# 02 — Etapa 2 Compliance Audit

> Assignment source: "Etapa 2 — Implementación Individual" provided by the teacher.
> All requirements evaluated against the actual implementation.

---

## REQ-01: Páginas y componentes reutilizables en Next.js

### Status
**PASS**

### Evidence
- App Router with dedicated route groups: `/(auth)/` for authenticated pages, `/admin/` for admin panel, `/shop/` for catalog
- Reusable components: `src/components/shared/` (PaginationControls, EmptyState, StatusBadge, PriceDisplay, ProductImage), `src/components/ui/` (59 shadcn components), `src/components/shop/`, `src/components/cart/`, `src/components/checkout/`, `src/components/orders/`, `src/components/admin/`
- Layouts: `src/app/layout.tsx`, `src/app/(auth)/layout.tsx`, `src/app/admin/layout.tsx`
- Pages: home, shop (with product detail), cart, checkout, orders (list + detail), profile, favorites, dashboard, admin (dashboard, orders, buyers, carts), sign-in, sign-up

### Issues
- No loading.tsx files in route segments (Next.js streaming loading UI not used)
- Shop page is a client component wrapping everything — Server Components underused

### Risk During Evaluation
Low. Component reuse is obvious and broad.

### Recommendation
None blocking. Optionally add loading.tsx to each route for polish.

---

## REQ-02: API propia — endpoints REST propios

### Status
**PASS**

### Evidence
- User-facing API: `src/app/api/v1/buyer/` — profile, addresses, cart, favorites, checkout, orders, cancel
- Service-to-service API: `src/app/api/v1/orders/[orderId]/` — payments status update, shipping status update, seller group status update
- Admin API: `src/app/api/admin/` — orders, buyers, carts, stats
- Public proxy: `src/app/api/products/` (catalog proxy)
- Docs: `src/app/api/docs/` (OpenAPI endpoint) + `src/app/api-docs/` (Swagger UI page)
- Health check: `src/app/api/health/`
- All endpoints use Zod validation at the boundary
- All endpoints return standardized error objects `{ error: { code, message, details } }`

### Issues
- `GET /api/products` is not under `/api/v1/` — it lives at `/api/products` (undocumented deviation)
- No rate limiting implemented
- No `Idempotency-Key` header handling on checkout endpoint
- Some admin endpoints lack filtering (e.g., buyers table has no search)

### Risk During Evaluation
Medium. The API is functional and well-structured but minor spec deviations exist (see `04-spec-deviations.md`).

### Recommendation
Low priority. The API is solid enough for evaluation.

---

## REQ-03: Base de datos PostgreSQL propia

### Status
**PASS**

### Evidence
- PostgreSQL via Prisma 6, hosted on Supabase
- `prisma/schema.prisma` defines all 9 models: BuyerProfile, Address, Cart, CartItem, FavoriteItem, Order, OrderSellerGroup, OrderItem, OrderStatusHistory
- All models include `createdAt`/`updatedAt` timestamps
- Soft delete on BuyerProfile (`deletedAt DateTime?`)
- Snapshots correctly modeled (shippingAddressSnapshot as Json, productNameSnapshot, unitPriceCents, weightGramsSnapshot)
- Cross-app references stored as opaque strings (no FK to external tables)
- Migrations present: `prisma/migrations/20260413214353_init/` and `20260413215035_add_product/`

### Issues
- No `order_status_history` audit for `OrderSellerGroup` (only for `Order` — spec says both should have history)
- `BuyerProfile` model missing `Role` enum field (spec says `Role` enum USER/ADMIN exists, but role is managed purely via Clerk `publicMetadata`, which is an acceptable design decision)
- Generated client at `src/generated/prisma/` is committed to repo (including `.dylib.node` binary — 10MB+ binary file)

### Risk During Evaluation
Low. DB ownership is clear and schema is well-designed.

### Recommendation
Remove committed Prisma generated files from git (add to .gitignore). Add `src/generated/prisma` to `.gitignore` — it already is, but the files were previously committed.

---

## REQ-04: Autenticación — login/logout

### Status
**PASS**

