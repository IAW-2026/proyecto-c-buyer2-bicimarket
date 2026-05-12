// PATCH /api/v1/orders/{orderId}/seller-groups/{groupId}/shipping
// Shipping App → Buyer App
//
// Shipping llama este endpoint cuando el estado del envío de un grupo vendedor cambia
// (ej: cuando el paquete sale a distribución, cuando se entrega)
//
// También actualiza el status de la Order si todos los grupos quedaron en "delivered"
//
// Autenticación: X-Service-Token (no JWT de Clerk)
// Variable de entorno requerida: SHIPPING_TO_BUYER_SERVICE_TOKEN

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SellerGroupStatus, OrderStatus } from "@/generated/prisma";
import { validateServiceToken } from "@/lib/service-auth";

const patchSchema = z.object({
  status: z.enum(["preparing", "ready_to_ship", "in_transit", "delivered"]),
  tracking_number: z.string().optional(),
  tracking_url: z.string().url().optional(),
});

// Mapeo de estados de Shipping → SellerGroupStatus en Buyer App
const STATUS_MAP: Record<string, SellerGroupStatus> = {
  preparing: SellerGroupStatus.PREPARING,
  ready_to_ship: SellerGroupStatus.READY_TO_SHIP,
  in_transit: SellerGroupStatus.IN_TRANSIT,
  delivered: SellerGroupStatus.DELIVERED,
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orderId: string; groupId: string }> },
) {
  const tokenError = validateServiceToken(request, "SHIPPING_TO_BUYER_SERVICE_TOKEN");
  if (tokenError) return tokenError;

  const { orderId, groupId } = await context.params;

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join(", ") } },
      { status: 400 },
    );
  }

  const group = await prisma.orderSellerGroup.findUnique({
    where: { id: groupId },
  });

  if (!group || group.orderId !== orderId) {
    return NextResponse.json(
      { error: { code: "GROUP_NOT_FOUND", message: "Grupo de vendedor no encontrado" } },
      { status: 404 },
    );
  }

  const newStatus = STATUS_MAP[parsed.data.status];

  await prisma.orderSellerGroup.update({
    where: { id: groupId },
    data: { status: newStatus },
  });

  // Si todos los grupos de esta orden están delivered, actualizar la orden
  if (parsed.data.status === "delivered") {
    const allGroups = await prisma.orderSellerGroup.findMany({
      where: { orderId },
      select: { status: true },
    });

    const allDelivered = allGroups.every((g) => g.status === SellerGroupStatus.DELIVERED);
    if (allDelivered) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.DELIVERED },
      });
    } else {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PARTIALLY_SHIPPED },
      });
    }
  } else if (parsed.data.status === "in_transit") {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.SHIPPED },
    });
  }

  return NextResponse.json({ id: groupId, status: newStatus });
}
