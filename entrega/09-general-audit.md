# 09 — General Audit

> Cross-cutting findings not captured in previous phases. Dead code, TODOs, security, accessibility, naming, unfinished features.

---

## 1. Dead Code & Unused Files

### `src/proxy.ts`
**What it is:** A file at `src/proxy.ts` exists but is not imported anywhere obvious.  
**Risk:** Could be left-over scaffolding or an incomplete feature.  
**Action:** Inspect and remove if unused.

### `src/components/admin/.orders-table.tsx.swp`
**What it is:** A vim swap file (binary). Committed to repository.  
**Risk:** Looks unprofessional. Bloats repo.  
**Action:** `git rm src/components/admin/.orders-table.tsx.swp` and add `*.swp` to `.gitignore`.

### Footer links all point to `#`
**Location:** `src/app/page.tsx` — FOOTER_LINKS array  
**What it is:** Footer columns (Tienda, Vendedores, Ayuda, Legales) render `<a href="#">` links.  
**Risk:** All footer links are non-functional. Not critical for evaluation but looks incomplete.  
**Action:** Either link to real routes (`/shop`, etc.) or remove the footer link columns.

### `src/generated/prisma/` committed to git
**What it is:** Entire Prisma generated client including `libquery_engine-darwin-arm64.dylib.node` (10MB macOS binary).  
**Risk:** The `.gitignore` already has `src/generated/prisma` but the files were previously committed. The macOS binary is dead weight — Vercel generates the correct Linux binary at build time.  
**Action:** `git rm -r --cached src/generated/prisma/` and commit. The `.gitignore` will prevent re-adding.

---

## 2. TODO / FIXME Comments

No explicit `// TODO` or `// FIXME` comments were found in a review of the main source files. This is good. However, several mock functions should have TODOs to signal Etapa 3 work:

- `src/lib/buyer-service.ts:createPaymentSession` — should have a TODO for Etapa 3 integration
- `src/lib/shipping-api.ts` — mock formula should be documented  
- `src/app/api/v1/buyer/checkout/route.ts` — seller_groups spec deviation should be noted

---

## 3. Security Concerns

