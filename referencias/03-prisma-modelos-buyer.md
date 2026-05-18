# 03 — Prisma y los modelos del Buyer App

Todo lo que necesitás saber sobre la base de datos del Buyer App: qué tablas hay, cómo consultarlas, y cómo modificar el schema.

---

## ¿Qué es un ORM? ¿Qué es Prisma?

Un **ORM** (Object-Relational Mapper) es una librería que te permite interactuar con la base de datos usando código JavaScript/TypeScript en lugar de escribir SQL directamente.

**Prisma** es el ORM que usamos. Con Prisma:

```ts
// Sin Prisma — tendrías que escribir SQL así:
const result = await db.query('SELECT * FROM "BuyerProfile" WHERE "userId" = $1', [userId]);

// Con Prisma — escribís TypeScript tipado:
const profile = await prisma.buyerProfile.findUnique({ where: { userId } });
```

La ventaja es que Prisma conoce la estructura de tu base de datos y te da autocompletado, detecta errores de tipo en tiempo de compilación, y genera el código SQL por vos.

---

## El archivo `prisma/schema.prisma`

Este archivo define toda la estructura de la base de datos. Tiene tres partes:

### 1. Generator (configuración de Prisma)
```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}
```
Le dice a Prisma dónde generar el cliente TypeScript.

### 2. Datasource (conexión a la base de datos)
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```
Lee las URLs de conexión desde las variables de entorno.

### 3. Modelos (las tablas)
Cada `model` es una tabla. Cada campo es una columna.

---

## Los modelos del Buyer App

### User
Sincronizado con Clerk. Cuando alguien se registra, Clerk crea este registro.

```prisma
model User {
  id           String        @id          // El userId de Clerk
  email        String        @unique
  firstName    String?                    // ? = opcional (nullable)
  lastName     String?
  imageUrl     String?
  role         Role          @default(USER)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt   // Se actualiza automáticamente
  buyerProfile BuyerProfile?             // Relación 1-a-1 con BuyerProfile
}
```

### BuyerProfile
El perfil del comprador. Uno por user.

```prisma
model BuyerProfile {
  id             String     @id @default(cuid())  // ID autogenerado
  userId         String     @unique               // FK al User
  displayName    String
  phone          String?
  documentNumber String?
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  // Relaciones
  user          User?       @relation(...)
  addresses     Address[]   // Una lista de direcciones
  cart          Cart?       // Un carrito (opcional)
  favoriteItems FavoriteItem[]
  orders        Order[]
}
```

### Address
Las direcciones de envío del comprador.

```prisma
model Address {
  id             String       @id @default(cuid())
  buyerProfileId String                            // FK a BuyerProfile
  label          String                            // Ej: "Casa", "Trabajo"
  street         String                            // Ej: "Av. Corrientes 1234"
  city           String
  state          String?
  zip            String
  country        String
  phone          String?
  isDefault      Boolean      @default(false)      // Si es la dirección predeterminada
  // ...
}
```

### Cart y CartItem
El carrito guarda snapshots de los productos al momento de agregarlos (precio, nombre, etc.), no referencias al producto original. Esto es importante porque si el vendedor cambia el precio, el carrito mantiene el precio al que el usuario lo agregó.

```prisma
model Cart {
  id             String       @id @default(cuid())
  buyerProfileId String       @unique   // Un solo carrito por perfil
  items          CartItem[]
}

model CartItem {
  id          String   @id @default(cuid())
  cartId      String                    // FK a Cart
  productId   String                    // ID del producto en Seller App
  title       String                    // Snapshot del nombre
  description String                    // Snapshot de la descripción
  unitPrice   Float                     // Snapshot del precio
  quantity    Int      @default(1)
  subtotal    Float                     // unitPrice * quantity
  sellerId    String                    // ID del vendedor en Seller App
  sellerName  String?                   // Snapshot del nombre del vendedor
  imageUrl    String?
}
```

### Order, OrderSellerGroup, OrderItem
Una orden puede tener productos de múltiples vendedores. Por eso existe `OrderSellerGroup` — uno por vendedor dentro de la orden.

```
Order (una por compra)
  └─ OrderSellerGroup (uno por vendedor)
       └─ OrderItem (uno por producto)
```

```prisma
model Order {
  id                String             @id @default(cuid())
  buyerProfileId    String
  orderNumber       String             @unique    // Ej: "ORD-1716823847291"
  status            OrderStatus        @default(PENDING_PAYMENT)
  totalAmount       Float
  shippingAmount    Float
  paymentId         String?                       // ID en Payments App
  shippingAddressId String?                       // ID de la dirección usada
  sellerGroups      OrderSellerGroup[]
  items             OrderItem[]
}
```

---

## Cómo hacer consultas con Prisma

Primero, importás el cliente Prisma:

```ts
import { prisma } from "@/lib/prisma";
```

### findUnique — buscar por ID o campo único

```ts
// Buscar por ID
const profile = await prisma.buyerProfile.findUnique({
  where: { id: "byp_abc123" },
});

// Buscar por campo único (userId es @unique en el schema)
const profile = await prisma.buyerProfile.findUnique({
  where: { userId: "user_clerk_abc" },
});

// Resultado: BuyerProfile | null
```

### findMany — buscar múltiples registros

```ts
// Todas las direcciones de un perfil
const addresses = await prisma.address.findMany({
  where: { buyerProfileId: profile.id },
});

// Con ordenamiento
const orders = await prisma.order.findMany({
  where: { buyerProfileId: profile.id },
  orderBy: { createdAt: "desc" },  // Más recientes primero
});

