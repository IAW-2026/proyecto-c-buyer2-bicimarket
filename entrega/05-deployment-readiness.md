# 05 — Deployment Readiness
> Audit generated: 2026-05-31

---

## 1. Vercel Compatibility

| Check | Status | Notes |
|---|---|---|
| Next.js App Router | ✅ PASS | Next.js 16 is Vercel-native |
| `package.json` build command | ⚠️ WARN | `"build": "prisma generate && next build --webpack"` — the `--webpack` flag forces Webpack over Turbopack and is non-standard |
| `vercel.json` | ✅ NOT NEEDED | Auto-detection handles Next.js |
| TypeScript errors | ⚠️ WARN | 26+ UI files have `@ts-nocheck` suppressing errors |
| Image domains | ⚠️ WARN | Only `upload.wikimedia.org` is whitelisted. Real product images from other domains will be blocked |

**The `--webpack` flag** in the build command could cause issues. Vercel supports `--turbo` (experimental) but `--webpack` is not a standard Next.js production flag. It may silently be ignored or cause a build failure. Test the production build locally with `npm run build` before deploying.

---

## 2. Environment Variables Required

All variables that must be set in Vercel Settings → Environment Variables:

| Variable | Source | Required for | Present in `.env`? |
|---|---|---|---|
| `DATABASE_URL` | Supabase/Neon | Prisma (pooled connection) | ✅ YES |
| `DIRECT_URL` | Supabase/Neon | Prisma (direct connection for migrations) | ✅ YES |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard | Clerk browser client | ✅ YES |
| `CLERK_SECRET_KEY` | Clerk dashboard | Clerk server SDK | ✅ YES |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Present but unused in code | ✅ YES |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase | Present but unused in code | ✅ YES |
| `SELLER_APP_URL` | Team agreement | Calls to Seller App | ❌ MISSING |
| `BUYER_TO_SELLER_SERVICE_TOKEN` | Team agreement | Auth to Seller App | ❌ MISSING |
| `SHIPPING_APP_URL` | Team agreement | Calls to Shipping App | ❌ MISSING |
| `BUYER_TO_SHIPPING_SERVICE_TOKEN` | Team agreement | Auth to Shipping App | ❌ MISSING |
| `PAYMENTS_APP_URL` | Team agreement | Calls to Payments App | ❌ MISSING |
| `BUYER_TO_PAYMENTS_SERVICE_TOKEN` | Team agreement | Auth to Payments App | ❌ MISSING |
| `PAYMENTS_TO_BUYER_SERVICE_TOKEN` | Team agreement | Validate incoming from Payments | ❌ MISSING |
| `SHIPPING_TO_BUYER_SERVICE_TOKEN` | Team agreement | Validate incoming from Shipping | ❌ MISSING |
| `SELLER_TO_BUYER_SERVICE_TOKEN` | Team agreement | Validate incoming from Seller | ❌ MISSING |

**Critical**: The service token variables are validated in `lib/service-auth.ts`:
```typescript
const expectedToken = process.env[envVarName];
if (!expectedToken) {
  return NextResponse.json(
    { error: { code: "SERVICE_TOKEN_NOT_CONFIGURED", ... } },
    { status: 500 }  // Returns 500 if token not configured!
  );
}
```
This means if `PAYMENTS_TO_BUYER_SERVICE_TOKEN` is not set in Vercel, any call from Payments App to `PATCH /api/v1/orders/{id}/status` will return **500 Internal Server Error**. The inter-service endpoints will be broken in production until all service tokens are configured.

---

## 3. Build Success Likelihood

**Probability of successful `npm run build`: ~70%**

Factors that could cause build failure:
1. **TypeScript errors masked by `@ts-nocheck`** — removing these suppressions might reveal compilation errors.
2. **`--webpack` flag** — may not be a valid Next.js build flag, could be ignored or cause an error.
3. **Prisma client generation** — the build script runs `prisma generate` first, which should succeed if `DATABASE_URL` is set.
4. **Next.js 16 vs `@clerk/nextjs` v7** — version compatibility should be fine but worth verifying.

