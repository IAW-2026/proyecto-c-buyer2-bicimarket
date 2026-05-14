import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateBuyerProfile } from "@/lib/buyer-service";

export async function DELETE(
  _: NextRequest,
  context: { params: Promise<{ favoriteId: string }> },
) {
  const { userId } = await auth();
  const { favoriteId } = await context.params;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getOrCreateBuyerProfile(userId);
  const favorite = await prisma.favoriteItem.findUnique({
    where: { id: favoriteId },
  });

  if (!favorite || favorite.buyerProfileId !== profile.id) {
    return NextResponse.json(
      { error: "Favorite item not found" },
      { status: 404 },
    );
  }

  await prisma.favoriteItem.delete({ where: { id: favoriteId } });
  return NextResponse.json({ success: true });
}
