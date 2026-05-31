# 02 — Etapa 2 Compliance Audit
> Audit generated: 2026-05-31 | Delivery: 2026-06-01 | Defense: 2026-06-04 / 2026-06-08

---

## R1 — Next.js reusable pages and components

### Requirement
Páginas y componentes reutilizables en Next.js.

### Status
**PASS**

### Evidence
- App Router with full page tree: `/`, `/shop`, `/shop/[productId]`, `/cart`, `/checkout`, `/orders`, `/orders/[orderId]`, `/dashboard`, `/profile`, `/favorites`, `/admin/*`, `/sign-in`, `/sign-up`, `/api-docs`
- Shared components: `EmptyState`, `PriceDisplay`, `StatusBadge`, `ProductImage`
- Domain components: `ProductCard`, `CartItemRow`, `OrderCard`, `FavoriteCard`, `AddressSelector`, `SellerGroupPreview`
- Admin components: `OrdersTable`, `BuyersTable`, `CartsTable`, `StatsOverview`
- UI library: full shadcn/ui component set

### Issues
- `src/components/buyer/` and `src/components/shop/` show some component duplication (`CartItemCard` vs `CartItemRow`).
- Admin layout (`src/app/admin/layout.tsx`) does **not** include `AdminSidebar` or `AdminHeader` components even though they exist in `src/components/admin/`. Admin pages have no persistent navigation.

### Risk During Evaluation
Professor may navigate to `/admin` and find a bare page layout with no sidebar navigation.

### Recommendation
Wire `AdminSidebar` and `AdminHeader` into `src/app/admin/layout.tsx`.

---

## R2 — Own REST API

### Requirement
API propia — cada app expone sus propios endpoints REST.

### Status
**PASS** (with reservations)

### Evidence
Full REST API implemented:
- `/api/v1/buyer/profile` — GET, PATCH
- `/api/v1/buyer/addresses` — GET, POST
- `/api/v1/buyer/addresses/[id]` — PATCH, DELETE
- `/api/v1/buyer/cart` — GET, POST
- `/api/v1/buyer/cart/[id]` — PATCH, DELETE
- `/api/v1/buyer/favorites` — GET, POST
- `/api/v1/buyer/favorites/[id]` — DELETE
- `/api/v1/buyer/orders` — GET
- `/api/v1/buyer/orders/[id]` — GET
- `/api/v1/buyer/orders/[id]/cancel` — POST
- `/api/v1/buyer/checkout` — POST
- `/api/v1/orders/[id]` — PATCH (from Payments)
- `/api/v1/orders/[id]/seller-groups/[g]/shipping` — PATCH (from Shipping)
- `/api/v1/orders/[id]/seller-groups/[g]/status` — PATCH (from Seller)
- Admin endpoints under `/api/admin/*`

### Issues
- **`GET /api/v1/buyer/orders` has no pagination** (`src/app/api/v1/buyer/orders/route.ts`). Returns all orders with `findMany` — no `page`, `limit`, `has_more` in the response. Violates the standard pagination contract from `documentacion/02-responsabilidades.md §4`.
- **`GET /api/admin/orders` has no pagination** (`src/app/api/admin/orders/route.ts`). Same issue.
- **`GET /api/v1/buyer/addresses` has no pagination** — returns raw array, not the documented `{ data, pagination }` envelope.
- **`GET /api/v1/buyer/favorites` has no pagination**.
- **Error format inconsistency** — Some routes return `{ error: "string" }` (e.g., checkout route), others return the documented `{ error: { code, message, details } }` structure.
- **README lists routes without `/v1` prefix** (e.g., `/api/buyer/profile` instead of `/api/v1/buyer/profile`) — README is wrong, implementation is correct, but this could confuse evaluators.

### Risk During Evaluation
Evaluator calls `GET /api/v1/buyer/orders` and finds no pagination envelope — direct spec violation.

### Recommendation
Add pagination to all list endpoints. Standardize error format across all routes.

---

## R3 — PostgreSQL ownership

### Requirement
Base de datos PostgreSQL propia — cada app es dueña de sus datos.

### Status
**PASS**

### Evidence
- `prisma/schema.prisma` defines all tables: `BuyerProfile`, `Address`, `Cart`, `CartItem`, `FavoriteItem`, `Order`, `OrderSellerGroup`, `OrderItem`, `OrderStatusHistory`
- Supabase PostgreSQL configured via `DATABASE_URL` and `DIRECT_URL` env vars
- All cross-app IDs stored as opaque strings (no FK to external tables) — correct architecture
- `prisma/migrations/` has two migrations: `20260413214353_init` and `20260413215035_add_product`

