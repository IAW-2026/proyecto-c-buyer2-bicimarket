# 05 — Deployment Readiness

---

## Summary

The app is **partially deployment-ready**. The database and Clerk are correctly configured. The build pipeline is likely functional. However, the checkout flow is broken (wrong payment function called), most service tokens are missing, and the deployed app will show a mock payment URL that does not redirect anywhere real.

---

## 1. Vercel Compatibility

### Status: LIKELY PASS

**Evidence:**
- `package.json:build` runs `prisma generate && next build --webpack` — Vercel will execute this correctly
- Next.js 16.2.3 is a stable version with full Vercel support
- App Router with React 19 — supported on Vercel
- No custom server needed (all serverless)
- Prisma with `directUrl` for migrations and `DATABASE_URL` with pgBouncer for runtime — correct Vercel/Supabase pattern

**Risks:**
- The `--webpack` flag is explicitly set in both dev and build scripts. This disables Turbopack/SWC bundler. This is intentional but worth confirming it doesn't cause issues with Vercel's build environment.
- `lucide-react@^1.8.0` is very recent — confirm it has no ESM/CJS compatibility issues on Vercel edge functions.
- `@xyflow/react` (React Flow) is listed as a dependency but does not appear used anywhere in the codebase. This adds build weight unnecessarily.

---

## 2. Environment Variable Audit

### Status: CRITICAL GAPS

| Variable | .env Status | .env.example | Required for Production |
|---|---|---|---|
| `DATABASE_URL` | ✅ Set (Supabase pooler) | Documented | YES |
| `DIRECT_URL` | ✅ Set (Supabase direct) | Documented | YES (for migrations) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ Set | Documented | YES |
| `CLERK_SECRET_KEY` | ✅ Set | Documented | YES |
| `BUYER_TO_SELLER_SERVICE_TOKEN` | ✅ Set | Documented | YES |
| `SELLER_APP_URL` | ✅ Set | Documented | YES |
| `BUYER_TO_SHIPPING_SERVICE_TOKEN` | ❌ **Commented out** | Documented | YES |
| `SHIPPING_APP_URL` | ✅ Set | Documented | YES |
| `BUYER_TO_PAYMENTS_SERVICE_TOKEN` | ❌ **Commented out** | Documented | YES |
| `PAYMENTS_APP_URL` | ✅ Set (with trailing space) | Documented | YES |
| `PAYMENTS_TO_BUYER_SERVICE_TOKEN` | ❌ **Commented out** | Documented | YES |
| `SHIPPING_TO_BUYER_SERVICE_TOKEN` | ❌ **Commented out** | Documented | YES |
| `SELLER_TO_BUYER_SERVICE_TOKEN` | ❌ **Commented out** | Documented | YES |
| `NEXT_PUBLIC_APP_URL` | ❌ **Missing entirely** | Not in .env.example | Needed for return_urls |

### Critical Issues:

1. **5 of 6 service tokens are commented out.** When other apps call Buyer's inter-app endpoints, `validateServiceToken` will return HTTP 500 ("SERVICE_TOKEN_NOT_CONFIGURED"). This means:
   - Payments App cannot update order status (PATCH `/api/v1/orders/{id}` → 500)
   - Shipping App cannot update shipping status (PATCH `/api/v1/orders/{id}/seller-groups/{g}/shipping` → 500)
   - Seller App cannot update seller group status (PATCH `/api/v1/orders/{id}/seller-groups/{g}/status` → 500)

2. **`PAYMENTS_APP_URL` has a trailing space**: `https://proyecto-c-payments-bicimarket.vercel.app/ `. Axios may handle this but it's a potential source of 404 errors when constructing URLs.

3. **`NEXT_PUBLIC_APP_URL` is not defined.** The checkout flow needs this to construct `return_urls`. Currently these are hardcoded to `https://example-payment.local/...` because `createPaymentSession` is the wrong function. When fixed, this env var will be needed.

### Actions Required:
1. Add all 5 missing service tokens to Vercel environment variables (coordinate with Payments, Shipping, Seller teams)
2. Remove trailing space from `PAYMENTS_APP_URL`
3. Add `NEXT_PUBLIC_APP_URL=https://proyecto-c-buyer2-bicimarket.vercel.app` to Vercel env and `.env.example`

---

## 3. Build Success Likelihood

### Status: LIKELY PASSES

**Indicators:**
- TypeScript is configured and dependencies are installed
- Prisma generate runs as part of build
- No obvious syntax errors found during review
- shadcn/ui and Radix UI are stable libraries

**Risks:**
- `zod@^4.3.6` is a very recent major version. Zod v4 has breaking API changes from v3. If any code patterns use v3 API, they will fail to compile. Needs verification.
- `lucide-react@^1.8.0` — major version change from v0.x. API may have changed. `src/types/lucide-react.d.ts` suggests there was already a type compatibility issue requiring a manual type declaration.
- `@base-ui/react@^1.4.0` is installed but may not be used. Confirm it doesn't introduce build errors.

---

## 4. Production Configuration

### Status: PARTIAL

