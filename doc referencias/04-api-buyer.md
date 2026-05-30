# 04 — APIs del Buyer App

Documentación completa de todos los endpoints REST del Buyer App, con ejemplos de request y response.

---

## Cómo funcionan las APIs en Next.js

Los archivos `route.ts` dentro de `src/app/api/` definen los endpoints. Por ejemplo:

- `src/app/api/buyer/cart/route.ts` → `GET /api/buyer/cart` y `POST /api/buyer/cart`
- `src/app/api/buyer/cart/[itemId]/route.ts` → `PATCH /api/buyer/cart/abc123` y `DELETE /api/buyer/cart/abc123`

Todo endpoint del Buyer App requiere autenticación con Clerk JWT (excepto los del `/api/v1/` que son para otras apps).

---

## Autenticación en los endpoints

Cada endpoint verifica la identidad del usuario así:

```ts
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();  // Lee el JWT de Clerk del header Authorization
  
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "No autenticado" } },
      { status: 401 }
    );
  }
  
  // userId es el ID del usuario en Clerk
  // ...
}
```

Cuando llamás la API desde el cliente (browser), el JWT de Clerk se manda automáticamente por Axios (configurado en `src/lib/axios.ts`).

---

## Validación con Zod

Antes de guardar datos en la base, todos los inputs se validan con Zod:

```ts
import { z } from "zod";

// Definís el schema de validación
const createAddressSchema = z.object({
  label: z.string().min(1, "El label es requerido"),
  street: z.string().min(1),
  city: z.string().min(1),
  zip: z.string().min(1),
  country: z.string().min(1),
  isDefault: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createAddressSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues.map(i => i.message).join(", ") } },
      { status: 400 }
    );
  }
  
  // parsed.data es el objeto validado y tipado
  const { label, street, city, zip, country } = parsed.data;
}
```

`safeParse` no lanza excepciones, devuelve `{ success: true, data }` o `{ success: false, error }`.

---

## Endpoints del Buyer App

### Perfil

#### `GET /api/buyer/profile`
Obtiene el perfil del comprador. Si no existe, lo crea automáticamente.

**Request**: No necesita body. Solo el JWT de Clerk en el header.

**Response exitosa** (200):
```json
{
  "id": "byp_clxxx",
  "userId": "user_clerk_xxx",
  "displayName": "Comprador",
  "phone": "+54 11 1234-5678",
  "documentNumber": null,
  "createdAt": "2026-05-01T12:00:00.000Z",
  "updatedAt": "2026-05-01T12:00:00.000Z"
}
```

---

#### `PATCH /api/buyer/profile`
Actualiza los datos del perfil.

**Request body**:
```json
{
  "displayName": "Camila Rojas",
  "phone": "+54 11 9876-5432",
  "documentNumber": "35.123.456"
}
```

Todos los campos son opcionales.

**Response exitosa** (200): el perfil actualizado (mismo formato que GET).

---

### Direcciones

#### `GET /api/buyer/addresses`
Lista todas las direcciones del comprador.

**Response** (200):
```json
[
  {
    "id": "adr_xxx",
    "buyerProfileId": "byp_xxx",
    "label": "Casa",
    "street": "Av. Corrientes 1234 3B",
    "city": "Buenos Aires",
    "state": "CABA",
    "zip": "1043",
    "country": "Argentina",
    "phone": null,
    "isDefault": true,
    "createdAt": "2026-05-01T12:00:00.000Z",
    "updatedAt": "2026-05-01T12:00:00.000Z"
  }
]
```

---

#### `POST /api/buyer/addresses`
Crea una nueva dirección.

**Request body**:
```json
{
  "label": "Trabajo",
  "street": "Florida 100",
  "city": "Buenos Aires",
  "state": "CABA",
  "zip": "1005",
  "country": "Argentina",
  "isDefault": false
}
```

**Response** (201): la dirección creada.

---

#### `PATCH /api/buyer/addresses/[addressId]`
Actualiza una dirección existente.

**Request body**: cualquier campo a actualizar.

**Response** (200): la dirección actualizada.

---

#### `DELETE /api/buyer/addresses/[addressId]`
Elimina una dirección.

**Response** (200):
```json
{ "deleted": true }
```

---

### Carrito

#### `GET /api/buyer/cart`
Obtiene el carrito activo con totales calculados. Si no tiene carrito, devuelve uno vacío.

**Response** (200):
```json
{
  "id": "cart_xxx",
  "buyerProfileId": "byp_xxx",
  "items": [
    {
      "id": "ci_xxx",
      "cartId": "cart_xxx",
      "productId": "prd_mock_001",
      "title": "Bicicleta de montaña Trek Marlin 5",
      "description": "Bici de montaña 29\"...",
      "unitPrice": 450000,
      "quantity": 1,
      "subtotal": 450000,
      "sellerId": "sel_mock_001",
      "sellerName": "BiciShop Buenos Aires",
      "imageUrl": null,
      "createdAt": "2026-05-06T10:00:00.000Z",
      "updatedAt": "2026-05-06T10:00:00.000Z"
    }
  ],
  "total": 450000,
  "itemCount": 1,
  "createdAt": "2026-05-06T10:00:00.000Z",
  "updatedAt": "2026-05-06T10:00:00.000Z"
}
```

**Importante**: `total` y `itemCount` son calculados por el servidor, no guardados en la DB.

---

#### `POST /api/buyer/cart`
Agrega un producto al carrito. Si el producto ya existe en el carrito, suma la cantidad.

