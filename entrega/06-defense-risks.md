# 06 — Defense Preparation
> Audit generated: 2026-05-31 | Defense: 2026-06-04 / 2026-06-08

---

## Authentication

### Possible Question
"¿Cómo funciona la autenticación en tu app? ¿Por qué no hay un archivo `middleware.ts`?"

### Expected Answer
Clerk is used for authentication. Each route that requires auth checks the session inline in the layout or API route using `auth()` from `@clerk/nextjs/server`. The admin panel additionally checks `publicMetadata.admin === true`. Service-to-service endpoints use `X-Service-Token` header for auth.

**Problem**: The professor will notice there's no `middleware.ts`. The correct answer requires explaining this is an oversight and how it should work. If it's fixed before the defense, say "it was added during pre-delivery fixes."

### Risk Level
**HIGH**

### Why it is risky
`middleware.ts` is the first thing any Clerk documentation shows. Its absence is immediately visible to a professor who knows Clerk. It likely means auth is broken in production.

---

### Possible Question
"¿Cómo protegés las rutas del panel de admin vs las rutas de usuario normal?"

### Expected Answer
Admin routes live under `/admin/` and use `requireAdmin()` from `lib/admin-auth.ts`. This function calls `currentUser()` and checks `publicMetadata.admin === true`. If false, it redirects to `/dashboard`. API routes use `requireAdminApi()` which returns 403. Regular buyer routes use `(auth)/layout.tsx` which redirects to sign-in if no session.

### Risk Level
**LOW** — The implementation is solid here.

---

## Database

### Possible Question
"¿Por qué los IDs no tienen el prefijo `ord_`, `byp_`, etc. que dice la documentación?"

### Expected Answer
The documentation specifies resource-prefixed IDs but the implementation uses raw CUIDs from Prisma's `@default(cuid())`. Generating prefixed IDs requires custom ID generation in application code (e.g., `id: "ord_" + createId()`). This was a simplification made during development — the CUIDs are functionally equivalent and unique, just without the human-readable type prefix.

### Risk Level
**MEDIUM**

### Why it is risky
The spec is explicit about prefixes. A professor reading the schema.prisma will notice immediately.

---

### Possible Question
"Explicame la tabla `order_status_history`. ¿Por qué hay entradas con `fromStatus` vacío?"

### Expected Answer
`OrderStatusHistory` records every state transition of an order. Each entry has `fromStatus`, `toStatus`, `source`, and `occurredAt`. The empty `fromStatus` on order creation is a bug — when creating an order, the code uses `fromStatus: ""` instead of a meaningful starting state like `"NEW"` or `null`.

### Risk Level
**MEDIUM**

### Why it is risky
Shows insufficient attention to data integrity details.

---

### Possible Question
"¿Cómo manejás las referencias a datos de otras apps (seller_profile_id, product_id)? ¿Por qué no hay foreign keys a esas tablas?"

