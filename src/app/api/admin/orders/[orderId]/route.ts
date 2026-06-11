import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { createOrderStatusHistoryId } from "@/lib/entity-ids";
import type { OrderStatus } from "@/generated/prisma/client";

const patchSchema = z.object({
  status: z.enum([
    "PENDING_PAYMENT",
    "PAID",
    "PAYMENT_FAILED",
    "PARTIALLY_SHIPPED",
    "SHIPPED",
    "DELIVERED",
    "COMPLETED",
    "CANCELLED",
    "REFUNDED",
  ]),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const deny = await requireAdminApi();
  if (deny) return deny;

  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      buyerProfile: { select: { id: true, fullName: true, email: true, phone: true } },
      sellerGroups: {
        include: { orderItems: true },
      },
      statusHistory: { orderBy: { occurredAt: "asc" } },
    },
  });

  if (!order) {
    return NextResponse.json(
      { error: { code: "ORDER_NOT_FOUND", message: "Orden no encontrada", details: {} } },
      { status: 404 },
    );
  }

  return NextResponse.json(order);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const deny = await requireAdminApi();
  if (deny) return deny;

  const { orderId } = await params;

  const body = await req.json();
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
      { status: 400 }
    );
  }

  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, status: true } });
  if (!order) {
    return NextResponse.json(
      { error: { code: "ORDER_NOT_FOUND", message: "Orden no encontrada", details: {} } },
      { status: 404 },
    );
  }

  const newStatus = parsed.data.status as OrderStatus;

  const [updated] = await Promise.all([
    prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    }),
    prisma.orderStatusHistory.create({
      data: {
        id: createOrderStatusHistoryId(),
        orderId,
        fromStatus: order.status,
        toStatus: newStatus,
        source: "admin",
      },
    }),
  ]);

  return NextResponse.json({ id: updated.id, status: updated.status });
}
