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
import { createOrderStatusHistoryId } from "@/lib/entity-ids";

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
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join(", "), details: {} } },
      { status: 400 },
    );
  }

  const group = await prisma.orderSellerGroup.findUnique({ where: { id: groupId } });
  if (!group || group.orderId !== orderId) {
    return NextResponse.json(
      { error: { code: "GROUP_NOT_FOUND", message: "Grupo de vendedor no encontrado", details: {} } },
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
      ...(parsed.data.tracking_number ? { trackingNumber: parsed.data.tracking_number } : {}),
      ...(parsed.data.tracking_url ? { trackingUrl: parsed.data.tracking_url } : {}),
    },
  });

  // Actualizar estado de la Order según el progreso de todos los grupos.
  // Excluimos el grupo recién actualizado del query para evitar leer su estado viejo
  // (stale read en PgBouncer u otros connection pools), y usamos newStatus directamente.
  const otherGroups = await prisma.orderSellerGroup.findMany({
    where: { orderId, id: { not: groupId } },
    select: { status: true },
  });

  const allGroupStatuses = [...otherGroups.map((g) => g.status), newStatus];

  const ADVANCED_STATUSES = new Set<SellerGroupStatus>([
    SellerGroupStatus.IN_TRANSIT,
    SellerGroupStatus.DELIVERED,
    SellerGroupStatus.SETTLED,
  ]);

  const allInTransitOrMore = allGroupStatuses.every((s) => ADVANCED_STATUSES.has(s));
  const allDelivered = allGroupStatuses.every(
    (s) => s === SellerGroupStatus.DELIVERED || s === SellerGroupStatus.SETTLED,
  );

  let newOrderStatus: OrderStatus | null = null;

  if (allDelivered) {
    newOrderStatus = OrderStatus.DELIVERED;
  } else if (allInTransitOrMore) {
    newOrderStatus = OrderStatus.SHIPPED;
  } else if (parsed.data.status === "in_transit") {
    newOrderStatus = OrderStatus.PARTIALLY_SHIPPED;
  }

  if (newOrderStatus) {
    const currentOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });
    if (currentOrder && currentOrder.status !== newOrderStatus) {
      await Promise.all([
        prisma.order.update({
          where: { id: orderId },
          data: { status: newOrderStatus },
        }),
        prisma.orderStatusHistory.create({
          data: {
            id: createOrderStatusHistoryId(),
            orderId,
            fromStatus: currentOrder.status,
            toStatus: newOrderStatus,
            source: "shipping",
          },
        }),
      ]);
    }
  }

  return NextResponse.json({ id: groupId, status: newStatus });
}
