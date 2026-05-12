# 06 — React Query y Zustand

Cómo funciona la gestión de datos en el Buyer App: React Query para datos del servidor, Zustand para estado local de UI.

---

## ¿Por qué no usar `useEffect + fetch`?

El enfoque "viejo" para cargar datos en React era:

```tsx
// ❌ Patrón viejo — problemático
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch("/api/buyer/cart")
    .then(r => r.json())
    .then(d => { setData(d); setLoading(false); });
}, []);
```

**Problemas**:
- Cada vez que el componente se monta, hace un nuevo fetch (aunque los datos sean frescos)
- Si dos componentes necesitan los mismos datos, hacen dos requests separados
- No hay cache
- Tienes que manejar manualmente los estados de loading/error
- Sincronizar los datos después de una mutación es complicado

**React Query soluciona todo esto:**

```tsx
// ✅ Patrón con React Query
const { data, isLoading, error } = useBuyerCart();
```

---

## React Query — conceptos clave

### `useQuery` — leer datos

```tsx
import { useQuery } from "@tanstack/react-query";

const { data, isLoading, error, refetch } = useQuery({
  queryKey: ["buyer-cart"],     // Identificador único del dato en cache
  queryFn: async () => {        // Función que obtiene los datos
    const { data } = await api.get("/buyer/cart");
    return data;
  },
});
```

**¿Qué retorna `useQuery`?**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `data` | `T \| undefined` | Los datos (undefined mientras carga o si hay error) |
| `isLoading` | `boolean` | True mientras carga por primera vez |
| `isFetching` | `boolean` | True cuando está refrescando (incluso si ya tenía datos) |
| `error` | `Error \| null` | El error si falló |
| `refetch` | `() => void` | Función para forzar una recarga |
| `isSuccess` | `boolean` | True cuando los datos llegaron correctamente |

### La `queryKey` — por qué importa

La `queryKey` es el identificador del dato en el cache. Puede ser un string o un array:

```ts
// Query simple
queryKey: ["buyer-profile"]

// Query con parámetros (crea un cache entry separado por ID)
queryKey: ["order", orderId]  // ["order", "abc"] y ["order", "xyz"] son entradas distintas

// Query con filtros
queryKey: ["orders", { status: "PAID" }]
```

Cuando llamás `invalidateQueries({ queryKey: ["buyer-cart"] })`, React Query recarga todos los queries que empiecen con `"buyer-cart"`.

### `useMutation` — modificar datos

Mientras `useQuery` es para leer, `useMutation` es para crear/modificar/eliminar:

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";

const queryClient = useQueryClient();

const addToCart = useMutation({
  mutationFn: async (payload) => {
    const { data } = await api.post("/buyer/cart", payload);
    return data;
  },
  onSuccess: () => {
    // Después de agregar al carrito, invalidar el query del carrito
    // Esto hace que React Query refetch el carrito automáticamente
    queryClient.invalidateQueries({ queryKey: ["buyer-cart"] });
  },
  onError: (error) => {
    console.error("Error al agregar al carrito:", error);
  },
});

// Usar la mutación
<Button onClick={() => addToCart.mutate({ productId: "prd_1", ... })}>
  Agregar
</Button>

// O con async/await
const handleClick = async () => {
  try {
    await addToCart.mutateAsync({ productId: "prd_1", ... });
    // Se ejecuta solo si la mutación fue exitosa
    router.push("/cart");
  } catch (error) {
    // Manejar error
  }
};
```

**¿Diferencia entre `mutate` y `mutateAsync`?**
- `mutate`: llama la mutación, maneja el resultado con `onSuccess`/`onError`
- `mutateAsync`: devuelve una Promise, podés usar try/catch directamente

**¿Qué retorna `useMutation`?**

| Campo | Descripción |
|-------|-------------|
| `mutate(payload)` | Ejecutar la mutación |
| `mutateAsync(payload)` | Ejecutar y retornar Promise |
| `isPending` | True mientras está en ejecución |
| `isSuccess` | True si fue exitosa |
| `isError` | True si falló |
| `data` | Resultado de la mutación |

### `invalidateQueries` — sincronizar el cache

Este es el patrón central de React Query: cuando modificás algo, invalidás el cache relacionado para que se recargue.

```ts
// Después de agregar una dirección, recargar la lista de direcciones
queryClient.invalidateQueries({ queryKey: ["buyer-addresses"] });

// Después del checkout, recargar carrito Y órdenes
queryClient.invalidateQueries({ queryKey: ["buyer-cart"] });
queryClient.invalidateQueries({ queryKey: ["buyer-orders"] });
```

---

## Los hooks del Buyer App (`src/hooks/use-buyer.ts`)

Todos los hooks de React Query del Buyer App están centralizados ahí:

```ts
// READS (useQuery)
useBuyerProfile()      // GET /api/buyer/profile
useBuyerAddresses()    // GET /api/buyer/addresses
useBuyerCart()         // GET /api/buyer/cart
useBuyerOrders()       // GET /api/buyer/orders
useFavoriteItems()     // GET /api/buyer/favorites
useProducts()          // GET /api/products