### Evidence
- Clerk `@clerk/nextjs` v7.1.0 integrated
- `src/app/sign-in/[[...sign-in]]/page.tsx` and `src/app/sign-up/[[...sign-up]]/page.tsx` — Clerk sign-in/sign-up pages
- `src/app/(auth)/layout.tsx` — server-side auth guard redirects to `/sign-in` if not authenticated
- `src/app/admin/layout.tsx` — calls `requireAdmin()` which checks `publicMetadata.admin === true`
- `src/lib/admin-auth.ts` — `requireAdmin()` and `requireAdminApi()` utilities
- All API routes under `/api/v1/buyer/` validate Clerk JWT via `auth()`
- Admin API routes validate via `requireAdminApi()`
- Service-to-service routes validate via `validateServiceToken()`

### Issues
- **CRITICAL: No `src/middleware.ts`** — Clerk's recommended `clerkMiddleware()` is absent. Without it, Clerk cannot process auth at the edge/middleware layer. Auth currently works route-by-route but this is non-standard and risks edge cases (e.g., Clerk session cookie handling, redirect loops)
- Public routes (shop, home) require auth to show cart/favorites because they call authenticated hooks — unauthenticated users on these pages may see silent errors

### Risk During Evaluation
**HIGH**. A professor checking Clerk integration will notice the missing `middleware.ts`. Clerk's official docs require it.

### Recommendation
**Must fix.** Add `src/middleware.ts` with `clerkMiddleware()` and proper `publicRoutes` configuration.

---

## REQ-05: Panel de administración

### Status
**PASS**

### Evidence
- `/admin` route group with its own protected layout
- `src/app/admin/page.tsx` — stats overview + recent orders
- `src/app/admin/orders/page.tsx` — orders table with status filter
- `src/app/admin/orders/[orderId]/page.tsx` — order detail view
- `src/app/admin/buyers/page.tsx` — buyers table
- `src/app/admin/carts/page.tsx` — carts table
- All protected by `requireAdmin()` checking `publicMetadata.admin === true`
- Stats endpoint: `GET /api/admin/stats` returns counts for orders, buyers, carts, revenue
- Orders endpoint: `GET /api/admin/orders` has server-side pagination, status filter
- Admin can update seller group status via `PATCH /api/admin/orders/{id}/seller-groups/{id}`

### Issues
- Admin panel has **no search** on buyers or carts tables (only status filter on orders)
- No ability to create/edit/delete buyers from admin panel (read-only)
- No export functionality (CSV/PDF)
- Admin navigation is minimal (no sidebar with quick links)
- `src/components/admin/.orders-table.tsx.swp` — vim swap file committed to repository

### Risk During Evaluation
Low–Medium. The admin panel is functional and demonstrates the main requirements. Lack of search on secondary tables is a minor weakness.

### Recommendation
Add search/filter to buyers table. Remove the `.swp` file.

---

## REQ-06: Búsqueda y paginación con parámetros en la URL

### Status
**PARTIAL**

### Evidence
**What works:**
- `src/hooks/use-shop-filters.ts` — reads `q`, `category`, `sellers`, `minPrice`, `maxPrice`, `bikeType`, `stock` from URL search params via `useSearchParams()`
- URL updates when filters change (via `router.replace()`)
- Filters are shareable/bookmarkable

**What is missing:**
- **Shop pagination is entirely client-side**: `GET /api/products` returns ALL products (no `page`/`limit` params). `useShopFilters` filters the full list in memory. There is no actual server-side pagination in the public shop.
- The `pagination` object exists in responses (e.g., in the API), but the shop frontend doesn't implement page navigation for the product grid.
- `src/components/shared/pagination-controls.tsx` exists but is **not used on the shop page**.
- Admin panel has true server-side pagination (proper `page`/`limit` in queries).

### Risk During Evaluation
**HIGH**. The requirement says "búsqueda y paginación con parámetros en la URL." URL params for search work. But if a professor looks for a "page=2" parameter in the shop URL after clicking Next, it won't be there. This could cost points.

### Recommendation
**Should fix.** Add a `page` parameter to the shop URL, pass it to `/api/products`, and implement server-side pagination in that route. Alternatively, add client-side pagination that updates the URL — at minimum this would satisfy the URL parameter requirement.

---

## REQ-07: Manejo de errores — errores generales y páginas 404

### Status
**PASS**

### Evidence
- `src/app/not-found.tsx` — global 404 page with "Volver al inicio" link
- `src/app/error.tsx` — global error boundary with retry button
- API routes return structured errors: `{ error: { code, message, details } }`
- Empty states handled via `src/components/shared/empty-state.tsx`
- Loading states handled via skeleton components (`src/components/shop/product-grid-skeleton.tsx`)

