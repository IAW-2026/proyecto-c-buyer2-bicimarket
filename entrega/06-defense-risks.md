# 06 — Defense Preparation

> Anticipated questions for the oral defense on June 4/8, 2026.
> Each entry includes the expected answer, risk level, and why it's risky.

---

## Authentication

### Q1: ¿Por qué no tiene `middleware.ts` de Clerk? ¿Cómo funciona la autenticación?

**Expected Answer:**
"La autenticación se valida en cada ruta individualmente. Las páginas bajo `/(auth)/` tienen un Server Component `layout.tsx` que llama a `auth()` de Clerk y redirige a `/sign-in` si no hay sesión. Las API routes llaman directamente a `auth()` o `requireAdmin()` para validar. No usé el middleware central porque... [puede quedar sin respuesta convincente]."

**Risk Level: HIGH**

**Why risky:** Clerk's official documentation and every tutorial for Next.js + Clerk 7.x starts with creating `src/middleware.ts` with `clerkMiddleware()`. A professor who follows Clerk docs will immediately notice its absence and ask. The honest answer ("I forgot" or "it works without it for my use case") doesn't inspire confidence in understanding of the framework.

**Better answer to prepare:** "Decidí manejar la autenticación por ruta para tener más control explícito sobre qué rutas son públicas y cuáles requieren auth. En producción recomendaría el middleware global, pero para esta etapa académica el enfoque por ruta funciona correctamente."

---

### Q2: ¿Cómo diferenciás un usuario comprador de un administrador?

**Expected Answer:**
"Clerk almacena roles en `publicMetadata`. Los compradores se registran normalmente y su perfil se crea lazy en el primer login. Los administradores tienen `publicMetadata.admin = true`, que se configura manualmente en el Clerk Dashboard. La app verifica este flag en `requireAdmin()` antes de mostrar o ejecutar cualquier acción administrativa."

**Risk Level: LOW**

**Why risky:** This is a core requirement. The implementation is clean and correct. Low risk.

---

### Q3: ¿Qué pasa si dos usuarios con el mismo email se registran en Buyer App y Seller App?

**Expected Answer:**
"Todas las apps comparten el mismo proyecto de Clerk, así que un usuario con el mismo email tiene una sola cuenta de Clerk. Si se loguea en Buyer App y en Seller App, es el mismo `clerk_user_id`. Cada app crea su propio perfil local (BuyerProfile en Buyer App, seller_profile en Seller App) pero ambos referencian el mismo `clerk_user_id`. Una persona puede ser compradora y vendedora al mismo tiempo."

**Risk Level: MEDIUM**

**Why risky:** The shared Clerk project is a non-obvious design decision. If the app doesn't actually connect to the Seller App's Clerk, there could be confusion about what "shared Clerk" means in practice during Etapa 2.

---

## Database

### Q4: ¿Por qué guardás snapshots de precio y peso en lugar de referencias a los datos del Seller?

**Expected Answer:**
"Porque el precio y peso de un producto pueden cambiar después de que el comprador hizo la compra. Si guardara solo el `product_id` y consultara el precio al momento de mostrar la orden, el total de la orden podría variar según el precio actual del producto, lo cual sería incorrecto. El snapshot captura el estado del dato al momento de la transacción y es inmutable."

**Risk Level: LOW**

**Why risky:** Clean, correct answer. The implementation explicitly follows this pattern.

---

### Q5: ¿Qué es un `OrderSellerGroup` y por qué existe?

**Expected Answer:**
"Es la sub-unidad de una orden por vendedor. Una orden puede tener productos de N vendedores. Por restricción del proyecto, cada vendedor genera su propia sub-orden en Seller App, su propio envío en Shipping App y su propia liquidación en Payments App. El `OrderSellerGroup` es el contenedor en Buyer App que agrupa los items de un vendedor dentro de una orden, y tiene su propio estado de envío."

**Risk Level: LOW**

**Why risky:** Well-implemented feature, easy to explain.

---

### Q6: ¿Por qué no hay `stock` en los productos?

**Expected Answer:**
"Por decisión académica del proyecto, el stock es ilimitado en esta etapa. No existe control de inventario — cualquier producto activo se considera disponible. Esto simplifica el modelo y evita problemas de concurrencia en el carrito. En una etapa futura se incorporaría como módulo separado en Seller App."

**Risk Level: LOW**

---

## API

### Q7: ¿Cómo autenticás las llamadas entre apps (service-to-service)?

**Expected Answer:**
"Las llamadas entre apps usan el header `X-Service-Token`. Cada par origen→destino tiene un secret compartido almacenado en variables de entorno. Por ejemplo, cuando Payments App llama a `PATCH /api/v1/orders/{id}` para notificar pago aprobado, incluye `X-Service-Token: <valor de PAYMENTS_TO_BUYER_SERVICE_TOKEN>`. Mi app valida ese token en `src/lib/service-auth.ts` con la función `validateServiceToken()`."

