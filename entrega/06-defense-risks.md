# 06 — Defense Preparation (Oral Questions)

> Identifies the riskiest questions a professor could ask, with expected answers and mitigation notes.

---

## Authentication

### Q1: ¿Cómo funciona la autenticación entre las distintas apps del sistema?

**Expected Answer:** Todas las apps comparten el mismo proyecto de Clerk. Los JWTs se emiten desde ese proyecto compartido y cada app los valida contra el mismo `CLERK_SECRET_KEY`. La UI usa `Authorization: Bearer <JWT>`. Las llamadas servidor-a-servidor usan `X-Service-Token` — un secreto diferente por cada par (A→B). Buyer valida el token entrante comparando con la variable de entorno correspondiente.

**Risk Level: MEDIUM**

**Why it's risky:** Professor may ask why there's no `middleware.ts`. Answer: "La protección está en cada route handler y en los layouts, que redirigen si no hay userId. Un middleware.ts sería más robusto y está documentado como mejora."

---

### Q2: ¿Cómo se diferencia un admin de un comprador en esta app?

**Expected Answer:** El rol admin se determina por `publicMetadata.admin = true` en el JWT de Clerk. La función `requireAdmin()` en `lib/admin-auth.ts` extrae el usuario de Clerk, verifica ese flag y redirige si no está. Para APIs, `requireAdminApi()` devuelve 403 si falta el flag. Los compradores no necesitan un rol explícito — cualquier usuario autenticado puede acceder a las rutas buyer.

**Risk Level: LOW**

---

### Q3: ¿Por qué no validás el rol `buyer` en las rutas del comprador?

**Expected Answer:** "Es una simplificación académica. La documentación indica que debería validarse `publicMetadata.role = 'buyer'`. Lo que tenemos valida que el usuario está autenticado via Clerk, pero no filtra por rol. En producción agregaríamos la verificación de rol."

**Risk Level: MEDIUM**

**Why it's risky:** This is a known gap. Have the answer ready.

---

## Database

### Q4: ¿Por qué los IDs de tus recursos no tienen prefijo (`ord_`, `byp_`, etc.) como indica la documentación?

**Expected Answer:** "La documentación especifica prefijos estilo Stripe. En la implementación usamos CUID directo desde Prisma. Para agregar el prefijo necesitaríamos un helper que genere el ID en la capa de aplicación antes del insert. Es una deuda técnica conocida."

**Risk Level: LOW**

---

### Q5: ¿Cómo asegurás la consistencia de los datos entre apps si no usás foreign keys cruzadas?

**Expected Answer:** "Cada app es dueña de su dominio. Los IDs de otras apps se guardan como strings opacos. La consistencia se mantiene por el ciclo de vida del negocio: Buyer crea el `order_id`, las demás apps lo reciben y lo referencian. Si Buyer App no tiene un `order_id` y otra app lo referencia, esa otra app simplemente tiene un dato huérfano — lo cual puede pasar pero no rompe la base de datos local. Los snapshots (precio, dirección) se guardan al momento de la transacción y nunca se actualizan."

**Risk Level: LOW**

---

### Q6: ¿Qué pasa si se hace checkout dos veces en simultáneo (doble clic)?

**Expected Answer:** Honestamente, "No implementamos Idempotency-Key en el checkout. La documentación lo requiere. Con doble clic rápido podría crearse dos órdenes. La solución es leer el header `Idempotency-Key`, guardarlo junto con la orden, y devolver la orden existente si se recibe el mismo key en un segundo request."

**Risk Level: HIGH**

**Why it's risky:** This is a real race condition and a documented requirement that's missing.

---

## API

### Q7: ¿Cómo funciona el checkout end-to-end?

**Expected Answer (CAREFUL — the real implementation is broken):**

El flujo documentado es: carrito → dirección → cotización de envío → llamar a Payments → recibir `checkout_url` → redirigir al comprador.

Lo que está implementado: el checkout llama a `getShippingQuotes` para calcular el costo de envío, crea la orden en la DB con estado `PENDING_PAYMENT`, y luego llama a `createPaymentSession` en `buyer-service.ts` que **devuelve un mock hardcodeado** en lugar de llamar a la Payments App real.

