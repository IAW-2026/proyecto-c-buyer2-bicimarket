# 03 — Architecture Review

---

## 1. Folder Structure

### Assessment: GOOD

```
src/
├── app/              # Next.js App Router (pages + API routes)
│   ├── (auth)/       # Protected buyer pages (layout redirects)
│   ├── admin/        # Admin pages (layout checks admin flag)
│   ├── api/
│   │   ├── v1/       # Versioned API (correct)
│   │   │   ├── buyer/    # UI-facing endpoints
│   │   │   └── orders/   # Inter-app endpoints
│   │   ├── admin/    # Admin REST APIs (not under v1 — see issue below)
│   │   ├── products/ # Proxy to Seller App (not under v1 — issue)
│   │   ├── docs/     # OpenAPI spec route
│   │   └── health/   # Health check
│   ├── shop/         # Catalog
│   ├── sign-in/
│   └── sign-up/
├── components/       # UI components by domain
├── hooks/            # React Query hooks and custom hooks
│   └── querys/       # Mutation hooks organized by domain
├── lib/              # Business logic and service clients
├── providers/        # React context providers
├── services/api/     # API function modules (partially redundant with hooks)
├── store/            # Zustand stores
└── types/            # TypeScript type definitions
```

### Issues

**Severity: MINOR** — Admin API routes (`/api/admin/...`) are not under `/api/v1/`. This deviates from the global rule that all API routes live under `/api/v1/...`.

**Severity: MINOR** — Product proxy routes (`/api/products/`, `/api/products/[productId]`) are not under `/api/v1/`. They exist alongside versioned routes.

**Severity: MINOR** — `src/services/api/` and `src/hooks/querys/` have partial overlap in responsibility (both deal with API calls), creating confusion about where to put new functionality.

---

## 2. Separation of Concerns

### Assessment: GOOD

- API routes handle HTTP concerns; business logic delegated to `lib/`
- `buyer-service.ts` contains pure domain functions (`getOrCreateBuyerProfile`, `calculateCartTotals`, `groupItemsBySeller`)
- Service clients (`seller-api.ts`, `shipping-api.ts`, `payments-api.ts`) are thin HTTP wrappers with mock fallback
- Prisma singleton in `lib/prisma.ts` prevents multiple client instances

### Issues

**Severity: IMPORTANT** — `buyer-service.ts` also contains `createPaymentSession` which is a **hardcoded stub** that has no business being in the service layer. It creates a false impression that payment integration is working. This function should either call `payments-api.ts::createPayment` or be removed. Its presence in `buyer-service.ts` caused a critical routing bug where checkout never calls the real Payments App.

**Severity: MINOR** — `src/services/api/` (addresses.ts, cart.ts, checkout.ts, favorites.ts, profile.ts) contains Axios API call functions targeting the Buyer App's own API. These are nearly identical in purpose to what `hooks/querys/` does, creating dual paths for the same data. The `hooks/` approach using TanStack Query is the modern pattern; the `services/api/` layer adds complexity without clear benefit.

---

## 3. API Design

### Assessment: GOOD (with deviations)

- Consistent error format `{ error: { code, message, details } }` across most routes
- HTTP verbs used correctly (GET/POST/PATCH/DELETE)
- Zod validation on all inputs
- Auth checked first in every handler

### Issues

**Severity: CRITICAL** — `POST /api/v1/buyer/cart` accepts the product snapshot from the client:
```ts
unitPriceCents: z.number().int().nonnegative(),
weightGramsSnapshot: z.number().int().nonnegative(),
```
A buyer can send `unitPriceCents: 1` and create a cart item for any product at ARS 0.01. This is a price manipulation vulnerability. The spec says the server must call Seller App to resolve these values.

**Severity: IMPORTANT** — `POST /api/v1/buyer/checkout` accepts `returnUrl` from the client instead of constructing it server-side. A malicious client could pass a `returnUrl` pointing to an external phishing site. Also, `seller_groups` with `shipping_quote_id` are not in the request body — the spec requires these.

**Severity: IMPORTANT** — Checkout hardcodes `shippingCostCents: 0` for each `OrderSellerGroup`:
```ts
shippingCostCents: 0,  // line 132 in checkout/route.ts
```
While `shippingTotalCents` is calculated correctly at the order level, each seller group shows zero shipping cost. This is incorrect and will mislead downstream apps.

**Severity: MINOR** — No `Idempotency-Key` check on checkout (spec requires it). A double-click could create two orders.

**Severity: MINOR** — `GET /api/v1/buyer/orders/{orderId}` is implemented but the API table in the README lists it as `GET /api/v1/buyer/orders/[id]`. Confirm route `src/app/api/v1/buyer/orders/[orderId]/route.ts` responds correctly — it does exist.

**Severity: MINOR** — Admin API error format inconsistent:
```ts
// admin-auth.ts line 13
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// vs everywhere else:
return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "...", details: {} } }, { status: 401 });
```

