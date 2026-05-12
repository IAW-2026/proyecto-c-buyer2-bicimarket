// Funciones para llamar a la Shipping App.
// Requiere: SHIPPING_APP_URL y BUYER_TO_SHIPPING_SERVICE_TOKEN en variables de entorno.
//
// Si las variables no están configuradas, devuelve cotizaciones mock
// para que puedas desarrollar sin la Shipping App corriendo.
//
// Ver documentacion/03-apis.md — sección "Shipping App endpoints"

import { createServiceClient } from "@/lib/service-client";
import type { ShippingQuote, ShippingQuoteRequest, Shipment } from "@/types/inter-service";

function getClient() {
  const baseURL = process.env.SHIPPING_APP_URL;
  const token = process.env.BUYER_TO_SHIPPING_SERVICE_TOKEN;
  if (!baseURL || !token) return null;
  return createServiceClient(baseURL, token);
}

// POST /api/v1/shipping-quotes — obtiene el costo de envío por vendedor
// Recibe un array de requests (uno por vendedor en el carrito)
export async function getShippingQuotes(
  requests: ShippingQuoteRequest[],
): Promise<ShippingQuote[]> {
  const client = getClient();

  if (!client) {
    // Mock: cotización fija de ejemplo por vendedor
    return requests.map((req) => ({
      seller_profile_id: req.seller_profile_id,
      cost: calcMockShippingCost(req),
      estimated_days: 3,
      packages_count: 1,
      total_weight: req.items.reduce(
        (sum, item) => sum + item.weight_grams * item.quantity,
        0,
      ),
    }));
  }

  const { data } = await getClient()!.post<ShippingQuote[]>(
    "/api/v1/shipping-quotes",
    requests,
  );
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
// Cálculo de envío mock
// ----------------------------------------------------------------
function calcMockShippingCost(req: ShippingQuoteRequest): number {
  const totalWeight = req.items.reduce(
    (sum, item) => sum + item.weight_grams * item.quantity,
    0,
  );
  // Base $800 + $50 por kg
  return Math.round(800 + (totalWeight / 1000) * 50);
}
