# Rutas de la Buyer App

## Rutas públicas

| Ruta | Descripción |
|------|-------------|
| `/` | Home — catálogo destacado, categorías, hero section |
| `/shop` | Catálogo completo con filtros (categoría, precio, búsqueda) |
| `/shop/[productId]` | Detalle de producto |
| `/sign-in` | Login (Clerk) |
| `/sign-up` | Registro (Clerk) |
| `/api-docs` | Documentación OpenAPI interactiva |

## Rutas protegidas (requieren login)

| Ruta | Descripción |
|------|-------------|
| `/dashboard` | Dashboard del comprador — resumen de actividad |
| `/cart` | Carrito de compras |
| `/checkout` | Proceso de pago |
| `/orders` | Historial de pedidos |
| `/orders/[orderId]` | Detalle de una orden |
| `/favorites` | Lista de favoritos |
| `/profile` | Perfil y gestión de direcciones de envío |

## Rutas de administración (requieren `publicMetadata.admin = true` en Clerk)

| Ruta | Descripción |
|------|-------------|
| `/admin` | Dashboard admin — estadísticas generales |
| `/admin/buyers` | Listado de compradores registrados |
| `/admin/carts` | Listado de carritos activos |
| `/admin/orders` | Listado de órdenes con filtro por estado |
| `/admin/orders/[orderId]` | Detalle de orden con historial de estados |