**To verify**: Run `npm run build` locally and check the output before submitting.

---

## 4. Production Configuration Issues

### 4.1 Missing Clerk Middleware
Without `middleware.ts`, the Vercel deployment will have unpredictable auth behavior. This is the #1 production-breaking issue.

### 4.2 Hardcoded Payment URL
`buyer-service.ts` returns `https://example-payment.local/checkout?order=${orderId}` as the payment URL. Users who complete checkout in production will be redirected to a non-existent localhost domain.

### 4.3 Image Domain Restrictions
`next.config.ts` only allows images from `upload.wikimedia.org`. All mock product images use Wikipedia URLs, which will work. But if Seller App is connected and returns images from other CDNs, they'll render as broken images.

### 4.4 No Cache Headers on Products Proxy
The `/api/products` route has no caching. Every page load will make a fresh call to Seller App. The spec mentions ≤60s cache on catalog calls (`documentacion/02-responsabilidades.md §3.2`).

---

## 5. Database Configuration

| Check | Status | Notes |
|---|---|---|
| Connection string format | ✅ | `DATABASE_URL` uses Supabase pooled connection string |
| Direct URL for migrations | ✅ | `DIRECT_URL` present for `prisma db push` |
| Migration state | ✅ | Two migrations present, DB should be in sync |
| Prisma binary | ⚠️ | Generated Prisma client includes `libquery_engine-darwin-arm64.dylib.node` — this won't work on Vercel's Linux runtime. Needs to regenerate for Linux on deploy |

**Prisma binary issue**: The `src/generated/prisma/` folder contains the locally generated Prisma client for macOS ARM64. Vercel runs on Linux x64. The `prisma generate` in the build script should regenerate the correct binary for Vercel's runtime — this should work automatically **as long as `DATABASE_URL` is set during build**.

However, `src/generated/prisma/` is in `.gitignore` so it won't be committed — correct.

---

## 6. Clerk Configuration

| Check | Status | Notes |
|---|---|---|
| Publishable key set | ✅ | Present in `.env` |
| Secret key set | ✅ | Present in `.env` |
| Middleware | ❌ MISSING | No `middleware.ts` |
| Sign-in/sign-up pages | ✅ | `/sign-in` and `/sign-up` configured |
| ClerkProvider in root layout | ✅ | Present |

**Required Clerk dashboard settings for production:**
- Add Vercel domain to allowed origins in Clerk dashboard
- Ensure `publicMetadata.admin: true` is set on at least one test user
- Configure allowed redirect URLs for after sign-in/sign-up

---

## 7. Seed Data Availability

The `prisma/seed.ts` file is present but:
- Has no `package.json` script to run it
- Depends on passing existing `buyer_profile` IDs as arguments
- The seed needs to be run against the production database before evaluation

**For the deployed app to show data**, the evaluator needs to:
1. Sign in as a test buyer to create a profile
2. Then run seed manually

This is not self-service. The seed should be redesigned to be idempotent and runnable without prior state.

---

## 8. Missing Setup Steps for a New Deployment

A developer cloning this repo and deploying to Vercel would need to:

1. Create a Supabase/Neon PostgreSQL database
2. Set `DATABASE_URL` and `DIRECT_URL`
3. Create a Clerk application with buyer project
4. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
5. Run `npx prisma db push` to create tables
6. Create a user in Clerk and mark as admin via Dashboard
7. Sign in to create buyer profile
8. Run seed against production DB
9. Set service token vars (or accept that inter-service calls return 500)
10. Deploy to Vercel

**None of this is documented in the README**.

---

## 9. Risk Summary

| Issue | Risk | Fix Effort |
|---|---|---|
| No deploy URL | CRITICAL delivery failure | 2h — just deploy |
| No middleware.ts | Auth broken in production | 30min |
| Payment URL hardcoded to localhost | Checkout broken | 1h |
| Service tokens not configured in Vercel | Inter-service endpoints return 500 | 1h (coordinate with team) |
| Missing `.env.example` | Rubric requirement not met | 15min |
| No seed script | App empty in production | 1h |
| `--webpack` build flag | Potential build failure | 5min to remove |
