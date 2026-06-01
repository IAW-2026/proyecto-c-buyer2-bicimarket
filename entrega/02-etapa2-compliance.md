# 02 — Etapa 2 Compliance Audit

> Each requirement is evaluated against the actual implementation. Evidence references concrete files and line numbers.

---

## REQ-01: Next.js App Router with Reusable Pages and Components

### Status: PASS

### Evidence
- App Router structure in `src/app/` with route groups: `(auth)/`, `admin/`, `shop/`, `api/`
- Reusable components in `src/components/` organized by domain: `admin/`, `buyer/`, `cart/`, `checkout/`, `dashboard/`, `favorites/`, `orders/`, `profile/`, `shared/`, `shop/`, `ui/`
- 30+ shadcn/ui base components in `src/components/ui/`
- Shared components: `pagination-controls.tsx`, `status-badge.tsx`, `empty-state.tsx`, `price-display.tsx`, `product-image.tsx`

### Issues
- Shop page (`src/app/shop/page.tsx`) is marked `"use client"` at the top level; no server-side rendering or SEO optimization for the catalog
- Several pages lack `loading.tsx` / `error.tsx` per-segment files (only one global `error.tsx`)

### Risk During Evaluation
Low. Component organization is clear and reuse is evident.

### Recommendation
Add `loading.tsx` to key routes (`/shop`, `/orders`, `/checkout`) for bonus credit.

---

## REQ-02: Own REST API

### Status: PASS

### Evidence
- Full CRUD API under `/api/v1/buyer/profile`, `/api/v1/buyer/addresses`, `/api/v1/buyer/cart`, `/api/v1/buyer/favorites`, `/api/v1/buyer/orders`, `/api/v1/buyer/checkout`
- Inter-app endpoints: `/api/v1/orders/[orderId]/route.ts` (← Payments), `/api/v1/orders/[orderId]/seller-groups/[groupId]/shipping/route.ts` (← Shipping), `/api/v1/orders/[orderId]/seller-groups/[groupId]/status/route.ts` (← Seller)
- Admin APIs: `/api/admin/buyers`, `/api/admin/carts`, `/api/admin/orders`, `/api/admin/stats`
- Health check: `/api/health`
- API docs: `/api/docs` (OpenAPI spec), `/api-docs` (Swagger UI page)

### Issues
- `POST /api/v1/buyer/cart` requires the client to send all product data (`sellerProfileId`, `productNameSnapshot`, `unitPriceCents`, `weightGramsSnapshot`) instead of just `{ product_id, quantity }`. This bypasses the Seller App availability check and allows **price manipulation** from the browser. This is a **functional deviation from the specification** (`documentacion/03-apis.md §B3`).
- `/api/products` and `/api/products/[productId]` exist at the non-versioned path, violating the `/api/v1/` convention.
- Admin error format in `admin-auth.ts:13` returns `{ error: "Unauthorized" }` instead of the standard `{ error: { code, message, details } }`.

### Risk During Evaluation
Medium. A professor examining the cart POST will see that client controls the price snapshot, which is a clear security/design flaw.

### Recommendation
Move product data resolution to the server: `POST /api/v1/buyer/cart` should accept only `{ product_id, quantity }` and call `seller-api.ts::getProductAvailability` internally.

---

## REQ-03: PostgreSQL Ownership

### Status: PASS

### Evidence
- `prisma/schema.prisma` defines all 8 tables: `BuyerProfile`, `Address`, `Cart`, `CartItem`, `FavoriteItem`, `Order`, `OrderSellerGroup`, `OrderItem`, `OrderStatusHistory`
- Supabase PostgreSQL configured via `DATABASE_URL` and `DIRECT_URL` in `.env`
- Two migrations in `prisma/migrations/`

### Issues
- **IDs use bare `cuid()` without resource prefixes.** Documentation (`04-modelo-de-datos.md §0`) specifies IDs like `ord_…`, `byp_…`, etc. The schema uses `@default(cuid())` with no prefix. This is a deviation from the spec but low academic impact.
- `ShippingStatus` enum has `PENDING` as a valid first value in the schema but `PENDING` is not in the shipping states documented in `03-apis.md §0.4` or `06-estados.md §1.4`. The docs list the first valid state as `CREATED`, `READY_FOR_PICKUP`, etc. There is no `PENDING` shipping status in the spec. However the `ShippingStatus?` field on `OrderSellerGroup` is nullable, so this may not cause problems.
- Actually `ShippingStatus` in the Prisma schema does NOT include `PENDING` — it starts with `CREATED`. The field `shippingStatus` on `OrderSellerGroup` is nullable (`ShippingStatus?`), which handles the initial unset state correctly.

