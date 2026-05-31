# 04 — Specification Deviations
> Audit generated: 2026-05-31

All deviations are between `/documentacion` (source of truth) and the implementation.

---

## DEV-01 — Payment Session is Fully Mocked

### Expected
`documentacion/02-responsabilidades.md §3.2`: Buyer App must call `POST /api/v1/payments` at Payments App to initiate the charge. The function should call the Payments App via `lib/payments-api.ts`.

### Actual
`src/lib/buyer-service.ts:44–50`:
```typescript
export async function createPaymentSession(orderId: string, totalCents: number) {
  return {
    paymentId: `pay_${orderId}`,
    paymentUrl: `https://example-payment.local/checkout?order=${orderId}`,
    totalCents,
  };
}
```
The `createPayment()` function exists in `lib/payments-api.ts` and IS correctly implemented to call Payments App (with mock fallback), but `createPaymentSession` in `buyer-service.ts` never calls it. This is a stub that was never replaced.

### Files Involved
- `src/lib/buyer-service.ts:44–50`
- `src/lib/payments-api.ts` (the real implementation that is never called)
- `src/app/api/v1/buyer/checkout/route.ts:155` (calls `createPaymentSession`)

### Impact
The checkout flow never calls Payments App. The `paymentUrl` returned to the user is `https://example-payment.local/checkout?...` which is unreachable. The order is created but the user is redirected to a non-existent page. **Checkout is fundamentally broken in production.**

### Is the deviation justified?
**NO**

### Explanation
This appears to be an incomplete implementation — `payments-api.ts` has the real code but `buyer-service.ts` still has the stub. This is likely a missed step during development.

### Required Action
**MUST FIX**: Replace `createPaymentSession` call with `createPayment()` from `lib/payments-api.ts`, passing the proper payload.

---

## DEV-02 — No Clerk Middleware

### Expected
`documentacion/07-clerk-autenticacion.md` (doc referencias): Clerk requires a middleware for auth state propagation.

### Actual
No `middleware.ts` file exists in the project root or `src/`. The Clerk SDK is installed but not initialized at the edge.

### Files Involved
- `middleware.ts` — does not exist
- `src/app/(auth)/layout.tsx` — does its own `auth()` check but without middleware the session may not be properly set

### Impact
Without Clerk middleware:
1. `auth()` calls in server components may return `{ userId: null }` even for authenticated users in production.
2. Routes are not protected at the CDN/edge level — auth checks are only at the server component level.
3. Clerk's `<ClerkProvider>` client-side state won't be properly synced.
4. The deployed Vercel app may have intermittent or total auth failures.

### Is the deviation justified?
**NO** — this is a missing required configuration

### Explanation
The middleware is required for `@clerk/nextjs` v7 to function correctly in production. Its absence is a setup omission.

### Required Action
**MUST FIX**: Create `middleware.ts` in project root with Clerk middleware configuration.

---

## DEV-03 — Price in Pesos vs Centavos

### Expected
`documentacion/03-apis.md §0.7`: "Montos en centavos como entero (`amount_cents: 1599900` = ARS 15.999,00)." All prices must be integers in centavos.

### Actual
`src/lib/seller-api.ts` mock data uses prices in pesos:
```typescript
{ price: 450000 }  // This should be price_cents: 45000000
```

`src/types/inter-service.ts` `SellerProduct` type uses `price: number` field, not `price_cents`.

`src/app/shop/page.tsx:33`:
```typescript
unitPriceCents: Math.round((product.price ?? 0) * 100),
```
This assumes `price` is in pesos and multiplies by 100 to get centavos.

### Files Involved
- `src/lib/seller-api.ts` (mock prices in pesos)
- `src/types/inter-service.ts` (`price` field naming)
- `src/app/shop/page.tsx:33` (conversion `* 100`)

### Impact
If the real Seller App (following spec) sends `price_cents: 45000000`, the Buyer App would store `4500000000` (100x too large) in `cart.unitPriceCents`. This would corrupt all order totals. The mock works because the mock prices ARE in pesos, but the real integration would break.

### Is the deviation justified?
**NO** — this is an incorrect mapping of the documented contract

### Explanation
The mock data and types don't follow the `price_cents` convention from the spec. When the real Seller App is connected, all price handling will be wrong.

