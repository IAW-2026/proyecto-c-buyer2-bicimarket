# 07 — Critical Fix List
> Audit generated: 2026-05-31 | Delivery: 2026-06-01 (TOMORROW) | Defense: 2026-06-04 / 2026-06-08

Time available before delivery: ~24 hours. Fix high-severity issues first.

---

# Must Fix Before Submission

These issues directly cost points or prevent the app from functioning.

---

## FIX-01 — Create `middleware.ts` for Clerk

**Severity**: CRITICAL
**Affected files**: Project root (create new file)
**Estimated effort**: 20 minutes
**Grading impact**: Auth broken in production → evaluator cannot log in → 0 points on auth-dependent features

```typescript
// middleware.ts (project root, same level as package.json)
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/shop(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/v1/orders(.*)",
  "/api/products(.*)",
  "/api/health(.*)",
  "/api/docs(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

---

## FIX-02 — Add Deploy URL and Credentials to README

**Severity**: CRITICAL
**Affected files**: `README.md`
**Estimated effort**: 10 minutes (after deploying)
**Grading impact**: Explicit rubric requirement — "link al deploy y credenciales"

Add this section at the TOP of README.md (before anything else):

```markdown
## 🚀 Deploy

- **URL**: https://YOUR-APP.vercel.app
- **Admin**: email `admin@test.com` | password `Admin1234!` (o instrucciones de cómo obtener un admin)
- **Comprador**: email `comprador@test.com` | password `Comprador1234!`
```

---

## FIX-03 — Create `.env.example`

**Severity**: CRITICAL
**Affected files**: `.env.example` (create new file), `.gitignore` (add exception)
**Estimated effort**: 15 minutes
**Grading impact**: Explicit rubric requirement

Create `.env.example`:
```
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
SELLER_APP_URL=
BUYER_TO_SELLER_SERVICE_TOKEN=
SHIPPING_APP_URL=
BUYER_TO_SHIPPING_SERVICE_TOKEN=
PAYMENTS_APP_URL=
BUYER_TO_PAYMENTS_SERVICE_TOKEN=
PAYMENTS_TO_BUYER_SERVICE_TOKEN=
SHIPPING_TO_BUYER_SERVICE_TOKEN=
SELLER_TO_BUYER_SERVICE_TOKEN=
```

Add to `.gitignore` (so the example CAN be committed):
```
# CHANGE THIS LINE:
.env*
# TO:
.env*
!.env.example
```

---

## FIX-04 — Fix Payment Session to Call Payments API

**Severity**: CRITICAL
**Affected files**: `src/lib/buyer-service.ts`, `src/app/api/v1/buyer/checkout/route.ts`
**Estimated effort**: 45 minutes
**Grading impact**: Checkout is broken — users are redirected to `https://example-payment.local/...`

In `src/lib/buyer-service.ts`, the `createPaymentSession` stub is:
```typescript
// BROKEN — replace this:
export async function createPaymentSession(orderId: string, totalCents: number) {
  return {
    paymentId: `pay_${orderId}`,
    paymentUrl: `https://example-payment.local/checkout?order=${orderId}`,
    totalCents,
  };
}
```

Replace with a call to the real payments API. In `src/app/api/v1/buyer/checkout/route.ts` after order creation, replace the `createPaymentSession(order.id, totalCents)` call with:

```typescript
import { createPayment } from "@/lib/payments-api";

// After order creation...
const payment = await createPayment({
  order_id: order.id,
  buyer_profile_id: profile.id,
  amount_cents: totalCents,
  currency: "ARS",
  idempotency_key: crypto.randomUUID(),
  return_url: parsed.data.returnUrl,
});

await prisma.order.update({
  where: { id: order.id },
  data: { paymentId: payment.payment_id },
});

return NextResponse.json({ paymentUrl: payment.checkout_url, orderId: order.id });
```

The `createPayment()` in `lib/payments-api.ts` already has a mock fallback when `PAYMENTS_APP_URL` is not set, so this will work in both environments.

---

## FIX-05 — Add Admin Sidebar to Admin Layout

**Severity**: HIGH
**Affected files**: `src/app/admin/layout.tsx`
**Estimated effort**: 30 minutes
**Grading impact**: Admin panel appears broken (no navigation)

The `AdminSidebar` component exists at `src/components/admin/admin-sidebar.tsx`. Wire it into the layout:

```typescript
// src/app/admin/layout.tsx
import { requireAdmin } from "@/lib/admin-auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex h-full">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

Check `AdminSidebar` and `AdminHeader` components first to ensure they don't have unexpected dependencies.

---

## FIX-06 — Deploy the App to Vercel

**Severity**: CRITICAL
**Affected files**: Vercel dashboard
**Estimated effort**: 1–2 hours
**Grading impact**: App not deployed → direct rubric failure

Steps:
1. Push current code to GitHub
2. Create new Vercel project from GitHub repo
3. Add all env vars from `.env` to Vercel Settings → Environment Variables
4. Deploy
5. Copy the Vercel URL into README.md

**BEFORE deploying**: Fix FIX-01 (middleware.ts) first, or auth will be broken on Vercel.

---

## FIX-07 — Add Seed Script to package.json

**Severity**: HIGH
**Affected files**: `package.json`
**Estimated effort**: 10 minutes
**Grading impact**: App will be empty in production if seed can't be run

Add to `package.json`:
```json
"scripts": {
  "seed": "tsx prisma/seed.ts"
}
```