### Risk During Evaluation
Low. The DB is well-structured and matches the documented model closely.

### Recommendation
Add resource ID prefixes in application code (via a helper that generates `"ord_" + cuid()`) to match spec.

---

## REQ-04: Authentication

### Status: PASS (with gaps)

### Evidence
- Clerk `@clerk/nextjs` v7 installed
- Auth check in every API route via `auth()` from Clerk
- Admin protection via `requireAdmin()` / `requireAdminApi()` checking `publicMetadata.admin`
- Auth layout at `(auth)/layout.tsx` redirects unauthenticated users to `/sign-in`
- Admin layout at `admin/layout.tsx` calls `requireAdmin()`
- Sign-in/sign-up pages at `/sign-in` and `/sign-up`

### Issues
- **No `middleware.ts` file.** Clerk's Next.js v7 SDK requires a `middleware.ts` at the root to protect routes at the edge. Without it, API routes are only protected by in-handler checks, and unauthenticated requests to non-API routes can bypass the layout redirect in some edge cases. This is a configuration gap.
- **No `buyer` role check.** Buyer API endpoints only verify `userId` (any authenticated Clerk user), not `publicMetadata.role = "buyer"`. A seller or logistics operator can access buyer endpoints.
- Profile `PATCH` doesn't support updating `default_shipping_address_id` — the spec (`03-apis.md §B1`) lists this as a patchable field. The implementation schema only allows `fullName` and `phone`.

### Risk During Evaluation
Medium. The `middleware.ts` absence is something professors look for when auditing Next.js + Clerk setups. Role enforcement gap could be raised.

### Recommendation
1. Add `src/middleware.ts` with `clerkMiddleware()` and a route matcher protecting `/(auth)/**` and `/admin/**`.
2. Optionally add buyer role check: verify `publicMetadata.role === "buyer"` in `getOrCreateBuyerProfile`.
3. Add `default_shipping_address_id` to the profile PATCH schema.

---

## REQ-05: Admin Panel

### Status: PASS

### Evidence
- `/admin` — dashboard with `StatsOverview` and recent orders table
- `/admin/buyers` — buyer list with `BuyersTable`
- `/admin/carts` — active cart viewer with `CartsTable`
- `/admin/orders` — full order list with `OrdersTable`
- `/admin/orders/[orderId]` — order detail with `OrderDetailView`
- Stats API at `/api/admin/stats` returns: totalBuyers, ordersByStatus, cartsByStatus, revenueCents, ordersLast24h
- Protected by `publicMetadata.admin = true`

### Issues
- Admin panel is read-only for orders. There is no admin action to change order status manually (no "mark as paid" or "force cancel" button visible in the UI).
- Seller group status update endpoint exists but no admin UI trigger.
- No export functionality (CSV/Excel) for data listings.

### Risk During Evaluation
Low. Admin panel is present and functional for viewing data.

### Recommendation
Add at least one admin action (e.g., manually cancel an order or update a seller group status) to show interactive admin capability.

---

## REQ-06: Reports / Listings

### Status: PASS

### Evidence
- Orders listing at `/orders` with paginated API (`GET /api/v1/buyer/orders?page=X&limit=Y`)
- Admin stats dashboard with aggregate metrics
- Order detail with full seller group breakdown
- Buyer list in admin with profile data
- Cart list in admin showing item counts and values

### Issues
- Orders listing UI does not appear to use the `PaginationControls` component — the orders page loads all user orders without a visible pager in the frontend. The API supports pagination but the UI may not wire it up.

### Risk During Evaluation
Low if orders list is short in demo. Medium if professor clicks through many orders.

### Recommendation
Verify that the orders page (`src/app/(auth)/orders/page.tsx`) connects to the paginated API and renders `PaginationControls`.

---

## REQ-07: Search

### Status: PARTIAL

