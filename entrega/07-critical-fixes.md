# 07 — Critical Fix List

> Organized by priority. Every item includes: severity, affected files, estimated effort, expected grading impact.

---

## MUST FIX BEFORE SUBMISSION (June 1, 2026)

---

### FIX-01: Add `src/middleware.ts` with Clerk middleware (YA ESTA)

**Severity:** HIGH  
**Affected files:** `src/middleware.ts` (new file)  
**Estimated effort:** 15 minutes  
**Grading impact:** Could cost significant points — evaluators know Clerk requires middleware. Without it, the Clerk integration appears incomplete.

**What to do:**
Create `src/middleware.ts`:
```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/shop(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/products(.*)",
  "/api/v1/orders/(.*)/seller-groups/(.*)/shipping",
  "/api/v1/orders/(.*)/seller-groups/(.*)/status",
  "/api/v1/orders/(.*)",
  "/api/health",
  "/api/docs(.*)",
  "/api-docs(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
```

Note: Service-to-service endpoints should remain public at the middleware level since they use X-Service-Token auth, not Clerk JWT.

---

### FIX-02: Fix user email format to match teacher's requirement (YA ESTA)

**Severity:** CRITICAL  
**Affected files:** `README.md`, Clerk Dashboard  
**Estimated effort:** 20 minutes  
**Grading impact:** BLOCKING — if the professor tries `buyer+clerktest@iaw.com` and the account doesn't exist, they cannot evaluate the app.

**What to do:**
1. In Clerk Dashboard, create/rename users to match the required format:
   - Admin: `admin+clerktest@iaw.com` (or `buyeradmin+clerktest@iaw.com`)
   - Buyer 1: `buyer+clerktest@iaw.com`
   - Buyer 2: `buyer2+clerktest@iaw.com`
2. Set `publicMetadata: { admin: true }` on the admin user
3. Update `README.md` to show the correct emails

Current README shows: `buyerclerktest@iaw.com`, `buyer1clerktest@iaw.com`  
Required format: `<rol>+clerktest@iaw.com`

---

### FIX-03: Fix price inconsistency between seed and mock products (NO LO NECESITO ESTOY CON SELLER)

**Severity:** HIGH  
**Affected files:** `prisma/seed.ts`  
**Estimated effort:** 15 minutes  
**Grading impact:** A professor comparing a seeded order's total to what the same product costs in the shop will see a huge discrepancy ($4,500 vs $1,300,000 for Trek Marlin).

**What to do:**
Update `prisma/seed.ts` MOCK_PRODUCTS to use the same prices (in cents) as `src/lib/seller-api.ts`:
```typescript
const MOCK_PRODUCTS = [
  { id: "prd_mock_001", name: "Bicicleta de montaña Trek Marlin 5", price: 130000000, weightGrams: 13500, sellerId: "sel_mock_001", sellerName: "BiciShop Buenos Aires" },
  { id: "prd_mock_002", name: "Bicicleta urbana Totem City", price: 1800000000, weightGrams: 11000, sellerId: "sel_mock_002", sellerName: "Urban Bike Store" },
  { id: "prd_mock_003", name: "Casco ciclismo Giro Register", price: 5500000, weightGrams: 320, sellerId: "sel_mock_001", sellerName: "BiciShop Buenos Aires" },
];
```
Then re-run `npm run seed` on production.

---

### FIX-04: Add more seed data (orders in all states) REVISAR ESTO

**Severity:** HIGH  
**Affected files:** `prisma/seed.ts`  
**Estimated effort:** 45 minutes  
**Grading impact:** Teacher explicitly requires "suficientes datos precargados." Two orders per user is insufficient. A professor who sees only 2 orders (one COMPLETED, one PENDING_PAYMENT) may dock points.

**What to do:**
Add orders in the following states for each buyer profile:
- `PAID` — with `SellerGroupStatus.PREPARING`
- `PARTIALLY_SHIPPED` — with one group `IN_TRANSIT`, one still `PENDING`
- `SHIPPED` — all groups `IN_TRANSIT`
- `DELIVERED` — all groups `DELIVERED`
- Keep the existing `COMPLETED` and `PENDING_PAYMENT`

Also add at least 3-5 favorites per user and a meaningful cart (not just 2 items).

---

### FIX-05: Fix README setup instructions (`cp .env` → `cp .env.example`)

**Severity:** MEDIUM  
**Affected files:** `README.md`  
**Estimated effort:** 2 minutes  
**Grading impact:** Anyone trying to set up locally will fail if they try `cp .env .env.local` (since `.env` is gitignored and may not exist in a fresh clone).

**Current:**
```bash
cp .env .env.local   # Completar con los valores del grupo
```
**Fix:**
```bash
cp .env.example .env.local   # Completar con los valores reales
```

---

### FIX-06: Confirm `SELLER_APP_URL` is set in Vercel production (LISTO)

**Severity:** HIGH  
**Affected files:** Vercel Dashboard (not code)  
**Estimated effort:** 5 minutes  
**Grading impact:** Without this, no real external API call is made — the "external API consumption" requirement may not be satisfied.

**What to do:**
1. Log into Vercel Dashboard
2. Go to project Settings → Environment Variables
3. Confirm `SELLER_APP_URL=https://proyecto-c-seller-pierinospina.vercel.app` is set (without trailing slash)
4. Confirm `BUYER_TO_SELLER_SERVICE_TOKEN` is set with the agreed token value
5. Redeploy if variables were changed

---

### FIX-07: Verify production deploy is at production URL (not preview) (LISTO)