### Expected Answer
Following the multi-app architecture, cross-app IDs are stored as opaque strings without foreign keys. `OrderSellerGroup.sellerProfileId` is a string that Seller App owns — Buyer App has no table for seller profiles. This prevents circular dependencies between databases and allows each app to be deployed independently. Consistency is maintained through the business logic (if Seller App assigns a `seller_profile_id`, it's valid at the time of the transaction) and through snapshotting (we capture all relevant data at transaction time).

### Risk Level
**LOW** — This is a textbook correct answer for microservices.

---

## API Design

### Possible Question
"Tus endpoints de listado devuelven un array directo. ¿Por qué no tienen el formato `{ data, pagination }` que dice tu documentación?"

### Expected Answer
**This is a genuine defect**. The spec and documentation define a standard pagination envelope `{ data: [...], pagination: { total, page, limit, has_more } }` for all list endpoints. The current implementation returns raw arrays without pagination. This was identified as a gap that needs to be fixed.

### Risk Level
**HIGH**

### Why it is risky
The professor will call the API and see the raw array. Direct spec violation with no justification.

---

### Possible Question
"¿Qué pasa si Payments App te manda un PATCH para actualizar el estado de una orden y el token es incorrecto?"

### Expected Answer
The `PATCH /api/v1/orders/{id}/status` endpoint calls `validateServiceToken(request, "PAYMENTS_TO_BUYER_SERVICE_TOKEN")`. If the token is missing or wrong, it returns 401 with `{ error: { code: "INVALID_SERVICE_TOKEN" } }`. If the env var itself is not configured, it returns 500 with `SERVICE_TOKEN_NOT_CONFIGURED`.

### Risk Level
**LOW** — Implementation is correct.

---

### Possible Question
"¿Cómo manejás la idempotencia en el checkout? Si el usuario hace doble-click en 'Pagar', ¿se crean dos órdenes?"

### Expected Answer
**This is a real weakness**. The spec requires an `Idempotency-Key` header on POST operations. The checkout endpoint does not implement idempotency — if the same request is sent twice (network retry, double-click), two separate orders will be created. The correct implementation would check for a previously processed `Idempotency-Key` and return the cached response.

### Risk Level
**HIGH**

### Why it is risky
Idempotency is a specific requirement in the system documentation. The professor may ask to demonstrate double-click behavior.

---

## Admin Panel

### Possible Question
"¿Cómo llego a ver el listado de compradores desde el panel de admin?"

### Expected Answer
**This is a known UI defect**. The admin layout doesn't include the `AdminSidebar` component, so there's no navigation menu. The URL is `/admin/buyers`. The `AdminSidebar` component is built but not wired into the layout.

If fixed before defense: "The sidebar was added during pre-delivery fixes and you can navigate to buyers, carts, and orders from the sidebar."

### Risk Level
**HIGH**

### Why it is risky
A professor who navigates to `/admin` and can't find other admin pages will penalize for incomplete admin panel.

---

### Possible Question
"¿Puede el admin cambiar el estado de una orden? ¿Qué validaciones tienen esas transiciones?"

### Expected Answer
Yes, admin can change order status via `PATCH /api/admin/orders/{id}` (the UI on the order detail page). However, **there is no transition validation** — admin can set any order to any status, including invalid transitions like `COMPLETED → PENDING_PAYMENT`. The spec defines strict allowed transitions in `documentacion/06-estados-y-diagramas.md §5`.

### Risk Level
**MEDIUM**

---

## Search & Filtering

### Possible Question
"¿La búsqueda es server-side o client-side? ¿Los parámetros de filtro están en la URL?"

### Expected Answer
The shop filtering is **client-side**. All products are loaded in a single request and filtered in the browser using `useShopFilters`. Filter parameters (category, search query, price range, sellers) ARE reflected in the URL via `useSearchParams()` and `router.replace()`. So the URL does update and filters survive page refresh — but there's no server-side pagination or server-side filtering.

### Risk Level
**MEDIUM**

### Why it is risky
The requirement says "búsqueda y paginación con parámetros en la URL." The search params are in the URL (good) but pagination params are not (bad). A professor testing with a real Seller App with many products would find the approach problematic.

---

## Validation

### Possible Question
"¿Dónde hacés validación del lado del servidor? Mostranos un ejemplo."

### Expected Answer
All API routes use Zod schemas for request validation. For example, the checkout endpoint validates `shippingAddressId` (required string), `notes` (optional string), and `returnUrl` (valid URL). The shipping status endpoint validates the status enum against allowed values. The admin status update validates against the full `OrderStatus` enum.

### Risk Level
**LOW** — Validation is clearly present throughout.

---

## External APIs

### Possible Question
"¿Tu app consume alguna API externa real? Mostrame el código."

### Expected Answer
The app consumes three external APIs — Seller App, Shipping App, and Payments App. The integration code is in `lib/seller-api.ts`, `lib/shipping-api.ts`, and `lib/payments-api.ts`. Each uses a `createServiceClient()` that makes real HTTP calls when env vars are configured, or falls back to mock data for isolation during Etapa 2.

Show `seller-api.ts:getSellerProducts()` — it calls `GET /api/v1/products` with `X-Service-Token` auth, processes the response, and maps it to the internal `SellerProduct` type.

### Risk Level
**LOW** — The code is real and well-structured.

---

### Possible Question
"¿Pero en tu app deployada, esas llamadas son reales o mockeadas?"

### Expected Answer
In the current deployment, they fall back to mocks because `SELLER_APP_URL`, `SHIPPING_APP_URL`, and `PAYMENTS_APP_URL` are not configured. The partner apps are being developed in parallel (Etapa 2 isolation). When those apps are deployed in Etapa 3, the env vars will point to their deployed URLs and the real calls will be made.

### Risk Level
**LOW** — The assignment explicitly allows mocking in Etapa 2.

---

## Deployment

### Possible Question
"¿Dónde está tu app deployada? Dame el URL."

### Expected Answer
If not deployed: **This will result in an automatic point deduction.** The delivery requirements explicitly state the app must be deployed on Vercel with a public URL.

If deployed with broken checkout: **Be prepared to explain that the payment flow uses a mock checkout URL** (because `createPaymentSession` in `buyer-service.ts` returns a hardcoded URL). The order creation itself works, but the redirect to the payment gateway doesn't.

### Risk Level
**CRITICAL**

---

## Architecture Decisions

### Possible Question
"¿Por qué tenés dos prefijos de rutas API: `/api/v1/buyer/` y `/api/v1/orders/`?"

### Expected Answer
The separation reflects two different authentication models. Routes under `/api/v1/buyer/` are called by this app's own frontend with Clerk JWT (`Authorization: Bearer`). Routes under `/api/v1/orders/` are called by other apps (Payments, Shipping, Seller) using service-to-service tokens (`X-Service-Token`). This separation makes it clear which routes are internal vs inter-service and allows different auth middleware to be applied.

### Risk Level
**LOW** — This is a well-reasoned design decision.

---

### Possible Question
"¿Por qué el precio en la tienda está en pesos y en la base de datos en centavos? ¿No es inconsistente con tu documentación?"

### Expected Answer
**This is a real inconsistency**. The documentation specifies all monetary values should be in centavos (integers). The mock Seller App data in `seller-api.ts` uses pesos (e.g., `price: 450000`). The shop page converts to centavos with `* 100` when adding to cart. When the real Seller App (which follows the spec) sends `price_cents: 45000000`, this conversion would double-count the conversion and store values 100x too large. This is a known defect that needs to be fixed when connecting to the real Seller App.

### Risk Level
**HIGH**

### Why it is risky
This reveals a fundamental misunderstanding of the price schema. The mock works but the real integration would corrupt all monetary values.

---

## Mock Integrations

### Possible Question
"¿Cómo vas a verificar que tus mocks respetan el contrato con las otras apps?"

### Expected Answer
The mock data in `seller-api.ts` returns products matching the `SellerProduct` type in `types/inter-service.ts`, which is derived from the documented API schema in `documentacion/03-apis.md`. The mock shipping response returns the same fields as the documented `ShippingQuoteResponse`. However, there are known deviations: mock prices are in pesos vs documented centavos, and the mock shipping quote format uses a batched request format (`pickups[]`) rather than the documented single-pickup format.

### Risk Level
**MEDIUM**

### Why it is risky
The inter-service types deviate from the spec in price field naming and potentially the shipping quote request shape.

---

## General

### Possible Question
"¿Cuál es la función de `prisma/seed.ts` y cómo se usa?"

### Expected Answer
`seed.ts` populates the database with test data: addresses, cart items, favorites, and orders in different states (COMPLETED, PENDING_PAYMENT, PAID, IN_TRANSIT). It requires an existing `buyer_profile_id` to associate the data with. Currently there's no `npm run seed` command — it must be run manually with `npx tsx prisma/seed.ts`. This should have been configured in `package.json`.

### Risk Level
**MEDIUM**

---

### Possible Question
"¿Tenés tests? ¿Por qué no?"

### Expected Answer
**No tests**. The assignment doesn't explicitly require tests, but their absence is a weakness. In an academic context, the professor may ask about testing strategy. A good answer: "The validation schemas (Zod) provide schema coverage for API inputs. Manual testing was done through the UI and API calls during development. Unit tests for the business logic functions (`groupItemsBySeller`, `calculateCartTotals`) would be the next step."

### Risk Level
**LOW** — Tests are not required by the rubric.
