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
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "No autorizado", details: {} } },
      { status: 401 },
    );
  }

  const body = await request.json();
  const parsed = quantitySchema.safeParse(body);
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
  const item = await prisma.cartItem.findUnique({ where: { id: itemId } });

  if (!item) {
    return NextResponse.json(
      { error: { code: "CART_ITEM_NOT_FOUND", message: "Item del carrito no encontrado", details: {} } },
      { status: 404 },
    );
  }

  const cart = await prisma.cart.findUnique({ where: { id: item.cartId } });
  if (!cart || cart.buyerProfileId !== profile.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "No autorizado", details: {} } },
      { status: 401 },
    );
  }

  const updated = await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity: parsed.data.quantity },
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
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "No autorizado", details: {} } },
      { status: 401 },
    );
  }

  const profile = await getOrCreateBuyerProfile(userId);
  const item = await prisma.cartItem.findUnique({ where: { id: itemId } });

  if (!item) {
    return NextResponse.json(
      { error: { code: "CART_ITEM_NOT_FOUND", message: "Item del carrito no encontrado", details: {} } },
      { status: 404 },
    );
  }

  const cart = await prisma.cart.findUnique({ where: { id: item.cartId } });
  if (!cart || cart.buyerProfileId !== profile.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "No autorizado", details: {} } },
      { status: 401 },
    );
  }

  await prisma.cartItem.delete({ where: { id: itemId } });
  return NextResponse.json({ success: true });
}
