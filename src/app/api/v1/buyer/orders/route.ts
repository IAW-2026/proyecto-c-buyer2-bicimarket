import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateBuyerProfile } from "@/lib/buyer-service";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getOrCreateBuyerProfile(userId);
  const orders = await prisma.order.findMany({
    where: { buyerProfileId: profile.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      sellerGroups: true,
    },
  });

  return NextResponse.json(orders);
}
