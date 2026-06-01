# Estructura del proyecto

```
src/
├── app/
│   ├── layout.tsx                          # Layout raíz (Clerk + QueryProvider)
│   ├── page.tsx                            # Home
│   ├── error.tsx                           # Página de error global
│   ├── not-found.tsx                       # Página 404
│   ├── (auth)/                             # Grupo de rutas protegidas (requieren login)
│   │   ├── layout.tsx
│   │   ├── cart/page.tsx
│   │   ├── checkout/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── favorites/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── orders/[orderId]/page.tsx
│   │   └── profile/page.tsx
│   ├── admin/                              # Panel de administración (requiere rol admin)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── buyers/page.tsx
│   │   ├── carts/page.tsx
│   │   └── orders/
│   │       ├── page.tsx
│   │       └── [orderId]/page.tsx
│   ├── shop/
│   │   ├── page.tsx                        # Catálogo
│   │   └── [productId]/page.tsx            # Detalle de producto
│   ├── sign-in/[[...sign-in]]/page.tsx
│   ├── sign-up/[[...sign-up]]/page.tsx
│   ├── api-docs/page.tsx                   # Documentación OpenAPI interactiva
│   └── api/
│       ├── health/route.ts                 # Health check
│       ├── docs/route.ts                   # Spec OpenAPI JSON
│       ├── products/route.ts               # Proxy al Seller App
│       ├── products/[productId]/route.ts
│       ├── admin/                          # Endpoints del panel admin
│       │   ├── stats/route.ts
│       │   ├── buyers/route.ts
│       │   ├── carts/route.ts
│       │   └── orders/
│       │       ├── route.ts
│       │       └── [orderId]/
│       │           ├── route.ts
│       │           └── seller-groups/[groupId]/route.ts
│       └── v1/
│           ├── buyer/                      # Endpoints para la UI (Clerk JWT)
│           │   ├── profile/route.ts
│           │   ├── addresses/route.ts
│           │   ├── addresses/[addressId]/route.ts
│           │   ├── cart/route.ts
│           │   ├── cart/[itemId]/route.ts
│           │   ├── favorites/route.ts
│           │   ├── favorites/[favoriteId]/route.ts
│           │   ├── orders/route.ts
│           │   ├── orders/[orderId]/route.ts
│           │   ├── orders/[orderId]/cancel/route.ts
│           │   └── checkout/route.ts
│           └── orders/                     # Endpoints para otras apps (X-Service-Token)
│               └── [orderId]/
│                   ├── route.ts                                    # ← Payments App
│                   └── seller-groups/[groupId]/
│                       ├── status/route.ts                         # ← Seller App
│                       └── shipping/route.ts                       # ← Shipping App
├── components/
│   ├── ui/                                 # shadcn/ui components
│   ├── admin/                              # Componentes del panel admin
│   │   ├── admin-header.tsx
│   │   ├── buyers-table.tsx
│   │   ├── carts-table.tsx
│   │   ├── order-detail-view.tsx
│   │   ├── orders-table.tsx
│   │   └── stats-overview.tsx
│   ├── buyer/                              # Componentes generales del comprador
│   │   ├── buyer-nav.tsx
│   │   └── order-summary.tsx
│   ├── cart/
│   │   ├── cart-item-row.tsx
│   │   └── cart-summary-panel.tsx
│   ├── checkout/
│   │   ├── address-selector.tsx
│   │   └── seller-group-preview.tsx
│   ├── dashboard/
│   │   ├── last-order-preview.tsx
│   │   ├── quick-actions.tsx
│   │   └── stat-cards.tsx
│   ├── favorites/
│   │   └── favorite-card.tsx
│   ├── header/
│   │   ├── Ruta.tsx
│   │   └── user-toggle.tsx
│   ├── layout/
│   │   ├── app-sidebar.tsx
│   │   ├── bottom-nav.tsx
│   │   └── mobile-header.tsx
│   ├── orders/
│   │   ├── order-card.tsx
│   │   ├── order-status-flow.tsx
│   │   ├── order-status-stepper.tsx
│   │   └── seller-group-section.tsx
│   ├── profile/
│   │   ├── address-list.tsx
│   │   └── profile-form.tsx
│   ├── shared/
│   │   ├── can.tsx
│   │   ├── empty-state.tsx
│   │   ├── pagination-controls.tsx
│   │   ├── price-display.tsx
│   │   ├── product-image.tsx
│   │   └── status-badge.tsx
│   └── shop/
│       ├── filter-panel.tsx
│       ├── product-card.tsx
│       ├── product-grid-skeleton.tsx
│       └── shop-header.tsx
├── hooks/
│   ├── querys/                             # Hooks de React Query por dominio
│   ├── use-buyer.ts
│   ├── use-dashboard.ts
│   ├── use-mobile.ts
│   ├── use-order-tabs.ts
│   ├── use-role.ts
│   └── use-shop-filters.ts
├── lib/
│   ├── prisma.ts                           # Cliente Prisma singleton
│   ├── axios.ts                            # Cliente Axios para llamadas desde la UI
│   ├── buyer-service.ts                    # Lógica de negocio del comprador
│   ├── service-client.ts                   # Factory de clientes HTTP server-to-server
│   ├── service-auth.ts                     # Validación de X-Service-Token
│   ├── admin-auth.ts                       # Validación de rol admin (Clerk metadata)
│   ├── seller-api.ts                       # Llamadas al Seller App
│   ├── shipping-api.ts                     # Llamadas al Shipping App
│   ├── payments-api.ts                     # Llamadas al Payments App
│   ├── categories.ts                       # Definición de categorías
│   ├── entity-ids.ts                       # Generación de IDs de entidades
│   └── openapi.ts                          # Especificación OpenAPI
├── services/
│   └── api/                                # Capa de servicios para llamadas desde la UI
│       ├── addresses.ts
│       ├── cart.ts
│       ├── checkout.ts
│       ├── favorites.ts
│       └── profile.ts
├── providers/
│   └── query-provider.tsx                  # TanStack Query provider
├── store/
│   └── use-cart-store.ts                   # Estado de UI del checkout (Zustand)
└── types/
    ├── buyer.ts                            # Tipos del dominio Buyer App
    ├── api.ts                              # Tipos genéricos de respuesta API
    └── inter-service.ts                    # Tipos de contratos con otras apps

prisma/
├── schema.prisma                           # Modelos de base de datos
├── seed.ts                                 # Script de datos de prueba
└── migrations/                             # Historial de migraciones

documentacion/                              # Arquitectura general del sistema (compartida con el equipo)
documentacion-buyer/                        # Documentación específica de esta app
referencias/                                # Guías paso a paso para principiantes (14 archivos)
```
