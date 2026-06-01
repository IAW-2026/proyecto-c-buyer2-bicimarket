# 03 — Architecture Review

---

## 1. Folder Structure

```
src/
  app/               # Next.js App Router pages + API routes
    (auth)/          # Protected user pages (cart, checkout, orders, profile, favorites, dashboard)
    admin/           # Admin panel pages (protected by requireAdmin)
    api/
      v1/buyer/      # User-facing API (Clerk JWT)
      v1/orders/     # Service-to-service API (X-Service-Token)
      admin/         # Admin API (admin Clerk JWT)
      products/      # Catalog proxy (no auth — public)
      docs/          # OpenAPI spec
    shop/            # Public catalog + product detail
    sign-in/ sign-up/ # Clerk auth pages
    api-docs/        # Swagger UI
  components/        # React components by domain
    admin/ buyer/ cart/ checkout/ dashboard/
    favorites/ header/ layout/ orders/ profile/ shared/ shop/ ui/
  hooks/             # TanStack React Query hooks
    querys/          # Mutation hooks (addresses, cart, checkout, favorites, profile)
    use-buyer.ts     # All query hooks
  lib/               # Business logic + external clients
  providers/         # QueryProvider
  services/api/      # Axios service functions (addresses, cart, checkout, favorites, profile)
  store/             # Zustand (cart checkout UI state only)
  types/             # TypeScript types
  generated/prisma/  # Generated Prisma client (should not be committed)
prisma/
  schema.prisma
  seed.ts
  migrations/
```

### Assessment
**Good.** Domain-organized folders, clear separation between pages, components, hooks, and service layer. Route groups used correctly.

**Issues:**
- `src/generated/prisma/` is committed to the repository (including a 10MB+ `.dylib.node` binary). This should be generated at build time, not committed. *(Severity: Medium)*
- `src/components/admin/.orders-table.tsx.swp` — vim swap file committed to repo. *(Severity: Minor)*
- `src/proxy.ts` — exists but unclear purpose (not referenced in obvious places). *(Severity: Minor)*

---

## 2. Separation of Concerns

### Assessment: Good overall, minor violations

**Good patterns:**
- Service layer: `src/lib/buyer-service.ts` contains business logic separate from API handlers
- External service clients: `src/lib/seller-api.ts`, `payments-api.ts`, `shipping-api.ts` — each encapsulates one integration
- Auth utilities: `src/lib/admin-auth.ts`, `src/lib/service-auth.ts` separate auth logic
- State management: Zustand only for ephemeral UI state (checkout address, notes); server state via React Query

**Violations:**
- `src/app/page.tsx` (home) is a huge client component (~800 lines) with business logic inline. Should be split into sub-components + moved logic to hooks. *(Severity: Minor)*
- `src/app/api/products/route.ts` is a "proxy" route that doesn't live under `/v1/` — it's a UI-specific endpoint not documented in the inter-service contract. *(Severity: Minor)*
- Two parallel data-fetching abstractions: `src/hooks/use-buyer.ts` (React Query hooks using axios) AND `src/services/api/` (raw axios functions). The hook layer calls the service layer, which is correct, but adds a layer of indirection that could be simplified. *(Severity: Minor)*

---

## 3. API Design

### Assessment: Good, with spec deviations

**Good:**
- Versioned under `/api/v1/`
- Consistent error format: `{ error: { code, message, details } }`
- Zod validation at every boundary
- Separation of user-facing (`/buyer/`) from service-to-service (`/orders/`) namespaces
- OpenAPI docs generated and served at `/api-docs`

**Issues:**
- `GET /api/products` is not under `/api/v1/` — this is an internal proxy route used by the frontend, not a documented public API. If a professor navigates to `/api/products` they'll see raw JSON without auth. This is fine but could be confusing. *(Severity: Minor)*
- Checkout endpoint at `/api/v1/buyer/checkout` (POST) accepts `{shippingAddressId, notes, returnUrl}` — the spec defines the request as `{shipping_address_id, seller_groups: [{seller_profile_id, shipping_quote_id}], notes}`. The `seller_groups` parameter is missing from the actual implementation. *(Severity: Important — see 04-spec-deviations.md)*
- No `Idempotency-Key` header support on the checkout endpoint, despite the spec requiring it on all POSTs that create resources. *(Severity: Minor)*
- Checkout response returns `{paymentUrl, orderId}` instead of the full order object defined in spec. *(Severity: Minor)*

---

## 4. Database Design

### Assessment: Excellent

**Good:**
- All models present and correctly structured per spec
- Snapshots correctly implemented (`productNameSnapshot`, `unitPriceCents`, `weightGramsSnapshot`, `shippingAddressSnapshot` as JSON)
- Cross-app references stored as opaque strings (no FK violations)
- Unique constraints correct: `(cartId, productId)`, `(buyerProfileId, productId)`, `(orderId, sellerProfileId)`
- Cascade deletes on Address when BuyerProfile is deleted
- OrderStatusHistory for audit trail

**Issues:**
- No `OrderSellerGroupStatusHistory` — spec says seller_group status transitions should also be audited. *(Severity: Minor)*
- `BuyerProfile.deletedAt` exists but is not used in any query (soft deletes not actually soft — no `where: { deletedAt: null }` in queries). *(Severity: Minor)*
- Prisma client generated to `src/generated/prisma/` — unusual path, non-default. Works but is non-standard. *(Severity: Minor)*
- The `libquery_engine-darwin-arm64.dylib.node` (macOS ARM binary) is committed. This will fail on Linux (Vercel). The build script `prisma generate && next build` handles this at build time, so it works, but the committed binary is dead weight and bloats the repo. *(Severity: Medium)*

