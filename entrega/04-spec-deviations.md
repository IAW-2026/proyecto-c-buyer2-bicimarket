# 04 — Specification vs Implementation Deviations

> Source of truth: `/documentacion/03-apis.md` and `/documentacion/04-modelo-de-datos.md`
> Each deviation is classified: Critical / Important / Minor / Justified

---

## DEV-01: Checkout request body missing `seller_groups` parameter

### Expected
Spec (`documentacion/03-apis.md`, section B5 — `POST /api/v1/buyer/checkout`):
```json
{
  "shipping_address_id": "adr_01H…",
  "seller_groups": [
    { "seller_profile_id": "slp_01H…", "shipping_quote_id": "qte_01H…" },
    { "seller_profile_id": "slp_02H…", "shipping_quote_id": "qte_02H…" }
  ],
  "notes": "Dejar en portería si no hay nadie."
}
```

### Actual
`src/app/api/v1/buyer/checkout/route.ts` validates:
```typescript
const checkoutSchema = z.object({
  shippingAddressId: z.string().min(1),
  notes: z.string().optional(),
  returnUrl: z.string().url(),
});
```
No `seller_groups` with `shipping_quote_id`. The checkout route automatically groups cart items by seller and calls `getShippingQuotes()` internally to get quotes, without requiring the client to pre-fetch quotes and pass them in.

### Files Involved
- `src/app/api/v1/buyer/checkout/route.ts`
- `src/lib/shipping-api.ts`

### Impact
The checkout contract does not match the spec. Other apps (Payments, Seller) that may call this endpoint in Etapa 3 will send the spec-compliant body and receive a 400 validation error. Also, there's no `shipping_quote_id` stored in `OrderSellerGroup.shippingQuoteId` for validation.

### Is the deviation justified?
**YES** — for Etapa 2 isolation. Since Shipping App is mocked, the app calculates quotes internally. The spec's design requires the frontend to first call Shipping App for quotes, then pass quote IDs to checkout, which is a 2-step process. The current implementation collapses this into 1 step internally.

### Required Action
Document this in README under "Decisions de diseño." In Etapa 3, the checkout API will need to be updated to accept the spec-compliant request body. Add a TODO comment in the checkout route.

---

## DEV-02: Payment session is fully mocked

### Expected
Spec (`documentacion/03-apis.md`, section B5): The checkout flow should call `POST /api/v1/payments` on the Payments App, receive `{payment_id, checkout_url}`, redirect to Mercado Pago.