### Issues
- `not-found.tsx` has a typo: "La pagina que buscas no existe." (missing accent: "página")
- `error.tsx` has a typo: "Algo salio mal" and "Ocurrio un error" (missing accents)
- No route-level `not-found.tsx` files for specific routes (e.g., `/shop/[productId]` not found scenario)
- No error page shown when an order isn't found

### Risk During Evaluation
Low. Global pages exist. Typos are cosmetic.

### Recommendation
Fix the accent typos. Minor polish.

---

## REQ-08: Validación de formularios del lado del servidor

### Status
**PASS**

### Evidence
- All API routes use Zod schemas for input validation, e.g.:
  - `src/app/api/v1/buyer/checkout/route.ts` — `checkoutSchema` validates body
  - `src/app/api/v1/buyer/cart/route.ts` — validates cart item creation
  - `src/app/api/v1/orders/.../shipping/route.ts` — `patchSchema` validates shipping update
- Validation errors return 400 with structured error body
- React Hook Form + Zod used on client side for immediate feedback

### Issues
- Some validation could be stricter (e.g., `quantity` should be validated as `>0`)
- No validation of `returnUrl` domain (accepts any URL, which could be a redirect vulnerability)

### Risk During Evaluation
Low. Server-side validation is clearly present and well-implemented.

### Recommendation
None blocking.

---

## REQ-09: Accesibilidad — buenas prácticas básicas

### Status
**PARTIAL**

### Evidence
- shadcn/ui components are built on Radix UI which has strong accessibility primitives (ARIA labels, keyboard nav, focus management)
- Buttons use semantic `<button>` elements
- Links use semantic `<a>` and Next.js `<Link>`
- Images in `product-image.tsx` likely have alt attributes

### Issues
- `src/app/page.tsx` (home) has many `<a href="#">` footer links with no meaningful text/labels
- Modal/dialog accessibility not specifically audited
- Color contrast not verified (dark green background in promo banner may fail WCAG AA)
- No `skip to content` link
- Form labels not explicitly checked for all forms

### Risk During Evaluation
Medium. Evaluators may check headings hierarchy, alt text, or run a quick Lighthouse audit.

### Recommendation
Verify alt text on all images. Add `aria-label` to icon-only buttons. Fix `<a href="#">` links.

---

## REQ-10: Consumo de al menos una API externa

### Status
**PARTIAL** (contextually PASS given Etapa 2 constraints)

### Evidence
- `src/lib/seller-api.ts` — calls `GET /api/v1/products` and `GET /api/v1/products/{id}/availability` on the Seller App
- `src/lib/service-client.ts` — creates an Axios client with `X-Service-Token` header
- When `SELLER_APP_URL` and `BUYER_TO_SELLER_SERVICE_TOKEN` are set, real HTTP requests are made to the external Seller App
- The README states: "**Catálogo (Seller App):** Los productos se obtienen en tiempo real desde el Seller App."

### Issues
- The fallback to mock data (`MOCK_PRODUCTS`) means the app works without ANY external call
- No second external API is consumed (e.g., a weather API, geolocation, currency conversion, etc.)
- The Seller App as "external API" is borderline — it's another app from the same project group
- If `SELLER_APP_URL` is not configured in Vercel, all product data comes from hardcoded mocks → **no real request is made**

### Risk During Evaluation
**HIGH**. A professor may ask to demonstrate an actual HTTP call to an external service. If `SELLER_APP_URL` is not set in Vercel, no real external call happens. Need to verify the production deploy has this variable configured.

### Recommendation
**Must verify** that `SELLER_APP_URL` is set in Vercel production deploy. If the Seller App is not available, consider adding a call to a free third-party API (e.g., currency rates for ARS conversion, or a geolocation API for postal code validation).

---

## REQ-11: Integración con Mercado Pago (N/A — Payments App only)

### Status
**N/A**

Mercado Pago integration is only required for the **Payments App** (Rocco Paoloni). The Buyer App only calls Payments App to initiate a payment session and receives a checkout URL. This is simulated with a mock in Etapa 2.

---

## REQ-12: Variables de entorno y secretos

### Status
**PASS**

### Evidence
- `.env.local` and `.env` are in `.gitignore` (`.env*` pattern)
- `.env.example` exists with all required variable names documented
- Variables include: `DATABASE_URL`, `DIRECT_URL`, Clerk keys, service tokens, inter-app URLs
- No secrets committed to the repository

