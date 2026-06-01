// PATCH /api/v1/orders/{orderId}
// Payments App → Buyer App
//
// Payments llama este endpoint cuando el estado del pago cambia.
// Autenticación: X-Service-Token (no JWT de Clerk)
// Variable de entorno requerida: PAYMENTS_TO_BUYER_SERVICE_TOKEN

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateServiceToken } from "@/lib/service-auth";
import { createOrderStatusHistoryId } from "@/lib/entity-ids";
import type { OrderStatus } from "@/generated/prisma";

const patchSchema = z.object({
  status: z.enum(["paid", "payment_failed", "cancelled", "refunded"]),
  payment_id: z.string().optional(),
});

const STATUS_MAP: Record<string, OrderStatus> = {
  paid: "PAID",
  payment_failed: "PAYMENT_FAILED",
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
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join(", "), details: {} } },
      { status: 400 },
    );
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json(
      { error: { code: "ORDER_NOT_FOUND", message: "Orden no encontrada", details: {} } },
      { status: 404 },
    );
  }

  const newStatus = STATUS_MAP[parsed.data.status];

  const [updated] = await Promise.all([
    prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        ...(parsed.data.payment_id ? { paymentId: parsed.data.payment_id } : {}),
      },
    }),
    prisma.orderStatusHistory.create({
      data: {
        id: createOrderStatusHistoryId(),
        orderId,
        fromStatus: order.status,
        toStatus: newStatus,
        source: "payments",
        payload: parsed.data.payment_id ? { payment_id: parsed.data.payment_id } : undefined,
      },
    }),
  ]);

  return NextResponse.json({ id: updated.id, status: updated.status });
}