Si el profesor pregunta "¿a qué URL redirige?", la respuesta honesta es: "Hay un bug en la integración — el checkout llama a una función mock en lugar de llamar a `payments-api.ts::createPayment`. Detectamos esto en la auditoría y está identificado como la corrección más urgente."

**Risk Level: CRITICAL**

**Why it's risky:** End-to-end checkout will visibly fail. Have the bug identified and the fix ready to show.

---

### Q8: ¿Cómo se actualiza el estado de una orden cuando Payments aprueba el pago?

**Expected Answer:** "Payments App llama `PATCH /api/v1/orders/{orderId}` con `X-Service-Token`. El endpoint valida el token contra `PAYMENTS_TO_BUYER_SERVICE_TOKEN`, verifica que la orden existe, y actualiza su status en la DB. También escribe en `OrderStatusHistory` con `source: 'payments'`."

**Risk Level: MEDIUM**

**Why it's risky:** The token is currently commented out in `.env`, so this endpoint would return 500. Have the answer ready: "En producción configuramos el token coordinando con el equipo de Payments."

---

### Q9: ¿Cómo implementaste la paginación en el catálogo?

**Expected Answer (CAREFUL — it's client-side):** "La paginación de órdenes y direcciones está implementada server-side en las APIs con `page` y `limit` query params. Para el catálogo de productos, la paginación es actualmente client-side — cargamos todos los productos y filtramos en el browser. Esto funciona con el mock de 12 productos pero sería un problema con un catálogo real. La mejora pendiente es pasar los parámetros de filtro al proxy y que Seller App haga la paginación server-side."

**Risk Level: MEDIUM**

---

### Q10: ¿Por qué el POST al carrito recibe el precio del producto desde el cliente?

**Expected Answer (CAREFUL — this is a security issue):** "Actualmente el endpoint `/api/v1/buyer/cart` acepta `unitPriceCents` desde el cliente para simplificar el desarrollo sin depender de Seller App siempre disponible. El problema es que esto permite que un cliente malicioso manipule el precio. Lo correcto según el spec es que el server llame a `GET /api/v1/products/{id}/availability` en Seller App para resolver el precio. Tenemos la función `getProductAvailability` en `seller-api.ts` pero no está conectada al endpoint del carrito."

**Risk Level: HIGH**

**Why it's risky:** This is a clear security vulnerability and spec deviation. The professor will likely identify this.

---

## Admin Panel

### Q11: ¿Qué puede hacer un admin en esta app?

**Expected Answer:** "El admin puede ver estadísticas de la plataforma (total de compradores, órdenes por estado, ingresos, órdenes últimas 24h), listar todas las órdenes con detalle de seller groups, ver los perfiles de compradores y los carritos activos. El acceso está protegido por `publicMetadata.admin = true` en el JWT de Clerk."

**Risk Level: LOW**

---

### Q12: ¿Cómo se crea un admin?

**Expected Answer:** "No hay self-service. Un admin existente va al Clerk Dashboard, busca el usuario, edita `publicMetadata` y agrega `{ admin: true }`. Así funciona en producción — sin UI de promoción de usuarios."

**Risk Level: LOW**

---

## Search

### Q13: ¿Cómo funciona el buscador de productos?

**Expected Answer:** "El filtrado es client-side. El hook `useShopFilters` toma la lista completa de productos y la filtra en memoria por texto, categoría, rango de precio y vendedor. Para una demo con 12 productos mock esto funciona bien. En producción con un catálogo grande necesitaríamos pasar los filtros a Seller App y paginar server-side."

**Risk Level: MEDIUM**

---

## Validation

### Q14: ¿Cómo validás los datos de entrada en tus APIs?

**Expected Answer:** "Usamos Zod para validar todos los request bodies. Cada route handler tiene un schema Zod con `safeParse`. Si falla la validación devolvemos HTTP 400 con el código `VALIDATION_ERROR` y los mensajes de error de Zod. La validación corre en el servidor antes de cualquier operación en base de datos."

**Risk Level: LOW**

---

## External APIs

### Q15: ¿Qué pasa si Seller App está caída cuando un comprador intenta agregar al carrito?

**Expected Answer:** "Actualmente el carrito no llama a Seller App — recibe los datos del producto desde el cliente (que los tiene del catálogo). Si el catálogo no cargó porque Seller App estuvo caída, el comprador no pudo ver los productos. Si Seller App se cae después de que el catálogo cargó, el comprador puede seguir agregando al carrito porque los datos ya están en el browser."

**Risk Level: MEDIUM**

**Why it's risky:** The real answer reveals that availability isn't checked server-side.

---

### Q16: ¿Implementaste retry en las llamadas inter-app?

**Expected Answer:** "No. La documentación lo requiere (3 reintentos con backoff 1s/3s/9s). Tenemos el mecanismo de mock fallback para cuando una app no está disponible, pero no hay retry automático. En una implementación de producción usaríamos una biblioteca de retry como `axios-retry`."

**Risk Level: LOW** (known gap, simple to explain)

---

## Deployment

### Q17: ¿Cómo desplegaste la app?

**Expected Answer:** "La app está en Vercel en `https://proyecto-c-buyer2-bicimarket.vercel.app/`. El build corre `prisma generate && next build`. La base de datos está en Supabase con connection pooling via pgBouncer para el entorno serverless. Las variables de entorno están configuradas en Vercel."

**Risk Level: LOW**

---

### Q18: ¿Qué harías diferente en producción respecto a lo que entregás?

**Expected Answer:** "Agregaría: middleware.ts para protección en el edge, retry logic en llamadas inter-app, paginación server-side en el catálogo, Idempotency-Key en checkout, precio resuelto server-side en el carrito, X-Request-Id para trazabilidad, y tests de integración. También sacaría el stub de `createPaymentSession` y conectaría el checkout real a Payments App."

**Risk Level: LOW** (shows awareness)

---

## Architecture Decisions

### Q19: ¿Por qué todas las apps comparten un solo proyecto de Clerk?

**Expected Answer:** "Fue una decisión de diseño del equipo para que un usuario pueda tener roles en múltiples apps con una sola cuenta. Si fueran proyectos de Clerk separados, un comprador que también vende necesitaría dos cuentas. Al compartir el proyecto, el `clerk_user_id` es el mismo en todas las apps y el rol se determina por `publicMetadata`."

**Risk Level: LOW**

---

### Q20: ¿Por qué usaste snapshots en lugar de FKs cruzadas?

**Expected Answer:** "Porque las apps son independientes y tienen bases de datos separadas. No podemos tener FKs cruzando límites de DB. Los snapshots garantizan que la información histórica (precio al momento de la compra, dirección de envío) no cambie aunque el dato original se modifique. Por ejemplo, si un vendedor cambia el precio después de que yo ya hice una orden, mi orden sigue mostrando el precio original."

**Risk Level: LOW**

---

## Mock Integrations

### Q21: ¿Cómo funciona el mock de Seller App?

**Expected Answer:** "En `seller-api.ts`, si `SELLER_APP_URL` o `BUYER_TO_SELLER_SERVICE_TOKEN` no están configurados, devolvemos un array hardcodeado de 12 productos. Esto permite desarrollar sin necesitar que Seller App esté corriendo. Cuando ambas variables están configuradas, hacemos el `GET /api/v1/products` real al Seller App."

**Risk Level: LOW**

---

### Q22: ¿Qué pasa con el pago cuando Payments App no está configurada?

**Expected Answer (CAREFUL):** "Hay dos niveles. Si `PAYMENTS_APP_URL` no está configurado, `payments-api.ts::createPayment` devolvería una sesión mock. Pero independientemente de eso, el checkout actualmente llama a `createPaymentSession` en `buyer-service.ts` que siempre devuelve un mock hardcodeado. Ese es un bug que está identificado para corrección."

**Risk Level: HIGH** — This reveals the critical bug clearly.