### Issues
- **IDs do not use resource prefixes**. The schema uses `@default(cuid())` without the documented `ord_`, `byp_`, `adr_` prefixes. The docs explicitly state IDs should be `ord_01H…`, `byp_01H…` etc. This is a visible deviation when the evaluator inspects database records or API responses.
- **Missing `order_status_history` table scope** — `OrderStatusHistory` doesn't have an index on `order_id` which would be slow for large datasets, but acceptable for academic scale.
- **`shippingCostCents` is always 0 per seller group** in the checkout route (`route.ts:118: shippingCostCents: 0`). The shipping total is correctly applied to `Order.shippingTotalCents` but the per-group breakdown is wrong.

### Risk During Evaluation
Low for core grading. The ID prefix deviation is cosmetic but visible. The `shippingCostCents: 0` per group is a data integrity issue that could surface during order detail review.

### Recommendation
Either generate IDs with prefixes in application code or note the deviation explicitly.

---

## R4 — Authentication

### Requirement
Autenticación — login/logout para usuarios administradores (obligatorio). Login para usuarios finales según corresponda al dominio de la app.

### Status
**PARTIAL — CRITICAL ISSUE**

### Evidence
- Clerk integrated via `ClerkProvider` in root layout
- `(auth)/layout.tsx` protects all buyer-facing routes
- `admin/layout.tsx` calls `requireAdmin()` which checks `publicMetadata.admin`
- API routes use `auth()` from `@clerk/nextjs/server`
- Sign-in/sign-up pages at `/sign-in` and `/sign-up`

### Issues
- **NO `middleware.ts` FILE EXISTS**. The entire project has no Clerk middleware. In `@clerk/nextjs` v7.x, the middleware is required for:
  1. Setting up auth state for `auth()` and `currentUser()` in server components/API routes
  2. Protecting routes at the edge
  3. Enabling the Clerk JS browser client to pick up session cookies
  
  Without middleware, `auth()` calls in API routes may return null `userId` even when the user IS logged in, because the session token is not being propagated properly. This is a **production-breaking defect**.

- Auth checks are done ad-hoc in each layout/route rather than centrally via middleware, which is fragile and may result in unprotected routes.

### Risk During Evaluation
**HIGH**. If the deployed app has auth working only because of local dev quirks, the evaluator will find that login/logout functionality is broken or unreliable in production (Vercel). The absence of `middleware.ts` is a textbook Clerk setup error that professors familiar with the framework will catch immediately.