Also add to `package.json` for Prisma to auto-run seed:
```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

After deploying, run the seed against production: `DATABASE_URL=<production-url> npx tsx prisma/seed.ts`

---

# Should Fix Before Defense

Important for the defense but not blocking for delivery.

---

## FIX-08 — Add Pagination to List APIs

**Severity**: HIGH
**Affected files**: All `route.ts` in `/api/v1/buyer/orders/`, `/api/admin/orders/`, `/api/admin/buyers/`, `/api/admin/carts/`
**Estimated effort**: 2 hours
**Grading impact**: Direct spec violation on a graded requirement

Example fix for `GET /api/v1/buyer/orders`:
```typescript
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
  const skip = (page - 1) * limit;

  const profile = await getOrCreateBuyerProfile(userId);
  
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { buyerProfileId: profile.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { items: true, sellerGroups: true },
    }),
    prisma.order.count({ where: { buyerProfileId: profile.id } }),
  ]);

  return NextResponse.json({
    data: orders,
    pagination: { total, page, limit, has_more: skip + orders.length < total },
  });
}
```

---

## FIX-09 — Fix Weight Snapshot in Shop Add-to-Cart

**Severity**: HIGH
**Affected files**: `src/app/shop/page.tsx:33`
**Estimated effort**: 30 minutes
**Grading impact**: Shipping quotes use 0-gram packages — breaks real Shipping App integration

In `src/app/shop/page.tsx`:
```typescript
// WRONG:
weightGramsSnapshot: 0,

// FIX: Make sure Product type has weight_grams field
weightGramsSnapshot: product.weightGrams ?? 0,
```

Also update `src/app/api/products/route.ts` to map `weight_grams` from `SellerProduct` to `Product`:
```typescript
function toProduct(p: SellerProduct): Product {
  return {
    ...
    weightGrams: p.weight_grams,
  };
}
```

---

## FIX-10 — Fix Shipping Cost Per Seller Group

**Severity**: MEDIUM
**Affected files**: `src/app/api/v1/buyer/checkout/route.ts:118`
**Estimated effort**: 30 minutes
**Grading impact**: Per-group shipping shows $0 in order detail

Change in checkout route:
```typescript
// WRONG:
shippingCostCents: 0,

// FIX:
shippingCostCents: quoteResponse.quotes.find(
  (q) => q.seller_profile_id === g.sellerProfileId
)?.cost_cents ?? 0,
```

---

## FIX-11 — Standardize Error Response Format

**Severity**: MEDIUM
**Affected files**: `src/app/api/v1/buyer/checkout/route.ts` and others with inconsistent format
**Estimated effort**: 1 hour
**Grading impact**: API contract inconsistency

In checkout route, change:
```typescript
// WRONG:
return NextResponse.json({ error: "El carrito está vacío" }, { status: 400 });

// FIX:
return NextResponse.json(
  { error: { code: "CART_EMPTY", message: "El carrito está vacío" } },
  { status: 400 }
);
```

---

## FIX-12 — Fix Price Units (Pesos vs Centavos)

**Severity**: HIGH (for real integration, deferred for now)
**Affected files**: `src/lib/seller-api.ts`, `src/types/inter-service.ts`, `src/app/shop/page.tsx`
**Estimated effort**: 2 hours
**Grading impact**: All monetary values will be 100x wrong when real Seller App is connected

This is high risk for the defense but acceptable for delivery since mock data works. Before connecting real Seller App:
1. Rename `price` → `price_cents` in `SellerProduct` type
2. Update mock data to use centavo values (multiply all by 100)
3. Remove `* 100` conversion in `shop/page.tsx`
4. Update `PriceDisplay` component to divide by 100 for display

---

# Nice To Have

Minor polish items.

---

## FIX-13 — Fix Typos in Error Pages

**Files**: `src/app/not-found.tsx`, `src/app/error.tsx`
**Effort**: 5 minutes

- "La pagina" → "La página"
- "Algo salio mal" → "Algo salió mal"
- "Ocurrio" → "Ocurrió"

---

## FIX-14 — Fix Page Metadata Title

**Files**: `src/app/layout.tsx:27`
**Effort**: 2 minutes

Change `title: "Marketplace App"` to `title: "BiciMarket — Buyer App"`.

---

## FIX-15 — Add State Transition Validation to Order Status PATCH

**Files**: `src/app/api/v1/orders/[orderId]/route.ts`
**Effort**: 30 minutes

Add a transition matrix and reject invalid transitions with 409.

---

## FIX-16 — Remove `--webpack` Flag from Build Script

**Files**: `package.json`
**Effort**: 2 minutes

Change `"build": "prisma generate && next build --webpack"` to `"build": "prisma generate && next build"`.

---

## Priority Order for the Next 24 Hours

Given delivery is tomorrow:

1. **FIX-06**: Deploy to Vercel (prerequisite for everything else)
2. **FIX-01**: Add middleware.ts (must do before deploying)
3. **FIX-02**: Add deploy URL and credentials to README
4. **FIX-03**: Create .env.example
5. **FIX-04**: Fix payment session (checkout must work for demo)
6. **FIX-05**: Wire admin sidebar
7. **FIX-07**: Add seed script, run seed on production DB
8. **FIX-08**: Add pagination (if time permits — 2 hours)
9. **FIX-09 + FIX-10**: Weight and shipping cost fixes (30 min each)
10. **FIX-13 + FIX-14**: Typos and title (10 min total)
