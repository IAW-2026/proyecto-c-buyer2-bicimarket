# 08 — README Audit
> Audit generated: 2026-05-31

---

## Current State

The README.md exists and contains:
- App description (what BiciMarket is, the four-app architecture)
- Table of apps with port numbers
- Setup instructions (npm install, env vars, prisma, npm run dev)
- Project folder structure (detailed)
- Routes table
- API endpoints table (both UI and inter-service)
- Tech stack table
- Useful commands section
- Documentation index (references to `doc referencias/` files)

---

## Assessment Against Rubric

The assignment says: "README breve y conciso, debe incluir: descripción de la app, **link al deploy**, y **credenciales o instrucciones para acceder con cada tipo de usuario disponible** (ej: administrador, usuario final). No debe ser extenso."

| Requirement | Present? | Notes |
|---|---|---|
| App description | ✅ YES | Good — explains what the app does |
| **Deploy link** | ❌ MISSING | No URL to Vercel deployment |
| **Admin credentials** | ❌ MISSING | No email/password or how to get admin access |
| **Buyer credentials** | ❌ MISSING | No test user credentials |
| Concise | ⚠️ FAILING | README is very long (~220 lines) — rubric says "breve y conciso" |

---

## Missing: Deploy Link

This is an automatic point deduction. The README must have the Vercel URL.

```markdown
## 🌐 App en producción

https://proyecto-buyer-bicimarket.vercel.app  ← (reemplazar con URL real)
```

---

## Missing: User Credentials

The evaluator needs to log in to test the app. Without credentials they cannot evaluate any auth-dependent features.

Required:
1. A **buyer user** — email + password that works on the deployed Clerk instance
2. An **admin user** — email + password of a Clerk user with `publicMetadata.admin = true`

Example section to add:

```markdown
## 👤 Acceso de prueba

### Usuario comprador
- **Email**: comprador@test.bicimarket.com
- **Contraseña**: BiciMarket2026!

### Usuario administrador
- **Email**: admin@test.bicimarket.com  
- **Contraseña**: BiciAdmin2026!
- El usuario admin tiene `publicMetadata.admin = true` configurado en Clerk.
- Panel de admin: `/admin`

> Para crear un admin nuevo: registrarse normalmente → ir al Clerk Dashboard → buscar el usuario → editar `publicMetadata` → agregar `{ "admin": true }`.
```

---

## Issues with Current README

### 1. Instruction "cp .env .env.local" is misleading
```bash
cp .env .env.local  # "Copiar los valores del grupo y pegarlos en .env.local"
```
This instruction says to copy `.env` which is gitignored — a new developer cloning the repo won't have this file. Should say to copy `.env.example` instead.

### 2. Next.js version is wrong
The README says `Next.js 16 (App Router)` in the tech stack table. This is correct (package.json has `"next": "16.2.3"`) but unusual — most tutorials reference Next.js 14/15. Not a problem, just notable.

### 3. Admin not mentioned
The README has a routes table that includes `/dashboard`, `/shop`, `/cart` etc. but has no mention of the admin panel at `/admin`. The admin panel is a graded feature.

### 4. Seed instructions missing
No mention of how to populate the database with test data. After `npm run build`, the app will be empty.

---

## Recommended README Structure

Replace the current README with a version that leads with the critical information:

```markdown
# BiciMarket — Buyer App

Aplicación del **comprador** del marketplace BiciMarket. Permite navegar el catálogo, 
gestionar el carrito, hacer checkout y ver el historial de pedidos.

## 🌐 Demo

**URL**: https://proyecto-buyer-bicimarket.vercel.app

## 👤 Acceso de prueba

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Comprador | comprador@test.bicimarket.com | BiciMarket2026! |
| Admin | admin@test.bicimarket.com | BiciAdmin2026! |

Panel de administración: `/admin`

## Stack

Next.js 16 · PostgreSQL · Prisma · Clerk · Tailwind CSS · shadcn/ui

## Setup local

```bash
cp .env.example .env.local   # Completar con las variables del grupo
npm install
npx prisma db push
npx prisma db seed
npm run dev
```

## Arquitectura

Esta app es una de cuatro apps independientes (Buyer, Seller, Shipping, Payments).
Ver `documentacion/` para la arquitectura completa.
```

Keep the rest of the current README content below this section — it's useful but shouldn't be the first thing an evaluator sees.

---

## Action Required

**Before submission** (estimated 20 minutes):
1. Deploy the app
2. Create test users in Clerk (buyer + admin)  
3. Add deploy URL to README
4. Add test credentials to README
5. Add admin route mention to README routes table
