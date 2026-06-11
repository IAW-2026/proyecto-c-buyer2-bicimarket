# 16 · Roles, Permisos y Autenticación

> Referencia técnica completa del sistema de identidad de BiciMarket Buyer App.  
> Cubre arquitectura de roles, flujos de autenticación, autorización por capa y guía de implementación para nuevas rutas.

---

## 1. Visión general

El sistema combina **tres mecanismos independientes** según el contexto:

| Mecanismo | Dónde actúa | Qué protege |
|---|---|---|
| **Clerk Middleware** (`proxy.ts`) | Edge — todas las requests | Páginas no públicas a nivel de URL |
| **Server Component / Layout guard** | RSC en el servidor | Grupos de rutas `(auth)/` y `admin/` |
| **`auth()` en Route Handlers** | API endpoints | Endpoints REST de buyer y admin |
| **`validateServiceToken`** | API inter-servicios | Endpoints llamados por otros microservicios |
| **`useRole` + `<Can>`** | Cliente (browser) | UI condicional en páginas públicas |

Ningún mecanismo reemplaza a otro — cada capa defiende su propio perímetro.

---

## 2. Arquitectura de Roles

### 2.1 Definición de roles

```ts
// src/lib/auth/roles.ts
export type Role = "public" | "buyer" | "admin";
```

| Rol | Condición | Descripción |
|---|---|---|
| `"public"` | No autenticado | Visitante sin sesión. Solo puede ver la tienda y el catálogo. |
| `"buyer"` | Autenticado, sin flag `admin` | Usuario registrado que puede comprar. Acceso a carrito, favoritos, órdenes, perfil. |
| `"admin"` | Autenticado **con** `publicMetadata.admin === true` en Clerk | Acceso completo incluyendo panel de administración. |

### 2.2 Cómo se determina el rol en el cliente

```ts
// src/hooks/use-role.ts
export function useRole(): Role {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  if (!isSignedIn) return "public";
  if (user?.publicMetadata?.admin) return "admin";
  return "buyer";
}
```

La fuente de verdad del flag `admin` es **Clerk `publicMetadata`**. Este campo solo puede escribirse desde el backend (Dashboard de Clerk o API de Clerk con `secretKey`), nunca desde el cliente — lo que previene escalada de privilegios.

### 2.3 Cómo asignar el rol admin a un usuario

Desde el **Dashboard de Clerk**:
1. Ir a *Users* → seleccionar el usuario
2. Editar *Public Metadata*
3. Establecer `{ "admin": true }`

Desde la **API de Clerk** (automatizable):
```bash
curl -X PATCH https://api.clerk.com/v1/users/<user_id> \
  -H "Authorization: Bearer <CLERK_SECRET_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"public_metadata": {"admin": true}}'
```

---

## 3. Mapa de Capacidades (Permisos)

```ts
// src/lib/auth/roles.ts
export type Capability =
  | "cart.add"
  | "favorites.toggle"
  | "orders.view"
  | "checkout"
  | "admin.access";

const CAPABILITIES: Record<Capability, Role[]> = {
  "cart.add":         ["buyer", "admin"],
  "favorites.toggle": ["buyer", "admin"],
  "orders.view":      ["buyer", "admin"],
  "checkout":         ["buyer", "admin"],
  "admin.access":     ["admin"],
};
```

**Lectura de la tabla:**

| Capacidad | public | buyer | admin |
|---|:---:|:---:|:---:|
| `cart.add` | ✗ | ✓ | ✓ |
| `favorites.toggle` | ✗ | ✓ | ✓ |
| `orders.view` | ✗ | ✓ | ✓ |
| `checkout` | ✗ | ✓ | ✓ |
| `admin.access` | ✗ | ✗ | ✓ |

La función de verificación es:

```ts
export function hasCapability(role: Role, action: Capability): boolean {
  return CAPABILITIES[action].includes(role);
}
```

---

## 4. Autenticación — Flujos por contexto

### 4.1 Middleware de Clerk (`src/proxy.ts`)

Es la **primera línea de defensa**. Se ejecuta en el Edge antes de renderizar cualquier página o API.

```ts
const isPublicRoute = createRouteMatcher([
  "/",
  "/shop",
  "/shop/(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/v1/(.*)",    // ← los endpoints REST tienen su propio guard interno
  "/api/docs(.*)",
  "/api/health(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect(); // redirige a /sign-in si no hay sesión
  }
});
```

**Implicaciones importantes:**
- `/api/v1/(**)` está marcado como público en el middleware porque los Route Handlers hacen su propia verificación con `auth()`. Esto permite también que otros microservicios llamen esos endpoints con `X-Service-Token` sin necesitar JWT de Clerk.
- Las rutas no listadas en `isPublicRoute` serán bloqueadas por Clerk antes de llegar al servidor (ej: `/admin`, `/dashboard`, etc.).

### 4.2 Layout Guard — Grupo `(auth)/`

Protege todas las páginas de buyer: `/cart`, `/checkout`, `/dashboard`, `/favorites`, `/orders`, `/profile`.

