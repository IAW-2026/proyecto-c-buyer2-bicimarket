# 03 — Architecture Review
> Audit generated: 2026-05-31

---

## 1. Folder Structure

```
src/
├── app/
│   ├── (auth)/          # Protected buyer pages (layout checks auth)
│   ├── admin/           # Admin pages (layout checks admin flag)
│   ├── shop/            # Public product catalog
│   ├── api/
│   │   ├── v1/buyer/    # Buyer-facing REST API (JWT auth)
│   │   ├── v1/orders/   # Inter-service REST API (X-Service-Token)
│   │   ├── admin/       # Admin REST API (JWT + admin flag)
│   │   └── products/    # Public products proxy
├── components/
│   ├── ui/              # shadcn/ui primitives
│   ├── admin/           # Admin-specific components
│   ├── buyer/           # Buyer domain components
│   ├── cart/            # Cart components
│   ├── checkout/        # Checkout components
│   ├── dashboard/       # Dashboard widgets
│   ├── favorites/       # Favorites components
│   ├── header/          # Header components
│   ├── layout/          # Layout components (sidebar, bottom nav)
│   ├── orders/          # Order components
│   ├── profile/         # Profile components
│   ├── shared/          # Cross-domain components
│   └── shop/            # Shop-specific components
├── hooks/
│   ├── querys/          # React Query mutation hooks (typo: should be "queries")
│   └── use-*.ts         # Custom hooks
├── lib/                 # Services, utilities, external clients
├── providers/           # React context providers
├── services/api/        # Axios API call functions
├── store/               # Zustand stores
└── types/               # TypeScript type definitions
```

**Assessment**: Structure is well-organized and follows Next.js App Router conventions. The separation of `/api/v1/buyer/` (JWT) vs `/api/v1/orders/` (service token) is clean and follows the spec. The `lib/` directory correctly houses service clients and business logic.

**Problem**: `hooks/querys/` is misspelled (should be `queries`). Minor but visible.

---

## 2. Separation of Concerns

**Severity: MEDIUM**

### Good
- Business logic is in `lib/buyer-service.ts`, not in route handlers
- External app clients are isolated in `lib/seller-api.ts`, `lib/shipping-api.ts`, `lib/payments-api.ts`
- Auth logic centralized in `lib/admin-auth.ts` and `lib/service-auth.ts`
- Types separated: `types/buyer.ts` (domain), `types/api.ts` (generic), `types/inter-service.ts` (contracts)

