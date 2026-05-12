import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateBuyerProfile } from "@/lib/buyer-service";

export async function GET(
  _: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const { userId } = await auth();
  const { orderId } = await context.params;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getOrCreateBuyerProfile(userId);
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      sellerGroups: { include: { orderItems: true } },
    },
  });

  if (!order || order.buyerProfileId !== profile.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}
