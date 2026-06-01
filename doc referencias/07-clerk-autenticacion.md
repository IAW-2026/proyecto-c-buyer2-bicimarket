# 07 — Clerk y autenticación

Todo lo que necesitás saber sobre cómo funciona la autenticación en el Buyer App.

---

## ¿Qué es Clerk?

Clerk es un servicio de autenticación completo. Se encarga de:
- Formularios de registro e inicio de sesión
- Gestión de sesiones
- JWT tokens
- Protección de rutas

En este proyecto, Clerk está **integrado directamente en Next.js** a través del paquete `@clerk/nextjs`.

---

## El Clerk compartido de BiciMarket

El sistema BiciMarket tiene **4 apps independientes** que comparten **un único proyecto de Clerk** (el del Buyer App). Un usuario tiene una sola cuenta y puede operar en múltiples apps con la misma sesión.

```
Buyer App    → Clerk compartido (rol: publicMetadata.role = "buyer")
Seller App   → Clerk compartido (rol: publicMetadata.role = "seller")
Shipping App → Clerk compartido (rol: publicMetadata.role = "logistics")
Payments App → Clerk compartido (requiere publicMetadata.admin = true)
```

Las apps se comunican entre sí usando X-Service-Token (ver [12-inter-servicios.md](12-inter-servicios.md)), no con JWT de usuarios.

---

## Cómo funciona el flujo de autenticación

```
1. Usuario va a /sign-in
2. Clerk muestra el formulario de login
3. Usuario ingresa email y password
4. Clerk verifica las credenciales
5. Clerk crea una sesión y guarda un cookie seguro en el browser
6. Usuario es redirigido a /dashboard (configurado en CLERK_AFTER_SIGN_IN_URL)
7. En cada request, el cookie de sesión se manda automáticamente
8. El servidor valida el token con auth() de Clerk
```

---

## Cómo usar Clerk en el servidor (`route.ts` y Server Components)

```ts
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  
  if (!userId) {
    // El usuario no está autenticado
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  
  // userId es el ID único del usuario en Clerk
  // Ej: "user_2abc123def456..."
  console.log("Usuario autenticado:", userId);
}
```

`auth()` lee el JWT del request, lo verifica contra Clerk y retorna la información del usuario. Si el token es inválido o expirado, `userId` es null.

### Obtener más datos del usuario en el servidor

```ts
import { auth, currentUser } from "@clerk/nextjs/server";

export async function GET() {
  const user = await currentUser();
  
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  
  console.log(user.firstName);   // Nombre del usuario
  console.log(user.emailAddresses[0].emailAddress);  // Email
  console.log(user.imageUrl);    // Foto de perfil
}
```

---

## Cómo usar Clerk en el cliente (`useUser`, `useAuth`)

En componentes con `"use client"`:

```tsx
"use client";

import { useUser, useAuth } from "@clerk/nextjs";

function ProfileButton() {
  const { user, isLoaded, isSignedIn } = useUser();
  
  if (!isLoaded) return <div>Cargando...</div>;
  if (!isSignedIn) return <a href="/sign-in">Iniciar sesión</a>;
  
  return (
    <div>
      <img src={user.imageUrl} alt="Avatar" />
      <span>{user.firstName}</span>
    </div>
  );
}
```

```tsx
"use client";

import { useAuth } from "@clerk/nextjs";

function LogoutButton() {
  const { signOut } = useAuth();
  
  return (
    <button onClick={() => signOut()}>
      Cerrar sesión
    </button>
  );
}
```

### Datos disponibles en `useUser()`

| Campo | Descripción |
|-------|-------------|
| `user.id` | ID único en Clerk |
| `user.firstName` | Nombre |
| `user.lastName` | Apellido |
| `user.fullName` | Nombre completo |
| `user.emailAddresses` | Array de emails |
| `user.imageUrl` | URL de la foto de perfil |
| `user.createdAt` | Fecha de registro |

---

## El componente `UserButton`

Clerk incluye un componente listo para mostrar el avatar del usuario con menú de opciones:

```tsx
import { UserButton } from "@clerk/nextjs";

// Muestra la foto del usuario y al hacer click abre un menú con opciones de perfil y logout
<UserButton afterSignOutUrl="/" />
```

---

## Páginas de autenticación (`/sign-in` y `/sign-up`)

Estas páginas usan los componentes built-in de Clerk:

```tsx
// src/app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  );
}
```

El componente `<SignIn />` es el formulario completo de login de Clerk. Maneja todo: validación, errores, redirect. Lo mismo con `<SignUp />`.

### ¿Por qué la carpeta se llama `[[...sign-in]]`?

Los corchetes dobles `[[...sign-in]]` son una "optional catch-all route" de Next.js. Esto le permite a Clerk manejar subrutas como `/sign-in/factor-one` para el flujo de autenticación multi-paso.

---

## Middleware de Clerk (`src/middleware.ts`)

El middleware se ejecuta antes de que cualquier request llegue a las páginas o APIs:

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Rutas públicas (no requieren autenticación)
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/v1/(.*)",       // Rutas para otras apps (usan X-Service-Token)
  "/products(.*)",
  "/api/products(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();  // Si no está autenticado, redirige a /sign-in
  }
});
```

**¿Qué hace `auth.protect()`?** Si el usuario no está autenticado, lo redirige a la URL de sign-in configurada en las variables de entorno.

---

## El `ClerkProvider` en `layout.tsx`

Para que Clerk esté disponible en toda la app, el `ClerkProvider` envuelve todo en `src/app/layout.tsx`:

```tsx
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

Sin este provider, los hooks de Clerk como `useUser()` no funcionarían.

---

## Sincronización Clerk → Base de datos

Cuando un usuario se registra en Clerk, necesitamos crear el registro en nuestra base de datos. Esto se hace de dos formas:

### Lazy provisioning (lo que usamos)

En lugar de crear el usuario en la DB al registrarse, lo creamos **la primera vez que hace un request autenticado**. El helper `getOrCreateBuyerProfile()` en `src/lib/buyer-service.ts` hace esto:

```ts
export async function getOrCreateBuyerProfile(userId: string) {
  const existing = await prisma.buyerProfile.findUnique({
    where: { userId },
  });

  if (existing) return existing;

  // Primera vez: crear el perfil
  return prisma.buyerProfile.create({
    data: {
      userId,
      displayName: "Comprador",
    },
  });
}
```

Todos los endpoints del Buyer App llaman a esta función antes de hacer cualquier operación.

---

## Variables de entorno de Clerk

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...   # Clave pública (va al browser)
CLERK_SECRET_KEY=sk_test_...                    # Clave secreta (solo servidor)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in         # Dónde está el login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up         # Dónde está el registro
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard # A dónde ir después del login
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard # A dónde ir después del registro
```

---

## Siguiente paso

→ [08-como-usar-la-app.md](08-como-usar-la-app.md) — tutorial completo de cómo usar el Buyer App.
