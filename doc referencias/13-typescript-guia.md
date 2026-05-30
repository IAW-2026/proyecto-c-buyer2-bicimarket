# 13 — TypeScript en el Buyer App

Guía práctica de cómo usamos TypeScript en este proyecto.

---

## ¿Por qué TypeScript?

TypeScript agrega **tipos estáticos** a JavaScript. El beneficio más grande es que detecta errores **antes de correr el código**:

```ts
// Sin TypeScript — este error solo se descubre en runtime
function calcTotal(items) {
  return items.reduce((sum, item) => sum + item.prince, 0); // typo: "prince" en vez de "price"
}

// Con TypeScript — el editor te avisa inmediatamente con subrayado rojo
function calcTotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.prince, 0);
  //                                          ^^^^^^ Error: Property 'prince' does not exist on type 'CartItem'
}
```

Otros beneficios:
- **Autocompletado**: el editor sabe qué campos tiene un objeto
- **Refactoring seguro**: si cambiás el nombre de un campo, TypeScript te dice dónde más se usa
- **Documentación implícita**: los tipos describen qué datos acepta cada función

---

## Dónde están los tipos del proyecto

```
src/types/
├── buyer.ts          # Tipos del dominio Buyer App (Product, BuyerProfile, Cart, etc.)
├── api.ts            # Tipos genéricos de API (ApiError, PaginatedResponse)
└── inter-service.ts  # Tipos de contratos con otras apps
```

---

## `type` vs `interface`

En TypeScript, `type` e `interface` hacen cosas muy similares. En este proyecto usamos `type` para todo.

```ts
// type — lo que usamos
type BuyerProfile = {
  id: string;
  displayName: string;
  phone: string | null;
};

// interface — alternativa (más verbosa, más fácil de extender)
interface BuyerProfile {
  id: string;
  displayName: string;
  phone: string | null;
}
```

**Diferencia práctica**: con `interface` podés declararla múltiples veces y se fusionan (declaration merging). Con `type` eso no es posible. Para este proyecto no importa, pero como regla general: usá `type`.

---

## Campos opcionales vs nullable

```ts
type Address = {
  label: string;        // ← Requerido: siempre tiene que tener valor
  state?: string;       // ← Opcional: puede estar ausente (undefined)
  phone: string | null; // ← Nullable: está presente pero puede ser null
};
```

En la práctica, en este proyecto usamos `string | null` para campos que pueden ser null en la DB (campos opcionales de Prisma), y el `?` para parámetros opcionales de funciones.

---

## Tipos genéricos con `<T>`

Un tipo genérico funciona como un "template" que acepta un tipo como parámetro:

```ts
// PaginatedResponse<T> puede ser PaginatedResponse<Product> o PaginatedResponse<Order>
type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
  };
};

// Uso:
const response: PaginatedResponse<Product> = {
  data: [product1, product2],
  pagination: { total: 2, page: 1, limit: 20, has_more: false }
};
```

---

## Utility types más usados

### `Partial<T>` — hacer todos los campos opcionales

```ts
type BuyerProfile = {
  id: string;
  displayName: string;
  phone: string | null;
};

// Para un update, no necesitás mandar todos los campos
type UpdateProfilePayload = Partial<BuyerProfile>;
// Equivale a: { id?: string; displayName?: string; phone?: string | null; }

// En el hook:
function useUpdateBuyerProfile() {
  return useMutation({
    mutationFn: async (payload: Partial<BuyerProfile>) => {
      // ...
    }
  });
}
```

### `Omit<T, K>` — excluir campos

```ts
type CartItem = {
  id: string;
  cartId: string;
  productId: string;
  title: string;
  unitPrice: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};

// Para crear un CartItem, no mandamos id, createdAt ni updatedAt (los genera el servidor)
type CreateCartItemPayload = Omit<CartItem, "id" | "createdAt" | "updatedAt">;
```

### `Pick<T, K>` — seleccionar solo algunos campos

```ts
type CartItem = { /* ... muchos campos */ };

// Para mostrar solo título y precio en un resumen
type CartItemSummary = Pick<CartItem, "id" | "title" | "unitPrice" | "quantity">;
```

### `z.infer<typeof schema>` — tipo desde Zod

```ts
import { z } from "zod";

const addressSchema = z.object({
  label: z.string().min(1),
  street: z.string().min(1),
  city: z.string().min(1),
  zip: z.string().min(1),
  country: z.string().min(1),
  isDefault: z.boolean().optional(),
});

// Generar el tipo TypeScript desde el schema de Zod
type AddressFormData = z.infer<typeof addressSchema>;
// Equivale a:
// type AddressFormData = {
//   label: string;
//   street: string;
//   city: string;
//   zip: string;
//   country: string;
//   isDefault?: boolean;
// }
```

