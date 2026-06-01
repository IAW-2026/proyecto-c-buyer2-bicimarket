# 04 — Specification vs Implementation Deviations

> Source of truth: `documentacion/03-apis.md`, `documentacion/04-modelo-de-datos.md`, `documentacion/02-responsabilidades.md`

---

## DEV-01: Checkout Payment Integration (CRITICAL)

### Expected
`documentacion/03-apis.md §P1`: Buyer App calls `POST /api/v1/payments` on Payments App, receives `{ payment_id, checkout_url }`, stores `payment_id`, and redirects buyer to `checkout_url`.

`documentacion/02-responsabilidades.md §3.2`: Buyer App must "Disparar el cobro hacia Payments con un `Idempotency-Key` único por orden."

### Actual
`src/app/api/v1/buyer/checkout/route.ts:168` calls `createPaymentSession` from `lib/buyer-service.ts`, which returns a **hardcoded mock**:
```ts
export async function createPaymentSession(orderId: string, totalCents: number) {
  return {
    paymentId: `pay_${orderId}`,
    paymentUrl: `https://example-payment.local/checkout?order=${orderId}`,
    totalCents,
  };
}
```
`lib/payments-api.ts::createPayment` (the correct function that would call the real Payments App) **is never invoked** by the checkout flow.

### Files Involved
- `src/app/api/v1/buyer/checkout/route.ts` (line 168)
- `src/lib/buyer-service.ts` (lines 44-50)
- `src/lib/payments-api.ts` (correct implementation, unused in checkout)

### Impact
Checkout is completely broken in production. The buyer is redirected to `https://example-payment.local/...` which does not exist. No real payment is ever initiated. Even when `PAYMENTS_APP_URL` is set correctly, the Payments App is never contacted during checkout.

### Is the deviation justified?
**NO.** The `payments-api.ts` file already has the correct implementation ready to use. This appears to be an integration oversight where the developer wrote the mock in `buyer-service.ts` during development and forgot to replace it with the real call.

