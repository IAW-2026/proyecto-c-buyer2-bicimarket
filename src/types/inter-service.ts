// ============================================================
// Tipos para la comunicación entre apps del sistema BiciMarket
//
// Estos tipos representan los contratos de las APIs de otras
// apps (Seller, Shipping, Payments) tal como están definidos
// en documentacion/03-apis.md
// ============================================================

// ------------------------------------------------------------
// Seller App — /api/v1/products
// ------------------------------------------------------------

export type SellerProduct = {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  weight_grams: number;
  seller_profile_id: string;
  seller_name: string;
  main_image_url: string | null;
  status: "active" | "draft" | "inactive";
  category: "mtb" | "road" | "urban" | "kids" | "bmx" | "parts" | "accessories" | "indumentaria";
  created_at: string;
  updated_at: string;
};

export type SellerProductsParams = {
  page?: number;
  limit?: number;
  sort?: string;
  q?: string;
  status?: "active";
};

// GET /api/v1/products/{id}/availability
export type ProductAvailability = {
  product_id: string;
  status: "active";
  price_cents: number;
  weight_grams: number;
  seller_profile_id: string;
  seller_name: string;
};

// ------------------------------------------------------------
// Shipping App — /api/v1/shipping-quotes
// ------------------------------------------------------------

export type ShippingPackage = {
  weight_grams: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
};

export type ShippingPickup = {
  seller_profile_id: string;
  packages: ShippingPackage[];
};

export type ShippingDestination = {
  city: string;
  province: string;
  postal_code: string;
  country: string;
};

export type ServiceLevel = "standard" | "express" | "same_day";

// POST /api/v1/shipping-quotes — un request con N orígenes (uno por vendedor)
export type ShippingQuoteRequest = {
  pickups: ShippingPickup[];
  to: ShippingDestination;
  service_level: ServiceLevel;
};

// POST /api/v1/shipping-quotes — response
export type ShippingQuoteResponse = {
  origins_count: number;
  discount_pct: number;       // 5% por origen extra, tope 20%
  total_gross_cents: number;
  total_net_cents: number;    // lo que se cobra al comprador
  currency: string;
};

// GET /api/v1/quote-preview — response (sin persistencia, para preview en carrito)
export type ShippingQuotePreview = {
  cost_cents: number;
  currency: string;
  carrier: string;
  service_level: ServiceLevel;
  distance_km: number;
  weight_grams_total: number;
  estimated_days_min: number;
  estimated_days_max: number;
};

// GET /api/v1/shipments?orderId=X
export type Shipment = {
  id: string;
  order_id: string;
  seller_profile_id: string;
  tracking_number: string;
  tracking_url: string | null;
  status: string;
  estimated_delivery: string | null;
  created_at: string;
  updated_at: string;
};

// ------------------------------------------------------------
// Payments App — /api/v1/payments
// ------------------------------------------------------------

export type CreatePaymentPayload = {
  order_id: string;
  total_amount: number;
  currency: "ARS";
  buyer_email: string;
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
    seller_profile_id: string;
  }>;
  return_url: string;
  idempotency_key: string;
};

// POST /api/v1/payments → response
export type PaymentSession = {
  payment_id: string;
  checkout_url: string;
  status: "pending";
  expires_at: string;
};

// GET /api/v1/receipts/{paymentId}
export type PaymentReceipt = {
  payment_id: string;
  order_id: string;
  status: "pending" | "approved" | "rejected" | "refunded";
  total_amount: number;
  currency: "ARS";
  created_at: string;
  updated_at: string;
};

// ------------------------------------------------------------
// Payloads ENTRANTES — otras apps llaman a Buyer App
// ------------------------------------------------------------

// PATCH /api/v1/orders/{orderId}/status
// Payments App → Buyer App (cuando cambia el estado de pago)
export type IncomingOrderStatusPatch = {
  status:
    | "paid"
    | "payment_failed"
    | "cancelled"
    | "refunded";
  payment_id?: string;
};

// PATCH /api/v1/orders/{orderId}/seller-groups/{groupId}/shipping
// Shipping App → Buyer App (cuando cambia el estado del envío)
export type IncomingSellerGroupShippingPatch = {
  status:
    | "preparing"
    | "ready_to_ship"
    | "in_transit"
    | "delivered";
  tracking_number?: string;
  tracking_url?: string;
};
