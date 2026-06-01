# 09 — General Audit

> Cross-cutting concerns, dead code, TODOs, security, naming, and anything not covered by the phase-specific audits.

---

## 1. Dead Code and Unused Assets

### 1.1 `src/lib/buyer-service.ts::createPaymentSession`

**File:** `src/lib/buyer-service.ts` (lines 44-50)  
**Issue:** This stub function was clearly written for early development. It should have been replaced when `payments-api.ts` was created. It is now the source of the critical checkout bug. Should be deleted entirely.

---

### 1.2 `src/services/api/` Directory

**Files:** `src/services/api/addresses.ts`, `cart.ts`, `checkout.ts`, `favorites.ts`, `profile.ts`  
**Issue:** These files define Axios-based API functions that call the Buyer App's own endpoints. The `hooks/querys/` directory also calls these same endpoints via TanStack Query. Both layers exist in parallel. The `services/api/` layer appears to be a leftover from before the hooks were written, or an intermediary that was never cleaned up.  
**Impact:** Adds cognitive overhead. A new developer doesn't know which layer to use. Neither breaks anything.

---

### 1.3 `@xyflow/react` Dependency

**File:** `package.json`  
**Issue:** React Flow (`@xyflow/react`) is installed as a dependency but does not appear to be used anywhere in the source. It adds bundle weight.  
**Action:** `npm uninstall @xyflow/react` if unused.

---

### 1.4 `src/proxy.ts`

**File:** `src/proxy.ts` (seen in file listing but not read)  
**Issue:** A file named `proxy.ts` in `src/` suggests it might be leftover scaffolding or a proxy utility. This should be audited — if unused, delete.

---

### 1.5 `public/` Directory

**Files:** `public/file.svg`, `public/globe.svg`, `public/vercel.svg`, `public/window.svg`  
**Issue:** These are Next.js default template assets. None are used in the application. Dead public assets.

---

### 1.6 Cart.status = ABANDONED

**File:** `prisma/schema.prisma`  
**Issue:** `CartStatus` enum includes `ABANDONED` but no code ever sets a cart to this status. Dead schema.

---

## 2. TODOs and FIXMEs

No explicit `// TODO` or `// FIXME` comments were found in the reviewed files. However, the mock implementations (stub functions, hardcoded URLs) serve the same purpose implicitly without the marker.

---

## 3. Security Concerns

### 3.1 Price Manipulation via Cart API (HIGH)

**File:** `src/app/api/v1/buyer/cart/route.ts`  
**Issue:** `unitPriceCents` is accepted from the client without server-side verification. A buyer can create a cart item at any price.  
**Exploitation:** `POST /api/v1/buyer/cart` with `{ productId: "prd_mock_001", unitPriceCents: 1, ... }`. The Trek Marlin would be in the cart at ARS 0.01.  
**Fix:** See FIX-04.

---

### 3.2 Service Token Returns 500 When Not Configured

**File:** `src/lib/service-auth.ts`  
**Issue:** When an inter-app endpoint's service token env var is not set, `validateServiceToken` returns HTTP 500 with message "La variable de entorno X no está configurada". This leaks configuration state to callers.  
**Fix:** Return HTTP 503 (Service Unavailable) with a generic message, or return 401 (treat unconfigured token as auth failure).

---

### 3.3 returnUrl Accepted from Client

**File:** `src/app/api/v1/buyer/checkout/route.ts`  
**Issue:** `returnUrl: z.string().url()` accepts any URL from the client. A malicious request could pass a phishing site as the return URL. After checkout, the user would be redirected there.  
**Fix:** Construct `returnUrl` server-side using `process.env.NEXT_PUBLIC_APP_URL`.

---

### 3.4 .env Contains Real Credentials

**File:** `.env`  
**Issue:** The `.env` file contains active Supabase database credentials (with password) and Clerk API keys. While `.gitignore` excludes it, the README says `cp .env .env.local` which would be a problem in a fresh clone where `.env` doesn't exist (fails silently). If ever accidentally committed, all secrets are exposed.  
**Status:** Currently safe (`.gitignore` correct), but the README instruction is wrong.

---

### 3.5 No Rate Limiting

**Issue:** No rate limiting on any API endpoint. A user could hammer the checkout endpoint repeatedly.  
**Status:** Acceptable for academic project. Vercel has DDoS protection at the CDN level.

---

## 4. Accessibility Issues

### 4.1 404 Page Typo

**File:** `src/app/not-found.tsx`  
**Issue:** "La pagina que buscas no existe." — missing accent on "página."

---

### 4.2 Shop Filter Panel

**File:** `src/components/shop/filter-panel.tsx`  
**Issue:** Filters likely use slider and button components. Confirm all inputs have associated `<label>` elements and keyboard navigation works.

---

### 4.3 No Skip Navigation Link

**Issue:** No `<a href="#main-content">Skip to main content</a>` for keyboard/screen reader users.

---

### 4.4 Dynamic Content Without Live Regions

**Issue:** When filters apply and product count changes, screen readers are not notified. The count text `{shopFilters.filtered.length} productos` should have `aria-live="polite"`.

---

## 5. Inconsistent Naming

### 5.1 camelCase vs snake_case in API Responses

The internal Prisma models use camelCase (`buyerProfileId`, `createdAt`). The API responses from some endpoints return raw Prisma objects with camelCase, while the documentation specifies snake_case (`buyer_profile_id`, `created_at`). Example: `GET /api/v1/buyer/profile` returns the raw Prisma object with camelCase fields, not the documented snake_case shape.

**Impact:** Clients (and inter-app consumers) expecting snake_case will break. The admin APIs consume these internally so it's not immediately visible. A professor testing the API with curl will see camelCase vs documented snake_case.

---

