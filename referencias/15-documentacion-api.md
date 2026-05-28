# Documentación de la API — `src/app/api`

> Proyecto: **bicimarket · buyer app**  
> Fecha: 2026-05-28

---

## Estructura general

```
src/app/api/
├── health/              → Estado del servicio
├── products/            → Catálogo de productos (proxy al Seller App)
├── docs/                → Spec OpenAPI
├── admin/               → Endpoints internos de administración
│   ├── buyers/
│   ├── carts/
│   ├── orders/
│   │   └── [orderId]/
│   └── stats/
└── v1/
    ├── buyer/           → Endpoints del comprador (autenticados con Clerk)
    │   ├── profile/
    │   ├── addresses/
    │   │   └── [addressId]/
    │   ├── cart/
    │   │   └── [itemId]/
    │   ├── checkout/
    │   ├── favorites/
    │   │   └── [favoriteId]/
    │   └── orders/
    │       └── [orderId]/
    │           └── cancel/
    └── orders/          → Endpoints internos (inter-servicios)
        └── [orderId]/
            └── seller-groups/
                └── [groupId]/
                    └── shipping/
```

---

## Carpetas de primer nivel

### `/api/health`
Chequeo de salud del servicio. Verifica que la base de datos esté conectada ejecutando una query simple (`SELECT 1`). No requiere autenticación.

### `/api/products`
Proxy hacia el **Seller App**. Devuelve el catálogo de productos activos, transformando el formato inter-servicio al tipo `Product` usado en el frontend del buyer.

### `/api/docs`
Devuelve la especificación OpenAPI del proyecto en formato JSON. Útil para explorar la API con herramientas como Swagger UI o Postman.

### `/api/admin`
Endpoints de administración interna. Se protegen con `requireAdminApi()` (rol de administrador). No son accesibles para usuarios regulares.

### `/api/v1/buyer`
Todos los endpoints del comprador autenticado. Usan **Clerk** como sistema de autenticación (`auth()` de `@clerk/nextjs/server`). Todos requieren sesión activa.

### `/api/v1/orders`
Endpoints internos llamados por otros servicios del sistema (Payments App, Shipping App). Se autentican con un **service token** (`X-Service-Token`), no con JWT de Clerk.

---

## `/api/v1/buyer` — Endpoints del comprador

### `GET /api/v1/buyer/profile`
Devuelve el perfil del comprador autenticado. Si no existe aún, lo crea automáticamente (`getOrCreateBuyerProfile`).

### `PATCH /api/v1/buyer/profile`
Actualiza el perfil del comprador. Campos editables: `fullName` (mín. 2 caracteres), `phone`.

---

### `GET /api/v1/buyer/addresses`
Lista todas las direcciones guardadas del comprador, ordenadas por fecha de creación descendente.

### `POST /api/v1/buyer/addresses`
Crea una nueva dirección. Si `isDefault: true`, desactiva automáticamente cualquier dirección default anterior. Campos requeridos: `alias`, `street`, `number`, `city`, `province`, `postalCode`, `country`.

### `PATCH /api/v1/buyer/addresses/[addressId]`
Actualiza parcialmente una dirección existente. Todos los campos son opcionales. Si se marca como default, la anterior pierde ese estado. Retorna 404 si la dirección no pertenece al comprador.

### `DELETE /api/v1/buyer/addresses/[addressId]`
Elimina una dirección. Retorna 404 si no existe o no pertenece al comprador.

---

### `GET /api/v1/buyer/cart`
Devuelve el carrito activo del comprador con todos sus ítems, más los totales calculados (`totalCents`, `itemCount`). Si no existe carrito, lo crea vacío.

### `POST /api/v1/buyer/cart`
Agrega un producto al carrito. Si el producto ya estaba en el carrito, **incrementa la cantidad** y actualiza el precio unitario. Si es nuevo, lo crea (responde `201`). Campos requeridos: `productId`, `sellerProfileId`, `productNameSnapshot`, `unitPriceCents`, `quantity`, `weightGramsSnapshot`.

### `PATCH /api/v1/buyer/cart/[itemId]`
Actualiza la cantidad de un ítem específico del carrito. El campo `quantity` debe ser un entero ≥ 1. Valida que el ítem pertenezca al carrito del comprador autenticado.

### `DELETE /api/v1/buyer/cart/[itemId]`
Elimina un ítem del carrito. Valida propiedad del ítem antes de eliminar.

---

### `POST /api/v1/buyer/checkout`
**El endpoint más importante del flujo de compra.** Convierte el carrito en una orden y genera una sesión de pago. Proceso interno:

1. Valida que el carrito no esté vacío y que la dirección de envío pertenezca al comprador.
2. Agrupa los ítems por vendedor (`groupItemsBySeller`).
3. Calcula el costo de envío por grupo (`getShippingQuoteForSeller`).
4. Crea la `Order` con estado `PENDING_PAYMENT`.
5. Crea los `OrderSellerGroup` (uno por vendedor).
6. Crea los `OrderItem` asociados a cada grupo.
7. Registra el evento inicial en `OrderStatusHistory`.
8. Vacía el carrito y lo marca como `CONVERTED`.
9. Llama a `createPaymentSession` y guarda el `paymentId`.
10. Retorna `{ paymentUrl, orderId }`.

