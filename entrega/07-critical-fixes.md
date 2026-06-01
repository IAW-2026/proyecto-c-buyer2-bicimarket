# 07 — Critical Fix List

> Prioritized by grading impact. Fix in this order.

---

# MUST FIX BEFORE SUBMISSION

---

## FIX-01: Replace Mock Payment Function in Checkout (INTEGRACION??)

**Severity:** CRITICAL  
**Affected Files:** `src/app/api/v1/buyer/checkout/route.ts` (line 168), `src/lib/buyer-service.ts` (lines 44-50)  
**Estimated Effort:** 30 minutes  
**Grading Impact:** Any end-to-end checkout demo will fail. Professor cannot complete the purchase flow. This alone could fail the demo.

**What to do:**

1. In `src/app/api/v1/buyer/checkout/route.ts`, remove the import of `createPaymentSession` from `buyer-service` and add import from `payments-api`:

```ts
// REMOVE:
import { createPaymentSession, ... } from "@/lib/buyer-service";
// ADD:
import { createPayment } from "@/lib/payments-api";
```

2. Replace the call at line 168:

```ts
// REMOVE:
const payment = await createPaymentSession(order.id, totalCents);

// ADD:
const payment = await createPayment({
  order_id: order.id,
  buyer_clerk_user_id: userId,
  buyer_profile_id: profile.id,
  amount_cents: totalCents,
  currency: "ARS",
  items_summary: groupedData.map((g) => ({
    seller_profile_id: g.sellerProfileId,
    subtotal_cents: g.itemsSubtotalCents,
    shipping_cost_cents: 0, // update after FIX-03
  })),
  idempotency_key: crypto.randomUUID(),
  return_urls: {
    success: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}?payment=success`,
    failure: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}?payment=failure`,
    pending: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}?payment=pending`,
  },
});
```

3. Update the order update to use correct field names from `PaymentSession` type:

```ts
await prisma.order.update({
  where: { id: order.id },
  data: { paymentId: payment.payment_id },
});

return NextResponse.json({ paymentUrl: payment.checkout_url, orderId: order.id });
```

4. Add `NEXT_PUBLIC_APP_URL=https://proyecto-c-buyer2-bicimarket.vercel.app` to `.env` and `.env.example`.

5. Delete `createPaymentSession` from `src/lib/buyer-service.ts`.

---

## FIX-02: Configure Missing Service Tokens (INTEGRACION DESPUES)

**Severity:** CRITICAL  
**Affected Files:** `.env` (local and Vercel dashboard)  
**Estimated Effort:** 15 minutes (coordination with other teams required)  
**Grading Impact:** Other apps cannot notify Buyer App of status changes. Any integration demo will show 500 errors on Buyer's inter-app endpoints.

**What to do:**

Uncomment and fill in `.env`:

```env
BUYER_TO_SHIPPING_SERVICE_TOKEN=<agree on value with Enrique Seitz>
BUYER_TO_PAYMENTS_SERVICE_TOKEN=<agree on value with Rocco Paoloni>
PAYMENTS_TO_BUYER_SERVICE_TOKEN=<same value as Rocco's PAYMENTS_TO_BUYER token>
SHIPPING_TO_BUYER_SERVICE_TOKEN=<same value as Enrique's SHIPPING_TO_BUYER token>
SELLER_TO_BUYER_SERVICE_TOKEN=<same value as Pierino's SELLER_TO_BUYER token>
```

Also fix the trailing space in `PAYMENTS_APP_URL`:
```env
PAYMENTS_APP_URL=https://proyecto-c-payments-bicimarket.vercel.app
```

Add all these to Vercel dashboard Environment Variables. Redeploy after updating.

---

## FIX-03: Fix ShippingCostCents Per Seller Group (LISTO)

**Severity:** IMPORTANT  
**Affected Files:** `src/app/api/v1/buyer/checkout/route.ts` (line 132)  
**Estimated Effort:** 20 minutes  
**Grading Impact:** Admin panel and API responses will show ARS 0 shipping per seller group even when shipping was charged. A professor examining an order in the DB will see this.

**What to do:**

The mock shipping response provides `total_net_cents` as a combined total. Until the shipping API provides per-seller costs, divide the total equally:

```ts
const shippingPerGroup = Math.round(shippingTotalCents / groupedData.length);

const createdGroups = await Promise.all(
  groupedData.map((g) =>
    prisma.orderSellerGroup.create({
      data: {
        orderId: order.id,
        sellerProfileId: g.sellerProfileId,
        itemsSubtotalCents: g.itemsSubtotalCents,
        shippingCostCents: shippingPerGroup, // was: 0
        weightGramsTotal: g.weightGramsTotal,
        status: "PENDING",
      },
    }),
  ),
);
```

---

## FIX-04: Fix Cart POST to Resolve Price Server-Side

**Severity:** IMPORTANT  
**Affected Files:** `src/app/api/v1/buyer/cart/route.ts`  
**Estimated Effort:** 45 minutes  
**Grading Impact:** A professor testing the cart API directly can send any price. This is an obvious security flaw that will be noticed.

**What to do:**

Replace client-supplied product data with server-resolved data:

```ts
// New minimal schema:
const cartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(10),
});

// In POST handler, after validating schema:
const availability = await getProductAvailability(parsed.data.productId);
if (!availability || availability.status !== "active") {
  return NextResponse.json(
    { error: { code: "PRODUCT_NOT_ACTIVE", message: "El producto no está disponible", details: {} } },
    { status: 409 }
  );
}
```

Then use `availability.price_cents`, `availability.weight_grams`, `availability.seller_profile_id`, etc. to build the cart item.

Note: If Seller App is not configured, `getProductAvailability` returns a mock. The mock doesn't need to change — prices will be resolved from the mock catalog server-side, not from the client.

---

## FIX-05: Fix Order Cancellation to Reject PAID Orders

**Severity:** IMPORTANT  
**Affected Files:** `src/app/api/v1/buyer/orders/[orderId]/cancel/route.ts` (line 7-11)  
**Estimated Effort:** 5 minutes  
**Grading Impact:** A professor testing the cancel endpoint with a paid order can demonstrate incorrect behavior.

**What to do:**

```ts
// Change:
const CANCELLABLE_STATUSES: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAID",         // remove this
  "PAYMENT_FAILED",
];

// To:
const CANCELLABLE_STATUSES: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAYMENT_FAILED",
];
```

---

## FIX-06: Fix Profile PATCH to Support default_shipping_address_id

**Severity:** IMPORTANT  
**Affected Files:** `src/app/api/v1/buyer/profile/route.ts`  
**Estimated Effort:** 10 minutes  
**Grading Impact:** Profile management is incomplete without this. The UI address selector needs this to set a default.

**What to do:**

```ts
const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  defaultShippingAddressId: z.string().optional().nullable(),
});
```

And update the prisma call to include the new field.

---

## FIX-07: Add middleware.ts for Clerk Route Protection

**Severity:** IMPORTANT  
**Affected Files:** Create `src/middleware.ts`  
**Estimated Effort:** 10 minutes  
**Grading Impact:** Shows awareness of Clerk best practices. A professor checking the Clerk setup will expect this.

**What to do:**

Create `src/middleware.ts`:

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/(auth)(.*)",
  "/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

---

## FIX-08: Align Seed Prices with Mock Products

**Severity:** MINOR  
**Affected Files:** `prisma/seed.ts`  
**Estimated Effort:** 10 minutes  
**Grading Impact:** Seeded orders will show different prices than the shop. Looks inconsistent in a demo.

**What to do:**

Update `MOCK_PRODUCTS` in `seed.ts` to match `seller-api.ts` prices:

```ts
const MOCK_PRODUCTS = [
  { id: "prd_mock_001", name: "Bicicleta de montaña Trek Marlin 5", price: 130000000, weightGrams: 13500, ... },
  { id: "prd_mock_002", name: "Bicicleta urbana Totem City", price: 1800000000, weightGrams: 11000, ... },
  { id: "prd_mock_003", name: "Casco ciclismo Giro Register", price: 5500000, weightGrams: 320, ... },
];
```

After changing, delete existing seeded orders and re-run `npm run seed`.

---

## FIX-09: Fix 404 Page Typo

