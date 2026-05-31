# 09 — General Audit
> Audit generated: 2026-05-31

This file captures additional findings that don't fit neatly into the other audit categories.

---

## 1. Dead Code and Unused Files

### `src/store/use-example-store.ts`
This file contains a Zustand example store. It is not imported or used anywhere. It should be deleted before submission — it looks like leftover boilerplate.

### `src/proxy.ts`
This file exists but its purpose is unclear. Needs review — either document it or delete it.

### `AdminSidebar` and `AdminHeader` components
Both exist in `src/components/admin/` but are not used in any layout. They are implemented but dead.

### `src/components/buyer/cart-item-card.tsx` vs `src/components/cart/cart-item-row.tsx`
Two similar components for cart items in different directories. Likely one is obsolete.

### `src/components/orders/order-status-stepper.tsx` vs `src/components/orders/order-status-flow.tsx`
Two similar components for order status display. One may be unused.

---

## 2. Security Concerns

### 2.1 Service Token Validation Returns 500 on Missing Config
`src/lib/service-auth.ts`:
```typescript
if (!expectedToken) {
  return NextResponse.json(
    { error: { code: "SERVICE_TOKEN_NOT_CONFIGURED", ... } },
    { status: 500 }
  );
}
```
Returning 500 when a config var is missing leaks implementation details. Should return 503 (Service Unavailable) or be handled at startup. More importantly, this means the inter-service endpoints return 500 in production until all tokens are configured — not a security vulnerability per se but a reliability risk.

### 2.2 Admin Auth — No Rate Limiting
The admin endpoints have no rate limiting. A brute force attack on `publicMetadata.admin` checks is mitigated by Clerk's own rate limiting, but there's no additional protection at the app level.

### 2.3 No CSRF Protection on State-Changing API Routes
Next.js App Router API routes don't have built-in CSRF protection. For a marketplace app this is a concern, but Clerk's `auth()` check implicitly validates the session which provides partial protection.

### 2.4 Order Belongs-To Check Missing
In `src/app/api/v1/buyer/orders/[orderId]/route.ts` (GET), the route doesn't verify that the order belongs to the authenticated buyer:
```typescript
// There's no check: order.buyerProfileId === profile.id
const order = await prisma.order.findUnique({ where: { id: orderId } });
```
This means Buyer A could view Buyer B's order if they know the order ID. **This is a data exposure vulnerability.**

### 2.5 Address Validation
The checkout route checks `address.buyerProfileId !== profile.id` — good, this prevents using another buyer's address.

---

## 3. Missing Features (functional gaps)

### 3.1 Order Cancel Endpoint Exists but Not Tested
`POST /api/v1/buyer/orders/{orderId}/cancel` exists at `src/app/api/v1/buyer/orders/[orderId]/cancel/route.ts`. This is good. However, the UI doesn't seem to have a "Cancelar orden" button — the feature exists as an API but may not be accessible from the UI.

### 3.2 No Order Retry After Payment Failure
The spec mentions `POST /api/v1/orders/{id}/retry-payment` as a future feature (in `06-estados-y-diagramas.md`). Orders that fail payment are stuck in `PAYMENT_FAILED` with no recovery path in the UI.

### 3.3 No Receipt/Comprobante View
The spec describes `GET /api/v1/receipts/{id}` (from Payments App). There's no UI in the order detail page to view the payment receipt. `payments-api.ts` has `getPaymentReceipt()` but it's not called anywhere in the UI.

### 3.4 Mock Order Status Not Matching UI
The seed creates orders in `COMPLETED`, `PENDING_PAYMENT`, `PAID`, and `IN_TRANSIT` states. The order list UI should show different status badges for each. Verify that `StatusBadge` component correctly displays all these states.

---

## 4. API-Docs Page

There's a `/api-docs` page (`src/app/api-docs/page.tsx`) with what appears to be Swagger UI integration (`swagger-ui-react` is in package.json). This is a nice addition — if it works, it demonstrates the API is properly documented.

Verify:
- The page actually renders Swagger UI
- The OpenAPI spec (`src/lib/openapi.ts`) covers all implemented endpoints
- The page is accessible without auth (or note that auth is needed)