### Actual
`src/lib/buyer-service.ts`:
```typescript
export async function createPaymentSession(orderId: string, totalCents: number) {
  return {
    paymentId: `pay_${orderId}`,
    paymentUrl: `https://example-payment.local/checkout?order=${orderId}`,
    totalCents,
  };
}
```
The payment URL is a fake local URL that does not redirect anywhere useful.

### Files Involved
- `src/lib/buyer-service.ts` (`createPaymentSession`)
- `src/lib/payments-api.ts` (exists but calls `createPaymentSession` which is hardcoded mock)

### Impact
The checkout flow cannot complete. Users who proceed through checkout will receive a non-functional payment URL. Order status will stay at `PENDING_PAYMENT` forever since no payment provider will call the callback.

### Is the deviation justified?
**YES for Etapa 2** — the assignment explicitly allows mocking inter-app calls. The README clearly states this. The contract is maintained (the endpoint returns a URL and order ID).

### Required Action
The README note is sufficient for Etapa 2. In Etapa 3, replace `createPaymentSession` with a real HTTP call to Payments App.

---

## DEV-03: `/api/products` not under `/api/v1/`

### Expected
Spec (`documentacion/02-responsabilidades.md`, §2 Rule 1): "Todos los endpoints viven bajo `/api/v1/...`."

### Actual
`src/app/api/products/route.ts` — catalog proxy endpoint lives at `/api/products`, not `/api/v1/products`.

### Files Involved
- `src/app/api/products/route.ts`
- `src/app/api/products/[productId]/route.ts`

### Impact
The versioning convention is violated. However, this route is an internal UI proxy, not part of the external inter-service API contract. The actual spec endpoint `GET /api/v1/products` is served by the Seller App, not the Buyer App. So the Buyer App is proxying it at a non-standard path for its own frontend use.

### Is the deviation justified?
**YES** — this endpoint is exclusively for the Buyer App's own frontend (the public shop page). It's not in the inter-service contract. Naming it `/api/products` vs `/api/v1/products` is a minor internal convention issue.

### Required Action
None. Optionally rename to `/api/v1/catalog` for consistency.

---

## DEV-04: Checkout response shape differs from spec

### Expected
Spec returns the full order object with seller_groups, items, totals, payment redirect info.

### Actual
`src/app/api/v1/buyer/checkout/route.ts` returns:
```typescript
return NextResponse.json({ paymentUrl: payment.paymentUrl, orderId: order.id });
```

### Files Involved
- `src/app/api/v1/buyer/checkout/route.ts`

### Impact
Minimal — the frontend only uses `paymentUrl` and `orderId` after checkout. But the full order is not returned, meaning the client must make a separate call to `GET /api/v1/buyer/orders/{id}` to display order details. The spec contract is not honored.

### Is the deviation justified?
**YES** — for the frontend use case, only `paymentUrl` and `orderId` are needed immediately. The spec's response shape is aspirational.

### Required Action
Minor. Document in README.

---

## DEV-05: `PATCH /api/v1/orders/{id}/seller-groups/{id}/shipping` — wrong endpoint path in spec

### Expected
Spec (`documentacion/02-responsabilidades.md`, §3.5): Shipping App calls `PATCH /api/v1/orders/{id}/seller-groups/{groupId}/shipping`

### Actual
Implemented at `src/app/api/v1/orders/[orderId]/seller-groups/[groupId]/shipping/route.ts` ✅

The route accepts `{status, shipping_status, shipment_id, tracking_number, tracking_url}`.

### Files Involved
- `src/app/api/v1/orders/[orderId]/seller-groups/[groupId]/shipping/route.ts`

### Impact
No deviation — the endpoint matches the spec path. The request body schema is slightly extended (adds `tracking_url` not in spec), which is not a problem.

### Is the deviation justified?
N/A — this is a match.

### Required Action
None.

---

## DEV-06: `PATCH /api/v1/orders/{id}` — spec says endpoint at `/orders/{id}/status`, implementation at `/orders/{id}`

### Expected
Spec (`documentacion/03-apis.md`, §B5): `PATCH /api/v1/orders/{orderId}` (spec actually uses this path, not `/status`). Implementation matches.

Actually looking at the spec: `PATCH /api/v1/orders/{orderId}/status` (server-to-server from Payments) in `documentacion/02-responsabilidades.md` §3.5 but `PATCH /api/v1/orders/{orderId}` in the API spec `03-apis.md`. There's an inconsistency in the docs themselves.

### Actual
Implemented at `src/app/api/v1/orders/[orderId]/route.ts` as `PATCH /api/v1/orders/{orderId}`.

### Files Involved
- `src/app/api/v1/orders/[orderId]/route.ts`

### Impact
Matches the more authoritative `03-apis.md`. The minor inconsistency is in the documentation itself.

### Is the deviation justified?
YES — implementation follows `03-apis.md` which is the canonical API spec.

### Required Action
None.

---

## DEV-07: Order cancel endpoint at `/buyer/orders/{id}/cancel`, spec says `/buyer/orders/{orderId}/cancel`

### Expected
`POST /api/v1/buyer/orders/{orderId}/cancel`

### Actual
`src/app/api/v1/buyer/orders/[orderId]/cancel/route.ts` ✅ — matches.

### Required Action
None.

---

## DEV-08: Checkout doesn't call Shipping App for quotes per spec flow

### Expected
Spec flow: frontend calls checkout → checkout calls Shipping App's `POST /api/v1/shipping-quotes` to get quote IDs → quote IDs included in checkout body.

### Actual
`src/app/api/v1/buyer/checkout/route.ts` calls `getShippingQuotes()` directly from `src/lib/shipping-api.ts`, which returns either real Shipping App data or a mock calculation. The `shippingQuoteId` is **not stored** in the created `OrderSellerGroup` (the field is left null).

### Files Involved
- `src/app/api/v1/buyer/checkout/route.ts`
- `src/lib/shipping-api.ts`

### Impact
- `OrderSellerGroup.shippingQuoteId` is always `null` in orders created via this flow
- In Etapa 3, Shipping App won't be able to validate the quote when Seller calls `POST /api/v1/shipments`
- The `quoteResponse.total_net_cents` is used to set shipping cost, which is correct in effect

### Is the deviation justified?
**YES for Etapa 2** — Shipping App is mocked.

### Required Action
Add a TODO comment. In Etapa 3: store the `shippingQuoteId` per seller group after quotes are received.

---

## DEV-09: `BuyerProfile` missing `Role` enum field

### Expected
Memory/earlier versions of schema mention a `Role` enum (USER/ADMIN) on `BuyerProfile`.

### Actual
`prisma/schema.prisma` — no `Role` field on `BuyerProfile`. Admin role is managed entirely through Clerk `publicMetadata.admin`. No local role stored in the database.

### Files Involved
- `prisma/schema.prisma`

### Impact
None functional — admin access is correctly gated via Clerk metadata. The local DB doesn't need to duplicate this.

### Is the deviation justified?
**YES** — Clerk is the source of truth for roles per the system design. Duplicating roles in the DB would create a sync problem.

### Required Action
None.

---

## DEV-10: `ShippingStatus` enum includes `CREATED` but spec seller_group shipping_status doesn't start at `CREATED`

### Expected
The `OrderSellerGroup.shippingStatus` should mirror the `shipment.status` states from Shipping App, which starts at `created`. The spec `04-modelo-de-datos.md` §1.1 says:
> `shipping_status` | enum (ver §6.4) — espejo del shipment, sincronizado vía PATCH REST

### Actual
`prisma/schema.prisma` correctly defines `ShippingStatus` with `CREATED` as first value. The `shipping/route.ts` includes `"created"` in the valid enum for the PATCH body.

### Files Involved
- `prisma/schema.prisma`
- `src/app/api/v1/orders/.../shipping/route.ts`

### Impact
No deviation — matches spec.

### Required Action
None.

---

## Summary

| ID | Description | Severity | Justified |
|---|---|---|---|
| DEV-01 | Checkout missing seller_groups/quote_id params | Important | YES (Etapa 2) |
| DEV-02 | Payment session fully mocked | Important | YES (Etapa 2) |
| DEV-03 | /api/products not under /api/v1/ | Minor | YES |
| DEV-04 | Checkout response shape simplified | Minor | YES |
| DEV-05 | Shipping PATCH endpoint | No deviation | N/A |
| DEV-06 | Order status PATCH path | No deviation | N/A |
| DEV-07 | Order cancel endpoint | No deviation | N/A |
| DEV-08 | shippingQuoteId not stored | Important | YES (Etapa 2) |
| DEV-09 | No Role field in BuyerProfile | Minor | YES |
| DEV-10 | ShippingStatus enum | No deviation | N/A |
