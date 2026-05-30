# 01 — Introducción a Next.js 16

Este documento es tu punto de partida para entender cómo está organizado el Buyer App y por qué las cosas están donde están.

---

## ¿Qué es Next.js?

Next.js es un **framework** construido sobre React. Si React es el motor que dibuja componentes en pantalla, Next.js es el auto completo: le agrega routing, manejo de APIs, renderizado en el servidor, optimización de imágenes, y muchas cosas más.

Lo que usamos en este proyecto es la versión **16** con el **App Router**, que es la forma moderna de construir apps en Next.js desde la versión 13 en adelante.

---

## El App Router — rutas basadas en carpetas

Lo más importante de entender es que **la estructura de carpetas dentro de `src/app/` define las rutas de la app**. No hay que registrar rutas manualmente.

```
src/app/
├── page.tsx          → /
├── shop/
│   └── page.tsx      → /shop
├── cart/
│   └── page.tsx      → /cart
├── orders/
│   └── page.tsx      → /orders
└── api/
    └── buyer/
        └── cart/
            └── route.ts  → POST/GET /api/buyer/cart
```

### Archivos especiales

| Archivo | Para qué sirve |
|---------|----------------|
| `page.tsx` | Define el contenido de una ruta. Sin este archivo, la carpeta no existe como página. |
| `layout.tsx` | Envuelve todas las páginas de esa carpeta y sus hijos. Se usa para providers, navbars, etc. |
| `route.ts` | Define un endpoint de API. Solo puede estar en carpetas dentro de `api/`. |
| `error.tsx` | Componente que se muestra si la página lanza un error. |
| `not-found.tsx` | Componente para el error 404. |
| `loading.tsx` | Componente de carga mientras la página está cargando. |
| `middleware.ts` | Código que corre antes de que se resuelva cualquier request. Acá configuramos Clerk. |

---

## Server Components vs Client Components

Esta es la diferencia más importante de entender en Next.js moderno.

### Server Components (por defecto)

Cualquier `page.tsx` o componente que NO tenga `"use client"` al inicio es un **Server Component**. Se ejecuta **solo en el servidor**, nunca en el navegador.

**¿Qué significa esto?**
- Puede acceder directamente a la base de datos con Prisma
- Puede leer variables de entorno secretas
- NO puede usar `useState`, `useEffect`, ni ningún hook de React
- NO puede manejar eventos del browser (`onClick`, `onChange`, etc.)

```tsx
// src/app/orders/page.tsx — Server Component (no tiene "use client")
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export default async function OrdersPage() {
  const { userId } = await auth();  // ✅ Funciona en el servidor
  
  const orders = await prisma.order.findMany({  // ✅ Funciona en el servidor
    where: { buyerProfile: { userId } },
  });
  
  return <div>{orders.map(o => <p key={o.id}>{o.orderNumber}</p>)}</div>;
}
```

### Client Components

Si el componente necesita interactividad (eventos, estado, efectos), necesitás poner `"use client"` al inicio.

```tsx
"use client";  // ← Esta línea lo convierte en Client Component

import { useState } from "react";

export default function CartPage() {
  const [count, setCount] = useState(0);  // ✅ Funciona en el cliente
  
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

**¿Cuándo usar cada uno?**

| Situación | Usar |
|-----------|------|
| Mostrar datos simples sin interactividad | Server Component |
| Usar `useState`, `useEffect`, `useQuery` | Client Component |
| Manejar eventos del usuario (clicks, inputs) | Client Component |
| Acceder directamente a Prisma | Server Component |
| Usar Clerk desde el servidor (`auth()`) | Server Component |
| Usar Clerk desde el cliente (`useUser()`) | Client Component |

> En este proyecto, la mayoría de las páginas del Buyer App son **Client Components** porque usan React Query para cargar datos y tienen formularios interactivos.

---

## Rutas dinámicas

Para rutas que dependen de un ID o parámetro variable, se usa corchetes en el nombre de carpeta:

```
src/app/orders/[orderId]/page.tsx  → /orders/abc123
```

En el componente, podés acceder al parámetro así:

```tsx
// ⚠️ En Next.js 16, params es una Promise — hay que hacer await
export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;  // ← await obligatorio en Next.js 16
  return <div>Orden: {orderId}</div>;
}
```

Lo mismo aplica en los `route.ts`:

```ts
export async function GET(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;  // ← await obligatorio
  // ...
}
```

> **Cambio de Next.js 16**: en versiones anteriores, `params` era un objeto directo. En Next.js 16 es una `Promise`. Si ves código viejo que no hace `await params`, va a fallar.

---

## Rutas de API (`route.ts`)

Los archivos `route.ts` dentro de `src/app/api/` definen endpoints REST.

```ts
// src/app/api/buyer/cart/route.ts
import { NextRequest, NextResponse } from "next/server";

