// PATCH /api/v1/orders/{orderId}/seller-groups/{groupId}/shipping
// Shipping App → Buyer App
//
// Shipping llama este endpoint cuando el estado del envío de un grupo cambia.
// También actualiza el status de la Order si todos los grupos quedaron en "delivered".
//
// Autenticación: X-Service-Token (no JWT de Clerk)
// Variable de entorno requerida: SHIPPING_TO_BUYER_SERVICE_TOKEN

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SellerGroupStatus, OrderStatus, ShippingStatus } from "@/generated/prisma";
import { validateServiceToken } from "@/lib/service-auth";

const patchSchema = z.object({
  status: z.enum(["preparing", "ready_to_ship", "in_transit", "delivered"]),
  shipping_status: z.enum([
    "created",
    "ready_for_pickup",
    "picked_up",
    "in_transit",
    "out_for_delivery",
    "delivered",
    "failed_delivery",
    "returned",
  ]).optional(),
  shipment_id: z.string().optional(),
  tracking_number: z.string().optional(),
  tracking_url: z.string().url().optional(),
});

const SELLER_GROUP_STATUS_MAP: Record<string, SellerGroupStatus> = {
  preparing: SellerGroupStatus.PREPARING,
  ready_to_ship: SellerGroupStatus.READY_TO_SHIP,
  in_transit: SellerGroupStatus.IN_TRANSIT,
  delivered: SellerGroupStatus.DELIVERED,
};

const SHIPPING_STATUS_MAP: Record<string, ShippingStatus> = {
  created: ShippingStatus.CREATED,
  ready_for_pickup: ShippingStatus.READY_FOR_PICKUP,
  picked_up: ShippingStatus.PICKED_UP,
  in_transit: ShippingStatus.IN_TRANSIT,
  out_for_delivery: ShippingStatus.OUT_FOR_DELIVERY,
  delivered: ShippingStatus.DELIVERED,
  failed_delivery: ShippingStatus.FAILED_DELIVERY,
  returned: ShippingStatus.RETURNED,
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

  const group = await prisma.orderSellerGroup.findUnique({ where: { id: groupId } });
  if (!group || group.orderId !== orderId) {
    return NextResponse.json(
      { error: { code: "GROUP_NOT_FOUND", message: "Grupo de vendedor no encontrado" } },
      { status: 404 },
    );
  }

  const newStatus = SELLER_GROUP_STATUS_MAP[parsed.data.status];
  const newShippingStatus = parsed.data.shipping_status
    ? SHIPPING_STATUS_MAP[parsed.data.shipping_status]
    : undefined;

  await prisma.orderSellerGroup.update({
    where: { id: groupId },
    data: {
      status: newStatus,
      ...(newShippingStatus ? { shippingStatus: newShippingStatus } : {}),
      ...(parsed.data.shipment_id ? { shipmentId: parsed.data.shipment_id } : {}),
    },
  });

  // Actualizar estado de la Order según el progreso de los grupos
  if (parsed.data.status === "delivered") {
    const allGroups = await prisma.orderSellerGroup.findMany({
      where: { orderId },
      select: { status: true },
    });
    const allDelivered = allGroups.every((g) => g.status === SellerGroupStatus.DELIVERED);
    await prisma.order.update({
      where: { id: orderId },
      data: { status: allDelivered ? OrderStatus.DELIVERED : OrderStatus.PARTIALLY_SHIPPED },
    });
  } else if (parsed.data.status === "in_transit") {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.SHIPPED },
    });
  }

  return NextResponse.json({ id: groupId, status: newStatus });
}
