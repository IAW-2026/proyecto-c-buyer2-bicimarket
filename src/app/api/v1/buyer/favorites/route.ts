import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateBuyerProfile } from "@/lib/buyer-service";
import { createFavoriteId } from "@/lib/entity-ids";

const favoriteSchema = z.object({
  productId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "No autorizado", details: {} } },
      { status: 401 },
    );
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const profile = await getOrCreateBuyerProfile(userId);
  const where = { buyerProfileId: profile.id };

  const [total, favorites] = await Promise.all([
    prisma.favoriteItem.count({ where }),
    prisma.favoriteItem.findMany({
      where,
      orderBy: { addedAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    data: favorites,
    pagination: {
      total,
      page,
      limit,
      has_more: skip + favorites.length < total,
    },
  });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "No autorizado", details: {} } },
      { status: 401 },
    );
  }

  const body = await request.json();
  const parsed = favoriteSchema.safeParse(body);
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

  const profile = await getOrCreateBuyerProfile(userId);

  const favorite = await prisma.favoriteItem.upsert({
    where: {
      buyerProfileId_productId: {
        buyerProfileId: profile.id,
        productId: parsed.data.productId,
      },
    },
    create: { id: createFavoriteId(), buyerProfileId: profile.id, productId: parsed.data.productId },
    update: {},
  });

  return NextResponse.json(favorite, { status: 201 });
}