// WRITES (useMutation)
useUpdateBuyerProfile()  // PATCH /api/buyer/profile
useCreateAddress()       // POST /api/buyer/addresses
useDeleteAddress()       // DELETE /api/buyer/addresses/:id
useAddCartItem()         // POST /api/buyer/cart
useUpdateCartItem()      // PATCH /api/buyer/cart/:id
useRemoveCartItem()      // DELETE /api/buyer/cart/:id
useAddFavoriteItem()     // POST /api/buyer/favorites
useRemoveFavoriteItem()  // DELETE /api/buyer/favorites/:id
useCheckoutCart()        // POST /api/buyer/checkout
```

### Ejemplo de uso en un componente

```tsx
"use client";

import { useBuyerCart, useRemoveCartItem } from "@/hooks/use-buyer";

export default function CartPage() {
  const { data: cart, isLoading } = useBuyerCart();
  const removeItem = useRemoveCartItem();

  if (isLoading) return <p>Cargando...</p>;

  return (
    <div>
      {cart?.items.map(item => (
        <div key={item.id}>
          <span>{item.title}</span>
          <button
            onClick={() => removeItem.mutate(item.id)}
            disabled={removeItem.isPending}
          >
            {removeItem.isPending ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## El QueryProvider

Para que React Query funcione en toda la app, necesita un `QueryClient` disponible globalmente. Eso está configurado en `src/providers/query-provider.tsx`:

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState asegura que cada usuario tiene su propio QueryClient
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,  // Los datos son "frescos" por 60 segundos
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

Este provider está en `src/app/layout.tsx`, envolviendo toda la app.

---

## Zustand — estado de UI local

Mientras React Query gestiona los datos del servidor, **Zustand** gestiona el estado de la interfaz de usuario que no necesita persistirse en el backend.

### ¿Cuándo usar Zustand vs React Query?

| Situación | Usar |
|-----------|------|
| Datos que vienen del servidor | React Query |
| Estado local de la UI (sin persistir) | Zustand o `useState` |
| Estado compartido entre varios componentes | Zustand |
| Estado simple en un solo componente | `useState` |

### El store del carrito (`src/store/use-cart-store.ts`)

```ts
import { create } from "zustand";

type CartStore = {
  selectedAddressId: string | null;
  orderNote: string;
  setSelectedAddressId: (addressId: string | null) => void;
  setOrderNote: (note: string) => void;
  resetCartState: () => void;
};

export const useCartStore = create<CartStore>((set) => ({
  // Estado inicial
  selectedAddressId: null,
  orderNote: "",
  
  // Acciones
  setSelectedAddressId: (addressId) => set({ selectedAddressId: addressId }),
  setOrderNote: (note) => set({ orderNote: note }),
  resetCartState: () => set({ selectedAddressId: null, orderNote: "" }),
}));
```

### Cómo usar el store en un componente

```tsx
"use client";

import { useCartStore } from "@/store/use-cart-store";

function CheckoutPage() {
  // Leer todo el store
  const { selectedAddressId, setSelectedAddressId } = useCartStore();
  
  // O seleccionar solo lo que necesitás (más eficiente)
  const selectedAddressId = useCartStore((state) => state.selectedAddressId);
  const setSelectedAddressId = useCartStore((state) => state.setSelectedAddressId);
  
  return (
    <select onChange={(e) => setSelectedAddressId(e.target.value)}>
      {/* opciones */}
    </select>
  );
}
```

### Cómo crear un nuevo store de Zustand

```ts
// src/store/use-ui-store.ts
import { create } from "zustand";

type UIStore = {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
};

export const useUIStore = create<UIStore>((set) => ({
  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));
```

---

## Patrón completo: Checkout

El flujo del checkout usa ambos — React Query y Zustand:

```
1. Usuario en /checkout
2. useBuyerAddresses() (React Query) → carga las direcciones
3. Usuario selecciona una → setSelectedAddressId() (Zustand) guarda la elección
4. Usuario hace click en "Confirmar orden"
5. useCheckoutCart().mutate({ shippingAddressId }) (React Query)
6. API crea la orden, retorna { paymentUrl, orderId }
7. resetCartState() (Zustand) limpia la selección
8. invalidateQueries (React Query) recarga carrito y órdenes
9. router.push(paymentUrl) redirige al pago
```

---

## Axios — el cliente HTTP

Los hooks usan `axios` para hacer los requests. El cliente está configurado en `src/lib/axios.ts`:

```ts
import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});
```

Con esta configuración, en los hooks usás:
```ts
api.get("/buyer/cart")       // → GET /api/buyer/cart
api.post("/buyer/cart", data) // → POST /api/buyer/cart
api.delete("/buyer/cart/123") // → DELETE /api/buyer/cart/123
```

El JWT de Clerk se manda automáticamente porque el browser incluye las cookies de sesión en cada request al mismo origen.

---

## Siguiente paso

→ [07-clerk-autenticacion.md](07-clerk-autenticacion.md) — cómo funciona la autenticación con Clerk.
