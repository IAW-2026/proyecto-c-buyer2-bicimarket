# 10 — Glosario

Definiciones de todos los términos técnicos usados en el Buyer App y en el sistema BiciMarket.

---

## Términos de Next.js

**App Router**
La forma moderna de organizar rutas en Next.js (v13+). Las rutas se definen por la estructura de carpetas dentro de `src/app/`. El archivo `page.tsx` define una página y `route.ts` define un endpoint de API.

**Server Component**
Componente de React que se ejecuta en el servidor. Por defecto en el App Router. Puede acceder a la DB directamente con Prisma. No puede usar `useState`, `useEffect`, ni eventos del browser.

**Client Component**
Componente de React que se ejecuta en el browser. Requiere `"use client"` al inicio del archivo. Puede usar todos los hooks de React y manejar eventos de usuario.

**Route Handler**
Un archivo `route.ts` que define endpoints REST. Exporta funciones con los nombres de los métodos HTTP: `GET`, `POST`, `PATCH`, `DELETE`.

**Middleware**
Código que corre antes de que cualquier request llegue a las páginas o APIs. En este proyecto, el middleware (`src/middleware.ts`) verifica la autenticación con Clerk.

**Dynamic Route**
Ruta que tiene un parámetro variable. Se define con corchetes: `src/app/orders/[orderId]/page.tsx`. En Next.js 16, el parámetro se obtiene con `await context.params`.

**`use client`**
Directiva que se pone en la primera línea de un archivo para indicar que es un Client Component.

**`use server`**
Directiva para Server Actions, que son funciones de servidor que pueden ser llamadas desde el cliente.

**Hot Reload**
Recarga automática de la app cuando cambiás un archivo en desarrollo. No pierde el estado de la app.

---

## Términos de React

**Hook**
Función de React que empieza con `use`. Permite usar estado, efectos, y otras funcionalidades dentro de componentes funcionales. Ejemplos: `useState`, `useEffect`, `useQuery`.

**`useState`**
Hook para manejar estado local en un componente. El componente se re-renderiza cuando el estado cambia.

**`useEffect`**
Hook para ejecutar efectos secundarios (fetching, subscripciones) después de que el componente se monta o actualiza.

**Re-render**
Cuando React vuelve a ejecutar el componente para actualizar lo que se muestra. Ocurre cuando cambia el estado o las props.

**Props**
Parámetros que se pasan a un componente. Son read-only (no se modifican dentro del componente que los recibe).

---

## Términos de TypeScript

**Type**
Define la forma de un objeto en TypeScript. Ejemplo: `type BuyerProfile = { id: string; displayName: string; }`.

**Interface**
Similar a `type`, define la forma de un objeto. Más flexible para extender.

**Enum**
Define un conjunto de valores constantes nombrados. Ejemplo: `enum OrderStatus { PAID = "PAID", CANCELLED = "CANCELLED" }`.

**`Partial<T>`**
Utility type que hace todos los campos de un tipo opcionales. Útil para updates.

**`Omit<T, K>`**
Utility type que excluye ciertos campos de un tipo.

**`z.infer<typeof schema>`**
Genera un tipo TypeScript automáticamente a partir de un schema de Zod.

**Optional chaining (`?.`)**
Accede a propiedades de un objeto que puede ser null/undefined sin lanzar error. Ej: `cart?.items`.

**Nullish coalescing (`??`)**
Proporciona un valor por defecto cuando el valor es null o undefined. Ej: `name ?? "Sin nombre"`.

---

## Términos de React Query

**Query**
Una operación de lectura de datos. Se define con `useQuery` y tiene un estado: loading, success, error.

**queryKey**
Identificador único de un query en el cache. Puede ser un string o array. Permite invalidar y recargar datos relacionados.

**Mutation**
Una operación que modifica datos (crear, actualizar, eliminar). Se define con `useMutation`.

**Cache**
React Query guarda los resultados de los queries en memoria. Si otro componente pide los mismos datos, los recibe del cache sin hacer otro request.

**Stale**
Un dato en cache se considera "viejo" (stale) después de un tiempo. React Query lo recarga en background la próxima vez que se necesita.

**invalidateQueries**
Marca uno o más queries como inválidos y los recarga. Se usa después de mutaciones para mantener los datos actualizados.

---

## Términos de Prisma

**Schema**
El archivo `prisma/schema.prisma` que define los modelos (tablas) de la base de datos.