---

## 4. Database Design

### Assessment: GOOD (with minor deviations)

- All required tables present and correctly related
- Proper use of nullable (`?`) for optional foreign refs to other apps
- `@@unique` constraints on `(cartId, productId)` and `(buyerProfileId, productId)` — correct
- `@@unique([orderId, sellerProfileId])` on `OrderSellerGroup` — correct
- Audit table `OrderStatusHistory` — present and populated
- Soft delete on `BuyerProfile` (`deletedAt`) — present
- Cascade delete on `Address` when `BuyerProfile` deleted — present

### Issues

**Severity: MINOR** — IDs are generated as bare CUIDs without the resource prefix (`ord_`, `byp_`, etc.) that the documentation mandates. Example: order IDs will be `clxyz123...` instead of `ord_clxyz123...`. This makes log parsing and debugging harder.

**Severity: MINOR** — `OrderStatusHistory` is used for both order-level and seller-group-level status changes (via `source: "seller"` in the seller-group update route). This mixes two different entity types in one audit table. A separate `OrderSellerGroupStatusHistory` would be cleaner.

**Severity: MINOR** — `CartItem` does not have `deleted_at` — if needed to audit removed items this is a gap (acceptable for this scope).

**Severity: INFO** — Only 2 migrations despite likely multiple schema iterations. This suggests `db push` was used predominantly over `migrate dev`. For an academic project this is acceptable but worth noting.

---

## 5. Domain Modeling

### Assessment: GOOD

- Domain boundaries are well respected: no cross-app FKs in schema
- Snapshots stored at time of transaction (`productNameSnapshot`, `unitPriceCents` in cart_items and order_items)
- `shippingAddressSnapshot` stored as JSON in orders — correct
- `orderStatusHistory` captures source and payload — correct

### Issues

**Severity: MINOR** — `Cart.status` enum includes `ABANDONED` but there is no code to mark carts as abandoned. This is dead schema that could confuse a reviewer.

---

## 6. Reusability

### Assessment: GOOD

- `PaginationControls` — generic and reusable
- `EmptyState` — generic (icon, title, description props)
- `StatusBadge` — generic status-to-color component
- `PriceDisplay` — reusable currency formatter
- `ProductImage` — image with fallback

### Issues

**Severity: MINOR** — `useApiMutation.tsx` in `hooks/querys/common/` exists but may not be used consistently across all mutation hooks. Some mutations are defined inline in components.

---

## 7. Coupling

### Assessment: ACCEPTABLE

- Inter-app coupling is contained in `lib/seller-api.ts`, `lib/shipping-api.ts`, `lib/payments-api.ts` — good boundary
- Mock fallbacks isolate the rest of the app from unavailable services
- `service-client.ts` is a single factory for all outbound service calls

### Issues

**Severity: IMPORTANT** — The checkout route imports from both `lib/buyer-service.ts` AND `lib/shipping-api.ts` but then calls `buyer-service.ts::createPaymentSession` (wrong function) instead of `lib/payments-api.ts::createPayment` (correct function). This tight coupling of the wrong function creates the critical payment bug.

---

## 8. Scalability

### Assessment: POOR for shop browsing, ACCEPTABLE for everything else

- API routes are serverless-compatible (Next.js API routes on Vercel)
- Prisma with connection pooling via Supabase pgBouncer — correct setup
- Individual buyer operations (cart, orders, addresses) are indexed and fast

### Issues

**Severity: IMPORTANT** — Shop page loads ALL products in one request with no server-side pagination. With a real seller catalog of hundreds of products, this creates a large response payload, slow initial load, and a memory-intensive client-side filter. The architecture needs server-side filtering and pagination before a real product set is connected.

---

## 9. Technical Debt

| Item | File | Severity | Notes |
|---|---|---|---|
| `createPaymentSession` stub | `buyer-service.ts:44-50` | CRITICAL | Blocks real payment flow |
| Price from client in cart | `cart/route.ts:7-15` | IMPORTANT | Security vulnerability |
| No middleware.ts | (missing) | IMPORTANT | Clerk protection gap |
| `shippingCostCents: 0` per group | `checkout/route.ts:132` | IMPORTANT | Data incorrect |
| Vim swap file committed | `.orders-table.tsx.swp` | MINOR | Clutter |
| Non-v1 admin/products routes | `api/admin/`, `api/products/` | MINOR | Spec deviation |
| Bare CUID IDs (no prefix) | `schema.prisma` | MINOR | Spec deviation |
| Price inconsistency in seed | `seed.ts` | MINOR | Confusing demo data |
| No retry logic | `service-client.ts` | MINOR | Spec deviation |
| No X-Request-Id propagation | `service-client.ts` | MINOR | Spec deviation |
| Dead `ABANDONED` cart status | `schema.prisma` | MINOR | Dead code |
| Duplicate service layer | `services/api/` vs `hooks/querys/` | MINOR | Redundant abstraction |
