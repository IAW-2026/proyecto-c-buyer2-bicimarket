# 01 — Documentation Summary (Phase 1)

> Source of truth: `/documentacion/` (01–06) and `/doc referencias/` (02–15)

---

## 1. High-Level Description

BiciMarket is an Argentine bicycle marketplace. The system is composed of **four independent webapps**:

| App | Owner | Role |
|---|---|---|
| **Buyer App** (this repo) | Camila Rojas Fritz | Front-end for buyers: catalog, cart, checkout, orders, favorites, profile |
| Seller App | Pierino Spina | Catalog management, product publishing, sales order fulfillment |
| Shipping App | Enrique Seitz | Shipment creation, tracking, logistics operators |
| Payments App | Rocco Paoloni | Mercado Pago integration, settlements, refunds |

Each app owns its own PostgreSQL database. All apps share **a single Clerk project** (owned by Buyer App). Inter-app communication is REST over HTTP with `X-Service-Token`. The only external webhook is Mercado Pago → Payments App.

---

## 2. Expected Architecture

- **Framework**: Next.js (App Router, React Server Components)
- **Database**: PostgreSQL via Prisma ORM — Buyer App owns `buyer_db`
- **Auth**: Clerk — JWT for user→app calls, `X-Service-Token` for app→app calls
- **Deployment**: Vercel (app) + Supabase/Railway (DB)
- **State**: TanStack React Query (server state) + Zustand (UI-only state)
- **UI**: Tailwind CSS + shadcn/ui

### Buyer DB Tables (as specified in `documentacion/04-modelo-de-datos.md`)

| Table | Purpose |
|---|---|
| `buyer_profiles` | Local profile linked to `clerk_user_id` |
| `addresses` | Buyer's shipping addresses |
| `carts` | One active cart per buyer |
| `cart_items` | Items in cart with price/weight snapshot |
| `favorite_items` | Wishlist (product references) |
| `orders` | Source of truth for `order_id` |
| `order_seller_groups` | One per seller per order (multi-seller support) |
| `order_items` | Line items with full snapshot |
| `order_status_history` | Audit log of order state transitions |

---

## 3. Main User Flows

### 3.1 Browsing & Discovery
- Unauthenticated users can access the home page (`/`) and shop (`/shop`)
- Products proxied from Seller App via `GET /api/v1/products`
- Filters: category, price range, seller, search query, bike type (all URL params)

### 3.2 Cart
- Authenticated buyers add products to a persistent cart (stored in PostgreSQL)
- Cart items capture price + weight snapshot from Seller App availability check
- Cart is grouped by seller for shipping calculations

### 3.3 Checkout
- Buyer selects a shipping address
- Buyer App calls Shipping App for per-seller shipping quotes
- Buyer App calls Payments App to create a payment session → redirects to checkout_url
- Order is created with `status=PENDING_PAYMENT` + one `OrderSellerGroup` per seller
- Cart is cleared and converted after order creation

### 3.4 Order Lifecycle
Orders transition: `PENDING_PAYMENT → PAID → PARTIALLY_SHIPPED → SHIPPED → DELIVERED → COMPLETED`

State changes are driven by:
- Payments App: `PATCH /api/v1/orders/{id}` → sets `PAID`, `PAYMENT_FAILED`, `REFUNDED`
- Shipping App: `PATCH /api/v1/orders/{id}/seller-groups/{id}/shipping` → sets shipping statuses
- Seller App: `PATCH /api/v1/orders/{id}/seller-groups/{id}/status` → sets `PREPARING`

### 3.5 Admin Panel
Admins (users with `publicMetadata.admin=true` in Clerk) can access `/admin`:
- Stats overview (total orders, buyers, carts)
- Orders management with status filter and pagination
- Buyers listing
- Carts listing

---

## 4. Expected REST APIs (Buyer App exposes)

