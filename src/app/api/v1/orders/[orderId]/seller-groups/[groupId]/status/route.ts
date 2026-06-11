// PATCH /api/v1/orders/{orderId}/seller-groups/{groupId}/status
// Seller App → Buyer App
//
// Seller App llama este endpoint cuando el vendedor acepta una orden,
// transicionando order_seller_group.status de PENDING → PREPARING.
//
// Autenticación: X-Service-Token (no JWT de Clerk)
// Variable de entorno requerida: SELLER_TO_BUYER_SERVICE_TOKEN

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { OrderStatus, SellerGroupStatus } from "@/generated/prisma";
import { validateServiceToken } from "@/lib/service-auth";
import { createOrderStatusHistoryId } from "@/lib/entity-ids";

const patchSchema = z.object({
  status: z.enum(["preparing"]),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orderId: string; groupId: string }> },
) {
  const tokenError = validateServiceToken(request, "SELLER_TO_BUYER_SERVICE_TOKEN");
  if (tokenError) return tokenError;

  const { orderId, groupId } = await context.params;

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          details: {},
        },
      },
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

  if (group.status !== SellerGroupStatus.PENDING) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_TRANSITION",
          message: `No se puede pasar de ${group.status} a PREPARING`,
          details: {},
        },
      },
      { status: 409 },
    );
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json(
      { error: { code: "ORDER_NOT_FOUND", message: "Orden no encontrada", details: {} } },
      { status: 404 },
    );
  }

  const updatedGroup = await prisma.$transaction(async (tx) => {
    const grp = await tx.orderSellerGroup.update({
      where: { id: groupId },
      data: { status: SellerGroupStatus.PREPARING },
    });

    await tx.orderStatusHistory.create({
      data: {
        id: createOrderStatusHistoryId(),
        orderId,
        fromStatus: group.status,
        toStatus: SellerGroupStatus.PREPARING,
        source: "seller",
      },
    });

    if (order.status === OrderStatus.PAID) {
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PREPARING },
      });

      await tx.orderStatusHistory.create({
        data: {
          id: createOrderStatusHistoryId(),
          orderId,
          fromStatus: OrderStatus.PAID,
          toStatus: OrderStatus.PREPARING,
          source: "seller",
        },
      });
    }

    return grp;
  });

  return NextResponse.json({ id: updatedGroup.id, status: updatedGroup.status });
}
