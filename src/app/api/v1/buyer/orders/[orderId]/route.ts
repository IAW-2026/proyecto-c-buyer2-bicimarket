import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateBuyerProfile } from "@/lib/buyer-service";
import { deepToSnakeCase } from "@/lib/case-utils";

export async function GET(
  _: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const { userId } = await auth();
  const { orderId } = await context.params;
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "No autorizado", details: {} } },
      { status: 401 },
    );
  }

  const profile = await getOrCreateBuyerProfile(userId);
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      sellerGroups: { include: { orderItems: true } },
      statusHistory: { orderBy: { occurredAt: "asc" } },
    },
  });

  if (!order || order.buyerProfileId !== profile.id) {
    return NextResponse.json(
      { error: { code: "ORDER_NOT_FOUND", message: "Orden no encontrada", details: {} } },
      { status: 404 },
    );
  }

  return NextResponse.json(deepToSnakeCase(order));
}