### Required Action
In `checkout/route.ts`, replace the call to `createPaymentSession` with a call to `createPayment` from `payments-api.ts`:
```ts
import { createPayment } from "@/lib/payments-api";
// ...
const payment = await createPayment({
  order_id: order.id,
  buyer_clerk_user_id: userId,
  buyer_profile_id: profile.id,
  amount_cents: totalCents,
  currency: "ARS",
  items_summary: groupedData.map(g => ({
    seller_profile_id: g.sellerProfileId,
    subtotal_cents: g.itemsSubtotalCents,
    shipping_cost_cents: g.shippingCostCents,
  })),
  idempotency_key: crypto.randomUUID(),
  return_urls: {
    success: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}?payment=success`,
    failure: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}?payment=failure`,
    pending: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}?payment=pending`,
  },
});
```

---

## DEV-02: Cart POST — Client-Supplied Price Data

### Expected
`documentacion/03-apis.md §B3`: `POST /api/v1/buyer/cart` request body is `{ "product_id": "prd_01H…", "quantity": 1 }`. The documentation states: "Buyer App llama internamente a `GET /api/v1/products/{id}/availability` en Seller App para resolver `seller_profile_id`, `unit_price_cents`, `weight_grams`."

### Actual
`src/app/api/v1/buyer/cart/route.ts:7-15` accepts and validates:
```ts
const cartItemSchema = z.object({
  productId: z.string().min(1),
  sellerProfileId: z.string().min(1),
  productNameSnapshot: z.string().min(1),
  unitPriceCents: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  weightGramsSnapshot: z.number().int().nonnegative(),
  currency: z.string().optional(),
});
```
The server accepts whatever price the client sends, never calls Seller App.

### Files Involved
- `src/app/api/v1/buyer/cart/route.ts`
- `src/lib/seller-api.ts` (has `getProductAvailability` — unused in cart route)
- `src/app/shop/page.tsx` (the frontend that sends all product data from mock)

### Impact
- **Security**: Buyer can set `unitPriceCents: 1` for any product, creating orders at ARS 0.01
- **Spec violation**: Seller App availability is never verified before adding to cart
- **Functional**: Products added to cart may reflect stale prices if mock changes

### Is the deviation justified?
**NO.** The availability check is both a business requirement (confirm product is active) and a security requirement (server-side price resolution). The deviation is a development shortcut.

### Required Action
Modify `cart/route.ts` to accept only `{ productId, quantity }`, then call `getProductAvailability(productId)` to resolve seller ID, price, and weight. Return 409 if product is not active.

---

## DEV-03: Checkout Schema — Missing seller_groups Array

### Expected
`documentacion/03-apis.md §B5` checkout request:
```json
{
  "shipping_address_id": "adr_01H…",
  "seller_groups": [
    { "seller_profile_id": "slp_01H…", "shipping_quote_id": "qte_01H…" },
    { "seller_profile_id": "slp_02H…", "shipping_quote_id": "qte_02H…" }
  ],
  "notes": "..."
}
```

### Actual
`src/app/api/v1/buyer/checkout/route.ts:12-16`:
```ts
const checkoutSchema = z.object({
  shippingAddressId: z.string().min(1),
  notes: z.string().optional(),
  returnUrl: z.string().url(),
});
```
No `seller_groups` or `shipping_quote_id`. The checkout calls Shipping App internally and generates quotes without storing or validating `quote_id`.

### Files Involved
- `src/app/api/v1/buyer/checkout/route.ts`
- `src/lib/shipping-api.ts`

### Impact
- Shipping quotes are never persisted with TTL validation — a quote cannot expire because it's never stored
- `shippingQuoteId` on `OrderSellerGroup` is always `null` (set to null implicitly since never provided)
- Actually: the code does set `shippingQuoteId: "quote_seed_002"` in seed but the real checkout never provides it
- Downstream systems (Seller App, Shipping App) cannot validate a quote against a stored record

### Is the deviation justified?
**PARTIALLY**. If Shipping App is mocked (no real quote TTL enforcement), this works. But it breaks the contract when real apps are integrated.

### Required Action
Accept `seller_groups` with `shipping_quote_id` in the checkout schema, OR document explicitly that quote IDs are not stored/validated in this implementation.

---

## DEV-04: OrderSellerGroup.shippingCostCents Always Zero

### Expected
`documentacion/04-modelo-de-datos.md §1.1`: `order_seller_groups.shipping_cost_cents` should reflect "el costo de envío cotizado para este grupo."

### Actual
`src/app/api/v1/buyer/checkout/route.ts:132`:
```ts
shippingCostCents: 0,
```
The total shipping is calculated correctly (`shippingTotalCents` in `Order`), but the per-group breakdown always shows 0.

### Files Involved
- `src/app/api/v1/buyer/checkout/route.ts` (line 132)

### Impact
- `OrderSellerGroup.shippingCostCents` is always 0 in the DB
- API responses for order detail will show 0 shipping per seller group
- Downstream apps (Seller App receiving sales_order) may receive incorrect `shipping_cost_cents`
- Admin panel showing per-group cost will be wrong

### Is the deviation justified?
**NO.** The shipping quotes are calculated by `getShippingQuotes` and `total_net_cents` is available. The per-group cost needs to be distributed from this total.

### Required Action
Distribute shipping cost per seller group. The simplest approach: divide `shippingTotalCents` equally or use per-group quote if available.

---

## DEV-05: No Idempotency-Key Support

### Expected
`documentacion/02-responsabilidades.md §2` Rule 5: "todo POST que crea recursos acepta header `Idempotency-Key`."
`documentacion/03-apis.md §B5`: "`POST /api/v1/buyer/checkout` — **Idempotency-Key obligatorio.**"

### Actual
Checkout (`checkout/route.ts`) reads the request body but never reads the `Idempotency-Key` header. No deduplication logic exists.

### Files Involved
- `src/app/api/v1/buyer/checkout/route.ts`

### Impact
A double-click or network retry could create two identical orders for the same cart.

### Is the deviation justified?
**NO.** This is explicitly required for checkout.

### Required Action
Read `Idempotency-Key` header in checkout. Check DB for existing order with that key before creating a new one. Return existing order if found.

---

## DEV-06: Order Cancellation Allows PAID Orders

### Expected
`documentacion/03-apis.md §B5`: "Solo si `status=pending_payment`."

### Actual
`src/app/api/v1/buyer/orders/[orderId]/cancel/route.ts:7-11`:
```ts
const CANCELLABLE_STATUSES: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAID",
  "PAYMENT_FAILED",
];
```
Allows cancellation of `PAID` orders, which the spec explicitly forbids.

### Files Involved
- `src/app/api/v1/buyer/orders/[orderId]/cancel/route.ts`

### Impact
A buyer could cancel an order that has already been paid, potentially without refund logic being triggered.

### Is the deviation justified?
**PARTIALLY**. Including `PAYMENT_FAILED` makes sense (buyer should be able to dismiss failed orders). Including `PAID` is incorrect per spec.

### Required Action
Remove `"PAID"` from `CANCELLABLE_STATUSES`. Consider keeping `PAYMENT_FAILED`.

---

## DEV-07: No middleware.ts for Clerk

### Expected
`documentacion/05-usuarios.md §3` and Clerk Next.js documentation: authentication should be enforced at the middleware level to protect routes from edge.

### Actual
No `middleware.ts` in project root or `src/`. Auth is only checked at:
1. Layout component level (page routes)
2. Individual API route handlers

### Files Involved
- (file missing: `src/middleware.ts` or `middleware.ts`)

### Impact
- Without middleware, Next.js edge runtime does not pre-validate auth tokens before rendering
- API routes are still protected by individual `auth()` calls, so API security is intact
- Page routes could briefly render before redirect in SSR, depending on how Clerk handles this

### Is the deviation justified?
**MINOR**. The app still functions securely for API routes. The gap is primarily about best practice and edge-level protection.

### Required Action
Add `middleware.ts`:
```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
const isProtectedRoute = createRouteMatcher(["/(auth)(.*)", "/admin(.*)"]);
export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});
export const config = { matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"] };
```

---

## DEV-08: Profile PATCH Missing default_shipping_address_id

### Expected
`documentacion/03-apis.md §B1`: PATCH profile allows updating `default_shipping_address_id`.

### Actual
`src/app/api/v1/buyer/profile/route.ts:7-10`:
```ts
const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
});
```
No `defaultShippingAddressId` field.

### Files Involved
- `src/app/api/v1/buyer/profile/route.ts`

### Impact
Buyer cannot update their default shipping address via API. The UI address selector in checkout would need a workaround.

### Is the deviation justified?
**NO.** The field is documented as settable.

### Required Action
Add `defaultShippingAddressId: z.string().optional()` to the profile patch schema.

---

## DEV-09: IDs Without Resource Prefixes

### Expected
`documentacion/04-modelo-de-datos.md §0`: "IDs: `String @id @default(cuid())` con prefijo de recurso (`ord_`, `prd_`, etc.) generado en aplicación."

### Actual
`prisma/schema.prisma`: All models use `@id @default(cuid())` with no prefix. IDs are bare CUIDs.

### Files Involved
- `prisma/schema.prisma` (all model definitions)

### Impact
IDs are not distinguishable by type. Log messages and API responses will show opaque IDs without type context. Less impactful for correctness, more for debuggability.

### Is the deviation justified?
**PARTIALLY**. Many production apps skip prefixes. In an academic context where the spec explicitly requires them, it's a deviation.

### Required Action
Create a helper `createId(prefix: string)` that returns `prefix + cuid()`. Use in model defaults via application-level generation before insert.

---

## DEV-10: No X-Request-Id Propagation

### Expected
`documentacion/02-responsabilidades.md §2` Rule 8: "cada request inter-app lleva `X-Request-Id: <uuid>` que se propaga en cadena."

### Actual
`src/lib/service-client.ts` creates Axios instances with `X-Service-Token` but no `X-Request-Id` header.

### Files Involved
- `src/lib/service-client.ts`

### Impact
Cross-app request tracing is not possible. Cannot correlate a buyer checkout with downstream shipping/payment calls in logs.

### Is the deviation justified?
**MINOR** for an academic project. Would be critical in production.

### Required Action
In `service-client.ts`, add a request interceptor that generates and forwards `X-Request-Id: crypto.randomUUID()`.

---

## DEV-11: No Retry Logic on Inter-App Calls

### Expected
`documentacion/02-responsabilidades.md §2` Rule 7: "Si fallan con 5xx o timeout, el emisor reintenta hasta 3 veces con backoff lineal (1s, 3s, 9s)."

### Actual
`src/lib/service-client.ts` creates a plain Axios instance with no retry interceptor. If Seller/Shipping/Payments App returns 5xx, the error propagates immediately.

### Files Involved
- `src/lib/service-client.ts`

### Impact
Transient failures in other apps will immediately fail the buyer request. For a demo where apps are stable, low impact. In production, high impact.

### Is the deviation justified?
**MINOR** for academic scope.

### Required Action
Add axios-retry or a manual retry interceptor in `service-client.ts`.

---

## DEV-12: Seed Price Inconsistency

### Expected
Seed data should match mock product data for a coherent demo.

### Actual
- `prisma/seed.ts` Trek Marlin: `price: 450000` (ARS 4,500 in centavos = ARS 45.00 if 100-based, or ARS 4,500 if already centavos)
- `src/lib/seller-api.ts` MOCK_PRODUCTS Trek Marlin: `price_cents: 130000000` (ARS 1,300,000)

These are wildly different values for the same product by the same ID (`prd_mock_001`).

### Files Involved
- `prisma/seed.ts` (line 12-17)
- `src/lib/seller-api.ts` (line 79-92)

### Impact
Order history (seeded at ARS 4,500) will look inconsistent compared to the shop (showing ARS 1,300,000). A professor examining orders vs shop prices will see a mismatch.

### Is the deviation justified?
**NO.** Simple oversight.

### Required Action
Align seed prices with mock product prices. Use `price_cents: 130000000` in seed for Trek Marlin.