### Evidence
- `useShopFilters` hook in `src/hooks/use-shop-filters.ts` provides client-side filtering
- `FilterPanel` component supports category and search query filtering
- `filter-panel.tsx` includes a price range slider

### Issues
- **Search is entirely client-side.** All products are loaded in one API call, then filtered in the browser. For the mock catalog (12 products) this works. For a real catalog with hundreds of products this would be unusable.
- No URL parameters for search/filter state — filters reset on page navigation.
- The API `/api/products` does not accept `?q=`, `?category=`, `?min_price=`, `?max_price=` parameters — it returns all products always.
- The Seller App contract documents server-side filtering at `GET /api/v1/products?q=...&category=...`. The Buyer proxy does not forward these params.

### Risk During Evaluation
Medium. Professor will likely ask "how does search work?" and the answer "client-side filtering of the full list" is architecturally weak.

### Recommendation
Pass filter params from the UI through the proxy to Seller App: `GET /api/products?q=X&category=Y` → `getSellerProducts({ q, category })` → `GET /api/v1/products?q=X&category=Y` on Seller App.

---

## REQ-08: Pagination

### Status: PARTIAL

### Evidence
- `PaginationControls` component built and functional at `src/components/shared/pagination-controls.tsx`
- API endpoints for orders and addresses support `?page=&limit=` query parameters
- Admin orders table uses pagination API

### Issues
- **Shop page has no pagination.** All products are loaded at once. The Seller App supports paginated catalog (`?page=&limit=`) but the Buyer proxy ignores these.
- It is unclear whether the buyer orders UI connects the `PaginationControls` component to the paginated API. The `use-order-tabs.ts` hook needs inspection.
- Admin tables may implement pagination client-side.

### Risk During Evaluation
Medium. A demo with only 12 mock products hides the issue. If real Seller App is connected and has many products, the page would load everything.

### Recommendation
Add server-side pagination to the shop proxy: accept `?page=&limit=` in `/api/products` and pass to Seller App.

---

## REQ-09: URL Parameter Handling

### Status: PASS

### Evidence
- Dynamic route segments: `[orderId]`, `[groupId]`, `[addressId]`, `[favoriteId]`, `[itemId]`, `[productId]`
- Query params parsed in orders listing (`page`, `limit`) and addresses listing
- Clerk sign-in uses `[[...sign-in]]` catch-all pattern

### Issues
- No URL-reflected filter state in `/shop` — selected category/search is component state only, not reflected in the URL. Deep-linking to a filtered state is not possible.

### Risk During Evaluation
Low. Dynamic segments work correctly.

### Recommendation
Sync filter state to URL via `useSearchParams` / `router.push` in `useShopFilters`.

---

## REQ-10: Error Handling

### Status: PASS (with inconsistencies)

### Evidence
- Global `error.tsx` at `src/app/error.tsx`
- `not-found.tsx` at `src/app/not-found.tsx`
- All API routes return structured errors: `{ error: { code, message, details } }`
- 404, 401, 409 (INVALID_TRANSITION) all handled with correct HTTP codes
- Zod validation on all request bodies

### Issues
- `admin-auth.ts:13` returns `{ error: "Unauthorized" }` (bare string) instead of `{ error: { code, message, details } }` — inconsistent with the rest of the API.
- `service-auth.ts` returns 500 when the service token env var is not configured. A 500 is misleading — it should be a 503 (Service Unavailable) or the endpoint should gracefully indicate a config problem. More importantly, this means **all inter-app endpoints will 500 if the env vars are not set**, which is the current state for most tokens (see §deployment).
- No error boundary for individual page sections (only at root level).

### Risk During Evaluation
Low for basic error handling. Medium if professor tests an unauthenticated admin API call and sees the inconsistent format.

### Recommendation
Fix `admin-auth.ts` to use the standard error envelope. Handle missing service token with a clearer response.

---

## REQ-11: 404 Pages

### Status: PASS

### Evidence
- `src/app/not-found.tsx` renders a styled 404 page with a "back to home" link.

### Issues
- Minor: "La pagina" should be "La página" (missing accent). Small but visible.

### Risk During Evaluation
Low.

### Recommendation
Fix the typo: `"La pagina que buscas"` → `"La página que buscas"`.

---

## REQ-12: Server-Side Validation

### Status: PASS