---

## Tipar funciones

```ts
// Función simple
function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Función async
async function getOrCreateProfile(userId: string): Promise<BuyerProfile> {
  // ...
}

// Función con genérico
function groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
  // keyof T = cualquier clave del tipo T
  return items.reduce((groups, item) => {
    const k = String(item[key]);
    groups[k] = groups[k] ?? [];
    groups[k].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}
```

---

## Tipar componentes React

```tsx
// Componente con props
type CartItemCardProps = {
  item: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
};

export function CartItemCard({ item, onIncrement, onDecrement, onRemove }: CartItemCardProps) {
  return (
    <div>
      <span>{item.title}</span>
      <button onClick={onDecrement}>-</button>
      <span>{item.quantity}</span>
      <button onClick={onIncrement}>+</button>
      <button onClick={onRemove}>Eliminar</button>
    </div>
  );
}
```

```tsx
// Componente con children
type CardProps = {
  title: string;
  children: React.ReactNode;  // Acepta cualquier JSX
};

export function Card({ title, children }: CardProps) {
  return (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  );
}
```

---

## Tipar hooks de React Query

```ts
// useQuery con tipo explícito
export function useBuyerCart() {
  return useQuery<Cart>({  // <Cart> = tipo del dato esperado
    queryKey: ["buyer-cart"],
    queryFn: async () => {
      const { data } = await api.get<Cart>("/buyer/cart");  // api.get<Cart> = axios tipado
      return data;
    },
  });
}

// useMutation con tipos
export function useCreateAddress() {
  return useMutation<
    Address,                                              // Tipo del resultado
    Error,                                               // Tipo del error
    Omit<Address, "id" | "createdAt" | "updatedAt">     // Tipo del payload
  >({
    mutationFn: async (newAddress) => {
      const { data } = await api.post<Address>("/buyer/addresses", newAddress);
      return data;
    },
  });
}
```

---

## Enum del schema de Prisma

Los enums definidos en `prisma/schema.prisma` se pueden importar desde el cliente generado:

```ts
import { OrderStatus, SellerGroupStatus } from "@/generated/prisma";

// Usar en queries
const paidOrders = await prisma.order.findMany({
  where: { status: OrderStatus.PAID }
});
```

También los tenemos en `src/types/buyer.ts` como TypeScript enums para uso en el frontend:

```ts
export enum OrderStatus {
  PENDING_PAYMENT = "PENDING_PAYMENT",
  PAID = "PAID",
  // ...
}
```

---

## Errores TypeScript frecuentes

### "Type 'string | null' is not assignable to type 'string'"

```ts
const name: string = profile.phone;  // ❌ Error: phone puede ser null

// Opciones:
const name: string = profile.phone ?? "";          // ✅ Valor por defecto
const name: string = profile.phone!;               // ✅ Non-null assertion (usá solo si estás seguro)
const name: string | null = profile.phone;        // ✅ Aceptar null en el tipo
if (profile.phone) { const name = profile.phone; }  // ✅ Type narrowing
```

### "Argument of type 'X | undefined' is not assignable to parameter of type 'X'"

```ts
const { data: cart } = useBuyerCart();

// cart puede ser undefined mientras carga
processCart(cart);  // ❌ Error: cart puede ser undefined

// Verificar antes de usar
if (cart) {
  processCart(cart);  // ✅ TypeScript sabe que cart no es undefined acá
}
```

### "Property 'X' does not exist on type 'Y'"

```ts
const item: CartItem = /* ... */;
item.price;  // ❌ CartItem tiene 'unitPrice', no 'price'
item.unitPrice;  // ✅
```

---

## Cómo agregar un nuevo tipo

**Paso 1**: Decidir dónde va el tipo:
- Dominio del Buyer App → `src/types/buyer.ts`
- Genérico de API → `src/types/api.ts`
- Contrato con otra app → `src/types/inter-service.ts`

**Paso 2**: Agregar el tipo:

```ts
// En src/types/buyer.ts
export type OrderStatusHistory = {
  id: string;
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  changedAt: string;
  changedBy: "system" | "buyer" | "seller" | "payments" | "shipping";
};
```

**Paso 3**: Importar donde se necesita:

```ts
import type { OrderStatusHistory } from "@/types/buyer";
```

---

## Siguiente paso

→ [14-agregar-funcionalidad.md](14-agregar-funcionalidad.md) — tutorial completo de cómo agregar una nueva funcionalidad end-to-end.