**Model**
Una tabla en la base de datos. Cada campo del modelo es una columna.

**Migration**
Un cambio al schema de la DB guardado como un archivo SQL. Permite evolucionar la estructura de la DB de forma controlada.

**`@id`**
Marca un campo como la clave primaria de la tabla.

**`@unique`**
Marca un campo como único (no pueden haber dos registros con el mismo valor).

**`@default(cuid())`**
Genera automáticamente un ID único con formato CUID cuando se crea un registro.

**`@default(now())`**
Guarda la fecha y hora actual automáticamente cuando se crea un registro.

**`@updatedAt`**
Actualiza el campo automáticamente con la fecha y hora actual cada vez que el registro se modifica.

**Relación**
Vínculo entre dos tablas. Ej: un `BuyerProfile` tiene muchos `Address` (relación 1-N).

**Include**
En Prisma, `include: { items: true }` hace un JOIN y trae los registros relacionados junto con el registro principal.

---

## Términos de Clerk

**JWT (JSON Web Token)**
Token firmado que contiene información del usuario. Clerk lo genera al iniciar sesión. El browser lo manda en cada request para autenticarse.

**`userId`**
El ID único del usuario en Clerk. Se obtiene con `auth()` en el servidor o `useAuth()` en el cliente.

**`auth()`**
Función de Clerk para obtener el userId en Server Components y API routes.

**`useUser()`**
Hook de Clerk para obtener los datos del usuario en Client Components.

**`ClerkProvider`**
Componente que envuelve toda la app y hace que Clerk esté disponible en todos los componentes.

---

## Términos del sistema BiciMarket

**Buyer App**
La aplicación del comprador. Responsable del carrito, órdenes, perfil y favoritos. Esta app.

**Seller App**
La aplicación del vendedor. Responsable del catálogo de productos y las sales_orders.

**Shipping App**
La aplicación de logística. Responsable de los envíos y tracking.

**Payments App**
La aplicación de pagos. Integra Mercado Pago para procesar pagos.

**Service Token (`X-Service-Token`)**
Token secreto compartido entre un par de apps para autenticar llamadas server-to-server. Diferente al JWT de Clerk.

**Snapshot**
Copia de datos de otra app guardada en nuestra DB. Ej: el `CartItem` guarda el precio del producto al momento de agregarlo al carrito. Si el vendedor cambia el precio después, el snapshot mantiene el precio original.

**Order**
Una compra del usuario. Puede contener productos de múltiples vendedores. El Buyer App es la fuente de verdad de las órdenes.

**OrderSellerGroup**
Subconjunto de una orden que agrupa los items de un mismo vendedor. Una orden con productos de 2 vendedores tiene 2 `OrderSellerGroup`.

**Sales Order**
La representación de una sub-orden en la Seller App. Creada por Payments App después de que el pago es aprobado.

**Shipment**
El envío de un paquete gestionado por la Shipping App. Uno por `OrderSellerGroup`.

**Idempotency Key**
Header enviado en POST requests para evitar duplicados. Si el mismo request se envía dos veces con la misma key, el servidor procesa el primero y retorna el mismo resultado en el segundo sin procesar de nuevo.

**BFF (Backend For Frontend)**
Patrón donde el Buyer App actúa como intermediario entre el browser del comprador y las otras apps. Las llamadas a Seller/Shipping/Payments se hacen desde el servidor del Buyer App, no desde el browser directamente.

**Lazy Provisioning**
Crear recursos solo cuando se necesitan por primera vez. En este proyecto, el `BuyerProfile` se crea en la DB la primera vez que el usuario hace un request autenticado, no al registrarse en Clerk.

**REST**
Estilo de arquitectura de APIs basado en HTTP. Usa los verbos `GET`, `POST`, `PATCH`, `DELETE` para describir la operación, y URLs para identificar los recursos.

**CUID**
"Collision-resistant Unique IDentifier". Formato de ID generado por Prisma con `@default(cuid())`. Ejemplo: `clx3abc123def456`.

**ORM (Object-Relational Mapper)**
Librería que permite interactuar con la base de datos usando código de alto nivel (TypeScript) en lugar de SQL directo. En este proyecto usamos Prisma.

**Mercado Pago**
La única pasarela de pago externa del sistema. Solo la Payments App se integra directamente con MP. El Buyer App nunca habla directamente con Mercado Pago.