// GET /api/buyer/cart
export async function GET() {
  return NextResponse.json({ items: [] });
}

// POST /api/buyer/cart
export async function POST(request: NextRequest) {
  const body = await request.json();
  // procesar body...
  return NextResponse.json({ created: true }, { status: 201 });
}
```

Para responder con error:
```ts
return NextResponse.json(
  { error: { code: "NOT_FOUND", message: "No encontrado" } },
  { status: 404 }
);
```

---

## El `layout.tsx` raíz

El archivo `src/app/layout.tsx` envuelve **toda** la app. Es donde ponemos los providers globales:

```tsx
// src/app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";
import { QueryProvider } from "@/providers/query-provider";

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>          {/* ← autenticación disponible en toda la app */}
      <html lang="es">
        <body>
          <QueryProvider>    {/* ← React Query disponible en toda la app */}
            {children}
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

---

## El flujo completo de una request

Cuando el usuario navega a `/cart`:

```
1. Browser → GET /cart
2. Next.js busca src/app/cart/page.tsx
3. Si tiene "use client": se ejecuta en el browser
   Si NO tiene "use client": se ejecuta en el servidor
4. El componente llama a useBuyerCart() (React Query hook)
5. React Query hace GET /api/buyer/cart (llamada al mismo servidor)
6. src/app/api/buyer/cart/route.ts maneja el request
7. auth() valida el JWT de Clerk
8. prisma.cart.findUnique() consulta la base de datos
9. NextResponse.json() devuelve los datos
10. React Query guarda los datos en cache
11. El componente re-renderiza con los datos
```

---

## Navegación entre páginas

Para navegar, usamos el componente `<Link>` de Next.js (NO el `<a>` de HTML):

```tsx
import Link from "next/link";

// Navegación estática
<Link href="/cart">Ver carrito</Link>

// Navegación con ID dinámico
<Link href={`/orders/${order.id}`}>Ver pedido</Link>
```

Para navegación programática (desde código, no desde un botón de link):

```tsx
"use client";
import { useRouter } from "next/navigation";  // ← siempre de "next/navigation", no "next/router"

function CheckoutButton() {
  const router = useRouter();
  
  const handleCheckout = () => {
    router.push("/checkout");
  };
  
  return <button onClick={handleCheckout}>Ir al checkout</button>;
}
```

---

## Convenciones importantes de Next.js 16

1. **`params` es Promise**: siempre hacer `await context.params` en routes y páginas dinámicas
2. **`useRouter`** viene de `next/navigation`, no de `next/router`
3. **`"use client"`** va en la primera línea del archivo, antes de los imports
4. **Async Server Components**: las páginas sin `"use client"` pueden ser `async`
5. **No usar `getServerSideProps` ni `getStaticProps`**: esas son del Pages Router viejo

---

## Estructura de imports

Este proyecto usa path aliases para imports más limpios:

```ts
// ✅ Correcto — usa el alias @/
import { useBuyerCart } from "@/hooks/use-buyer";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

// ❌ Incorrecto — ruta relativa larga
import { useBuyerCart } from "../../../hooks/use-buyer";
```

El `@/` apunta a la carpeta `src/`. Está configurado en `tsconfig.json`.

---

## Siguiente paso

Ya entendés la estructura. El próximo paso es configurar el proyecto y entender las variables de entorno.
→ Continuá con [02-configuracion-proyecto.md](02-configuracion-proyecto.md)
