// Funciones para llamar a la Payments App.
// Requiere: PAYMENTS_APP_URL y BUYER_TO_PAYMENTS_SERVICE_TOKEN en variables de entorno.
//
// Si las variables no están configuradas, devuelve una sesión de pago mock
// para que puedas desarrollar sin la Payments App corriendo.
//
// Ver documentacion/03-apis.md — sección "Payments App endpoints"

import { createServiceClient } from "@/lib/service-client";
import type {
  CreatePaymentPayload,
  PaymentSessionResult,
  PaymentReceipt,
} from "@/types/inter-service";

function getClient() {
  const baseURL = process.env.PAYMENTS_APP_URL;
  const token = process.env.BUYER_TO_PAYMENTS_SERVICE_TOKEN;
  if (!baseURL || !token) return null;
  return createServiceClient(baseURL, token);
}

// POST /api/v1/payments — inicia el proceso de pago y obtiene la URL de checkout
// Devuelve la URL a la que redirigir al comprador para completar el pago en Mercado Pago
export async function createPayment(
  payload: CreatePaymentPayload,
): Promise<PaymentSessionResult> {
  const client = getClient();

  if (!client) {
    return {
      payment_id: `pay_mock_${payload.order_id}`,
      checkout_url: `/orders?mock_payment_success=true&order_id=${payload.order_id}`,
      preference_id: "mock_preference",
    };
  }

  // Payments App devuelve { data: { payment_id, checkout_url, preference_id }, public_key }
  try {
    const { data: envelope } = await client.post<{
      data: PaymentSessionResult;
      public_key: string;
    }>("/api/v1/payments", payload, {
      headers: { "Idempotency-Key": payload.idempotency_key },
    });
    return envelope.data;
  } catch (err: unknown) {
    const res = (err as { response?: { status?: number; data?: unknown } }).response;
    console.error("[payments-api] createPayment failed", res?.status, JSON.stringify(res?.data));
    throw err;
  }
}

// GET /api/v1/receipts/{paymentId} — obtiene el comprobante de pago
export async function getPaymentReceipt(
  paymentId: string,
): Promise<PaymentReceipt | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const { data } = await client.get<PaymentReceipt>(
      `/api/v1/receipts/${paymentId}`,
    );
    return data;
  } catch {
    return null;
  }
}
