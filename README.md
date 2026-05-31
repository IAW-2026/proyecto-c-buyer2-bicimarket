[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/Tl5PKMoG)
# buyer

Aplicación **Buyer** del [Proyecto IAW 2026](https://iaw-2026.github.io/proyecto/) — comisión `BiciMarket`.

Esta app corresponde al rol del comprador en los proyectos de tipo **C (Marketplace)**.

---

Enunciado completo: <https://iaw-2026.github.io/proyecto/>

# BiciMarket — Buyer App

App del comprador del marketplace BiciMarket. Permite a los usuarios navegar el catálogo, gestionar su carrito, hacer checkout y ver el historial de pedidos.

Esta app es una de cuatro apps independientes del sistema. Cada app tiene su propia base de datos y su propio Clerk.

| App | Responsable | Puerto dev |
|-----|-------------|------------|
| **Buyer App** (este repo) | Camila Rojas | 3000 |
| Seller App | Pierino Spina | 3001 |
| Shipping App | Enrique Seitz | 3002 |
| Payments App | Rocco Paoloni | 3003 |

---

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
# Copiar los valores del grupo y pegarlos en .env.local
cp .env .env.local

# 3. Generar el cliente de Prisma
npx prisma generate

# 4. Crear las tablas en la base de datos
npx prisma db push

# 5. Iniciar el servidor de desarrollo
npm run dev
```

> **Nota:** cada vez que cambiás `prisma/schema.prisma` tenés que correr `npx prisma generate` y luego `npx prisma db push`.

---

## Estructura del proyecto

```
src/
├── app/                        # App Router — páginas y rutas API
│   ├── layout.tsx              # Layout raíz (Clerk + QueryProvider)
│   ├── page.tsx                # Home
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
└── migrations/                 # Historial de migraciones

referencias/                    # Documentación para beginners (14 archivos)
documentacion/                  # Documentación general del sistema (compartida con el equipo)
```

---

## Rutas de la app

| Ruta | Descripción |
|------|-------------|
| `/` | Home público |
| `/dashboard` | Dashboard del comprador (requiere login) |
| `/shop` | Catálogo de productos |
| `/cart` | Carrito de compras |
| `/checkout` | Proceso de pago |
| `/orders` | Historial de pedidos |
| `/profile` | Perfil y direcciones de envío |

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

## Stack tecnológico

| Tecnología | Uso |
|-----------|-----|
| Next.js 16 (App Router) | Framework principal |
| TypeScript | Tipado estático |
| Tailwind CSS + shadcn/ui | Estilos y componentes |
| Clerk | Autenticación |
| PostgreSQL + Prisma | Base de datos y ORM |
| Zustand | Estado de UI |
| TanStack Query + Axios | Data fetching y cache |
| React Hook Form + Zod | Formularios y validación |

---

## Comandos útiles

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

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