### Issues
- `.env.example` uses `#DATABASE_URL=xxxxxxxxx` format — values are commented out, which is non-standard (should be uncommented with placeholder values like `DATABASE_URL=your_connection_string_here`)
- The `.env` file exists in the local filesystem — if it was ever committed, secrets could be in git history
- `SELLER_APP_URL` has a trailing slash in the example: `https://proyecto-c-seller-pierinospina.vercel.app/` — this may cause double-slash issues in URL construction

### Risk During Evaluation
Low. Proper env var hygiene is demonstrated.

### Recommendation
Fix `.env.example` format (uncomment the lines). Remove trailing slash from URL values.

---

## REQ-13: Datos cargados (seed data)

### Status
**PARTIAL**

### Evidence
- `prisma/seed.ts` creates data for each existing `BuyerProfile`
- Seed creates: 1 address, 1 cart with 2 items, favorites for 3 products, 2 orders (COMPLETED + PENDING_PAYMENT)
- `npm run seed` command available
- README instructions mention running seed

### Issues
- **Seed is profile-dependent**: it only seeds data for profiles that already exist. If profiles are empty, seed prints a warning and exits.
- The seed produces only **2 orders per user** (one COMPLETED, one PENDING_PAYMENT). Missing states: PAID, SHIPPED, PARTIALLY_SHIPPED, DELIVERED.
- **Only 2 mock products from 3 sellers** in the seed (uses `MOCK_PRODUCTS` from seller-api.ts which has 12 products, but seed only uses 3 of them for orders)
- Price inconsistency: seed uses `price: 450000` for Trek Marlin (in pesos? unclear units) but seller-api.ts defines the same product as `price_cents: 130000000` (ARS $1,300,000). This means seed-created carts have dramatically wrong prices.
- No seed for admin user creation instructions in the seed file

### Risk During Evaluation
**HIGH**. The teacher's reminder explicitly states: "La aplicación no debe estar vacía. Debe contar con suficientes datos precargados para que podamos probar adecuadamente las distintas funcionalidades." Two orders per user is marginal.

### Recommendation
**Must fix.** Add orders in all relevant statuses. Fix price inconsistency. Make seed work even without pre-existing profiles by providing hardcoded Clerk user IDs for the test users.

---

## REQ-14: README

### Status
**PARTIAL** (see `08-readme-audit.md` for details)

### Evidence
- Deploy link present: `https://proyecto-c-buyer2-bicimarket.vercel.app/`
- 3 test users documented with emails, passwords, roles
- Setup instructions present
- Project description present
- Notes for grader present

### Issues
- **CRITICAL: Email format wrong.** Teacher requires `<rol>+clerktest@iaw.com` (e.g. `buyer+clerktest@iaw.com`). README shows `buyerclerktest@iaw.com` and `buyer1clerktest@iaw.com` — missing the `+` separator.
- README structure doesn't exactly follow teacher's required order (deploy link → users → instructions → description → notes)

### Risk During Evaluation
**HIGH**. If the professor tries to log in with `buyer+clerktest@iaw.com` and it doesn't work because the account is actually `buyerclerktest@iaw.com`, the evaluation will fail.

### Recommendation
**Must fix.** Create new Clerk users with the correct email format or update README to match exact accounts.

---

## REQ-15: Deploy en Vercel

### Status
**PASS** (assumed)

### Evidence
- Deploy URL documented: `https://proyecto-c-buyer2-bicimarket.vercel.app/`
- `vercel` is in `.gitignore`
- `package.json` build script: `"build": "prisma generate && next build --webpack"`
- No obvious build blockers (see `05-deployment-readiness.md` for details)

### Issues
- Build uses `--webpack` flag — non-default for Next.js, may cause slower builds
- Cannot verify at audit time whether the live deploy is the production URL (not preview)

### Recommendation
Verify the Vercel dashboard shows the deploy is the **production** deployment (not a preview URL).

---

## Summary Table

| Requirement | Status | Risk |
|---|---|---|
| Next.js pages + components | PASS | Low |
| Own REST API | PASS | Low |
| PostgreSQL ownership | PASS | Low |
| Authentication | PARTIAL | HIGH |
| Admin panel | PASS | Low |
| Search + pagination | PARTIAL | HIGH |
| Error handling + 404 | PASS | Low |
| Server-side validation | PASS | Low |
| Accessibility | PARTIAL | Medium |
| External API | PARTIAL | HIGH |
| Mercado Pago | N/A | — |
| Env vars + secrets | PASS | Low |
| Seed data | PARTIAL | HIGH |
| README | PARTIAL | HIGH |
| Vercel deploy | PASS | Low |