### User-facing (Clerk JWT auth)
- `GET/PATCH /api/v1/buyer/profile`
- `GET/POST/PATCH/DELETE /api/v1/buyer/addresses/{id}`
- `GET/POST/PATCH/DELETE /api/v1/buyer/cart` and `cart/{itemId}`
- `GET/POST /api/v1/buyer/favorites` and `favorites/{id}`
- `POST /api/v1/buyer/checkout`
- `GET /api/v1/buyer/orders` and `orders/{id}`
- `POST /api/v1/buyer/orders/{id}/cancel`

### Service-to-service (X-Service-Token auth)
- `PATCH /api/v1/orders/{id}` ← Payments App (payment status updates)
- `PATCH /api/v1/orders/{id}/seller-groups/{id}/shipping` ← Shipping App
- `PATCH /api/v1/orders/{id}/seller-groups/{id}/status` ← Seller App

### Admin (admin Clerk JWT)
- `GET /api/admin/orders`, `GET /api/admin/orders/{id}`
- `PATCH /api/admin/orders/{id}/seller-groups/{id}`
- `GET /api/admin/buyers`
- `GET /api/admin/carts`
- `GET /api/admin/stats`

---

## 5. Expected Database Ownership

The Buyer App **owns**:
- All buyer-related data (profiles, addresses, carts, orders)
- Order IDs (source of truth across all apps)

The Buyer App **does NOT own**:
- Products (Seller App is the source of truth)
- Payments (Payments App is the source of truth)
- Shipments (Shipping App is the source of truth)
- Seller profiles (Seller App is the source of truth)

References to external entities (product IDs, seller IDs, payment IDs, shipment IDs) are stored as **opaque strings** — no foreign keys to external tables.

---

## 6. Expected External Integrations

| Service | Purpose | Auth |
|---|---|---|
| Seller App | Catalog proxy, product availability | `X-Service-Token` |
| Shipping App | Shipping quotes during checkout | `X-Service-Token` |
| Payments App | Create payment session, receive payment updates | `X-Service-Token` |
| Clerk | Authentication (shared across all 4 apps) | JWT |

During Etapa 2, Shipping and Payments App calls are **mocked/simulated** since those apps are developed independently. Seller App is consumed live if `SELLER_APP_URL` is set.

---

## 7. Expected Admin Capabilities

- View all orders with pagination and status filtering
- View order details (including seller groups and items)
- Update seller group status (admin override)
- View all buyers
- View all carts with items
- View platform-wide stats (counts of orders, buyers, carts, revenue)

---

## 8. Expected Authentication Model

| Actor | Login method | Access |
|---|---|---|
| Buyer | Clerk sign-up/sign-in | Authenticated pages under `/(auth)/` |
| Admin | Same Clerk account + `publicMetadata.admin=true` | `/admin/*` routes |

- Buyer profile is created automatically on first login (lazy provisioning)
- Admin role is manually assigned via Clerk Dashboard
- Inter-app calls use `X-Service-Token` (not Clerk JWT)
- No Clerk webhook setup — profile sync happens at request time via JWT claims

---

## 9. Expected Mocked Integrations (Etapa 2)

Per the assignment, Etapa 2 apps must **mock** inter-app calls. For Buyer App:
- **Payments App**: mock the `POST /api/v1/payments` call → return a fake checkout URL
- **Shipping App**: mock shipping quote calculation → return a calculated cost
- **Seller App**: optionally mock catalog if Seller App URL not available

These mocks must **respect the defined contracts** (same request/response shapes) so they can be replaced by real calls in Etapa 3.

---

## 10. Explicit Documentation Assumptions

1. Stock is unlimited — no inventory management in any app.
2. All apps share one Clerk project (Buyer App's).
3. Multi-seller orders are supported: one `OrderSellerGroup` per seller.
4. Price and weight are always stored as snapshots at the time of the transaction.
5. External service IDs (product IDs, seller IDs, etc.) are stored as opaque strings — no cross-DB foreign keys.
6. Idempotency is required for all order-creating POST endpoints.
7. All monetary amounts are in centavos (integer). Currency is always ARS.
8. All IDs use string prefixes (e.g., `ord_`, `prd_`, `crt_`).
9. No webhooks between internal apps — all notifications are synchronous REST calls.
10. Retry policy for inter-app calls: 3 retries with backoff (1s, 3s, 9s).
