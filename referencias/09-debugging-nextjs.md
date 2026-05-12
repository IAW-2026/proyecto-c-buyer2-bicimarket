# 09 — Debugging y solución de errores

Errores comunes en el Buyer App y cómo resolverlos.

---

## Dónde ver los errores

### Errores del servidor
La terminal donde corre `npm run dev` muestra todos los errores del servidor:

```bash
npm run dev
```

Cuando una API route falla, el stack trace completo aparece ahí. Es lo primero que tenés que mirar.

### Errores del cliente
Los errores del JavaScript del browser aparecen en la **Consola** del navegador (F12 → Console).

Los errores de red (requests fallidos) aparecen en **Network** (F12 → Network).

### Errores de compilación
```bash
npm run build
```
Muestra todos los errores de TypeScript antes de que la app corra.

---

## Errores más comunes

### "PrismaClient is not generated"

```
Error: @prisma/client did not initialize yet. Please run "prisma generate" first.
```

**Causa**: falta correr `prisma generate`.

**Solución**:
```bash
npx prisma generate
```

---

### "Can't reach database server"

```
PrismaClientInitializationError: Can't reach database server at `host:5432`
```

**Causa**: la base de datos no está corriendo o la URL de conexión está mal.

**Solución**:
1. Verificar la `DATABASE_URL` en `.env.local`
2. Si usás Supabase, verificar que el proyecto no esté pausado
3. Si usás PostgreSQL local, verificar que el servicio esté activo

---

### "Unauthorized" en todos los endpoints

```json
{ "error": "Unauthorized" }
```

**Causa**: no estás autenticado o la sesión expiró.

**Solución**:
1. Iniciar sesión en `/sign-in`
2. Verificar que `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY` están configuradas en `.env.local`
3. Reiniciar el servidor (`Ctrl+C` y `npm run dev`)

---

### "Hydration error"

```
Error: Hydration failed because the initial UI does not match what was rendered on the server.
```

**Causa**: el HTML generado en el servidor no coincide con lo que React renderiza en el cliente.

**Causa común**: usar datos que dependen del browser (como `window` o `Date.now()`) en un Server Component.

**Solución**: agregar `"use client"` al componente que usa datos dependientes del browser. O usar `suppressHydrationWarning` solo como último recurso.

---

### "useQuery is not a function" / hooks en Server Component

```
Error: Invalid hook call. Hooks can only be called inside of a function component.
```

**Causa**: estás usando un hook (`useQuery`, `useState`, etc.) en un Server Component (un componente sin `"use client"`).

**Solución**: agregar `"use client"` al inicio del archivo.

---

### "Cannot read properties of undefined"

```
TypeError: Cannot read properties of undefined (reading 'items')
```

**Causa**: accediste a `cart.items` sin verificar que `cart` exista.

**Solución**: usar optional chaining:
```tsx
// ❌ Falla si cart es undefined
cart.items.map(...)

// ✅ Correcto
cart?.items.map(...)

// ✅ Con valor por defecto
(cart?.items ?? []).map(...)
```

---

### Params no es un objeto (Next.js 16)

```
TypeError: params.orderId is not defined
```

**Causa**: en Next.js 16, `params` es una `Promise`. Olvidaste el `await`.

**Solución**:
```ts
// ❌ Incorrecto (funciona en versiones viejas, falla en Next.js 16)
export async function GET(req, { params }) {
  const { orderId } = params;
}

// ✅ Correcto para Next.js 16
export async function GET(req, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
}
```

---

### "Module not found: @/"

```
Module not found: Can't resolve '@/components/ui/button'
```

**Causa**: el alias `@/` no está configurado o hay un typo en la ruta.

**Solución**:
1. Verificar que `tsconfig.json` tiene `"paths": { "@/*": ["./src/*"] }`
2. Verificar que el archivo existe en `src/components/ui/button.tsx`

---

### Puerto 3000 ocupado

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solución**:
```bash
# Matar el proceso que usa el puerto 3000
lsof -ti:3000 | xargs kill -9

# O usar otro puerto
npm run dev -- -p 3001
```

---

## Cómo debuggear un endpoint de API

### Método 1: Console.log en el servidor

```ts
export async function GET() {
  const { userId } = await auth();
  console.log("userId:", userId);  // Aparece en la terminal de npm run dev
  
  const profile = await getOrCreateBuyerProfile(userId!);
  console.log("profile:", JSON.stringify(profile, null, 2));
  
  return NextResponse.json(profile);
}
```

### Método 2: Testear con curl

```bash
# Primero necesitás el JWT. Podés obtenerlo del browser:
# F12 → Application → Cookies → __session

curl -H "Authorization: Bearer TU_TOKEN" http://localhost:3000/api/buyer/profile
```

### Método 3: Testear desde la consola del browser

Con la app abierta y habiendo iniciado sesión:

```js
// En la consola del browser (F12)
const res = await fetch("/api/buyer/profile");
console.log(await res.json());
```

---

## Cómo debuggear React Query

### React Query DevTools

Para ver el estado del cache de React Query, podés agregar las DevTools temporalmente:

```tsx
// En src/providers/query-provider.tsx, agregar temporalmente:
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// Dentro del return:
<QueryClientProvider client={queryClient}>
  {children}
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

Esto agrega un panel en la esquina inferior derecha del browser donde podés:
- Ver todos los queries activos
- Ver el estado de cada query (loading, success, error)
- Ver los datos en cache
- Invalidar queries manualmente para testear

---

## Cómo leer errores de Prisma

### Error de validación

```
PrismaClientValidationError: Argument `where` is missing.
```
El campo `where` es requerido pero no lo pasaste.

### Error de constraint único

```
PrismaClientKnownRequestError: Unique constraint failed on the fields: (`email`)
```
Ya existe un registro con ese email.

### Error de foreign key

```
PrismaClientKnownRequestError: Foreign key constraint failed on the field: `buyerProfileId`
```
Estás intentando crear un registro con un ID que no existe en la tabla padre.

**Para ver más detalle**, podés habilitar los logs de Prisma en `src/lib/prisma.ts`:

```ts
export const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],  // Agrega esto temporalmente
});
```

---

## Errores de TypeScript en el editor

TypeScript te avisa de errores antes de que corras la app. Si el editor muestra subrayados rojos:

### "Property 'X' does not exist on type 'Y'"
Estás accediendo a una propiedad que no está definida en el tipo.

```ts
// ❌ Si BuyerProfile no tiene campo 'age'
profile.age  // Error: Property 'age' does not exist on type 'BuyerProfile'

// ✅ Agregar el campo al tipo en src/types/buyer.ts
type BuyerProfile = {
  // ...
  age?: number;
};
```

### "Type 'string | null' is not assignable to type 'string'"
Tenés un valor que puede ser null pero el tipo espera un string.

```ts
// ❌
const name: string = user.firstName;  // firstName puede ser null

// ✅ Opción 1: usar el operador ??
const name: string = user.firstName ?? "Usuario";

// ✅ Opción 2: verificar primero
if (user.firstName) {
  const name: string = user.firstName;
}
```

---

## Inspeccionar la base de datos

```bash
npx prisma studio
```

Abre [http://localhost:5555](http://localhost:5555). Útil para:
- Verificar que los datos se guardaron correctamente
- Borrar registros de prueba
- Ver el estado actual de las órdenes

---

## Siguiente paso

→ [10-glosario.md](10-glosario.md) — glosario de todos los términos técnicos usados en el proyecto.
