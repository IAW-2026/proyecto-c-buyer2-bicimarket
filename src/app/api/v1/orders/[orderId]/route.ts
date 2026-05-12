// PATCH /api/v1/orders/{orderId}/status
// Payments App → Buyer App
//
// Payments llama este endpoint cuando el estado del pago cambia
// (ej: cuando Mercado Pago confirma el pago, Payments PATCH-ea acá con status="paid")
//
// Autenticación: X-Service-Token (no JWT de Clerk)
// Variable de entorno requerida: PAYMENTS_TO_BUYER_SERVICE_TOKEN

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateServiceToken } from "@/lib/service-auth";

const patchSchema = z.object({
  status: z.enum([
    "paid",
    "payment_failed",
    "cancelled",
    "refunded",
  ]),
  payment_id: z.string().optional(),
});

// Mapeo de estados de Payments hacia los estados de Order en Buyer App
const STATUS_MAP: Record<string, string> = {
  paid: "PAID",
  payment_failed: "CANCELLED",
  cancelled: "CANCELLED",
  refunded: "REFUNDED",
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const tokenError = validateServiceToken(request, "PAYMENTS_TO_BUYER_SERVICE_TOKEN");
  if (tokenError) return tokenError;

  const { orderId } = await context.params;

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join(", ") } },
      { status: 400 },
    );
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json(
      { error: { code: "ORDER_NOT_FOUND", message: "Orden no encontrada" } },
      { status: 404 },
    );
  }

  const newStatus = STATUS_MAP[parsed.data.status] as Parameters<typeof prisma.order.update>[0]["data"]["status"];

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: newStatus,
      ...(parsed.data.payment_id ? { paymentId: parsed.data.payment_id } : {}),
    },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
