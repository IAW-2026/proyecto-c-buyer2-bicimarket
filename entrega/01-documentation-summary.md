# 01 — Documentation Summary

> Source of truth: `documentacion/` (6 files) and `doc referencias/` (14 files).
> Note: The audit prompt refers to `/docs` but this repository stores documentation in `documentacion/` and `doc referencias/`. This audit uses those as the source of truth.

---

## 1. High-Level Description

**BiciMarket** is an academic multi-vendor marketplace for bicycles and accessories. It is split into four independent web applications, each owning its own PostgreSQL database and REST API:

| App | Owner | Role |
|---|---|---|
| **Buyer App** | Camila Rojas Fritz | Catalog browsing, cart, checkout, orders, favorites, addresses, profile |
| Seller App | Pierino Spina | Vendor catalog management, sales order processing |
| Shipping App | Enrique Seitz | Shipments, logistics operators, tracking |
| Payments App | Rocco Paoloni | Mercado Pago integration, settlements, refunds |

All four apps share **one Clerk project** (owned by Buyer App). User roles are determined by `publicMetadata` in the JWT, not by separate accounts.

---

## 2. Expected Architecture

- **Framework**: Next.js (App Router) with TypeScript
- **Database**: PostgreSQL 16+ via Prisma ORM, one DB per app
- **Auth**: Clerk (shared project), `publicMetadata.role` for buyer/seller/logistics, `publicMetadata.admin` for admins
- **UI**: React with shadcn/ui, TanStack Query, Zustand
- **Inter-app communication**: REST over HTTP, authenticated with `X-Service-Token` (one secret per ordered pair of apps)
- **State management**: Zustand for UI cart state, TanStack Query for server state
- **Deployment**: Vercel for all four apps

All API routes live under `/api/v1/...`. The only exception is the Mercado Pago webhook at `/webhooks/mercadopago` (only on Payments App).

---

## 3. Main User Flows

### 3.1 Purchase Flow (multi-vendor)
1. Buyer browses catalog (proxied from Seller App)
2. Buyer adds items to cart → Buyer App verifies availability via Seller App
3. Buyer initiates checkout → Buyer App requests shipping quotes from Shipping App per vendor group
4. Buyer App calls Payments App to create a payment → gets `checkout_url`
5. Buyer is redirected to Mercado Pago checkout
6. Mercado Pago sends webhook to Payments App → Payments PATCH Buyer order status
7. Payments POSTs `sales_orders` to Seller App per vendor
8. Seller prepares and marks `ready_to_ship` → Shipping creates `shipment`
9. Shipping updates Buyer and Seller as parcel moves through states
10. On `delivered`, Shipping notifies Payments → settlement and payout to vendor

### 3.2 Profile Management
- Buyer creates account via Clerk → profile auto-created on first request
- Buyer can update name, phone, default shipping address
- Buyer can CRUD delivery addresses

### 3.3 Favorites
- Buyer can add/remove products from wishlist (favoriteItems table)

### 3.4 Order Tracking
- Buyer sees order list with status tabs
- Buyer can view individual order detail including seller groups and shipping status
- Buyer can cancel orders in `pending_payment` status

---

## 4. Expected APIs (Buyer App Endpoints)

### Public user-facing (Clerk JWT required)
| Endpoint | Description |
|---|---|
| `GET /api/v1/buyer/profile` | Get or create buyer profile |
| `PATCH /api/v1/buyer/profile` | Update profile (name, phone, default_address) |
| `GET /api/v1/buyer/addresses` | List addresses (paginated) |
| `POST /api/v1/buyer/addresses` | Create address |
| `PATCH /api/v1/buyer/addresses/{id}` | Update address |
| `DELETE /api/v1/buyer/addresses/{id}` | Delete address |
| `GET /api/v1/buyer/cart` | Get active cart |
| `POST /api/v1/buyer/cart` | Add item (only product_id + quantity needed; Buyer resolves rest) |
| `PATCH /api/v1/buyer/cart/{itemId}` | Update item quantity |
| `DELETE /api/v1/buyer/cart/{itemId}` | Remove item |
| `GET /api/v1/buyer/favorites` | List favorites |
| `POST /api/v1/buyer/favorites` | Add favorite |
| `DELETE /api/v1/buyer/favorites/{id}` | Remove favorite |
| `GET /api/v1/buyer/orders` | List orders (paginated, filterable by status) |
| `GET /api/v1/buyer/orders/{orderId}` | Order detail |
| `POST /api/v1/buyer/checkout` | Create order from cart (Idempotency-Key required) |
| `POST /api/v1/buyer/orders/{id}/cancel` | Cancel order if pending_payment |

### Inter-app (X-Service-Token required)
| Endpoint | Called by |
|---|---|
| `PATCH /api/v1/orders/{id}/status` | Payments App |
| `PATCH /api/v1/orders/{id}/seller-groups/{g}/shipping` | Shipping App |
| `PATCH /api/v1/orders/{id}/seller-groups/{g}/status` | Seller App |

---

## 5. Expected Database (Buyer App — `buyer_db`)

Tables: `buyer_profiles`, `addresses`, `carts`, `cart_items`, `favorite_items`, `orders`, `order_seller_groups`, `order_items`, `order_status_history`

Key constraints:
- IDs: string with resource prefix (`ord_`, `byp_`, `crt_`, etc.), generated using CUID/ULID
- Snapshots: price, weight, address — never updated once stored
- Cross-app references: stored as opaque strings (no FK)
- Audit table: `order_status_history` for every status change

---

## 6. Expected External Integrations

| Service | Used for |
|---|---|
| Clerk | Authentication for all 4 apps (shared project) |
| Seller App | Product catalog proxy, availability checks |
| Shipping App | Shipping quotes, shipment status |
| Payments App | Payment initiation, receipt retrieval |
| Mercado Pago | Only via Payments App (Buyer App does NOT integrate directly) |

---

## 7. Expected Admin Capabilities

- View all orders with filtering and pagination
- View all buyer profiles
- View active carts
- View platform statistics (total buyers, revenue, orders by status)
- Update order seller group status (via API)
- Access protected by `publicMetadata.admin = true`

---

## 8. Expected Authentication Model

- **Buyers**: any Clerk user with `publicMetadata.role = "buyer"` — auto-provisioned on first login
- **Admins**: Clerk user with `publicMetadata.admin = true` — promoted via Clerk Dashboard
- **Service calls**: `X-Service-Token` header, one secret per directed app-to-app pair
- **No Clerk webhooks** — profiles synced lazily on each request via JWT claims

---

## 9. Expected Mocked Integrations

Per documentation, when real app URLs are not configured:
- Seller App: return mock product catalog
- Shipping App: return mock shipping quotes
- Payments App: return mock payment session with mock `checkout_url`

The inter-app mock behavior is explicitly documented as a dev convenience, NOT as production behavior.

---

## 10. Explicit Assumptions in Documentation

1. Stock is unlimited — no inventory management
2. All apps share one Clerk project; role determined by `publicMetadata`
3. Idempotency via header `Idempotency-Key` on all resource-creating POSTs
4. All amounts in centavos (integer), currency always `"ARS"`
5. All IDs have resource-type prefix (`ord_`, `byp_`, etc.)
6. Snapshots are immutable once stored
7. Failed inter-app calls retried 3 times (1s/3s/9s backoff)
8. Error format: `{ "error": { "code": "...", "message": "...", "details": {} } }`
9. Pagination default: `limit=20`, max `limit=100`
10. Soft deletes for entities with relevant history