### Recommendation
**MUST FIX BEFORE SUBMISSION**: Create `middleware.ts` in the project root with:
```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/", "/shop(.*)", "/sign-in(.*)", "/sign-up(.*)",
  "/api/v1/orders(.*)",  // inter-service routes
  "/api/products(.*)",
  "/api/health(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

---

## R5 — Admin Panel

### Requirement
Panel de administración — el usuario administrador debe poder gestionar los datos principales de la app y visualizar al menos un listado o reporte relevante.

### Status
**PARTIAL**

### Evidence
- Admin panel at `/admin` with stats overview
- `/admin/orders` — order list with status filter
- `/admin/orders/[id]` — order detail with status change capability
- `/admin/buyers` — buyer list
- `/admin/carts` — cart monitoring
- Admin APIs: `/api/admin/stats`, `/api/admin/orders`, `/api/admin/buyers`, `/api/admin/carts`
- Auth protected with `requireAdmin()` checking `publicMetadata.admin`

### Issues
- **Admin layout has no navigation**. `src/app/admin/layout.tsx` renders only `<main className="flex-1 overflow-y-auto">{children}</main>`. The `AdminSidebar` and `AdminHeader` components exist but are not wired in. Navigating to `/admin/buyers` from `/admin/orders` requires manually editing the URL.
- **Admin order list has no pagination** — returns all orders via `findMany` without `skip`/`take`.
- **Admin cannot create/delete buyers** — only viewing. This is acceptable per domain.
- **Admin status change in `/api/admin/orders/[orderId]` accepts all status values** with no transition validation — an admin can set any order from any state to any other state (including nonsensical transitions like `COMPLETED → PENDING_PAYMENT`).

### Risk During Evaluation
**MEDIUM**. The professor will navigate to `/admin` and immediately notice there's no menu to go to buyers, carts etc. If they don't know the exact URLs, they may think those pages don't exist.

### Recommendation
Add sidebar navigation to admin layout. At minimum, include links to all admin sub-pages.

---

## R6 — Search and Pagination

### Requirement
Búsqueda y paginación — donde aplique, implementar búsqueda y paginación con parámetros en la URL.

### Status
**PARTIAL**

### Evidence
- **Search**: `useShopFilters` hook (`src/hooks/use-shop-filters.ts`) implements URL-based filtering for the shop with `q`, `category`, `bikeType`, `minPrice`, `maxPrice`, `sellers` parameters. These are reflected in the URL and survive page refresh.
- **Client-side filtering**: The shop page filters client-side on all loaded products.

### Issues
- **No server-side pagination** anywhere. The shop page loads ALL products in one request. For 12 mock products this is fine; for a real catalog it would break.
- **Orders page has no pagination** — displays all orders at once.
- **Admin orders/buyers/carts have no pagination in UI or API**.
- **Pagination response envelope missing** from all list endpoints — the documented `{ data, pagination: { total, page, limit, has_more } }` structure is absent.
- **`page` and `limit` URL params not implemented** — only filter params are in the URL, no `?page=2&limit=20`.

### Risk During Evaluation
**HIGH**. The requirement explicitly says "paginación con parámetros en la URL". A professor looking at the shop URL after filtering will see filter params but no pagination params. The API responses won't show the documented pagination envelope.

### Recommendation
1. Add server-side pagination to `/api/v1/buyer/orders` and `/api/admin/orders`.
2. Add `page`/`limit` URL params to the orders page.
3. Wrap all list API responses in `{ data, pagination }` envelope.

---

## R7 — Error Handling and 404 Pages

### Requirement
Manejo de errores — errores generales y páginas 404.

### Status
**PASS**

### Evidence
- `src/app/not-found.tsx` — custom 404 page with "Volver al inicio" link
- `src/app/error.tsx` — global error boundary with "Intentar de nuevo" button
- API routes return appropriate HTTP status codes (400, 401, 403, 404, 409)
- Some API routes use the documented error format `{ error: { code, message } }`

### Issues
- **Inconsistent error format** — some routes return `{ error: "string" }` (checkout route line 28: `{ error: parsed.error.issues... }`), others return the documented `{ error: { code, message } }` format. This inconsistency means frontend error handling can't rely on a consistent structure.
- **Error messages mix Spanish and English** — some validation errors come from Zod in English, some manual messages are in Spanish.
- **`not-found.tsx` has a typo**: "La pagina que buscas no existe." — missing accent on "página".
- **`error.tsx` has a typo**: "Algo salio mal" and "Ocurrio un error inesperado." — missing accents.

### Risk During Evaluation
LOW — 404 and error pages exist. The inconsistency is cosmetic for grading purposes.

### Recommendation
Fix typos. Standardize error format to `{ error: { code, message } }` across all routes.

---

## R8 — Server-side Form Validation

### Requirement
Validación de formularios del lado del servidor.

### Status
**PASS**

### Evidence
- All API routes use Zod for request validation
- Checkout route: `checkoutSchema` validates `shippingAddressId`, `notes`, `returnUrl`
- Shipping endpoint: validates all incoming fields with enum constraints
- Status update endpoints validate enum transitions
- Profile, address, cart, favorites all have validation schemas

### Issues
- **Checkout route validates `returnUrl` with `z.string().url()`** but the URL is only used internally to return to the orders page — not passed to any payment service. Validating it serves no functional purpose in the current mock payment implementation.
- **No idempotency key validation** on checkout endpoint — the spec requires `Idempotency-Key` header for POST operations that create resources. The checkout route ignores this header entirely.

### Risk During Evaluation
LOW. Server-side validation is clearly present.

---

## R9 — Accessibility

### Requirement
Accesibilidad — aplicar buenas prácticas básicas.

### Status
**PARTIAL**

### Evidence
- `lang="es"` on `<html>` element
- Product images have `alt` attributes
- Form labels present in profile/address forms
- Button components use semantic `<button>` elements
- Heading hierarchy generally maintained

### Issues
- **`@ts-nocheck` in 26+ UI components** — Most shadcn/ui components in `src/components/ui/` have `// @ts-nocheck` at the top. This suppresses TypeScript errors including potential accessibility prop type errors.
- **No `aria-label` on icon-only buttons** — Navigation items with only icons (e.g., cart icon in header) may lack accessible labels.
- **No visible focus rings tested** — Not confirmed whether keyboard navigation is functional.
- **Color contrast not verified** — The muted-foreground color scheme may fail WCAG AA.

### Risk During Evaluation
MEDIUM. A basic visual check won't catch most accessibility issues, but a professor who checks keyboard navigation or uses a screen reader may flag icon buttons without labels.

### Recommendation
Add `aria-label` to icon-only buttons. Verify focus ring visibility.