// Con paginación
const orders = await prisma.order.findMany({
  where: { buyerProfileId: profile.id },
  take: 10,    // Límite de resultados
  skip: 0,     // Offset (saltar N resultados)
});
```

### include — traer relaciones

```ts
// Traer el carrito junto con sus items
const cart = await prisma.cart.findUnique({
  where: { buyerProfileId: profile.id },
  include: {
    items: true,  // Incluir los CartItems relacionados
  },
});
// Ahora cart.items es un array de CartItem

// Relaciones anidadas
const order = await prisma.order.findUnique({
  where: { id: orderId },
  include: {
    items: true,
    sellerGroups: {
      include: {
        orderItems: true,  // OrderItems dentro de cada grupo
      },
    },
  },
});
```

### create — insertar un registro

```ts
const address = await prisma.address.create({
  data: {
    buyerProfileId: profile.id,
    label: "Casa",
    street: "Av. Corrientes 1234",
    city: "Buenos Aires",
    zip: "1043",
    country: "Argentina",
    isDefault: true,
  },
});
// Retorna el Address creado con su id generado
```

### update — actualizar un registro

```ts
const updated = await prisma.buyerProfile.update({
  where: { id: profile.id },
  data: {
    displayName: "Nuevo nombre",
    phone: "+54 11 1234-5678",
  },
});
```

### upsert — crear si no existe, actualizar si existe

```ts
// Usamos upsert para el carrito: si no tiene carrito, lo creamos
const cart = await prisma.cart.upsert({
  where: { buyerProfileId: profile.id },
  create: { buyerProfileId: profile.id },  // Crear con estos datos
  update: {},                               // Si ya existe, no cambiar nada
});
```

### delete — eliminar un registro

```ts
await prisma.address.delete({
  where: { id: addressId },
});
```

### deleteMany — eliminar múltiples registros

```ts
// Vaciar el carrito después del checkout
await prisma.cartItem.deleteMany({
  where: { cartId: cart.id },
});
```

### createMany — insertar múltiples registros

```ts
await prisma.orderItem.createMany({
  data: [
    { orderId: order.id, productId: "prd_1", title: "Bici", quantity: 1, unitPrice: 450000, subtotal: 450000, sellerId: "sel_1" },
    { orderId: order.id, productId: "prd_2", title: "Casco", quantity: 2, unitPrice: 35000, subtotal: 70000, sellerId: "sel_1" },
  ],
});
```

---

## Enums en el schema

Los enums definen los valores posibles para un campo. Por ejemplo:

```prisma
enum OrderStatus {
  PENDING_PAYMENT   // Esperando pago
  PAID              // Pagado
  PARTIALLY_SHIPPED // Algunos grupos ya salieron
  SHIPPED           // Todos los grupos salieron
  DELIVERED         // Entregado
  COMPLETED         // Completado
  CANCELLED         // Cancelado
  REFUNDED          // Reembolsado
}
```

En el código TypeScript, usás el enum así:

```ts
// Buscar órdenes pagadas
const paidOrders = await prisma.order.findMany({
  where: { status: "PAID" },
});

// O usando el enum importado del schema
import { OrderStatus } from "@/generated/prisma";
const paidOrders = await prisma.order.findMany({
  where: { status: OrderStatus.PAID },
});
```

---

## Migraciones: cómo cambiar el schema

Cuando necesitás cambiar algo en el schema (agregar un campo, una tabla, etc.):

### Opción 1: `prisma db push` (rápida, para desarrollo)

```bash
# 1. Editás schema.prisma
# 2. Aplicás los cambios
npx prisma db push

# 3. Regenerás el cliente
npx prisma generate
```

**Limitación**: no guarda historial de cambios. Si tenés datos en producción, puede ser riesgoso.

### Opción 2: `prisma migrate dev` (con historial)

```bash
# 1. Editás schema.prisma
# 2. Creás una migración con nombre descriptivo
npx prisma migrate dev --name add_phone_to_buyer_profile

# Esto:
# - Crea un archivo SQL en prisma/migrations/
# - Aplica la migración a tu DB
# - Regenera el cliente automáticamente
```

El archivo de migración queda en `prisma/migrations/` y se puede commitear al repositorio para que todos los miembros del equipo apliquen el mismo cambio.

---

## Ejemplo: agregar un nuevo campo al schema

Supongamos que querés guardar el número de documento del comprador. Ya existe el campo `documentNumber` en `BuyerProfile`, pero supongamos que querés agregar una fecha de nacimiento.

**Paso 1**: Editás `prisma/schema.prisma`:

```prisma
model BuyerProfile {
  // ...campos existentes...
  birthDate   DateTime?   // ← Nuevo campo (opcional)
}
```

**Paso 2**: Aplicás el cambio:

```bash
npx prisma db push
npx prisma generate
```

**Paso 3**: Ahora podés usar el campo en el código:

```ts
await prisma.buyerProfile.update({
  where: { id: profile.id },
  data: { birthDate: new Date("1995-03-15") },
});
```

---

## El cliente Prisma (`src/lib/prisma.ts`)

```ts
import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

**¿Por qué este patrón?** En desarrollo, Next.js recarga módulos constantemente (hot reload). Sin este patrón, crearías cientos de conexiones a la base de datos. La variable `globalForPrisma` asegura que solo exista una instancia de PrismaClient.

---

## Siguiente paso

→ [04-api-buyer.md](04-api-buyer.md) — cómo funcionan los endpoints REST del Buyer App.