### Evidence
- Zod schemas used in every POST/PATCH route handler: `checkoutSchema`, `cartItemSchema`, `addressSchema`, `updateProfileSchema`, `patchSchema`
- All schemas validated with `safeParse` before any DB operations
- Type-safe Prisma calls enforce DB-level constraints

### Issues
- The `cartItemSchema` (in cart POST) requires `unitPriceCents` and `weightGramsSnapshot` from the client. While these are validated as non-negative integers, the server does not verify these values against the real Seller App. A client can send `unitPriceCents: 1` for any product.

### Risk During Evaluation
Medium. A professor who examines the cart POST carefully will notice the price is trust-based from the client.

### Recommendation
Remove client-supplied price/weight from `cartItemSchema` and resolve from Seller App server-side.

---

## REQ-13: Accessibility

### Status: PARTIAL

### Evidence
- shadcn/ui components have ARIA attributes built in (Radix UI primitives)
- `PaginationControls` uses `aria-label` on prev/next buttons and `aria-current="page"` on current page
- Semantic HTML elements (`<main>`, `<aside>`, `<h1>`, `<h2>`)

### Issues
- Shop filter panel and product grid lack explicit `role` attributes
- No `aria-live` regions for dynamic content updates (cart additions, filter results)
- No skip-to-content link
- Color contrast not audited
- No visible focus indicators confirmed (depends on shadcn theme)
- No keyboard navigation testing documented

### Risk During Evaluation
Low (rarely graded in detail unless explicitly in rubric).

### Recommendation
Add `role="status"` to the product count text in ShopContent. Ensure all interactive elements are keyboard accessible.

---

## REQ-14: External API Consumption

### Status: PARTIAL

### Evidence
- `src/lib/seller-api.ts` — calls Seller App `GET /api/v1/products` and `GET /api/v1/products/{id}/availability`
- `src/lib/shipping-api.ts` — calls Shipping App `POST /api/v1/shipping-quotes` and `GET /api/v1/shipments`
- `src/lib/payments-api.ts` — calls Payments App `POST /api/v1/payments` and `GET /api/v1/receipts/{id}`
- Service client factory in `src/lib/service-client.ts`

### Issues
- **CRITICAL**: The checkout route (`src/app/api/v1/buyer/checkout/route.ts:168`) calls `createPaymentSession` from `buyer-service.ts`, NOT `createPayment` from `payments-api.ts`. The `buyer-service.ts::createPaymentSession` is **hardcoded to return a mock** `paymentUrl: "https://example-payment.local/checkout?order=${orderId}"`. This means even when `PAYMENTS_APP_URL` is correctly configured, the payment is never actually sent to the real Payments App. Checkout is broken in production.
- `payments-api.ts::createPayment` is written correctly but is never called by the checkout flow.
- No retry logic (3 attempts with 1s/3s/9s backoff) on any external API call. If Seller or Shipping App is down, the error propagates immediately.
- No `X-Request-Id` header propagated in `service-client.ts`.

### Risk During Evaluation
**HIGH**. If the professor clicks "checkout" with Payments App connected, nothing will happen (redirect to `https://example-payment.local/...` which is not a real URL). This will fail the end-to-end checkout demonstration.

### Recommendation
In `checkout/route.ts`, replace:
```ts
const payment = await createPaymentSession(order.id, totalCents);
```
with:
```ts
const payment = await createPayment({ order_id: order.id, amount_cents: totalCents, ... });
```
And delete or rename the mock `createPaymentSession` in `buyer-service.ts`.

---

## REQ-15: Mocking of Inter-App Integrations

### Status: PASS (with caveats)

### Evidence
- `seller-api.ts` — falls back to `MOCK_PRODUCTS` when `SELLER_APP_URL` or `BUYER_TO_SELLER_SERVICE_TOKEN` is missing
- `shipping-api.ts` — falls back to `buildMockResponse()` when `SHIPPING_APP_URL` or `BUYER_TO_SHIPPING_SERVICE_TOKEN` is missing
- `payments-api.ts` — falls back to mock session when `PAYMENTS_APP_URL` or `BUYER_TO_PAYMENTS_SERVICE_TOKEN` is missing (but this function is never called from checkout)