Campos requeridos: `shippingAddressId`, `returnUrl` (URL válida). Opcional: `notes`.

---

### `GET /api/v1/buyer/favorites`
Lista todos los productos favoritos del comprador, ordenados por fecha de agregado descendente.

### `POST /api/v1/buyer/favorites`
Agrega un producto a favoritos. Usa `upsert`, por lo que no falla si ya existe. Campo requerido: `productId`.

### `DELETE /api/v1/buyer/favorites/[favoriteId]`
Elimina un favorito por su ID. Retorna 404 si no existe o no pertenece al comprador.

---

### `GET /api/v1/buyer/orders`
Lista todas las órdenes del comprador autenticado, ordenadas por fecha descendente. Incluye los `items` y `sellerGroups` de cada orden.

### `GET /api/v1/buyer/orders/[orderId]`
Devuelve el detalle completo de una orden específica. Incluye: `items`, `sellerGroups` (con sus `orderItems`), e historial de estados (`statusHistory`) ordenado cronológicamente. Retorna 404 si la orden no existe o no pertenece al comprador.

### `POST /api/v1/buyer/orders/[orderId]/cancel`
Cancela una orden. Solo permite cancelar órdenes en estado `PENDING_PAYMENT`, `PAID` o `PAYMENT_FAILED`. Si el estado no es cancellable, retorna `409 Conflict`. Al cancelar, registra el cambio en `OrderStatusHistory` con `source: "buyer"`.

---

## `/api/v1/orders` — Endpoints inter-servicios

Estos endpoints **no usan autenticación de Clerk**. Se protegen con un `X-Service-Token` validado contra una variable de entorno específica.

### `PATCH /api/v1/orders/[orderId]`
**Llamado por el Payments App** cuando el estado de un pago cambia. Variable de entorno requerida: `PAYMENTS_TO_BUYER_SERVICE_TOKEN`.

Mapeo de estados de pago a estados de orden:

| Estado pago recibido | Estado orden resultante |
|---|---|
| `paid` | `PAID` |
| `payment_failed` | `PAYMENT_FAILED` |
| `cancelled` | `CANCELLED` |
| `refunded` | `REFUNDED` |

También puede actualizar el `paymentId` si se incluye `payment_id` en el body. Registra el cambio en `OrderStatusHistory` con `source: "payments"`.

### `PATCH /api/v1/orders/[orderId]/seller-groups/[groupId]/shipping`
**Llamado por el Shipping App** cuando el estado de envío de un grupo de vendedor cambia. Variable de entorno requerida: `SHIPPING_TO_BUYER_SERVICE_TOKEN`.

Actualiza el `status` y opcionalmente el `shippingStatus`, `shipmentId` del grupo. Además, actualiza el estado global de la orden según el progreso:

- Si el grupo pasa a `in_transit` → la orden pasa a `SHIPPED`.
- Si el grupo pasa a `delivered` y **todos** los grupos están entregados → la orden pasa a `DELIVERED`.
- Si el grupo pasa a `delivered` pero hay grupos pendientes → la orden pasa a `PARTIALLY_SHIPPED`.

---

## `/api/admin` — Endpoints de administración

Todos requieren rol de administrador verificado por `requireAdminApi()`.

### `GET /api/admin/buyers`
Lista todos los compradores registrados con su último pedido y el conteo total de órdenes.

### `GET /api/admin/carts`
Lista todos los carritos con su estado, comprador asociado, ítems y total estimado calculado en tiempo real.

### `GET /api/admin/orders`
Lista todas las órdenes. Acepta query param `?status=` para filtrar por estado (ej. `PAID`, `PENDING_PAYMENT`, etc.).

### `GET /api/admin/orders/[orderId]`
Detalle completo de una orden: comprador, grupos de vendedor con sus ítems, e historial de estados.

### `GET /api/admin/stats`
Dashboard de métricas generales del sistema:
- `totalBuyers`: total de compradores registrados.
- `ordersByStatus`: conteo de órdenes agrupado por estado.
- `cartsByStatus`: conteo de carritos agrupado por estado.
- `revenueCents`: ingresos totales de órdenes en estados `PAID`, `COMPLETED`, `SHIPPED`, `DELIVERED` o `PARTIALLY_SHIPPED`.
- `ordersLast24h`: órdenes creadas en las últimas 24 horas.

---

## Autenticación — Resumen

| Ruta | Método de auth |
|---|---|
| `/api/health` | Ninguna |
| `/api/products` | Ninguna |
| `/api/docs` | Ninguna |
| `/api/v1/buyer/**` | Clerk JWT (`auth()`) |
| `/api/v1/orders/**` | Service Token (`X-Service-Token`) |
| `/api/admin/**` | Rol de admin (`requireAdminApi()`) |
