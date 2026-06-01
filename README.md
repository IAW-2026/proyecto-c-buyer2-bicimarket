[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/Tl5PKMoG)

# BiciMarket — Buyer App

Aplicación del **comprador** del marketplace BiciMarket. Permite navegar el catálogo, gestionar el carrito, hacer checkout y ver el historial de pedidos.

---

## 🚀 Deploy

- **URL**: https://proyecto-c-buyer2-bicimarket.vercel.app/
- **Admin**: email `admin@test.com` | contraseña `Admin1234!`
- **Comprador**: email `comprador@test.com` | contraseña `Comprador1234!`

> Para crear un admin nuevo: registrarse normalmente → ir al Clerk Dashboard → buscar el usuario → editar `publicMetadata` → agregar `{ "admin": true }`.

---

## Stack

Next.js 16 · PostgreSQL · Prisma · Clerk · Tailwind CSS · shadcn/ui · Zustand · TanStack Query

---

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env .env.local   # Completar con los valores del grupo

# 3. Generar el cliente de Prisma y crear las tablas
npx prisma generate
npx prisma db push

# 4. Poblar la base de datos con datos de prueba
npm run seed

# 5. Iniciar el servidor de desarrollo
npm run dev
```

> **Nota:** cada vez que cambiás `prisma/schema.prisma` tenés que correr `npx prisma generate` y luego `npx prisma db push`.

---

## Arquitectura

Esta app es una de cuatro apps independientes del sistema. Cada app tiene su propia base de datos; todas comparten el mismo proyecto de Clerk.

| App | Responsable | 
|-----|-------------|
| **Buyer App** | **Camila Rojas** | 
| Seller App | Pierino Spina | 
| Shipping App | Enrique Seitz | 
| Payments App | Rocco Paoloni | 

Ver `documentacion/` para la arquitectura completa del sistema.

---

## Estructura del proyecto

```
src/
├── app/                        # App Router — páginas y rutas API
│   ├── layout.tsx              # Layout raíz (Clerk + QueryProvider)
│   ├── page.tsx                # Home
│   ├── admin/                  # Panel de administración (protegido)
│   ├── dashboard/              # Dashboard del comprador (protegido)
│   ├── shop/                   # Catálogo de productos
│   ├── cart/                   # Carrito de compras
│   ├── checkout/               # Proceso de pago
│   ├── orders/                 # Historial de pedidos
│   ├── profile/                # Perfil y direcciones
│   ├── sign-in/                # Login (Clerk)
│   ├── sign-up/                # Registro (Clerk)
│   └── api/
│       └── v1/                 # Todos los endpoints viven bajo /api/v1/
│           ├── buyer/          # Endpoints que usa la UI del Buyer App
│           │   ├── profile/
│           │   ├── addresses/
│           │   ├── cart/
│           │   ├── favorites/
│           │   ├── orders/
│           │   └── checkout/
│           └── orders/         # Endpoints que llaman otras apps (X-Service-Token)
│               └── [orderId]/
│                   ├── route.ts                    # PATCH status (←Payments)
│                   └── seller-groups/
│                       └── [groupId]/
│                           └── shipping/
│                               └── route.ts        # PATCH shipping (←Shipping)
├── components/
│   ├── ui/                     # shadcn/ui components
│   └── buyer/                  # Componentes propios del Buyer App
├── hooks/
│   ├── use-buyer.ts            # Todos los hooks de React Query
│   └── use-mobile.ts
├── lib/
│   ├── prisma.ts               # Cliente Prisma singleton
│   ├── axios.ts                # Cliente Axios para llamadas desde la UI
│   ├── buyer-service.ts        # Lógica de negocio del comprador
│   ├── service-client.ts       # Factory de clientes HTTP server-to-server
│   ├── service-auth.ts         # Validación de X-Service-Token
│   ├── seller-api.ts           # Llamadas a Seller App
│   ├── shipping-api.ts         # Llamadas a Shipping App
│   └── payments-api.ts         # Llamadas a Payments App
├── providers/
│   └── query-provider.tsx      # TanStack Query provider
├── store/
│   └── use-cart-store.ts       # Estado de UI del carrito (Zustand)
└── types/
    ├── buyer.ts                # Tipos del dominio Buyer App
    ├── api.ts                  # Tipos genéricos de respuesta API
    └── inter-service.ts        # Tipos de contratos con otras apps