### Required Action
Rename `price` to `price_cents` in `SellerProduct` type, update mock data to use centavo values, remove the `* 100` multiplication.

---

## DEV-04 — Pagination Missing from All List APIs

### Expected
`documentacion/02-responsabilidades.md §4`: "GET de listado devuelve `{ data: [...], pagination: { total, page, limit, has_more } }`. Default `limit=20`, máximo `limit=100`."

### Actual
All list endpoints return raw arrays without the pagination envelope:
- `GET /api/v1/buyer/orders` → returns `Order[]`
- `GET /api/v1/buyer/addresses` → returns `Address[]` (implied from usage)
- `GET /api/admin/orders` → returns `Order[]`
- `GET /api/admin/buyers` → returns `BuyerProfile[]`

None support `?page=` or `?limit=` query parameters.

### Files Involved
- `src/app/api/v1/buyer/orders/route.ts`
- `src/app/api/admin/orders/route.ts`
- `src/app/api/admin/buyers/route.ts`
- `src/app/api/admin/carts/route.ts`

### Impact
APIs don't follow the documented contract. External apps consuming these endpoints (in Etapa 3) would get unexpected response shapes. Admin and buyer UIs would load all records at once, breaking with real data.

### Is the deviation justified?
**NO**

### Explanation
Pagination is explicitly required by the assignment rubric AND the inter-service contract documentation.

### Required Action
Add `page`/`limit` query param parsing and wrap all list responses in `{ data, pagination }` envelope.

---

## DEV-05 — Weight Snapshot is Always 0

### Expected
`documentacion/04-modelo-de-datos.md §1.1 cart_items`: `weight_grams_snapshot` must capture the actual weight of the product at cart-add time for use in shipping quotes.

### Actual
`src/app/shop/page.tsx:33`:
```typescript
weightGramsSnapshot: 0,
```
When a user adds a product to cart from the shop UI, the weight is always stored as 0 grams.

### Files Involved
- `src/app/shop/page.tsx:33`

### Impact
Shipping quotes are calculated with 0-gram packages. The mock shipping API ignores this (uses a fixed formula), but a real Shipping App would return incorrect quotes or reject the request.

### Is the deviation justified?
**PARTIALLY** — The `weight_grams` field exists in the `SellerProduct` type but the shop page doesn't pass it when adding to cart.

### Explanation
The shop page `handleAddToCart` function doesn't access `product.weight_grams` (which is available in `SellerProduct` but may not be mapped into the `Product` type used in the shop UI).

### Required Action
Pass `product.weight_grams ?? 0` → map `SellerProduct.weight_grams` through to `Product` type → use it in `handleAddToCart`.

---

## DEV-06 — ID Format Without Resource Prefixes

### Expected
`documentacion/04-modelo-de-datos.md §0`: "IDs: `String @id @default(cuid())` con prefijo de recurso (`ord_`, `prd_`, etc.) generado en aplicación."

### Actual
`prisma/schema.prisma`:
```prisma
model Order {
  id String @id @default(cuid())  // No prefix — generates e.g. "clxyz123..."
}
```
No custom ID generation logic exists. IDs are raw CUIDs.

### Files Involved
- `prisma/schema.prisma` — all models

### Impact
API responses show IDs like `clxyz123abc456def789` instead of `ord_clxyz123abc456def789`. Inter-service communication relies on these IDs. The deviation is cosmetic but visible during demos and oral defense.

### Is the deviation justified?
**PARTIALLY** — The spec calls for prefixes but raw CUIDs are functionally equivalent. For academic purposes this is acceptable but deviates from the stated contract.

### Required Action
Generate IDs with `cuid()` in application code and add prefix before storing. Or accept the deviation and document it.

---

## DEV-07 — Shipping Cost Per Group Always 0

### Expected
`documentacion/04-modelo-de-datos.md §1.1 order_seller_groups`: `shipping_cost_cents` should contain the shipping cost for that specific seller group.

### Actual
`src/app/api/v1/buyer/checkout/route.ts:118`:
```typescript
shippingCostCents: 0,  // Always 0
```
The total shipping is stored in `Order.shippingTotalCents` but each `OrderSellerGroup.shippingCostCents` is 0.

### Files Involved
- `src/app/api/v1/buyer/checkout/route.ts:118`