**Severity:** MINOR  
**Affected Files:** `src/app/not-found.tsx`  
**Estimated Effort:** 1 minute  
**Grading Impact:** Small but visible. Shows attention to detail.

```ts
// Change:
"La pagina que buscas no existe."
// To:
"La página que buscas no existe."
```

---

## FIX-10: Fix Admin API Error Format

**Severity:** MINOR  
**Affected Files:** `src/lib/admin-auth.ts` (lines 13, 16)  
**Estimated Effort:** 5 minutes  
**Grading Impact:** Inconsistent with rest of API. Minor.

```ts
// Change line 13:
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// To:
return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "No autorizado", details: {} } }, { status: 401 });

// Change line 16:
return NextResponse.json({ error: "Forbidden" }, { status: 403 });
// To:
return NextResponse.json({ error: { code: "FORBIDDEN", message: "Acceso denegado", details: {} } }, { status: 403 });
```

---

# SHOULD FIX BEFORE DEFENSE

---

## FIX-11: Delete Vim Swap File

**Severity:** MINOR  
**Affected Files:** `src/components/admin/.orders-table.tsx.swp`  
**Estimated Effort:** 1 minute  

```bash
rm "src/components/admin/.orders-table.tsx.swp"
echo "*.swp" >> .gitignore
git rm --cached "src/components/admin/.orders-table.tsx.swp"
```

---

## FIX-12: Move Admin/Products API Routes Under /api/v1/

**Severity:** MINOR  
**Affected Files:** `src/app/api/admin/`, `src/app/api/products/`  
**Estimated Effort:** 30 minutes (+ update all references)  
**Notes:** Move to `src/app/api/v1/admin/` and `src/app/api/v1/products/` and update all fetch calls. Low priority — only matters if professor checks URL conventions strictly.

---

## FIX-13: Add Idempotency-Key to Checkout

**Severity:** MINOR  
**Affected Files:** `src/app/api/v1/buyer/checkout/route.ts`  
**Estimated Effort:** 30 minutes  
**Notes:** Read `Idempotency-Key` header, store with order, return existing order on retry.

---

# NICE TO HAVE

---

## FIX-14: Add Server-Side Pagination to Shop

**Severity:** MINOR  
**Affected Files:** `src/app/api/products/route.ts`, `src/lib/seller-api.ts`, shop page  
**Estimated Effort:** 1 hour  

---

## FIX-15: Add X-Request-Id Propagation

**Severity:** MINOR  
**Affected Files:** `src/lib/service-client.ts`  
**Estimated Effort:** 15 minutes  

---

## FIX-16: Add Retry Logic to Service Client

**Severity:** MINOR  
**Affected Files:** `src/lib/service-client.ts`  
**Estimated Effort:** 30 minutes  
**Notes:** Install `axios-retry` and configure 3 retries with exponential backoff.

---

## FIX-17: Add ID Prefixes to Prisma Models

**Severity:** MINOR  
**Affected Files:** All API route handlers (generation), `src/lib/` helpers  
**Estimated Effort:** 2 hours  
**Notes:** Create `createId(prefix)` helper and use before Prisma inserts.

---

## Priority Summary Table

| Fix | Severity | Effort | Impact |
|---|---|---|---|
| FIX-01: Payment function | CRITICAL | 30 min | Checkout demo works |
| FIX-02: Service tokens | CRITICAL | 15 min | Inter-app integration works |
| FIX-03: Shipping cost per group | IMPORTANT | 20 min | Correct data in orders |
| FIX-04: Cart server-side price | IMPORTANT | 45 min | Security compliance |
| FIX-05: Cancel PAID orders | IMPORTANT | 5 min | Spec compliance |
| FIX-06: Profile default address | IMPORTANT | 10 min | Feature completeness |
| FIX-07: middleware.ts | IMPORTANT | 10 min | Auth best practice |
| FIX-08: Seed prices | MINOR | 10 min | Demo coherence |
| FIX-09: 404 typo | MINOR | 1 min | Polish |
| FIX-10: Admin error format | MINOR | 5 min | API consistency |
| FIX-11: Delete swap file | MINOR | 1 min | Repo hygiene |
