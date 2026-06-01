# 05 — Deployment Readiness

---

## 1. Vercel Compatibility

### Assessment: PASS (with caveats)

**Good:**
- `package.json` build script: `"build": "prisma generate && next build --webpack"` — Prisma client is generated at build time, which is correct for Vercel
- Next.js 16.2.3 is a recent version, compatible with Vercel
- No custom server (using Next.js built-in server), which is correct for Vercel
- App Router used throughout — Vercel supports this natively
- Images configured with `remotePatterns` in `next.config.ts`

**Caveats:**
- `--webpack` flag on build — this opts out of the default Next.js Turbopack/SWC build. This is unusual and may cause slower builds on Vercel, but will not break the deploy.
- `src/generated/prisma/libquery_engine-darwin-arm64.dylib.node` committed to repo — this is a macOS ARM binary. On Vercel (Linux), Prisma generates the correct Linux binary during `prisma generate`, so this won't break the build. However it adds 10MB+ to the git history needlessly.
- The committed generated Prisma client directory may cause conflicts with the freshly generated one during Vercel build. Typically Vercel builds to a clean directory so this should be fine.

---

## 2. Environment Variables

### Required Variables (from `.env.example`)

| Variable | Purpose | Required for Production | Status |
|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (pooled) | YES | Must be set in Vercel |
| `DIRECT_URL` | PostgreSQL direct connection (migrations) | YES | Must be set in Vercel |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key | YES | Must be set in Vercel |
| `CLERK_SECRET_KEY` | Clerk backend key | YES | Must be set in Vercel |
| `BUYER_TO_SELLER_SERVICE_TOKEN` | Token for calling Seller App | Optional (fallback to mock) | Should be set |
| `BUYER_TO_SHIPPING_SERVICE_TOKEN` | Token for calling Shipping App | Optional (fallback to mock) | Should be set |
| `BUYER_TO_PAYMENTS_SERVICE_TOKEN` | Token for calling Payments App | Optional (mock active) | Should be set when available |
| `PAYMENTS_TO_BUYER_SERVICE_TOKEN` | Token for receiving Payments App callbacks | YES (for inter-service) | Must be set |
| `SHIPPING_TO_BUYER_SERVICE_TOKEN` | Token for receiving Shipping App callbacks | YES (for inter-service) | Must be set |
| `SELLER_TO_BUYER_SERVICE_TOKEN` | Token for receiving Seller App callbacks | YES (for inter-service) | Must be set |
| `SELLER_APP_URL` | URL of Seller App | Optional (fallback to mock) | **CRITICAL: Must be set for real external API call** |
| `PAYMENTS_APP_URL` | URL of Payments App | Optional (mock active) | Set when available |
| `SHIPPING_APP_URL` | URL of Shipping App | Optional (fallback to mock) | Set when available |

### Critical Missing Variable
- **`SELLER_APP_URL` must be set in Vercel** for the external API requirement to be satisfied. Without it, all product data comes from `MOCK_PRODUCTS` in `seller-api.ts` — no real HTTP request is made. A professor checking "external API consumption" would find zero real requests.

### Variable Not in `.env.example`
- No `NEXT_PUBLIC_*` variable for the seller app URL — this is correct since Seller App URL should only be accessed server-side.

---

## 3. Build Success Likelihood

### Assessment: HIGH likelihood of success

**Potential build failures:**
1. TypeScript errors — the codebase uses strict TypeScript. If any type errors exist in `src/`, the build will fail. A quick `npm run build` locally would confirm.
2. Missing optional peer dependencies — the `package.json` has many heavy dependencies. If any peer deps are incompatible on Node 20 (Vercel default), build could fail.
3. ESLint errors — `"lint": "eslint"` is in scripts but not run during build. ESLint errors won't block build.

**Positive indicators:**
- `package.json` scripts include `prisma generate` before `next build`
- No obvious circular imports
- TypeScript strict mode but no obvious violations in reviewed code

---

## 4. Production Configuration

### Issues

