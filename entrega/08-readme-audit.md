# 08 — README Audit

---

## Current README Assessment

File: `README.md`

---

## ✅ What's Present

| Requirement | Status | Notes |
|---|---|---|
| App description | ✅ | Clear one-paragraph description of what BiciMarket Buyer App does |
| Deploy link | ✅ | `https://proyecto-c-buyer2-bicimarket.vercel.app/` |
| Admin credentials | ✅ | `admin@test.com` / `Admin1234!` |
| Buyer credentials | ✅ | `comprador@test.com` / `Comprador1234!` |
| Setup instructions | ✅ (partial) | 5-step setup with code blocks |
| Tech stack | ✅ | Listed in "Stack" section |
| Route table | ✅ | All main routes listed with descriptions |
| API table | ✅ | Full endpoint table with methods and descriptions |
| Project structure | ✅ | Tree structure of `src/` directory |
| Useful commands | ✅ | npm run dev/build/seed, Prisma commands |
| Documentation reference | ✅ | Links to `referencias/` and `documentacion/` |
| Architecture context | ✅ | Table showing all 4 apps and their owners |

---

## ⚠️ Issues Found

### Issue 1: Setup Step 2 References Wrong File

```bash
# Current (WRONG):
cp .env .env.local   # Completar con los valores del grupo

# Should be:
cp .env.example .env.local   # Completar con los valores del grupo
```

**Impact:** If someone follows step 2 literally, they copy the real `.env` (which contains actual credentials) rather than the template. In a clean clone where `.env` doesn't exist (because it's gitignored), this command fails silently.

**Fix:** Change step 2 to `cp .env.example .env.local`.

---

### Issue 2: No Mention of Admin Creation Process

The README lists `admin@test.com` but does not explain how this user was made admin. Someone setting up the project fresh will not know they need to:
1. Register via Clerk sign-up
2. Go to Clerk Dashboard
3. Find the user
4. Add `publicMetadata: { "admin": true }`

There is a note: *"Para crear un admin nuevo: registrarse normalmente → ir al Clerk Dashboard → buscar el usuario → editar `publicMetadata` → agregar `{ "admin": true }`."* — this IS present. ✅

---

### Issue 3: Setup Does Not Mention All Required Env Vars

Setup step 2 says "Completar con los valores del grupo" but doesn't specify which values are needed from which team members. A new developer would not know they need service tokens from 3 other people.

**Fix:** Add a note listing which env vars need cross-team coordination.

---

### Issue 4: No Mention of `NEXT_PUBLIC_APP_URL`

This variable is not in `.env.example` but will be needed once the payment function is fixed (FIX-01). Pre-emptively add it.

---

### Issue 5: No Indication of What Fails Without Full Integration

The README does not mention that checkout is mocked or that most inter-app features require configuration. A professor deploying the app cold would not understand why checkout doesn't work.

**Fix:** Add a "Known Limitations / Mock Behavior" section explaining which features are mocked.

---

### Issue 6: Stack Says "Next.js 16" — Non-Standard Version

`package.json` has `"next": "16.2.3"`. This is not a standard public release version that a professor would recognize. Worth noting in the README that this is the project's custom/academic version per AGENTS.md.

---

## Recommended README Improvements

### Add: "Known Limitations" Section

```markdown
## Known Limitations (Demo Mode)

When `SELLER_APP_URL` is configured but `BUYER_TO_SELLER_SERVICE_TOKEN` is missing, the catalog falls back to 12 mock products.

When `PAYMENTS_APP_URL` is not configured or inter-app tokens are missing, checkout uses a mock payment session and does not connect to Mercado Pago.

See `documentacion/` for full integration requirements.
```

### Fix Setup Step 2

```markdown
# 2. Configurar variables de entorno
cp .env.example .env.local
# Completar con los valores del grupo (coordinarse con los otros repos para los service tokens)
```

### Add: Required Team Coordination

```markdown
## Setup Completo (Integración Multi-App)

Para habilitar la integración completa:
- `PAYMENTS_TO_BUYER_SERVICE_TOKEN` — debe coincidir con el valor en Payments App (Rocco Paoloni)
- `SHIPPING_TO_BUYER_SERVICE_TOKEN` — debe coincidir con el valor en Shipping App (Enrique Seitz)
- `SELLER_TO_BUYER_SERVICE_TOKEN` — debe coincidir con el valor en Seller App (Pierino Spina)
- `BUYER_TO_PAYMENTS_SERVICE_TOKEN` — compartir con Payments App
- `BUYER_TO_SHIPPING_SERVICE_TOKEN` — compartir con Shipping App
```

---

## Overall README Grade

**Grade: B+**

The README is well-structured and covers most required elements. The deploy link, credentials, setup steps, route table, and API table are all present and clear. The main gaps are: wrong source file in setup step 2, no mention of integration requirements, and no explicit mock limitations disclosure. These are quick fixes.