---

## 5. Domain Modeling

### Assessment: Excellent match with spec

The Prisma schema closely mirrors the spec in `documentacion/04-modelo-de-datos.md`:

| Spec Model | Schema Model | Match |
|---|---|---|
| `buyer_profiles` | `BuyerProfile` | ✅ |
| `addresses` | `Address` | ✅ |
| `carts` | `Cart` | ✅ |
| `cart_items` | `CartItem` | ✅ |
| `favorite_items` | `FavoriteItem` | ✅ |
| `orders` | `Order` | ✅ |
| `order_seller_groups` | `OrderSellerGroup` | ✅ |
| `order_items` | `OrderItem` | ✅ |
| `order_status_history` | `OrderStatusHistory` | ✅ |

All enums match: `CartStatus`, `OrderStatus`, `SellerGroupStatus`, `ShippingStatus`.

**Difference:** Spec mentions a `Role` enum (USER/ADMIN) but it's not in the schema. Role is managed via Clerk `publicMetadata` instead, which is a legitimate design decision.

---

## 6. Reusability

### Assessment: Good

**Good:**
- `src/components/shared/` houses truly reusable components (EmptyState, PaginationControls, StatusBadge, PriceDisplay, ProductImage)
- `src/components/ui/` — 59 shadcn/ui components, all primitive and reusable
- `src/lib/entity-ids.ts` — centralized ID generation with prefixes
- `src/lib/service-auth.ts` — `validateServiceToken()` reused across all service-to-service routes
- `src/lib/service-client.ts` — reusable Axios client factory for inter-service calls

**Issues:**
- `src/app/page.tsx` duplicates product card + cart interaction logic that is also in `src/app/shop/page.tsx`. The `handleAddToCart` and `handleToggleFavorite` functions are copy-pasted between the two files. *(Severity: Minor)*
- `src/hooks/use-buyer.ts` exports a long flat list of hooks — could be split by domain (useCart, useFavorites, useOrders) for better discoverability. *(Severity: Minor — no functional impact)*

---

## 7. Coupling

### Assessment: Well decoupled by design

**Good:**
- External services (Seller App, Shipping App, Payments App) accessed only through dedicated client modules with graceful fallback
- Zustand store only holds UI state — no server data in global state
- React Query cache is the single source of truth for server data
- API routes don't call each other — they're independently callable

**Issues:**
- `src/lib/buyer-service.ts` imports `currentUser` from `@clerk/nextjs/server` — this ties the service layer to the HTTP request context. The function `getOrCreateBuyerProfile` is not pure. *(Severity: Minor)*
- `src/lib/seller-api.ts` has `MOCK_PRODUCTS` hardcoded inline — mock data is coupled to the production client. A better design would have the mock in a separate file or use a different pattern. *(Severity: Minor)*
- Seed (`prisma/seed.ts`) imports from the same `MOCK_PRODUCTS` concept but with different prices — loose coupling that has caused a data inconsistency bug. *(Severity: Medium — see below)*

---

## 8. Critical Bug: Price Inconsistency Between Seed and Mock Data

**Severity: HIGH**

`prisma/seed.ts` uses:
```typescript
{ id: "prd_mock_001", name: "Bicicleta de montaña Trek Marlin 5", price: 450000, ... }
```

`src/lib/seller-api.ts` uses:
```typescript
{ id: "prd_mock_001", title: "Bicicleta de montaña Trek Marlin 5", price_cents: 130000000, ... }
```

The same product (same `id`) has `price: 450000` in the seed (ARS $4,500) vs `price_cents: 130000000` (ARS $1,300,000) in the mock product list. These are dramatically different values.

A seeded cart will show $4,500 for the Trek Marlin, but adding it fresh to a cart from the shop will show $1,300,000. This inconsistency is immediately visible to an evaluator comparing cart totals with order history.

**Fix:** Align prices between seed.ts and MOCK_PRODUCTS in seller-api.ts.

---

## 9. Scalability

### Assessment: Not a concern for academic scope, but worth noting

**Issues:**
- `GET /api/products` fetches ALL products (`limit: 100`) in one call. For the academic use case with ~12 mock products this is fine, but would fail at scale. *(Severity: Minor for now)*
- Client-side filtering in the shop means all products are transferred to the browser before any filtering happens. *(Severity: Minor)*
- No caching layer (Redis, etc.) for Seller App responses — a short TTL cache is called for in the spec. *(Severity: Minor)*
- No rate limiting on any endpoint. *(Severity: Minor)*

---

## 10. Technical Debt

### Summary

| Issue | Severity | File |
|---|---|---|
| Missing `src/middleware.ts` for Clerk | High | — |
| No server-side pagination in shop | High | `src/app/api/products/route.ts`, `src/app/shop/page.tsx` |
| Price inconsistency seed vs mock | High | `prisma/seed.ts`, `src/lib/seller-api.ts` |
| `createPaymentSession` is fully mocked | Medium | `src/lib/buyer-service.ts` |
| Generated Prisma binary committed | Medium | `src/generated/prisma/` |
| Vim swap file committed | Low | `src/components/admin/.orders-table.tsx.swp` |
| Home page too large (~800 LOC) | Low | `src/app/page.tsx` |
| Duplicate cart/favorite logic | Low | `src/app/page.tsx`, `src/app/shop/page.tsx` |
| No SellerGroupStatusHistory | Low | `prisma/schema.prisma` |
| Footer links all point to `#` | Low | `src/app/page.tsx` |
