import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateBuyerProfile } from "@/lib/buyer-service";
import type { OrderStatus } from "@/generated/prisma";

const CANCELLABLE_STATUSES: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAID",
  "PAYMENT_FAILED",
];

export async function POST(
  _: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await context.params;
  const profile = await getOrCreateBuyerProfile(userId);

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.buyerProfileId !== profile.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!CANCELLABLE_STATUSES.includes(order.status)) {
    return NextResponse.json(
      { error: "Order cannot be cancelled in its current status" },
      { status: 409 },
    );
  }

  const [updated] = await Promise.all([
    prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: "CANCELLED",
        source: "buyer",
      },
    }),
  ]);

  return NextResponse.json({ id: updated.id, status: updated.status });
}