**No `next.config.ts` security headers:**
The `next.config.ts` only configures `images.remotePatterns`. Production deployments should have:
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Content-Security-Policy` (at minimum restricting `frame-ancestors`)

These are not strictly required for the academic evaluation, but are good practice.

**`--webpack` flag:**
```json
"build": "prisma generate && next build --webpack"
```
The `--webpack` flag should be removed — in Next.js 16.x, Turbopack is the default bundler and is significantly faster. Using `--webpack` means slower Vercel builds. This was likely added to work around a Tailwind CSS 4 compatibility issue.

---

## 5. Database Configuration

### Assessment: PASS (with verification required)

- Supabase PostgreSQL used (inferred from `.env.example` comments and `DATABASE_URL` + `DIRECT_URL` pattern)
- Connection pooling supported via `DATABASE_URL` (pgbouncer-compatible)
- Direct connection via `DIRECT_URL` for migrations
- `prisma db push` or `prisma migrate deploy` must be run after each schema change

**Potential issues:**
- If migrations haven't been run in production, the DB schema may be out of date
- `prisma.config.ts` exists — this is Prisma 6's new config file. Verify it doesn't conflict with `prisma/schema.prisma`
- The `DATABASE_URL` in `.env` (local) could accidentally be used if `.env` is loaded instead of `.env.local`

**Recommendation:**
Verify Vercel deploy runs `prisma migrate deploy` (or that `prisma db push` was run on the production DB). The build script only runs `prisma generate` which just generates the client type definitions — it doesn't apply migrations.

---

## 6. Clerk Configuration

### Assessment: PASS

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` used correctly in client components
- `CLERK_SECRET_KEY` used only in server-side code
- Sign-in/sign-up pages at correct Clerk-expected paths (`/sign-in/[[...sign-in]]`, `/sign-up/[[...sign-up]]`)
- Clerk middleware missing (`src/middleware.ts`) — this is a known issue (see REQ-04)
- Without `clerkMiddleware()`, the Clerk SDK still works for server-side calls but the recommended redirect handling may behave unexpectedly

**Required verification:**
- Confirm `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set in Vercel environment variables
- Confirm test users exist in the Clerk dashboard with correct `publicMetadata`

---

## 7. External API Configuration

### Seller App
- `SELLER_APP_URL` and `BUYER_TO_SELLER_SERVICE_TOKEN` must both be set for real calls
- If `SELLER_APP_URL` is not set, app falls back to mock data — **not ideal for evaluation**
- Seller App URL: `https://proyecto-c-seller-pierinospina.vercel.app/` (from `.env.example`)

### Payments App
- Fully mocked in `createPaymentSession()` — no real HTTP calls made regardless of env vars
- `PAYMENTS_APP_URL` is defined in `.env.example` but not actually used by the mock

### Shipping App
- `getShippingQuotes()` in `src/lib/shipping-api.ts` checks for `SHIPPING_APP_URL`
- If not set, falls back to mock calculation: `$10,000 base + $4,000 per seller`
- Mock formula should be clearly documented in README (it is, under "Notas para la corrección")

---

## 8. Seed Data Availability

### Assessment: PARTIAL — seed requires manual intervention

The seed script (`prisma/seed.ts`) only seeds data for BuyerProfiles that already exist in the database. This means:

1. The evaluator must log in with each test user account first (to trigger profile creation)
2. Then run `npm run seed` to create orders/cart/favorites for those profiles
3. If the production DB is cleared or refreshed, the evaluator must repeat steps 1-2

**Problem:** There is no automatic way to seed the production DB for accounts that haven't logged in yet. Profiles are created lazily on first login via `getOrCreateBuyerProfile()`.

**Recommendation:**
Option A — Run the seed after logging in with both test users. Document this in README.
Option B — Refactor seed to accept hardcoded Clerk user IDs and create profiles programmatically. This makes seeding idempotent regardless of prior logins.

---

## 9. Missing Setup Steps in README

The README `cp .env .env.local` instruction is incorrect — the correct step is to copy `.env.example`, not `.env`. (`.env` is a local dev file, not a template.) This could confuse evaluators trying to set up locally.

Current README says:
```bash
cp .env .env.local   # Completar con los valores del grupo
```

Should say:
```bash
cp .env.example .env.local   # Completar con los valores del grupo
```

---

## 10. Summary of Deployment Risks

| Risk | Severity | Blocker? | Fix |
|---|---|---|---|
| `SELLER_APP_URL` not set → no real external API | HIGH | For req satisfaction | Set in Vercel dashboard |
| No Clerk `middleware.ts` | HIGH | Auth edge cases | Add middleware.ts |
| Seed requires manual login before running | MEDIUM | Data may be empty | Pre-login or refactor seed |
| Wrong `cp` command in README setup | MEDIUM | Local setup fails | Fix README |
| `prisma migrate deploy` not in build script | MEDIUM | Schema drift | Add or document separately |
| `--webpack` flag slows builds | LOW | No | Remove |
| macOS binary in generated/ | LOW | No | Gitignore properly |