```ts
// src/app/(auth)/layout.tsx
export default async function AuthLayout({ children }) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  return <main className="flex-1">{children}</main>;
}
```

- Se ejecuta en el **servidor** (React Server Component).
- Cualquier página bajo `(auth)/` hereda esta protección automáticamente.
- No renderiza nada si el usuario no está autenticado — la redirección ocurre antes de que el browser reciba HTML.

### 4.3 Layout Guard — Grupo `admin/`

Protege todas las páginas del panel de administración.

```ts
// src/app/admin/layout.tsx
export default async function AdminLayout({ children }) {
  await requireAdmin(); // lanza redirect si no es admin
  return (
    <SidebarProvider>
      <AppSidebar />
      ...
    </SidebarProvider>
  );
}
```

```ts
// src/lib/admin-auth.ts
export async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");          // no autenticado → login
  const user = await currentUser();
  if (!user?.publicMetadata?.admin) redirect("/dashboard"); // autenticado pero no admin → buyer home
}
```

**Flujo de redirects para `/admin/*`:**
```
No autenticado  →  /sign-in
Autenticado, no admin  →  /dashboard
Autenticado + admin  →  renderiza la página
```

---

## 5. Autorización en API Endpoints

### 5.1 Endpoints de Buyer (`/api/v1/buyer/**`)

Verifican sesión de Clerk con `auth()`. El patrón estándar:

```ts
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... lógica de negocio
}
```

El `userId` de Clerk se usa para recuperar o crear el `BuyerProfile` en la base de datos:

```ts
const profile = await getOrCreateBuyerProfile(userId);
// BuyerProfile.clerkUserId === userId
```

Todos los datos del usuario están aislados por su `buyerProfileId` — un usuario nunca puede acceder a datos de otro.

### 5.2 Endpoints de Admin (`/api/admin/**`)

Usan `requireAdminApi()` que devuelve un `NextResponse` de error o `null` (si está autorizado):

```ts
// src/lib/admin-auth.ts
export async function requireAdminApi(): Promise<NextResponse | null> {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await currentUser();
  if (!user?.publicMetadata?.admin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

// Uso en un Route Handler:
export async function GET(req: NextRequest) {
  const deny = await requireAdminApi();
  if (deny) return deny;   // 401 o 403 según el caso
  // ... lógica de admin
}
```

| Situación | Código HTTP |
|---|---|
| Sin sesión | 401 Unauthorized |
| Autenticado pero no admin | 403 Forbidden |
| Admin válido | continúa con la lógica |

### 5.3 Endpoints Inter-Servicio (`/api/v1/orders/**`)

Llamados por otros microservicios (Payments App, Shipping App). No usan JWT de Clerk — usan un **token secreto compartido** via header `X-Service-Token`.

```ts
// src/lib/service-auth.ts
export function validateServiceToken(request: Request, envVarName: string): NextResponse | null {
  const expectedToken = process.env[envVarName];
  if (!expectedToken)
    return NextResponse.json({ error: { code: "SERVICE_TOKEN_NOT_CONFIGURED" } }, { status: 500 });

  const receivedToken = request.headers.get("X-Service-Token");
  if (!receivedToken || receivedToken !== expectedToken)
    return NextResponse.json({ error: { code: "INVALID_SERVICE_TOKEN" } }, { status: 401 });

  return null;
}

// Ejemplo de uso (Payments → Buyer):
const tokenError = validateServiceToken(request, "PAYMENTS_TO_BUYER_SERVICE_TOKEN");
if (tokenError) return tokenError;
```

Variables de entorno requeridas:
- `PAYMENTS_TO_BUYER_SERVICE_TOKEN` — token que usa Payments App para actualizar órdenes
- `SHIPPING_TO_BUYER_SERVICE_TOKEN` — token que usa Shipping App para actualizar envíos

---

## 6. UI Condicional — Componente `<Can>`

Para páginas **públicas** (como `/shop`) donde el usuario puede o no estar autenticado, se usa el render-prop `<Can>` para decidir comportamiento sin bloquear el render:

```tsx
// src/components/shared/can.tsx
export function Can({ action, children }: CanProps) {
  const role = useRole();
  return <>{children(hasCapability(role, action))}</>;
}
```

**Uso típico — botón que redirige al login si no está autenticado:**

```tsx
<Can action="cart.add">
  {(granted) => (
    <Button onClick={granted ? handleAddToCart : () => router.push("/sign-in")}>
      Agregar al carrito
    </Button>
  )}
</Can>
```

**Regla:** `<Can>` **nunca oculta** el elemento — siempre renderiza algo. La decisión es qué hacer al hacer clic: la acción real o redirigir al login. Esto mejora la UX porque el usuario ve la interfaz completa antes de autenticarse.

---

## 7. Diagrama de capas

