import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateBuyerProfile } from "@/lib/buyer-service";

const favoriteSchema = z.object({
  productId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  sellerId: z.string().min(1),
  sellerName: z.string().optional(),
  imageUrl: z.string().optional(),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getOrCreateBuyerProfile(userId);
  const favorites = await prisma.favoriteItem.findMany({
    where: { buyerProfileId: profile.id },
    orderBy: { createdAt: "desc" },
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
      { error: parsed.error.issues.map((item) => item.message).join(", ") },
      { status: 400 },
    );
  }

  const profile = await getOrCreateBuyerProfile(userId);
  const existing = await prisma.favoriteItem.findFirst({
    where: { buyerProfileId: profile.id, productId: parsed.data.productId },
  });

  if (existing) {
    return NextResponse.json(existing);
  }

  const favorite = await prisma.favoriteItem.create({
    data: {
      buyerProfileId: profile.id,
      ...parsed.data,
    },
  });

  return NextResponse.json(favorite, { status: 201 });
}
