# 08 — README Audit

---

## Current README Structure

The README currently contains:

1. GitHub Classroom assignment badge (auto-generated)
2. Title: "BiciMarket — Buyer App"
3. Deploy link
4. Test users table (3 users)
5. Suggested test flow
6. Local setup instructions
7. Useful commands
8. Project description
9. "Notas para la corrección" (notes for graders)
10. Documentation links

---

## Required Structure (per teacher's June 1 reminder)

Teacher explicitly specified this order:
1. Deploy link
2. List of test users
3. Instructions for using/evaluating the app
4. Brief project description (max 3–4 paragraphs)
5. Notes/comments for graders

---

## Issue Analysis

### CRITICAL: User email format is wrong

**Current:**
```
| buyer admin    | buyerclerktest@iaw.com  | iawuser# | Admin |
| buyer1 operator | buyer1clerktest@iaw.com | iawuser# | Comprador |
| buyer2 operator | buyer2clerktest@iaw.com | iawuser# | Comprador |
```

**Required format:** `<rol>+clerktest@iaw.com`

**Correct format should be:**
```
| Admin          | admin+clerktest@iaw.com  | iawuser# | Admin (acceso a /admin) |
| Comprador 1    | buyer+clerktest@iaw.com  | iawuser# | Comprador |
| Comprador 2    | buyer2+clerktest@iaw.com | iawuser# | Comprador |
```

If the Clerk accounts don't use the `+` separator, the evaluator will try `buyer+clerktest@iaw.com`, the login will fail, and the evaluation will stop there. **This is blocking.**

---

### MEDIUM: README order differs from required

The deploy link is at the top (correct), test users table is second (correct), but the "Instrucciones para evaluar" section appears before setup instructions in the README — the teacher wants: link → users → instructions → description → notes.

The current README interleaves "Setup local" (technical setup) with the test flow instructions. These should be separated.

---

### MINOR: GitHub badge at top

The auto-generated `[![Review Assignment Due Date](...)]` badge is the first thing in the README. This is fine but distracts from the deploy link. Consider moving it below the deploy link.

---

### MINOR: "cp .env .env.local" is wrong

The setup step says:
```bash
cp .env .env.local   # Completar con los valores del grupo
```
Since `.env` is gitignored and won't exist in a fresh clone, this will fail. Should be:
```bash
cp .env.example .env.local
```

---

### MINOR: Description is below setup instructions

The project description should be max 3–4 paragraphs and appear **after** the instructions, not before. Currently it appears under "Descripción del proyecto" which is after the commands section.

---

### GOOD: What the README does well

- Deploy URL is present and prominent
- User table has email, password, and role columns
- "Notas para la corrección" section explicitly documents:
  - Payments mock status
  - Shipping mock status
  - Real Seller App integration
  - Design decisions (Zustand, graceful fallback, service-auth)
  - Known limitations
- Setup steps are clear (modulo the `cp .env` issue)
- Documentation links at bottom point to relevant architecture docs

---

## Recommended Revised README Structure

```markdown
# BiciMarket — Buyer App

## Deploy
https://proyecto-c-buyer2-bicimarket.vercel.app/

---

## Usuarios de prueba

| Nombre | Email | Contraseña | Rol |
|--------|-------|------------|-----|
| Admin | admin+clerktest@iaw.com | iawuser# | Admin (acceso a `/admin`) |
| Comprador 1 | buyer+clerktest@iaw.com | iawuser# | Comprador |
| Comprador 2 | buyer2+clerktest@iaw.com | iawuser# | Comprador |

---

## Instrucciones para evaluar

**Flujo de comprador:**
1. Ingresar con `buyer+clerktest@iaw.com`
2. Navegar el catálogo → explorar filtros por categoría, precio, vendedor
3. Agregar productos al carrito
4. Ir al checkout → seleccionar dirección → confirmar pedido
5. Ver la orden en el historial de pedidos

**Flujo de administrador:**
1. Ingresar con `admin+clerktest@iaw.com`
2. Navegar a `/admin` → revisar dashboard de estadísticas
3. Ver listado de órdenes con filtro de estado y paginación
4. Ver detalle de una orden individual

**Datos precargados:**
Los usuarios de prueba tienen carritos, favoritos y órdenes en distintos estados precargados.

---

## Setup local

```bash
# 1. Clonar e instalar
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local   # Completar con los valores reales

# 3. Aplicar schema y generar cliente
npx prisma generate
npx prisma db push

# 4. Poblar con datos de prueba (requiere haber logueado con los usuarios primero)
npm run seed

# 5. Iniciar
npm run dev
```

---

## Descripción

BiciMarket es un marketplace argentino de bicicletas y accesorios. Esta app es la interfaz del comprador: permite navegar el catálogo por categoría y precio, guardar favoritos, armar un carrito persistente, hacer checkout con múltiples vendedores, y hacer seguimiento del historial de pedidos.

El sistema completo está compuesto por cuatro apps independientes (Buyer, Seller, Shipping, Payments), cada una con su propia base de datos. Todas comparten el mismo proyecto de Clerk para autenticación. La comunicación entre apps es server-to-server usando `X-Service-Token`. La Buyer App consume el catálogo del Seller App y expone endpoints que Payments y Shipping llaman para actualizar estados.

**Stack:** Next.js 16 (App Router) · PostgreSQL · Prisma · Clerk · Tailwind CSS · shadcn/ui · Zustand · TanStack Query · Zod

---

## Notas para la corrección

**Integraciones simuladas (Etapa 2):**
- **Pagos:** Al confirmar el checkout se genera una URL mock. Los endpoints para recibir actualizaciones de pago están implementados.
- **Envíos:** Si `SHIPPING_APP_URL` no está configurada, el costo se calcula con fórmula mock ($10.000 base + $4.000 por vendedor).

**Integraciones reales:**
- **Catálogo:** Los productos se obtienen en tiempo real del Seller App cuando `SELLER_APP_URL` está configurada. Hay fallback a datos mock para funcionamiento autónomo.

**Decisiones de diseño:**
- Zustand solo para estado de UI del checkout (dirección, nota). El carrito persiste en PostgreSQL.
- El checkout agrupa items por vendedor automáticamente y calcula cotizaciones de envío internamente.
- `service-auth.ts` centraliza la validación de `X-Service-Token` para todos los endpoints inter-servicios.
```

---

## Priority Fixes for README

| Fix | Priority | Effort |
|---|---|---|
| Create correct Clerk users with `+` format | CRITICAL | 20 min |
| Update user table with correct emails | CRITICAL | 2 min |
| Fix `cp .env` → `cp .env.example` | HIGH | 2 min |
| Reorder structure to match teacher requirement | MEDIUM | 15 min |
| Remove GitHub badge from top | LOW | 1 min |
