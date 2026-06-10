// Funciones para llamar a la Shipping App.
// Requiere: SHIPPING_APP_URL y BUYER_TO_SHIPPING_SERVICE_TOKEN en variables de entorno.
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
  if (!baseURL || !token) {
    throw new Error("SHIPPING_APP_URL y BUYER_TO_SHIPPING_SERVICE_TOKEN son requeridos");
  }
  return createServiceClient(baseURL, token);
}

// POST /api/v1/shipping-quotes — cotización persistente (TTL 60 min), devuelve quote_id por origen
export async function getShippingQuotes(
  req: ShippingQuoteRequest,
): Promise<ShippingQuoteResponse> {
  const client = getClient();
  const { data } = await client.post<ShippingQuoteResponse>(
    "/api/v1/shipping-quotes",
    req,
  );
  return data;
}

// GET /api/v1/quote-preview — estimado sin persistencia (para mostrar precio en carrito)
export async function getShippingQuotePreview(params: {
  pickup_postal_code: string;
  shipping_postal_code: string;
  weight_grams: number;
  service_level: "standard" | "express" | "same_day";
}): Promise<ShippingQuotePreview | null> {
  const client = getClient();
  const { data } = await client.get<ShippingQuotePreview>("/api/v1/quote-preview", {
    params,
  });
  return data;
}

// GET /api/v1/shipments?orderId={orderId} — seguimiento de envíos de una orden
export async function getShipmentsByOrder(orderId: string): Promise<Shipment[]> {
  const client = getClient();
  const response = await client.get<{ data: Shipment[]; pagination: unknown }>(
    "/api/v1/shipments",
    { params: { orderId } },
  );
  return response.data.data;
}