---

## R10 — External API Consumption

### Requirement
Consumo de al menos una API externa — integrar un servicio externo que aporte valor al dominio de la app. Debe hacerse un request real y procesarse la respuesta (no embeds). Las APIs de las otras webapps del mismo proyecto cuentan como externas.

### Status
**PARTIAL — CRITICAL CONCERN**

### Evidence
- `src/lib/seller-api.ts` — calls Seller App `GET /api/v1/products` and `GET /api/v1/products/{id}/availability`
- `src/lib/shipping-api.ts` — calls Shipping App `POST /api/v1/shipping-quotes`
- `src/lib/payments-api.ts` — calls Payments App `POST /api/v1/payments`
- All three files fall back to mock data when env vars `SELLER_APP_URL`, `SHIPPING_APP_URL`, `PAYMENTS_APP_URL` are not set

### Issues
- **In the current state, all external calls are mocked**. The env vars `SELLER_APP_URL`, `SHIPPING_APP_URL`, `PAYMENTS_APP_URL` are NOT present in `.env` (only `DATABASE_URL`, `DIRECT_URL`, and Clerk keys are present). This means the app never makes a real external call.
- **The mock fallback is acceptable for Etapa 2 isolation** as per the assignment: "Las llamadas a APIs de otras webapps deben mockearse o simularse durante esta etapa." However, the actual HTTP client code for real calls IS implemented, which satisfies the spirit of the requirement.
- **For the defense**, the professor will likely ask "can you make a real call?" — the answer is yes IF the partner app URLs are configured, but right now they're not.

### Risk During Evaluation
MEDIUM. The assignment says mocking is acceptable for Etapa 2. However, the evaluator may want to see at least one live call. If the Seller App (Pierino) has a deployed instance, connecting to it would demonstrate real external API consumption.

### Recommendation
Configure `SELLER_APP_URL` in `.env.local` and Vercel to point to the deployed Seller App. The seller-api.ts code is already written to make real calls when the env var is present.

---

## R11 — Mercado Pago (not applicable)

### Requirement
Integración con Mercado Pago (solo para la Payments App) — flujo de pago en modo sandbox.

### Status
**NOT APPLICABLE**

Mercado Pago integration is the responsibility of the Payments App (Rocco Paoloni), not the Buyer App. The Buyer App only consumes the checkout URL returned by Payments.

---

## R12 — AI Features (Optional)

### Requirement
Opcional — IA — se puede incorporar funcionalidad basada en inteligencia artificial.

### Status
**NOT IMPLEMENTED**

No AI features present. This is optional and has no impact on grading.

---

## R13 — Deployment Readiness

### Requirement
Aplicación web funcional — deployada en Vercel y accesible mediante un link de producción.

### Status
**UNKNOWN — CRITICAL CONCERN**

### Evidence
- Next.js 16 with App Router — Vercel compatible
- `package.json` build script: `prisma generate && next build --webpack`
- No `vercel.json` — auto-detection will handle this
- Database URLs configured in `.env`

### Issues
- **No deploy URL anywhere in the README or codebase**. There is no link to a deployed Vercel instance.
- **`--webpack` flag** in `npm run build` forces Webpack bundler instead of Turbopack. This is non-standard and could cause build issues. Vercel may not support this flag in all configurations.
- **Missing Clerk middleware** will cause auth to break in production even if build succeeds.
- **`next.config.ts` only allows images from `upload.wikimedia.org`**. In production with real Seller App data, product images from other domains will be blocked.

### Risk During Evaluation
**CRITICAL**. The delivery requires a live Vercel URL. If there's no deployed instance, it's an automatic point deduction.

### Recommendation
**MUST**: Deploy to Vercel before submission. Add the URL to README. Fix middleware.ts before deploying.

---

## R14 — Seed / Sample Data

### Requirement
Datos cargados — la aplicación no puede estar vacía.

### Status
**PARTIAL**

### Evidence
- `prisma/seed.ts` exists with comprehensive seed data:
  - 3 mock products across 3 sellers
  - Multiple addresses per profile
  - Cart with items
  - Favorites
  - Multiple orders in different states (COMPLETED, PENDING_PAYMENT, PAID, IN_TRANSIT)
  - Order status history

### Issues
- **No seed script in `package.json`**. The `seed.ts` exists but there's no `"seed": "tsx prisma/seed.ts"` script in package.json, and no `prisma.seed` configuration in package.json. A new developer cloning the repo cannot run the seed without knowing to run `npx tsx prisma/seed.ts` manually.
- **Seed depends on existing buyer profiles** — the seed function `seedProfile(profileId, email)` takes an existing profile ID as argument. Without knowing how to get/create a profile, the seed is non-trivial to run.
- **Mock products in seed don't match real Seller App schema** — `price: 450000` (in pesos) vs documented `price_cents: 45000000` (in centavos).