This is a BONUS feature that could impress the evaluator.

---

## 5. Performance Concerns

### 5.1 Product Loading
All products are loaded client-side via `useProducts()` hook with `GET /api/products`. With 12 mock products this is fast. With a real Seller App catalog, this would be slow.

### 5.2 No `loading.tsx` Files
The App Router supports `loading.tsx` for automatic Suspense boundaries. The app uses manual skeleton components but no `loading.tsx` files. This is not a blocking issue but means the initial page load may show a flash of unstyled content on slower connections.

### 5.3 `next.config.ts` Missing Image Optimization Config
Only `upload.wikimedia.org` is in `remotePatterns`. Any real product CDN URL would require adding to this list before deployment.

---

## 6. Naming and Code Quality

### 6.1 `hooks/querys/` Misspelled
Directory `src/hooks/querys/` should be `src/hooks/queries/`. Minor but visible.

### 6.2 `@ts-nocheck` in 26 UI Components
All shadcn/ui components in `src/components/ui/` have `// @ts-nocheck`. This suppresses all TypeScript errors in these files. In a graded project, this is not ideal but acceptable if it's a library issue (shadcn/ui generated code). If a professor looks at the code, they should know this is standard shadcn/ui output.

### 6.3 Inconsistent Casing in API Responses
API routes return Prisma models directly which use `camelCase` fields (e.g., `buyerProfileId`, `createdAt`). The documented API spec uses `snake_case` (e.g., `buyer_profile_id`, `created_at`). This is a pervasive inconsistency but acceptable for academic purposes.

### 6.4 `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env`
These Supabase client-side keys are present in `.env` but there's no Supabase client library in `package.json` and no Supabase imports in the code. They appear to be leftover from a template. This is confusing but harmless.

---

## 7. Positive Observations

The following are genuine strengths of the implementation:

1. **Clean inter-service architecture** — Seller, Shipping, and Payments API clients are properly isolated with mock fallbacks. This is exactly how Etapa 2 isolation should work.

2. **`OrderStatusHistory` audit trail** — Implemented correctly and used consistently.

3. **Lazy profile provisioning** — `getOrCreateBuyerProfile()` correctly implements the documented pattern.

4. **Multi-seller order model** — `Order → OrderSellerGroup → OrderItem` hierarchy is correctly modeled and matches the spec.

5. **Comprehensive seed data** — Orders in multiple states, multiple seller groups, status history — this is excellent for demonstration.

6. **URL-based shop filtering** — The `useShopFilters` hook persists all filter state in the URL, which is the right approach.

7. **Accessible sign-in flow** — Clerk's components handle most accessibility concerns for auth.

8. **API docs page** — `/api-docs` with Swagger UI is a bonus that demonstrates professionalism.

9. **Server-side validation with Zod** — Consistently applied across all routes.

10. **Responsive design** — Components like `BottomNav`, `MobileHeader`, and `AppSidebar` suggest mobile responsiveness is considered.

---

## 8. Issues in the `doc referencias/` Files vs Implementation

The `doc referencias/` folder contains 17 reference documents for beginners. Some discrepancies with the implementation:

- **`doc referencias/04-api-buyer.md`** — If it documents the API paths without `/v1` prefix (like README does), this is misleading.
- **`doc referencias/17-estados.md`** (newly created, not audited) — Was just opened by the developer, suggesting active work. May contain state diagrams for the defense.

---

## 9. Suggested Additional Checks Before Defense

1. **Run `npm run build` locally** — Verify the build succeeds without errors.
2. **Check all admin pages render without JS errors** — Navigate to `/admin`, `/admin/orders`, `/admin/buyers`, `/admin/carts`.
3. **Test the full checkout flow** on deployed app — Add to cart → checkout → verify redirect.
4. **Test the inter-service endpoints** — Use cURL to verify `PATCH /api/v1/orders/{id}/status` with the correct token.
5. **Verify seed data appears** in the deployed app after running seed.
6. **Test sign-in/sign-out** on deployed app after adding middleware.ts.