### Impact
The per-group shipping breakdown shown in order detail views will show $0 per seller group. The total is correct but the breakdown is wrong.

### Is the deviation justified?
**NO** — The quote response contains per-seller costs (`quoteResponse.quotes[i].cost_cents`) which should be mapped to each group.

### Required Action
Map `quoteResponse.quotes.find(q => q.seller_profile_id === g.sellerProfileId)?.cost_cents ?? 0` to `shippingCostCents` in each seller group.

---

## DEV-08 — Admin Layout Missing Navigation

### Expected
The admin panel should be a usable UI with navigation between admin sub-pages.

### Actual
`src/app/admin/layout.tsx`:
```typescript
return (
  <main className="flex-1 overflow-y-auto">
    {children}
  </main>
);
```
No sidebar, no header, no navigation. `AdminSidebar` and `AdminHeader` components exist but are not used.

### Files Involved
- `src/app/admin/layout.tsx`
- `src/components/admin/admin-sidebar.tsx` (exists, unused)
- `src/components/admin/admin-header.tsx` (exists, unused)

### Impact
Admin panel is navigable only by typing URLs manually. Evaluators who don't know the admin routes won't find the buyers or carts pages.

### Is the deviation justified?
**NO**

### Required Action
Add `AdminSidebar` and `AdminHeader` to admin layout.

---

## DEV-09 — Missing `.env.example`

### Expected
Assignment requirement: "Incluir en el repositorio un archivo `.env.example` con los nombres de las variables necesarias pero sin sus valores."

### Actual
No `.env.example` file exists.

### Files Involved
- `.env.example` — does not exist

### Impact
Anyone cloning the repo (including the evaluator) has no documented list of required environment variables.

### Is the deviation justified?
**NO** — this is an explicit delivery requirement

### Required Action
Create `.env.example` with all required variable names (no values).

---

## DEV-10 — README Missing Deploy URL and Credentials

### Expected
Assignment: "README breve y conciso, debe incluir: descripción de la app, link al deploy, y credenciales o instrucciones para acceder con cada tipo de usuario."

### Actual
README has description and tech stack but no deploy URL and no user credentials.

### Files Involved
- `README.md`

### Impact
Evaluators cannot access the deployed app or log in without hunting for credentials.

### Is the deviation justified?
**NO** — explicit rubric requirement

### Required Action
Add deploy URL and user credentials to README.

---

## DEV-11 — Products Proxy Ignores Filter Parameters

### Expected
The shop should send filter params (`q`, `category`, etc.) to Seller App for server-side filtering.

### Actual
`src/app/api/products/route.ts`:
```typescript
export async function GET() {
  const { data } = await getSellerProducts({ status: "active" });
  // No query params from the request are forwarded
  return NextResponse.json(data.map(toProduct));
}
```
And `src/lib/seller-api.ts:getSellerProducts()` accepts params but is called with no user params.

### Files Involved
- `src/app/api/products/route.ts`
- `src/lib/seller-api.ts`

### Impact
All filtering is done client-side on the full product list. With real Seller App data (potentially thousands of products), this would load everything and then filter in the browser — performance issue and UX problem.

### Is the deviation justified?
**PARTIALLY** — client-side filtering works for the mock 12 products. But with real data it would fail.

### Required Action
Pass search params from the request to `getSellerProducts()`.

---

## Summary

| # | Deviation | Severity | Justified |
|---|---|---|---|
| DEV-01 | Payment session hardcoded mock | CRITICAL | NO |
| DEV-02 | No Clerk middleware | CRITICAL | NO |
| DEV-03 | Price in pesos vs centavos | HIGH | NO |
| DEV-04 | No pagination on list APIs | HIGH | NO |
| DEV-05 | Weight snapshot always 0 | HIGH | PARTIALLY |
| DEV-06 | ID format without prefix | LOW | PARTIALLY |
| DEV-07 | Shipping cost per group always 0 | MEDIUM | NO |
| DEV-08 | Admin layout missing navigation | MEDIUM | NO |
| DEV-09 | Missing `.env.example` | HIGH | NO |
| DEV-10 | README missing URL and credentials | HIGH | NO |
| DEV-11 | Products proxy ignores filter params | MEDIUM | PARTIALLY |
