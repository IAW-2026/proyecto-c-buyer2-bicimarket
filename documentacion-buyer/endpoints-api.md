# Endpoints API — Buyer App

## Endpoints para la UI (autenticación con Clerk JWT)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/buyer/profile` | Obtiene o crea el perfil del comprador |
| PATCH | `/api/v1/buyer/profile` | Actualiza datos del perfil |
| GET | `/api/v1/buyer/addresses` | Lista las direcciones guardadas |
| POST | `/api/v1/buyer/addresses` | Agrega una dirección |
| PATCH | `/api/v1/buyer/addresses/[addressId]` | Edita una dirección |
| DELETE | `/api/v1/buyer/addresses/[addressId]` | Elimina una dirección |
| GET | `/api/v1/buyer/cart` | Obtiene el carrito activo con totales |
| POST | `/api/v1/buyer/cart` | Agrega un ítem al carrito |
| PATCH | `/api/v1/buyer/cart/[itemId]` | Actualiza cantidad de un ítem |
| DELETE | `/api/v1/buyer/cart/[itemId]` | Elimina un ítem del carrito |
| GET | `/api/v1/buyer/favorites` | Lista favoritos |
| POST | `/api/v1/buyer/favorites` | Agrega un favorito |
| DELETE | `/api/v1/buyer/favorites/[favoriteId]` | Elimina un favorito |
| GET | `/api/v1/buyer/orders` | Lista órdenes del comprador |
| GET | `/api/v1/buyer/orders/[orderId]` | Detalle de una orden |
| POST | `/api/v1/buyer/orders/[orderId]/cancel` | Cancela una orden (solo si está en `pending_payment`) |
| POST | `/api/v1/buyer/checkout` | Convierte el carrito en orden |

## Endpoints para otras apps (autenticación con X-Service-Token)

| Método | Ruta | Llamado por |
|--------|------|-------------|
| PATCH | `/api/v1/orders/[orderId]` | Payments App — actualiza estado de pago |
| PATCH | `/api/v1/orders/[orderId]/seller-groups/[groupId]/status` | Seller App — acepta/prepara la orden |
| PATCH | `/api/v1/orders/[orderId]/seller-groups/[groupId]/shipping` | Shipping App — actualiza estado de envío |

## Endpoints de administración (autenticación con Clerk JWT + rol admin)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/stats` | Estadísticas generales |
| GET | `/api/admin/buyers` | Lista todos los compradores |
| GET | `/api/admin/carts` | Lista todos los carritos activos |
| GET | `/api/admin/orders` | Lista todas las órdenes (con filtros) |
| GET | `/api/admin/orders/[orderId]` | Detalle de una orden |
| PATCH | `/api/admin/orders/[orderId]/seller-groups/[groupId]` | Modifica un seller group |