```
Request
   │
   ▼
┌─────────────────────────────────┐
│  Clerk Middleware (Edge)        │  proxy.ts
│  • Rutas no públicas → 401/302  │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  Next.js Routing                │
├─────────────┬───────────────────┤
│  (auth)/    │  admin/           │  Layout RSC
│  layout.tsx │  layout.tsx       │
│  auth()     │  requireAdmin()   │
│  → /sign-in │  → /sign-in      │
│             │  → /dashboard     │
└──────┬──────┴────────┬──────────┘
       │               │
       ▼               ▼
  Páginas buyer   Páginas admin
  (RSC/Client)   (RSC/Client)
       │
       ▼
  API Route Handlers
  ├── /api/v1/buyer/**   → auth() + buyerProfileId
  ├── /api/admin/**      → requireAdminApi()
  └── /api/v1/orders/**  → validateServiceToken()
```

---

## 8. Guía de Implementación — Cómo proteger nuevas rutas

### 8.1 Nueva página de buyer (requiere login, cualquier usuario)

1. Crear el archivo dentro de `src/app/(auth)/mi-pagina/page.tsx`
2. No hacer nada más — el layout `(auth)/layout.tsx` ya aplica el guard.

```tsx
// src/app/(auth)/mi-pagina/page.tsx
export default function MiPagina() {
  // Aquí se llega solo si hay sesión activa
  return <div>...</div>;
}
```

### 8.2 Nueva página de admin

1. Crear en `src/app/admin/mi-seccion/page.tsx`
2. El layout `admin/layout.tsx` ya corre `requireAdmin()` — no agregar lógica adicional en la página.

```tsx
// src/app/admin/mi-seccion/page.tsx
export default function MiSeccionAdmin() {
  return <div>Solo admins ven esto</div>;
}
```

### 8.3 Nuevo endpoint de buyer (`/api/v1/buyer/...`)

```ts
// src/app/api/v1/buyer/mi-recurso/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getOrCreateBuyerProfile } from "@/lib/buyer-service";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getOrCreateBuyerProfile(userId);
  // Usar profile.id para todas las queries — nunca userId directamente en Prisma
  const data = await prisma.miModelo.findMany({
    where: { buyerProfileId: profile.id },
  });

  return NextResponse.json(data);
}
```

### 8.4 Nuevo endpoint de admin (`/api/admin/...`)

```ts
// src/app/api/admin/mi-recurso/route.ts
import { requireAdminApi } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const deny = await requireAdminApi();
  if (deny) return deny;   // retorna 401 o 403 automáticamente

  const data = await prisma.miModelo.findMany();
  return NextResponse.json(data);
}
```

### 8.5 Nuevo endpoint inter-servicio

```ts
// src/app/api/v1/mi-servicio/route.ts
import { validateServiceToken } from "@/lib/service-auth";

export async function PATCH(request: NextRequest) {
  const tokenError = validateServiceToken(request, "MI_SERVICIO_TOKEN");
  if (tokenError) return tokenError;

  // lógica de negocio...
}
```

Agregar la variable de entorno correspondiente (ej: `MI_SERVICIO_TOKEN`) en `.env.local` y en producción.

### 8.6 Nuevo botón/acción en página pública con permiso condicional

```tsx
import { Can } from "@/components/shared/can";

// Opción A — misma acción, distinto destino según auth
<Can action="checkout">
  {(granted) => (
    <Button onClick={granted ? handleCheckout : () => router.push("/sign-in")}>
      Finalizar compra
    </Button>
  )}
</Can>

// Opción B — ocultar completamente si no tiene permiso
<Can action="admin.access">
  {(granted) => granted ? <AdminPanel /> : null}
</Can>
```

### 8.7 Agregar una nueva capacidad

1. Agregar el string en `Capability` en `src/lib/auth/roles.ts`
2. Agregar la entrada en `CAPABILITIES` con los roles que la tienen

```ts
export type Capability =
  | "cart.add"
  | "favorites.toggle"
  | "orders.view"
  | "checkout"
  | "admin.access"
  | "reviews.write";  // ← nueva

const CAPABILITIES: Record<Capability, Role[]> = {
  // ... existentes
  "reviews.write": ["buyer", "admin"],
};
```

3. Usar con `<Can action="reviews.write">` en componentes o con `hasCapability(role, "reviews.write")` en lógica pura.

---

## 9. Resumen rápido de errores de autorización

| Situación | Capa que la maneja | Resultado |
|---|---|---|
| Usuario no autenticado accede a `/dashboard` | Clerk Middleware | redirect `/sign-in` |
| Usuario no autenticado accede a `/cart` | `(auth)/layout.tsx` | redirect `/sign-in` |
| Usuario no admin accede a `/admin` | `admin/layout.tsx` via `requireAdmin()` | redirect `/dashboard` |
| Usuario no autenticado llama `GET /api/v1/buyer/cart` | Route Handler `auth()` | 401 |
| Usuario autenticado llama `GET /api/admin/orders` sin ser admin | `requireAdminApi()` | 403 |
| Microservicio llama sin `X-Service-Token` | `validateServiceToken()` | 401 |
| `<Can action="cart.add">` con usuario `"public"` | `useRole` + `hasCapability` | `granted = false` → redirección manual |
