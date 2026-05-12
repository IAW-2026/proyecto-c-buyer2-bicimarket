import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateBuyerProfile } from "@/lib/buyer-service";

const quantitySchema = z.object({ quantity: z.number().int().min(1) });

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> },
) {
  const { userId } = await auth();
  const { itemId } = await context.params;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = quantitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((item) => item.message).join(", ") },
      { status: 400 },
    );
  }

  const profile = await getOrCreateBuyerProfile(userId);
  const item = await prisma.cartItem.findUnique({ where: { id: itemId } });

  if (!item) {
    return NextResponse.json({ error: "Cart item not found" }, { status: 404 });
  }

  const cart = await prisma.cart.findUnique({ where: { id: item.cartId } });
  if (!cart || cart.buyerProfileId !== profile.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updated = await prisma.cartItem.update({
    where: { id: itemId },
    data: {
      quantity: parsed.data.quantity,
      subtotal: Number((parsed.data.quantity * item.unitPrice).toFixed(2)),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _: NextRequest,
  context: { params: Promise<{ itemId: string }> },
) {
  const { userId } = await auth();
  const { itemId } = await context.params;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getOrCreateBuyerProfile(userId);
  const item = await prisma.cartItem.findUnique({ where: { id: itemId } });

  if (!item) {
    return NextResponse.json({ error: "Cart item not found" }, { status: 404 });
  }

  const cart = await prisma.cart.findUnique({ where: { id: item.cartId } });
  if (!cart || cart.buyerProfileId !== profile.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.cartItem.delete({ where: { id: itemId } });
  return NextResponse.json({ success: true });
}