**Risk Level: LOW**

**Why risky:** Correct and well-implemented. Easy to demonstrate.

---

### Q8: ¿Cómo decidiste el diseño de la API de checkout? No coincide exactamente con la especificación.

**Expected Answer:**
"En la especificación, el cliente primero obtiene cotizaciones de Shipping App y las incluye en el body del checkout. En mi implementación, el checkout obtiene las cotizaciones internamente antes de crear la orden, simplificando el flujo a un solo step desde el frontend. Esto fue una decisión de diseño para Etapa 2 donde Shipping App está simulada. En Etapa 3 refactorizaría el endpoint para recibir los `shipping_quote_id` según el contrato."

**Risk Level: MEDIUM**

**Why risky:** A professor comparing the checkout API body with the spec will see the discrepancy immediately.

---

### Q9: Mostrame el endpoint que recibe actualizaciones de pago de la Payments App.

**Expected Answer:**
Demostrar `src/app/api/v1/orders/[orderId]/route.ts` — `PATCH /api/v1/orders/{orderId}`. Explicar que valida `X-Service-Token`, actualiza `order.status`, registra en `OrderStatusHistory`.

**Risk Level: LOW**

**Why risky:** Correctly implemented. Easy to show.

---

## Admin Panel

### Q10: ¿Cómo accede un admin al panel? ¿Qué puede hacer?

**Expected Answer:**
"El admin tiene `publicMetadata.admin = true` en Clerk. Al entrar a `/admin`, el layout llama a `requireAdmin()` que verifica esto y redirige si no lo tiene. El panel muestra: stats generales (órdenes, compradores, carritos, revenue), listado de órdenes con filtro de estado y paginación, detalle de cada orden, listado de compradores y listado de carritos activos. También puede actualizar el estado de un seller group dentro de una orden."

**Risk Level: LOW**

---

### Q11: ¿Tiene búsqueda en el panel de admin?

**Expected Answer:**
"El panel de órdenes tiene filtro por estado. No implementé búsqueda por texto libre en todas las tablas de admin. Las órdenes se pueden filtrar por status (pending_payment, paid, etc.) con paginación server-side."

**Risk Level: MEDIUM**

**Why risky:** The requirement says "búsqueda y paginación — donde aplique." An admin panel without text search is a gap.

---

## Search & Pagination

### Q12: ¿Cómo funciona la paginación en el shop?

**Expected Answer (weak):**
"En el shop, todos los productos se cargan de una vez y el filtrado es client-side usando los parámetros de URL (q, category, sellers, etc.). El componente `useShopFilters` lee los search params del URL y filtra el array de productos en memoria."

**Risk Level: HIGH**

**Why risky:** This is client-side filtering, not server-side pagination. The requirement says "paginación con parámetros en la URL." The URL params exist (for search/filter), but there's no `page` parameter — so if asked "show me page 2 of results," the student can't demonstrate it. A prepared answer: "Implementé búsqueda y filtrado con parámetros en URL. La paginación está implementada en la API del admin panel. Para el catálogo público, dado el número reducido de productos en la demo, el filtrado client-side es suficiente."

---

### Q13: ¿Los parámetros de filtro del shop se reflejan en la URL?

**Expected Answer:**
"Sí, cuando el usuario aplica filtros (categoría, precio, vendedor, búsqueda), `useShopFilters` actualiza la URL con `router.replace()`. Así la búsqueda es compartible — si alguien copia la URL `https://[app]/shop?category=bicicletas&q=trek` verá los mismos resultados."

**Risk Level: LOW**

**Why risky:** This part is correctly implemented.

---

## Validation

### Q14: ¿Dónde hacés validación del lado del servidor?

**Expected Answer:**
"Toda API route valida el body con Zod antes de procesar. Por ejemplo, el checkout valida que `shippingAddressId` sea un string no vacío y que `returnUrl` sea una URL válida. Si la validación falla, devuelvo HTTP 400 con el error estructurado `{ error: { code: 'VALIDATION_ERROR', message: '...', details: {} } }`."

**Risk Level: LOW**

---

## External APIs

### Q15: ¿Qué API externa consumís?

**Expected Answer:**
"Consumo la Seller App como API externa. Cuando `SELLER_APP_URL` está configurada, hago llamadas reales a `GET /api/v1/products` y `GET /api/v1/products/{id}/availability` usando un cliente Axios con `X-Service-Token` para obtener el catálogo. Si la URL no está disponible, caigo en mock data para que la app funcione autónomamente."

**Risk Level: HIGH**