### Risk During Evaluation
MEDIUM. If the evaluator can't see data in the deployed app, it's a direct point deduction. The seed needs to be runnable.

### Recommendation
Add to `package.json`: `"seed": "tsx prisma/seed.ts"`. Add documentation on how to run seed and with which user.

---

## R15 — README Requirements

### Requirement
README — breve y conciso, debe incluir: descripción de la app, link al deploy, y credenciales o instrucciones para acceder con cada tipo de usuario.

### Status
**FAIL**

### Evidence
README exists with: app description, tech stack, setup instructions, route table, API table, command reference.

### Issues
- **No deploy link** — The README has no URL to the deployed Vercel instance.
- **No admin credentials** — No instructions for accessing the admin panel or which Clerk user has `publicMetadata.admin = true`.
- **No buyer user credentials** — No test user email/password for the evaluator to log in as a buyer.
- **README is excessively long** — The assignment says "breve y conciso" but the README is extensive with folder structure, all API routes, all commands. This is not the requested format.

### Risk During Evaluation
**HIGH**. The README requirements are explicitly stated in the rubric. Missing deploy link and credentials are automatic deductions.

### Recommendation
**MUST FIX BEFORE SUBMISSION**: Add a brief section at the top of README with:
1. Vercel deploy URL
2. Admin user credentials (email + password or how to create one)
3. Buyer user credentials (email + password for a pre-seeded account)

---

## R16 — Environment Variables and `.env.example`

### Requirement
Variables de entorno — usar `.env.local` para desarrollo, configurar en Vercel. Incluir `.env.example` con los nombres de las variables (sin valores).

### Status
**FAIL**

### Evidence
- `.env` file exists locally (properly .gitignored via `.env*` rule)
- No `.env.example` file exists anywhere in the repository

### Issues
- **`.env.example` is completely missing** — the assignment explicitly requires this file.
- **The required env vars are scattered** — `SELLER_APP_URL`, `SHIPPING_APP_URL`, `PAYMENTS_APP_URL`, `PAYMENTS_TO_BUYER_SERVICE_TOKEN`, `SHIPPING_TO_BUYER_SERVICE_TOKEN`, `SELLER_TO_BUYER_SERVICE_TOKEN` are referenced in source code but never documented in one place.

### Risk During Evaluation
**HIGH**. The absence of `.env.example` is explicitly mentioned in the rubric as a requirement.

### Recommendation
**MUST FIX BEFORE SUBMISSION**: Create `.env.example`:
```
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
SELLER_APP_URL=
SHIPPING_APP_URL=
PAYMENTS_APP_URL=
BUYER_TO_SELLER_SERVICE_TOKEN=
BUYER_TO_SHIPPING_SERVICE_TOKEN=
BUYER_TO_PAYMENTS_SERVICE_TOKEN=
PAYMENTS_TO_BUYER_SERVICE_TOKEN=
SHIPPING_TO_BUYER_SERVICE_TOKEN=
SELLER_TO_BUYER_SERVICE_TOKEN=
```

---

## R17 — .gitignore Protections

### Requirement
Never commit secrets.

### Status
**PASS**

### Evidence
`.gitignore` includes `.env*` — all env files (`.env`, `.env.local`, `.env.example`) are ignored. Note: `.env.example` should NOT be ignored since it contains only variable names, no values. Consider using `!.env.example` exception.

### Issues
- `.env.example` would be gitignored by the current `.env*` rule. Add `!.env.example` to `.gitignore` so the example file CAN be committed.

---

## Summary Table

| Requirement | Status | Priority |
|---|---|---|
| Next.js pages/components | PASS | — |
| Own REST API | PARTIAL | HIGH |
| PostgreSQL ownership | PASS | — |
| Authentication | PARTIAL | **CRITICAL** |
| Admin panel | PARTIAL | HIGH |
| Search & pagination | PARTIAL | HIGH |
| Error handling & 404 | PASS | — |
| Server-side validation | PASS | — |
| Accessibility | PARTIAL | MEDIUM |
| External API consumption | PARTIAL | MEDIUM |
| Deployment | UNKNOWN | **CRITICAL** |
| Seed data | PARTIAL | HIGH |
| README | FAIL | **CRITICAL** |
| `.env.example` | FAIL | **CRITICAL** |
| `.gitignore` protections | PASS | — |