**Request body**:
```json
{
  "productId": "prd_mock_001",
  "title": "Bicicleta de montaña Trek Marlin 5",
  "description": "Bici de montaña 29\"...",
  "unitPrice": 450000,
  "quantity": 1,
  "sellerId": "sel_mock_001",
  "sellerName": "BiciShop Buenos Aires"
}
```

**¿Por qué mandamos title, description y sellerId?** Porque el carrito guarda snapshots. Si mañana el vendedor cambia el precio, el carrito mantiene el precio al que lo agregaste.

**Response**: el item del carrito creado o actualizado.

---

#### `PATCH /api/buyer/cart/[itemId]`
Actualiza la cantidad de un ítem.

**Request body**:
```json
{ "quantity": 2 }
```

**Response** (200): el item actualizado.

---

#### `DELETE /api/buyer/cart/[itemId]`
Elimina un ítem del carrito.

**Response** (200):
```json
{ "deleted": true }
```

---

### Favoritos

#### `GET /api/buyer/favorites`
Lista los productos favoritos.

**Response** (200): array de `FavoriteItem`.

---

#### `POST /api/buyer/favorites`
Agrega un producto a favoritos.

**Request body**:
```json
{
  "productId": "prd_mock_001",
  "title": "Bicicleta de montaña Trek Marlin 5",
  "description": "Bici de montaña 29\"...",
  "sellerId": "sel_mock_001",
  "sellerName": "BiciShop Buenos Aires"
}
```

---

#### `DELETE /api/buyer/favorites/[favoriteId]`
Elimina un favorito.

---

### Órdenes

#### `GET /api/buyer/orders`
Lista todas las órdenes del comprador, ordenadas por fecha descendente.

**Response** (200): array de órdenes con sus grupos e items.

---

#### `GET /api/buyer/orders/[orderId]`
Detalle de una orden específica.

**Response** (200): orden con `items` y `sellerGroups` (cada grupo con sus `orderItems`).

---

### Checkout

#### `POST /api/buyer/checkout`
El endpoint más importante. Convierte el carrito activo en una orden y retorna la URL de pago.

**¿Qué hace internamente?**
1. Verifica que el carrito no esté vacío
2. Agrupa los items por vendedor
3. Calcula el costo de envío por grupo (llama a Shipping API o usa mock)
4. Crea la `Order` en la DB
5. Crea un `OrderSellerGroup` por cada vendedor
6. Crea los `OrderItem`
7. Vacía el carrito
8. Llama a Payments API para crear la sesión de pago (o usa mock)
9. Retorna la URL de checkout

**Request body**:
```json
{
  "shippingAddressId": "adr_xxx",
  "returnUrl": "https://buyer.bicimarket.com/orders"
}
```

**Response** (200):
```json
{
  "orderId": "ord_xxx",
  "paymentUrl": "https://www.mercadopago.com.ar/checkout/..."
}
```

El frontend debe redirigir al usuario a `paymentUrl`.

---

## Cómo testear los endpoints

### Con `curl`

```bash
# Necesitás un JWT de Clerk. Para obtenerlo desde el browser:
# 1. Loguéate en la app
# 2. Abrí DevTools → Application → Cookies → buscá "__session" o usá Clerk SDK para obtener el token

# GET perfil
curl -H "Authorization: Bearer TU_JWT_ACÁ" http://localhost:3000/api/buyer/profile

# POST agregar al carrito
curl -X POST \
  -H "Authorization: Bearer TU_JWT_ACÁ" \
  -H "Content-Type: application/json" \
  -d '{"productId":"prd_1","title":"Bici","description":"...","unitPrice":450000,"quantity":1,"sellerId":"sel_1"}' \
  http://localhost:3000/api/buyer/cart
```

### Con el browser (más fácil)

Con la app corriendo y habiendo iniciado sesión, podés hacer requests desde la consola del browser:

```js
// En la consola del browser (F12)
const res = await fetch("/api/buyer/profile");
const data = await res.json();
console.log(data);
```

### Con Postman o Bruno

1. Importá los endpoints manualmente
2. Para autenticarte, primero iniciá sesión en la app en el browser
3. Copiá el cookie de sesión y agrégalo al header

---

## Cómo agregar un nuevo endpoint

Ejemplo: agregar `GET /api/buyer/stats` que devuelva el total de órdenes del comprador.

**Paso 1**: Crear el archivo `src/app/api/buyer/stats/route.ts`

```ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateBuyerProfile } from "@/lib/buyer-service";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "No autenticado" } },
      { status: 401 }
    );
  }

  const profile = await getOrCreateBuyerProfile(userId);
  
  const [totalOrders, totalSpent] = await Promise.all([
    prisma.order.count({ where: { buyerProfileId: profile.id } }),
    prisma.order.aggregate({
      where: { buyerProfileId: profile.id, status: "COMPLETED" },
      _sum: { totalAmount: true },
    }),
  ]);

  return NextResponse.json({
    totalOrders,
    totalSpent: totalSpent._sum.totalAmount ?? 0,
  });
}
```

**Paso 2**: El endpoint ya está disponible en `GET /api/buyer/stats` sin ninguna configuración adicional.

**Paso 3**: (Opcional) Agregar un hook en `src/hooks/use-buyer.ts`:

```ts
export function useBuyerStats() {
  return useQuery({
    queryKey: ["buyer-stats"],
    queryFn: async () => {
      const { data } = await api.get("/buyer/stats");
      return data;
    },
  });
}
```

---

## Siguiente paso

→ [05-frontend-buyer.md](05-frontend-buyer.md) — cómo están construidas las páginas y cómo agregar componentes.