prisma/
├── schema.prisma               # Modelos de base de datos
├── seed.ts                     # Script de datos de prueba
└── migrations/                 # Historial de migraciones

referencias/                    # Documentación para beginners (14 archivos)
documentacion/                  # Documentación general del sistema (compartida con el equipo)
```

---

## Rutas de la app

| Ruta | Descripción |
|------|-------------|
| `/` | Home público |
| `/shop` | Catálogo de productos |
| `/dashboard` | Dashboard del comprador (requiere login) |
| `/cart` | Carrito de compras |
| `/checkout` | Proceso de pago |
| `/orders` | Historial de pedidos |
| `/profile` | Perfil y direcciones de envío |
| `/admin` | Panel de administración (requiere `publicMetadata.admin = true`) |

---

## APIs del Buyer App

### Endpoints para la UI (autenticación con Clerk JWT)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/buyer/profile` | Obtiene o crea el perfil del comprador |
| PATCH | `/api/v1/buyer/profile` | Actualiza datos del perfil |
| GET | `/api/v1/buyer/addresses` | Lista las direcciones guardadas |
| POST | `/api/v1/buyer/addresses` | Agrega una dirección |
| PATCH | `/api/v1/buyer/addresses/[id]` | Edita una dirección |
| DELETE | `/api/v1/buyer/addresses/[id]` | Elimina una dirección |
| GET | `/api/v1/buyer/cart` | Obtiene el carrito activo con totales |
| POST | `/api/v1/buyer/cart` | Agrega un ítem al carrito |
| PATCH | `/api/v1/buyer/cart/[id]` | Actualiza cantidad de un ítem |
| DELETE | `/api/v1/buyer/cart/[id]` | Elimina un ítem del carrito |
| GET | `/api/v1/buyer/favorites` | Lista favoritos |
| POST | `/api/v1/buyer/favorites` | Agrega un favorito |
| DELETE | `/api/v1/buyer/favorites/[id]` | Elimina un favorito |
| GET | `/api/v1/buyer/orders` | Lista órdenes del comprador |
| GET | `/api/v1/buyer/orders/[id]` | Detalle de una orden |
| POST | `/api/v1/buyer/checkout` | Convierte el carrito en orden |

### Endpoints para otras apps (autenticación con X-Service-Token)

| Método | Ruta | Llamado por |
|--------|------|-------------|
| PATCH | `/api/v1/orders/[id]` | Payments App (cambio de estado de pago) |
| PATCH | `/api/v1/orders/[id]/seller-groups/[gId]/shipping` | Shipping App (cambio de estado de envío) |

---

## Comandos útiles

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Seed
npm run seed

# Prisma
npx prisma generate        # Regenera el cliente (necesario después de cambiar schema.prisma)
npx prisma db push         # Aplica cambios del schema a la base de datos
npx prisma migrate dev     # Crea y aplica una migración con nombre
npx prisma studio          # UI para explorar la base de datos en el navegador

# Si el servidor no conecta a la DB
npx prisma generate && npm run dev
```

---

## Documentación

La carpeta `referencias/` tiene documentación paso a paso pensada para principiantes en Next.js:

| Archivo | Tema |
|---------|------|
| `01-introduccion-nextjs.md` | Qué es Next.js 16 y cómo funciona el App Router |
| `02-configuracion-proyecto.md` | Setup del proyecto, variables de entorno, Clerk, DB |
| `03-prisma-modelos-buyer.md` | Modelos de datos, queries Prisma, migraciones |
| `04-api-buyer.md` | Todos los endpoints con ejemplos de request/response |
| `05-frontend-buyer.md` | Páginas, componentes, formularios, shadcn/ui |
| `06-react-query-zustand.md` | React Query y Zustand explicados con ejemplos |
| `07-clerk-autenticacion.md` | Cómo funciona Clerk en este proyecto |
| `08-como-usar-la-app.md` | Tutorial de uso completo paso a paso |
| `09-debugging-nextjs.md` | Errores comunes y cómo resolverlos |
| `10-glosario.md` | Glosario de términos técnicos |
| `11-flujo-completo.md` | Traza completa del flujo de compra multi-vendedor |
| `12-inter-servicios.md` | Comunicación entre las 4 apps del sistema |
| `13-typescript-guia.md` | TypeScript en este proyecto |
| `14-agregar-funcionalidad.md` | Tutorial: agregar una nueva funcionalidad end-to-end |

La documentación general del sistema (arquitectura, contratos de API, modelos compartidos) está en `documentacion/`.