### 5.2 `Ruta.tsx` Component Name

**File:** `src/components/header/Ruta.tsx`  
**Issue:** Single-word Spanish component name mixed with English naming convention. Should be `BreadcrumbNav.tsx` or similar.

---

### 5.3 Hook Directory Named `querys`

**File:** `src/hooks/querys/`  
**Issue:** "querys" is not a word — should be "queries". Minor but visible in file tree during defense.

---

## 6. Unfinished Features

### 6.1 Order Status Tabs Not Wired to API Filter

**File:** `src/hooks/use-order-tabs.ts`  
**Issue:** The orders page has tabs (Pendientes, En camino, Completadas). If these tabs are client-side filters only (filtering already-fetched orders), that works for small datasets. Server-side filtering by status (`?status=PAID`) would be more scalable. Verify that tab selection doesn't cause a full reload without pagination.

---

### 6.2 Dashboard Stats Are Not Documented

**File:** `src/app/(auth)/dashboard/page.tsx`  
**Issue:** The buyer dashboard shows "stat cards" from `src/components/dashboard/stat-cards.tsx`. It is unclear what data these cards show. If they hardcode numbers or show unrelated metrics, this is dead UI.

---

### 6.3 Favorites Don't Show Product Details

**File:** `src/components/favorites/favorite-card.tsx`  
**Issue:** Favorites store only `productId`. The favorites page must fetch product details from Seller App to display name, price, image. If Seller App is unavailable and the product ID is from the mock, the display may be empty or show placeholder data. Verify favorites can display product info when Seller App is live.

---

## 7. Dependency Concerns

| Package | Version | Concern |
|---|---|---|
| `zod` | `^4.3.6` | v4 is a major breaking release from v3. Syntax changes in schemas. Verify all schemas are v4 compatible. |
| `lucide-react` | `^1.8.0` | `^1.x` is a major version change from `^0.x` — may have breaking import changes. The custom type declaration at `src/types/lucide-react.d.ts` suggests there was already a compat issue. |
| `@clerk/nextjs` | `^7.1.0` | v7 is the latest but has changes from v5/v6. Ensure no deprecated APIs are used. |
| `next` | `16.2.3` | Non-standard version per AGENTS.md — has breaking changes vs standard Next.js 14/15. |
| `react` | `19.2.4` | React 19 — stable but very new. Some older libraries may not be compatible. |
| `@base-ui/react` | `^1.4.0` | May conflict with shadcn/radix components. Verify no component conflicts. |
| `@xyflow/react` | `^12.10.2` | Appears unused — remove. |

---

## 8. Testing

**Status:** NO TESTS EXIST

There are no test files anywhere in the repository (`*.test.ts`, `*.spec.ts`, `*.test.tsx`, `*.spec.tsx`). No `jest.config.js`, `vitest.config.ts`, or testing library setup found.

**Impact:** Cannot verify API behavior without manual testing. Regressions from fixes will not be caught automatically.

**Recommendation:** Even adding 2-3 unit tests for critical functions (`calculateCartTotals`, `groupItemsBySeller`, `validateServiceToken`) would demonstrate awareness of testing. For an academic project, this is low priority but worth noting.

---

## 9. Observations on Mock Architecture

The mock strategy is well-designed:
- `seller-api.ts`, `shipping-api.ts`, `payments-api.ts` all check for env var presence and fall back to mocks transparently
- This allows the app to function as a standalone demo without the other 3 apps

However, the mock strategy is undermined by:
1. `createPaymentSession` — is always mock, bypasses the conditional check in `payments-api.ts`
2. Missing service tokens — incoming endpoints fail with 500 instead of falling back gracefully
3. The mock shipping response structure doesn't match what the real Shipping App would return (per the API contract), potentially requiring interface changes when connecting for real

---

## 10. Code Quality Observations

**Positive:**
- Clean, readable TypeScript throughout
- Consistent use of async/await
- Good use of `Promise.all` for parallel operations in checkout and data fetching
- Zod schemas co-located with handlers for readability
- `getOrCreateBuyerProfile` is a clean single-responsibility function
- Service clients are thin and testable

**Negative:**
- `checkout/route.ts` is 176 lines and handles too many concerns (validation, shipping, order creation, group creation, item creation, history, cart clearing, payment) — should be decomposed
- No JSDoc on public service functions (acceptable per project guidelines)
- Comments in some files explain WHAT the code does rather than WHY (e.g., `// PATCH /api/v1/buyer/profile` repeats the route)

---

## 11. API Documentation (Swagger/OpenAPI)

**File:** `src/app/api/docs/route.ts`, `src/app/api-docs/page.tsx`, `src/lib/openapi.ts`

**Status:** Present ✅

The app serves an OpenAPI spec at `/api/docs` and a Swagger UI at `/api-docs`. This is a significant bonus — few students implement API documentation. Verify that the OpenAPI spec accurately reflects the implemented endpoints (it may be auto-generated or manually maintained).

**Recommendation:** Mention the API docs page in the README and defense presentation.

---

## 12. Summary Scorecard

| Area | Score | Notes |
|---|---|---|
| Functionality | 6/10 | Checkout broken; most features work |
| Code Quality | 8/10 | Clean, readable, well-organized |
| Spec Compliance | 6/10 | Multiple documented deviations |
| Security | 5/10 | Price manipulation; service token leakage |
| Testing | 0/10 | No tests |
| Documentation | 8/10 | README good; Swagger UI present |
| Deployment | 7/10 | Live on Vercel; missing tokens |
| Architecture | 7/10 | Good separation; checkout coupling bug |
| Accessibility | 5/10 | shadcn helps; no auditing done |
| Admin Panel | 8/10 | Present and functional |
| **Overall** | **6.5/10** | **Strong foundation, critical bugs to fix** |