**Severity:** MEDIUM  
**Affected files:** Vercel Dashboard  
**Estimated effort:** 5 minutes  
**Grading impact:** Teacher specifically warned: "El enlace incluido en la entrega debe apuntar al deploy de producción y no a un deploy de preview o desarrollo."

**What to do:**
Verify `https://proyecto-c-buyer2-bicimarket.vercel.app/` is the production deployment alias (not a preview URL like `proyecto-c-buyer2-bicimarket-git-main-*.vercel.app`).

---

## SHOULD FIX BEFORE DEFENSE (June 4–8, 2026)

---

### FIX-08: Add server-side pagination to the shop

**Severity:** MEDIUM  
**Affected files:** `src/app/api/products/route.ts`, `src/app/shop/page.tsx`, `src/hooks/use-buyer.ts`  
**Estimated effort:** 2–3 hours  
**Grading impact:** A professor who asks "how does pagination work in the shop?" will be dissatisfied with the answer "all products load client-side." The `PaginationControls` component already exists in `src/components/shared/`.

**Minimum viable fix:**
Add `page` and `limit` params to `GET /api/products`:
```typescript
const page = Number(url.searchParams.get("page") ?? 1);
const limit = 20;
// ... return { data, pagination: { total, page, limit, has_more } }
```
Then add pagination controls to `src/app/shop/page.tsx` that update `?page=N` in the URL.

---

### FIX-09: Fix accent marks in 404 and error pages (LISTO)

**Severity:** LOW  
**Affected files:** `src/app/not-found.tsx`, `src/app/error.tsx`  
**Estimated effort:** 5 minutes  
**Grading impact:** Minor visual polish — "La pagina" → "La página", "Algo salio mal" → "Algo salió mal", "Ocurrio" → "Ocurrió"

---

### FIX-10: Remove vim swap file from repository

**Severity:** LOW  
**Affected files:** `src/components/admin/.orders-table.tsx.swp`  
**Estimated effort:** 2 minutes  
**Grading impact:** Cosmetic but looks unprofessional. A professor checking the repo will see it.

**What to do:**
```bash
git rm src/components/admin/.orders-table.tsx.swp
git commit -m "remove vim swap file"
```
Add `*.swp` to `.gitignore`.

---

### FIX-11: Update README structure to match teacher's required order

**Severity:** MEDIUM  
**Affected files:** `README.md`  
**Estimated effort:** 20 minutes  
**Grading impact:** Teacher explicitly specified README order: deploy link → users → instructions → description → notes. Current README has description early and notes at end. Should be reordered.

See `08-readme-audit.md` for detailed recommendations.

---

### FIX-12: Refactor seed to not depend on pre-existing profiles

**Severity:** MEDIUM  
**Affected files:** `prisma/seed.ts`  
**Estimated effort:** 30 minutes  
**Grading impact:** Ensures the production DB can be seeded at any time. Current seed prints a warning and exits if no profiles exist.

**Minimum viable fix:**
Hardcode the Clerk user IDs of the test accounts, look them up in Clerk via admin API, and create BuyerProfiles if they don't exist. Alternatively, document clearly in README that evaluators must log in first before running seed.

---

## NICE TO HAVE (polish, no grading impact)

---

### FIX-13: Add `page` to admin buyers/carts search

**Estimated effort:** 1 hour  
An admin who needs to browse 50+ buyers has no text search. Low impact for academic demo.

---

### FIX-14: Add `loading.tsx` to route segments

**Estimated effort:** 30 minutes  
Streaming loading UI improves perceived performance and shows understanding of Next.js App Router.

---

### FIX-15: Remove `--webpack` flag from build script

**Estimated effort:** 5 minutes  
```json
"build": "prisma generate && next build"
```
This will use the default bundler. Only revert if there's a specific incompatibility.

---

### FIX-16: Deduplicate `handleAddToCart` / `handleToggleFavorite` between home and shop

**Estimated effort:** 30 minutes  
Extract shared logic to a custom hook or utility to avoid copy-paste maintenance issues.

---

### FIX-17: Add `src/generated/prisma/` to `.gitignore` and purge from git history

**Estimated effort:** 15 minutes  
The `.gitignore` already includes `src/generated/prisma` but the files were previously committed. Run:
```bash
git rm -r --cached src/generated/prisma/
git commit -m "remove generated Prisma client from tracking"
```

---

## Summary Checklist

```
PRE-SUBMISSION (June 1):
[ ] FIX-01: Add src/middleware.ts
[ ] FIX-02: Fix user email format in Clerk + README
[ ] FIX-03: Fix seed prices to match mock product prices
[ ] FIX-04: Add more orders in all states to seed
[ ] FIX-05: Fix README "cp .env" → "cp .env.example"
[ ] FIX-06: Verify SELLER_APP_URL in Vercel
[ ] FIX-07: Verify production deploy URL

PRE-DEFENSE (June 4–8):
[ ] FIX-08: Add server-side shop pagination
[ ] FIX-09: Fix accent marks in 404/error pages
[ ] FIX-10: Remove .swp file from repo
[ ] FIX-11: Update README structure
[ ] FIX-12: Make seed independent of pre-existing profiles

NICE TO HAVE:
[ ] FIX-13: Admin buyers/carts search
[ ] FIX-14: loading.tsx in route segments
[ ] FIX-15: Remove --webpack flag
[ ] FIX-16: Deduplicate cart/favorite handlers
[ ] FIX-17: Purge generated/ from git history
```