### Issues
- Mock fallback for Payments is in `payments-api.ts::createPayment` but checkout calls `buyer-service.ts::createPaymentSession` which is always mock.
- Inter-app incoming endpoints (those receiving calls FROM Payments/Shipping/Seller) will return **HTTP 500** when the service token env vars are not configured (`service-auth.ts:9`).

### Risk During Evaluation
Medium. The mocking for outgoing calls works, but incoming mocking is broken.

---

## REQ-16: Mercado Pago Sandbox

### Status: FAIL

### Evidence
- Buyer App does not integrate directly with Mercado Pago (by design — that's Payments App's job)
- `payments-api.ts` has correct structure for calling Payments App which would trigger MP

### Issues
- Due to the bug in REQ-14 (wrong function called), Mercado Pago is never reached even indirectly.
- No Mercado Pago credentials in `.env` or `.env.example` (correct — that belongs in Payments App).

### Risk During Evaluation
Medium. If the system is meant to be demonstrated end-to-end, this will block the demo.

---

## REQ-17: Deployment Readiness

### Status: PARTIAL — see `05-deployment-readiness.md` for full analysis.

---

## REQ-18: Seed / Sample Data

### Status: PASS (with inconsistency)

### Evidence
- `prisma/seed.ts` creates: 1 address, 1 cart with 2 items, 3 favorites, 2 orders (COMPLETED + PENDING_PAYMENT) per existing buyer profile
- `npm run seed` script configured in `package.json`
- Seed is idempotent — deletes and recreates carts/orders

### Issues
- **Price inconsistency**: seed defines Trek Marlin price as `450000` (ARS 4,500) but `seller-api.ts` mock has `130000000` (ARS 1,300,000). The products are the same by ID but have completely different prices. Orders in the DB will show ARS 4,500 for a Trek Marlin while the shop shows ARS 1,300,000.
- Seed requires that at least one buyer profile exists first (must log in before seeding). README mentions this but it's a friction point.
- Only 3 mock products in seed vs 12 in the seller-api mock. Favorited products will point to valid IDs, but the cart only contains 2 products.

### Risk During Evaluation
Low-Medium. Price discrepancy between orders and shop display is visually odd.

### Recommendation
Align prices between `seed.ts` and `seller-api.ts` MOCK_PRODUCTS.

---

## REQ-19: README Requirements

### Status: PARTIAL — see `08-readme-audit.md`.

---

## REQ-20: Environment Variables

### Status: PARTIAL

### Evidence
- `.env.example` exists with all required keys (commented out)
- Real `.env` has `DATABASE_URL`, `DIRECT_URL`, Clerk keys, and `SELLER_APP_URL` configured
- `.gitignore` correctly excludes `.env*` (with `!.env.example` exception)

### Issues
- Most service tokens are **commented out** in `.env`: `BUYER_TO_SHIPPING_SERVICE_TOKEN`, `BUYER_TO_PAYMENTS_SERVICE_TOKEN`, `PAYMENTS_TO_BUYER_SERVICE_TOKEN`, `SHIPPING_TO_BUYER_SERVICE_TOKEN`, `SELLER_TO_BUYER_SERVICE_TOKEN`
- Only `BUYER_TO_SELLER_SERVICE_TOKEN` is set (but the real Seller App is connected)
- `PAYMENTS_APP_URL` has a **trailing space**: `https://proyecto-c-payments-bicimarket.vercel.app/ ` — this may cause connection issues
- `SHIPPING_APP_URL` is set to `https://proyecto-c-shipping-bicimarket.vercel.app/` but `BUYER_TO_SHIPPING_SERVICE_TOKEN` is commented out, meaning shipping calls will use mock

### Risk During Evaluation
**HIGH**. With most tokens missing, the inter-app endpoints will return HTTP 500 when called by other apps.

### Recommendation
Fill in all service tokens. Verify with the other teams what secrets they expect.

---

## REQ-21: .gitignore Protections

### Status: PASS

### Evidence
- `.gitignore` excludes `.env*` with `!.env.example` exception
- `/src/generated/prisma` excluded (good — generated code)
- `/node_modules`, `/.next/`, `build` excluded

### Issues
- **`src/components/admin/.orders-table.tsx.swp`** — a Vim swap file appears to be committed to the repository. This is not harmful but is unprofessional and pollutes the repo.

### Recommendation
Delete the swap file and add `*.swp` to `.gitignore`.