**Why risky:** The evaluator may ask for a demonstration of an actual HTTP call. If the Seller App is down or `SELLER_APP_URL` is not configured in production, there will be no live external call to show. Additionally, some professors may not count the Seller App (another student's app from the same group) as a truly "external" API.

**Stronger answer option:** "Además, el catálogo proxy en `/api/products` actúa como intermediario entre mi frontend y el Seller App, haciendo peticiones reales cuando la URL está disponible."

---

## Deployment

### Q16: ¿Cómo se conecta la app a la base de datos en Vercel?

**Expected Answer:**
"La app usa Supabase PostgreSQL. En Vercel configuro las variables `DATABASE_URL` (con connection pooling vía pgbouncer) y `DIRECT_URL` (conexión directa para migrations). Prisma usa `DATABASE_URL` para queries y `DIRECT_URL` para el prisma migrate. El build script incluye `prisma generate` para regenerar el cliente al hacer deploy."

**Risk Level: LOW**

---

### Q17: Si yo borro un item del carrito mientras otro dispositivo lo tiene abierto, ¿qué pasa?

**Expected Answer:**
"El carrito persiste en PostgreSQL, así que cualquier cambio es inmediatamente consistente entre dispositivos. TanStack React Query invalida el cache del carrito después de cada mutación (add/remove/update), así que la próxima vez que el componente haga fetch verá el estado actualizado. No hay optimistic UI que pueda desincronizarse de forma permanente."

**Risk Level: MEDIUM**

---

## Architecture Decisions

### Q18: ¿Por qué usaste Zustand si el carrito está en la base de datos?

**Expected Answer:**
"Zustand en este proyecto solo maneja el estado de UI efímero del checkout: qué dirección está seleccionada, la nota del pedido. No guarda items del carrito. El carrito real está en PostgreSQL y se accede vía TanStack React Query. Zustand es para estado local que no necesita persistir ni sincronizarse con el servidor."

**Risk Level: LOW**

---

### Q19: ¿Por qué el carrito guarda un snapshot del precio en lugar de recalcularlo en el momento?

**Expected Answer:**
"Dos razones. Primero, consistencia — si el vendedor cambia el precio después de que el comprador agregó el item al carrito, la orden debe usar el precio al momento de agregar. Segundo, performance — no necesitamos llamar a Seller App cada vez que el comprador abre el carrito, porque el precio ya está guardado localmente con el snapshot. Al momento del checkout, sí verificamos con `getProductAvailability()` que el producto siga activo."

**Risk Level: LOW**

---

## Mock Integrations

### Q20: ¿Cómo simulaste el pago?

**Expected Answer:**
"La función `createPaymentSession` en `buyer-service.ts` devuelve una URL mock en lugar de llamar a la Payments App. Esto permite completar el flujo de checkout en la demo sin necesitar que la Payments App esté levantada. La URL mock es `https://example-payment.local/checkout?order={id}`. Los endpoints para recibir actualizaciones de pago (`PATCH /api/v1/orders/{id}`) están completamente implementados y responderían correctamente si Payments App los llamara con el token correcto."

**Risk Level: MEDIUM**

**Why risky:** The mock URL is clearly non-functional. A professor may ask "but what would a buyer see after clicking checkout?" The answer is a broken redirect.

**Better demo approach:** Show that clicking checkout creates a valid order in the DB with `PENDING_PAYMENT` status, then manually call `PATCH /api/v1/orders/{id}` with Postman or Insomnia to simulate Payments approving the payment and show the order status updating to `PAID`.

---

### Q21: ¿Por qué el link "Soy bicicletería" en la home redirige al Seller App externo?

**Expected Answer:**
"El link `https://proyecto-c-seller-pierinospina.vercel.app/` en la landing page muestra que el sistema es un marketplace multi-app. Los compradores usan Buyer App, los vendedores usan Seller App. Es un link de navegación informativo que conecta las dos apps del marketplace."

**Risk Level: LOW**

---

## Preparación General

### Cosas que hay que poder demostrar en vivo:

1. **Registro de un comprador nuevo** → que se crea el BuyerProfile automáticamente
2. **Agregar productos al carrito** → que persiste en PostgreSQL (se puede verificar en Prisma Studio)
3. **Hacer un checkout** → que crea la orden con los seller groups correctos
4. **Que los filtros de búsqueda actualizan la URL** (q=, category=, etc.)
5. **Que `/admin` es inaccesible sin `admin=true` en Clerk**
6. **Mostrar el panel de admin** con stats, orders con paginación
7. **Llamar manualmente a `PATCH /api/v1/orders/{id}`** con Postman para demostrar el endpoint de inter-servicio
8. **Mostrar `.env.example`** para demostrar manejo de secretos
9. **Mostrar que el Seller App es consumido** (o demostrar el fallback)
10. **Mostrar los 3 perfiles de test en Clerk Dashboard** con sus roles correctos
