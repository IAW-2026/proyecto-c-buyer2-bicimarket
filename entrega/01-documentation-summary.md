# 01 — Documentation Summary
> Audit generated: 2026-05-31 | Delivery: 2026-06-01 | Defense: 2026-06-04 / 2026-06-08

This file represents my reading of the **intended system** as described by the documentation in `/documentacion`. It is the baseline against which the implementation is compared in subsequent audit files.

---

## 1. High-Level Description

**BiciMarket** is a bicycle and accessories marketplace connecting buyers with sellers. It is composed of four independent webapps, each owning its own PostgreSQL database, its own Clerk instance, and its own REST API.

This repository is the **Buyer App** — owned by Camila Rojas Fritz — responsible for the entire buying experience: browsing, cart management, checkout, order tracking, and buyer profile.

---

## 2. Expected Architecture

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Database | PostgreSQL via Prisma ORM |
| Auth | Clerk (`buyer.bicimarket` project) |
| Styles | Tailwind CSS + shadcn/ui |
| State | Zustand (UI), TanStack Query (server state) |
| Validation | Zod |
| HTTP Client | Axios |

The app has two categories of API routes:
1. **`/api/v1/buyer/*`** — for its own UI (authenticated with Clerk Bearer JWT)
2. **`/api/v1/orders/*`** — for incoming calls from other apps (authenticated with `X-Service-Token`)

---

## 3. Main User Flows

### 3.1 Browse & Purchase
1. User registers/logs into Buyer App via Clerk.
2. Browses catalog proxied from Seller App.
3. Adds items to cart; each item gets a price and weight snapshot.
4. Goes to checkout; selects a shipping address.
5. Buyer App calls Shipping App for quotes per seller group.
6. Buyer App calls Payments App to create the payment session.
7. User is redirected to Mercado Pago checkout URL.
8. Upon payment approval, Payments App notifies Buyer App via `PATCH /api/v1/orders/{id}/status`.
9. Payments App also notifies Seller App to create sub-orders.
10. Shipping App updates shipment status via `PATCH /api/v1/orders/{id}/seller-groups/{g}/shipping`.

### 3.2 Order Tracking
- User views order history at `/orders`.
- Clicks order for detail view at `/orders/{id}`.
- Sees status of each seller group (preparing → shipped → delivered).

### 3.3 Profile & Addresses
- User manages addresses at `/profile`.
- Sets a default shipping address.

### 3.4 Favorites
- User can bookmark products as favorites.

---

## 4. Expected APIs

### Buyer-facing (JWT auth)
| Method | Path | Description |
|---|---|---|
| GET/PATCH | `/api/v1/buyer/profile` | Profile CRUD |
| GET/POST/PATCH/DELETE | `/api/v1/buyer/addresses/{id?}` | Address CRUD |
| GET/POST/PATCH/DELETE | `/api/v1/buyer/cart/{itemId?}` | Cart management |
| GET/POST/DELETE | `/api/v1/buyer/favorites/{id?}` | Wishlist |
| GET | `/api/v1/buyer/orders` | Order list |
| GET | `/api/v1/buyer/orders/{id}` | Order detail |
| POST | `/api/v1/buyer/checkout` | Create order |
| POST | `/api/v1/buyer/orders/{id}/cancel` | Cancel order |

### Inter-service (X-Service-Token auth)
| Method | Path | Called by |
|---|---|---|
| PATCH | `/api/v1/orders/{id}/status` | Payments App |
| PATCH | `/api/v1/orders/{id}/seller-groups/{g}/shipping` | Shipping App |
| PATCH | `/api/v1/orders/{id}/seller-groups/{g}/status` | Seller App |

---

## 5. Expected Database Tables

| Table | Purpose |
|---|---|
| `buyer_profiles` | Buyer identity, linked to Clerk user ID |
| `addresses` | Buyer shipping addresses |
| `carts` | One active cart per buyer |
| `cart_items` | Items with price/weight snapshots |
| `favorite_items` | Wishlist |
| `orders` | Source of truth for `order_id` |
| `order_seller_groups` | Per-seller sub-groups within an order |
| `order_items` | Snapshot of order line items |
| `order_status_history` | Audit trail for order status changes |

All IDs should use string CUIDs with resource prefixes (`ord_…`, `byp_…`, etc.).

---

## 6. Expected External Integrations

| App/Service | What Buyer App consumes |
|---|---|
| **Seller App** | Product catalog, product availability |
| **Shipping App** | Shipping quotes per seller group |
| **Payments App** | Create payment session, get receipt |

All inter-app calls use `X-Service-Token` for server-to-server authentication. If env vars are not configured, the app falls back to mock data (valid for Etapa 2 isolation).

---

## 7. Expected Admin Capabilities

The documentation specifies a Buyer App admin with `publicMetadata.admin = true` in Clerk who can:
- View/manage all orders with filtering by status
- View all buyers
- View all carts
- See aggregate stats (total buyers, orders by status, revenue)
- Manually update order status

---

## 8. Expected Authentication Model

- **Buyers**: register freely via Clerk-Buyer. Profile created on first login (lazy provisioning).
- **Admins**: Clerk users with `publicMetadata.admin = true`. Same Clerk project as buyers.
- **Inter-service**: `X-Service-Token` header per pair (e.g., `PAYMENTS_TO_BUYER_SERVICE_TOKEN`).

No Mercado Pago integration in Buyer App — that belongs to Payments App.

---

## 9. Expected Mocked Integrations

Per Etapa 2 rules, all three external apps (Seller, Shipping, Payments) may be mocked. The contract must be respected:
- Seller App mock must return products matching the documented schema.
- Shipping App mock must return `quote_id` per seller group.
- Payments App mock must return a `checkout_url`.

---

## 10. Assumptions Explicitly Stated by Documentation

1. **Stock is unlimited** — No inventory management. All active products are always available.
2. **No cross-Clerk correlation** — Each Clerk is independent. Admin in Buyer App ≠ admin elsewhere.
3. **No webhooks between internal apps** — All inter-app notifications are REST `POST`/`PATCH` calls.
4. **Snapshots are immutable** — Prices, weights, addresses saved at transaction time are never updated retroactively.
5. **IDs use resource prefixes** — `ord_`, `byp_`, `adr_`, `cit_`, etc.
6. **Prices in centavos** — All monetary amounts are integers in ARS cents.
7. **Lazy profile provisioning** — Buyer profile created on first authenticated request, not on Clerk registration.
