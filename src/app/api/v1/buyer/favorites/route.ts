import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateBuyerProfile } from "@/lib/buyer-service";

const favoriteSchema = z.object({
  productId: z.string().min(1),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getOrCreateBuyerProfile(userId);
  const favorites = await prisma.favoriteItem.findMany({
    where: { buyerProfileId: profile.id },
    orderBy: { addedAt: "desc" },
  });

  return NextResponse.json(favorites);
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = favoriteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }

  const profile = await getOrCreateBuyerProfile(userId);

  const favorite = await prisma.favoriteItem.upsert({
    where: {
      buyerProfileId_productId: {
        buyerProfileId: profile.id,
        productId: parsed.data.productId,
      },
    },
    create: { buyerProfileId: profile.id, productId: parsed.data.productId },
    update: {},
  });

  return NextResponse.json(favorite, { status: 201 });
}