### 3.1 `returnUrl` in checkout not validated against allowlist
**Location:** `src/app/api/v1/buyer/checkout/route.ts:19`  
**Issue:** `returnUrl: z.string().url()` accepts any URL. A malicious actor could craft a checkout that redirects to an attacker-controlled domain.  
**Severity:** Low (the current mock doesn't actually redirect, so this is a future concern for Etapa 3)  
**Fix:** In Etapa 3, validate `returnUrl` against a whitelist of allowed domains.

### 3.2 Admin auth relies on `publicMetadata` set in Clerk Dashboard
**Location:** `src/lib/admin-auth.ts`  
**Issue:** If a regular user somehow gets `publicMetadata.admin = true` set on their Clerk account (e.g., if Clerk Dashboard access is compromised), they gain full admin access.  
**Severity:** Acceptable for academic scope — this is the recommended Clerk pattern for admin roles.  
**Action:** None required for Etapa 2.

### 3.3 No rate limiting
**Issue:** All API endpoints have no rate limiting. A bot could spam `POST /api/v1/buyer/cart` to create thousands of cart items.  
**Severity:** Not a concern for academic evaluation.

### 3.4 `.env.example` has trailing slash in `PAYMENTS_APP_URL`
**Location:** `.env.example:22`  
```
#PAYMENTS_APP_URL=https://proyecto-c-payments-bicimarket.vercel.app/ 
```
**Issue:** Trailing slash + trailing space. URL construction with this base URL will produce double slashes.  
**Fix:** Remove trailing slash and space.

### 3.5 Service tokens in `.env.example` use descriptive placeholder values
**Location:** `.env.example`  
```
#BUYER_TO_SELLER_SERVICE_TOKEN=token_secreto_para_comunicacion_buyer_seller
```
These descriptions as placeholder values are fine for documentation purposes. No actual secrets are exposed.

---

## 4. Accessibility Issues

### 4.1 Missing `alt` text verification
Products displayed via `ProductCard` and `ProductImage` components — need to verify `alt` attributes are populated with meaningful text.  
**File:** `src/components/shared/product-image.tsx`

### 4.2 Icon-only buttons
Many interactive elements use only icons (e.g., favorite heart button, cart button in ProductCard) without visible text labels. These need `aria-label` attributes.  
**Files:** `src/components/shop/product-card.tsx`

### 4.3 Color contrast in promo banner
**Location:** `src/app/page.tsx` — PromoBanner section  
The banner uses `oklch(0.22 0.05 168)` background with white text. While likely fine, the sub-text at `text-white/60` may fail WCAG AA contrast ratio (4.5:1 minimum).

### 4.4 Form input labels
The checkout page address selector and other form inputs need to be checked for proper `<label>` associations. shadcn/ui forms typically include this, but custom components may not.

### 4.5 No `skip to content` link
Best practice for keyboard navigation is a "skip to main content" link that appears on focus. Not required but worth noting.

---

## 5. Inconsistent Naming

### 5.1 Route group naming: `(auth)` vs protected auth
`src/app/(auth)/` — the group is named `(auth)` but contains "protected pages for authenticated buyers" (dashboard, cart, checkout, etc.). The name is misleading — `(auth)` might suggest it's the authentication pages (sign-in/sign-up). Consider renaming to `(protected)` or `(buyer)`.  
**Severity:** Zero functional impact.

### 5.2 Mixed camelCase and snake_case in API responses
User-facing API responses use camelCase (`shippingAddressId`) in the request body, but the spec defines snake_case (`shipping_address_id`).  
The service-to-service endpoints correctly use snake_case for the body payload.  
**Severity:** Minor inconsistency for Etapa 3 integration.

### 5.3 `MOCK_PRODUCTS` in seller-api.ts uses `price_cents` but seed.ts uses `price`
Both represent prices in centavos (when large enough) but the different property names and the mismatched values create confusion.  
**Files:** `prisma/seed.ts`, `src/lib/seller-api.ts`

---

## 6. Unfinished Features

### 6.1 Checkout returns mock payment URL
**Location:** `src/lib/buyer-service.ts:45`  
```typescript
paymentUrl: `https://example-payment.local/checkout?order=${orderId}`,
```
This means clicking "Confirmar compra" in the checkout leads to a browser error page. The order is created correctly in the DB, but the payment redirect is broken.  
**Impact:** No real end-to-end checkout flow exists. A professor clicking through the UI will hit a dead end.

### 6.2 Order status only advances via service-to-service calls
Orders created will stay at `PENDING_PAYMENT` forever in the live demo unless someone manually calls `PATCH /api/v1/orders/{id}` with a valid service token. There's no way for a regular user to see an order progress to `PAID` → `SHIPPED` → `DELIVERED` without external tools.  
**Recommendation:** For the defense, prepare a Postman collection or curl command to simulate Payments App calling back.

### 6.3 Product detail page (`/shop/[productId]`)
`src/app/shop/[productId]/page.tsx` exists. Need to verify it works correctly with both real Seller App data and mock data.  
**Action:** Test this page manually.

### 6.4 Profile page
`src/app/(auth)/profile/page.tsx` exists. The profile editing functionality uses `useProfileMutations` and `PATCH /api/v1/buyer/profile`. Verify this actually persists changes.

### 6.5 Order cancellation
`POST /api/v1/buyer/orders/{orderId}/cancel` endpoint exists. Verify this is accessible from the UI (not just the API). Check if there's a "Cancelar pedido" button on the order detail page.

---

## 7. Performance Observations

### 7.1 All products loaded at once
`GET /api/products` fetches up to 100 products in one request and returns them all to the client. For 12 mock products this is fine. For a real marketplace with hundreds of products, this would be a problem.

### 7.2 No image optimization for product images
Product images from Wikimedia Commons are served directly. The `next/image` component with `remotePatterns` is configured for Wikimedia, which means lazy loading and WebP optimization should work. Verify `<ProductImage>` uses `next/image` and not a plain `<img>` tag.

### 7.3 Large home page bundle
`src/app/page.tsx` is ~800 lines with all sections inline. The entire home page is a client component (`"use client"`) which means it's not rendered on the server. This increases the JS bundle size and delays Time To First Byte.

---

## 8. Missing Tests

**There are zero test files in the repository.**

The assignment doesn't explicitly require tests, but for an academic evaluation a professor may ask about testing strategy. The expected answer: "No implementé tests automatizados en esta etapa. Para testear manualmente uso Prisma Studio para verificar la DB, y Postman para los endpoints service-to-service."

---

## 9. OpenAPI Documentation

`src/app/api/docs/route.ts` and `src/app/api-docs/page.tsx` — an OpenAPI spec and Swagger UI exist. This is a significant bonus that demonstrates professionalism.

**Verify:**
- The OpenAPI spec at `/api/docs` returns valid JSON/YAML
- The Swagger UI at `/api-docs` renders correctly
- The spec documents at least the main buyer endpoints (cart, orders, checkout)
- The spec includes auth requirements (Bearer token, X-Service-Token)

---

## 10. Final Scorecard (Unofficial Estimate)

| Area | Score (0–10) | Notes |
|---|---|---|
| Next.js pages + components | 9/10 | Comprehensive, well-organized |
| Own REST API | 8/10 | Good structure, minor spec deviations |
| PostgreSQL + Prisma | 9/10 | Solid schema, good migrations |
| Authentication | 6/10 | Works but missing middleware.ts |
| Admin panel | 7/10 | Functional but no text search |
| Search + URL params | 6/10 | URL params work, no server pagination |
| Error handling / 404 | 8/10 | Pages exist, minor typos |
| Server-side validation | 9/10 | Zod everywhere |
| Accessibility | 5/10 | Radix UI helps but icon labels missing |
| External API | 6/10 | Seller App when configured, else mock |
| Env vars / secrets | 8/10 | Good hygiene, format issue in .env.example |
| Seed data | 5/10 | Only 2 orders/user, price inconsistency |
| README | 5/10 | Email format wrong (CRITICAL) |
| **Overall** | **~7/10** | Good foundation, several fixable gaps |

The overall quality is **above average** for an academic project. The code is clean, the architecture is thoughtful, and the documentation is thorough. The main risks are fixable in a few hours of focused work:
1. User emails (30 min)
2. Clerk middleware (15 min)  
3. Seed data expansion (1 hour)
4. Production SELLER_APP_URL verification (10 min)