### Problems
- **`createPaymentSession` in `lib/buyer-service.ts` is hardcoded mock** (lines 44–50):
  ```typescript
  export async function createPaymentSession(orderId: string, totalCents: number) {
    return {
      paymentId: `pay_${orderId}`,
      paymentUrl: `https://example-payment.local/checkout?order=${orderId}`,
      totalCents,
    };
  }
  ```
  This function should be calling `lib/payments-api.ts`, but it's returning a hardcoded localhost URL. The real `createPayment()` function in `payments-api.ts` EXISTS but is never called from the checkout route. **This is the single most critical functional defect.**

- **Shipping cost duplicated between API and UI** — The checkout page (`src/app/(auth)/checkout/page.tsx` lines 68–71) hardcodes the shipping cost calculation:
  ```typescript
  const grossCents = 1_000_000 + 400_000 * n;
  const discountPct = Math.min(0.05 * (n - 1), 0.2);
  const totalShipping = Math.round(grossCents * (1 - discountPct)) / 100;
  ```
  This duplicates the mock formula from `lib/shipping-api.ts`. If the mock changes, the UI display will be wrong. These should be derived from the same source.

- **`services/api/` and `hooks/querys/` layers overlap** — There are two layers making API calls: `services/api/*.ts` (Axios call functions) and `hooks/querys/*/` (React Query mutations calling those functions). This is acceptable but creates extra indirection.

---

## 3. API Design

**Severity: HIGH**

### Good
- Routes are versioned under `/api/v1/`
- Correct HTTP verbs used (GET, POST, PATCH, DELETE)
- Zod validation on all request bodies
- Consistent 401/403/404 status codes
- Service token validation reused via `validateServiceToken()`

### Problems
- **Pagination envelope missing from all list APIs**. The documented format `{ data: [...], pagination: { total, page, limit, has_more } }` is absent. All list endpoints return raw arrays.
- **Error format inconsistency** across routes:
  - Checkout: `{ error: "string" }`
  - Status routes: `{ error: { code, message } }`
  - Admin routes: `{ error: "Not found" }` or `{ error: { code, message } }`
- **No `Idempotency-Key` handling** — the spec requires this for POST operations that create resources. The checkout endpoint ignores it entirely.
- **`PATCH /api/v1/orders/{id}/status` has no state transition validation** — an order can go from any status to any status without checking validity. The spec defines strict transitions (e.g., `COMPLETED` → nothing).
- **`/api/products` proxy route** does not pass query parameters from the frontend to Seller App. The `GET /api/products` route ignores any `q=`, `category=`, etc. params from the browser.

---

## 4. Database Design

**Severity: LOW–MEDIUM**

### Good
- Schema accurately represents all 9 required tables
- Correct use of `@unique` constraints (cart per buyer, cart item per product in cart, favorite per product)
- `OrderStatusHistory` table implements audit trail
- Cross-app IDs stored as opaque strings — correct architecture
- Cascade delete on address → buyer profile
- Soft delete via `deletedAt` on `BuyerProfile`

### Problems
- **Missing indexes** on several foreign keys:
  - `OrderItem.orderId` — no explicit index (Prisma may add one automatically for FKs, but not guaranteed)
  - `OrderItem.sellerGroupId` — same
  - `OrderSellerGroup.orderId` — should have index for order detail queries
- **`shippingCostCents` is always stored as 0** per `OrderSellerGroup` even though the `Order.shippingTotalCents` is correct. The per-group shipping breakdown is meaningless.
- **IDs use raw CUIDs** without the documented `ord_`, `byp_`, `adr_` prefixes. This violates the spec but is otherwise functionally fine.
- **`OrderStatusHistory.fromStatus` is empty string `""`** when an order is first created (checkout route line 140). This pollutes the audit trail.

---

## 5. Domain Modeling

**Severity: MEDIUM**

### Good
- Multi-seller order properly modeled with `Order → OrderSellerGroup → OrderItem`
- Shipping status mirrored on `OrderSellerGroup` (not just `Order`) — correct per spec
- Price/weight snapshots correctly captured at cart-add time

### Problems
- **`Product` type in `types/buyer.ts` uses `price` (pesos) instead of `price_cents` (centavos)**. The spec mandates centavo-based integers. The shop page converts: `unitPriceCents: Math.round((product.price ?? 0) * 100)`. This multiplication assumes `price` is in pesos, which is only true for the mock data. If a real Seller App sends `price_cents`, the cart would store values 100x too large.
- **`weightGramsSnapshot: 0`** is hardcoded when adding items to cart from the shop page (`shop/page.tsx` line 33). This means all checkout shipping quotes use 0 grams for items added via the UI, making shipping quotes meaningless.
- **The `SellerGroupStatus` enum has `SETTLED` and `REFUNDED`** but there's no code path that sets them. They're dead states.

---

## 6. Reusability

**Assessment: GOOD**

Shared components (`EmptyState`, `PriceDisplay`, `StatusBadge`, `ProductImage`) are properly factored. The `useApiMutation` generic hook avoids mutation boilerplate. The `validateServiceToken` utility is reused across all inter-service endpoints. The `getOrCreateBuyerProfile` utility centralizes the lazy provisioning pattern.

---

## 7. Coupling

**Severity: MEDIUM**

- The checkout page is tightly coupled to the shipping mock's pricing formula (hardcoded `$10k + $4k/seller`).
- The `seller-api.ts` mock PRODUCTS array is duplicated in `prisma/seed.ts` — two separate sources of truth for mock data.
- The shop page passes `weightGramsSnapshot: 0` hardcoded, coupling it to the assumption that weight doesn't matter in checkout (breaks as soon as Seller App is real).

---

## 8. Scalability

This is an academic project — scalability concerns are minor. However:

- Loading all products in one request (no server-side pagination) would fail at scale.
- No caching on the products proxy (`/api/products`) — each page load triggers a new call to Seller App.
- No rate limiting on any endpoint.

---

## 9. Technical Debt

| Item | Location | Severity |
|---|---|---|
| `createPaymentSession` is a hardcoded mock | `lib/buyer-service.ts:44–50` | CRITICAL |
| No `middleware.ts` | project root | CRITICAL |
| `weightGramsSnapshot: 0` in shop add-to-cart | `shop/page.tsx:33` | HIGH |
| Shipping cost duplicated in checkout UI | `checkout/page.tsx:68–71` | HIGH |
| 26+ UI components with `@ts-nocheck` | `components/ui/` | MEDIUM |
| `hooks/querys/` misspelling | directory name | LOW |
| `OrderStatusHistory` with empty `fromStatus` | checkout route line 140 | MEDIUM |
| No pagination in any list endpoint | all API routes | HIGH |
| Product price in pesos vs spec centavos | `types/buyer.ts`, `seller-api.ts` | HIGH |
| Products proxy ignores filter params | `api/products/route.ts` | MEDIUM |