**Good:**
- Error boundaries configured (`error.tsx`)
- 404 page configured (`not-found.tsx`)
- Health check endpoint at `/api/health`

**Gaps:**
- No rate limiting on any API endpoint
- No CORS configuration (relies on Next.js defaults — acceptable for same-origin UI use)
- No CSP headers configured in `next.config.ts` or `vercel.json`
- `@tanstack/react-query-devtools` is in `dependencies` not `devDependencies` — the devtools panel will be included in production bundle unless conditionally rendered

---

## 5. Database Configuration

### Status: PASS

**Evidence:**
- Supabase PostgreSQL with pgBouncer connection pooling configured
- `DATABASE_URL` uses `?pgbouncer=true` — correct for serverless
- `DIRECT_URL` uses standard port 5432 — correct for Prisma migrations
- Prisma client generated to `src/generated/prisma` (excluded from git correctly)

**Risks:**
- Database is a `pk_test_` Clerk instance (test environment), not production. Confirm this is intentional for the project.
- Supabase credentials in `.env` are real and functional. If the `.env` is ever accidentally pushed, the database is compromised. The current `.gitignore` is correct but developers should be aware.

---

## 6. Clerk Configuration

### Status: PASS

**Evidence:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set
- Clerk keys are `pk_test_` / `sk_test_` — test environment keys (appropriate for academic project)
- Sign-in/sign-up routes properly delegate to Clerk hosted UI

**Gaps:**
- No admin user is created via code. The README says to create admin manually via Clerk Dashboard. This is fine but should be in setup instructions clearly.
- `publicMetadata.role = "buyer"` is never set programmatically. New users can use buyer features without explicitly having the `buyer` role. This works because buyer APIs only check `userId` (see DEV-02 auth gap).

---

## 7. Mercado Pago Configuration

### Status: NOT APPLICABLE for Buyer App

Buyer App does not integrate directly with Mercado Pago. However, due to DEV-01 (wrong payment function), even the indirect integration (via Payments App) is broken.

---

## 8. External API Configuration

### Status: PARTIAL

| App | URL Set | Token Set | Functional |
|---|---|---|---|
| Seller App | ✅ | ✅ | YES (mock fallback if token mismatch) |
| Shipping App | ✅ | ❌ commented out | Uses MOCK |
| Payments App | ✅ (trailing space) | ❌ commented out | MOCKED via wrong function |

**Recommendation:** Configure all tokens. The app will fall back to mocks anyway due to DEV-01 in checkout, so the immediate impact is low, but the inbound inter-app endpoints will 500.

---

## 9. Seed Data Availability

### Status: PASS (with caveats)

- `npm run seed` is configured
- Seed creates realistic demo data
- Seed requires a pre-existing `BuyerProfile` (must log in first)
- README documents the seed requirement
- Price inconsistency in seed (see DEV-12)

---

## 10. Missing Secrets for Full Integration

To make the app fully functional end-to-end:

| Secret | Get from |
|---|---|
| `BUYER_TO_SHIPPING_SERVICE_TOKEN` | Coordinate with Enrique Seitz (Shipping App) |
| `BUYER_TO_PAYMENTS_SERVICE_TOKEN` | Coordinate with Rocco Paoloni (Payments App) |
| `PAYMENTS_TO_BUYER_SERVICE_TOKEN` | Coordinate with Rocco Paoloni — must match his `PAYMENTS_TO_BUYER_SERVICE_TOKEN` |
| `SHIPPING_TO_BUYER_SERVICE_TOKEN` | Coordinate with Enrique Seitz — must match his `SHIPPING_TO_BUYER_SERVICE_TOKEN` |
| `SELLER_TO_BUYER_SERVICE_TOKEN` | Coordinate with Pierino Spina — must match his `SELLER_TO_BUYER_SERVICE_TOKEN` |

---

## 11. Missing Setup Steps

Things not covered in README that a new developer or evaluator would need:

1. Run `npx prisma db push` (mentioned) OR `npx prisma migrate deploy` to apply schema
2. Set all environment variables in Vercel dashboard (not just `.env` locally)
3. Coordinate service token values with other 3 teams
4. Create an admin user via Clerk Dashboard (set `publicMetadata: { admin: true }`)
5. Run `npm run seed` AFTER logging in at least once to create a `BuyerProfile`
6. Fix the checkout payment function before the end-to-end flow will work

---

## 12. Anything That Could Break the Deployed App

| Issue | Severity | Likely Symptom |
|---|---|---|
| `createPaymentSession` returns mock URL | CRITICAL | Checkout redirect goes to `https://example-payment.local/...` |
| 5 service tokens missing | HIGH | Other apps receive HTTP 500 when calling Buyer inter-app endpoints |
| `PAYMENTS_APP_URL` trailing space | MEDIUM | Axios may fail to POST to Payments |
| No `middleware.ts` | LOW | Minor auth gap, unlikely to cause visible crash |
| Zod v4 compatibility | UNKNOWN | Build could fail if v3 patterns are used |
| Wrong function for checkout | CRITICAL | No real payment is ever processed |
