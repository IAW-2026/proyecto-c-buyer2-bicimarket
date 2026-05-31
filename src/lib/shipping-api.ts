// Funciones para llamar a la Shipping App.
// Requiere: SHIPPING_APP_URL y BUYER_TO_SHIPPING_SERVICE_TOKEN en variables de entorno.
//
// Si las variables no están configuradas, devuelve cotizaciones mock
// para que puedas desarrollar sin la Shipping App corriendo.
//
// Ver documentacion/03-apis.md — sección "Shipping App endpoints"

import { createServiceClient } from "@/lib/service-client";
import type {
  ShippingQuoteRequest,
  ShippingQuoteResponse,
  ShippingQuotePreview,
  Shipment,
} from "@/types/inter-service";

// Dimensiones de caja por defecto hasta que Seller App exponga las reales
export const DEFAULT_PACKAGE_DIMS = { length_cm: 40, width_cm: 30, height_cm: 20 };

function getClient() {
  const baseURL = process.env.SHIPPING_APP_URL;
  const token = process.env.BUYER_TO_SHIPPING_SERVICE_TOKEN;
  if (!baseURL || !token) return null;
  return createServiceClient(baseURL, token);
}

// POST /api/v1/shipping-quotes — cotización persistente (TTL 60 min), devuelve quote_id por origen
export async function getShippingQuotes(
  req: ShippingQuoteRequest,
): Promise<ShippingQuoteResponse> {
  const client = getClient();

  if (!client) {
    return buildMockResponse(req);
  }

  const { data } = await client.post<ShippingQuoteResponse>(
    "/api/v1/shipping-quotes",
    req,
  );
  return data;
}

// GET /api/v1/quote-preview — estimado sin persistencia (para mostrar precio en carrito)
// Retorna null si no hay client configurado (requiere CPs reales, no tiene mock)
export async function getShippingQuotePreview(params: {
  pickup_postal_code: string;
  shipping_postal_code: string;
  weight_grams: number;
  service_level: "standard" | "express" | "same_day";
}): Promise<ShippingQuotePreview | null> {
  const client = getClient();
  if (!client) return null;

  const { data } = await client.get<ShippingQuotePreview>("/api/v1/quote-preview", {
    params,
  });
  return data;
}

// GET /api/v1/shipments?orderId={orderId} — seguimiento de envíos de una orden
export async function getShipmentsByOrder(orderId: string): Promise<Shipment[]> {
  const client = getClient();
  if (!client) return [];

  const { data } = await client.get<Shipment[]>("/api/v1/shipments", {
    params: { orderId },
  });
  return data;
}

// ----------------------------------------------------------------
// Mock — se usa cuando SHIPPING_APP_URL no está configurada
// ----------------------------------------------------------------
function buildMockResponse(req: ShippingQuoteRequest): ShippingQuoteResponse {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const n = req.pickups.length;
  // $10,000 base + $4,000 por pickup, en centavos
  const grossCents = 1_000_000 + 400_000 * n;
  const perPickupCents = Math.round(grossCents / n);

  const quotes = req.pickups.map((pickup, i) => {
    const totalWeight = pickup.packages.reduce((s, p) => s + p.weight_grams, 0);
    return {
      id: `qte_mock_${i}`,
      seller_profile_id: pickup.seller_profile_id,
      service_level: req.service_level,
      carrier: "MockCarrier",
      cost_cents: perPickupCents,
      currency: "ARS",
      estimated_days_min: 3,
      estimated_days_max: 5,
      weight_grams_total: totalWeight,
      packages_count: pickup.packages.length,
      expires_at: expiresAt,
    };
  });

  const discountPct = Math.min(0.05 * (n - 1), 0.2);
  const totalNetCents = Math.round(grossCents * (1 - discountPct));

  return {
    origins_count: n,
    discount_pct: discountPct,
    total_gross_cents: grossCents,
    total_net_cents: totalNetCents,
    currency: "ARS",
    quotes,
  };
}
