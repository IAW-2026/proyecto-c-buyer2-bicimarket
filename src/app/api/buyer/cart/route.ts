import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateBuyerProfile, calculateCartTotals } from "@/lib/buyer-service";

const cartItemSchema = z.object({
  productId: z.string().min(1),
  sellerProfileId: z.string().min(1),
  productNameSnapshot: z.string().min(1),
  unitPriceCents: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  weightGramsSnapshot: z.number().int().nonnegative(),
  currency: z.string().optional(),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getOrCreateBuyerProfile(userId);
  const cart = await prisma.cart.findUnique({
    where: { buyerProfileId: profile.id },
    include: { items: true },
  });

  if (!cart) {
    const newCart = await prisma.cart.create({
      data: { buyerProfileId: profile.id },
      include: { items: true },
    });
    return NextResponse.json({ ...newCart, totalCents: 0, itemCount: 0 });
  }

  const { totalCents, itemCount } = calculateCartTotals(cart.items);
  return NextResponse.json({ ...cart, totalCents, itemCount });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = cartItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }

  const profile = await getOrCreateBuyerProfile(userId);
  const cart = await prisma.cart.upsert({
    where: { buyerProfileId: profile.id },
    create: { buyerProfileId: profile.id },
    update: {},
  });

  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId: parsed.data.productId },
  });

  if (existing) {
    const updated = await prisma.cartItem.update({
      where: { id: existing.id },
      data: {
        quantity: existing.quantity + parsed.data.quantity,
        unitPriceCents: parsed.data.unitPriceCents,
      },
    });
    return NextResponse.json(updated);
  }

  const item = await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId: parsed.data.productId,
      sellerProfileId: parsed.data.sellerProfileId,
      productNameSnapshot: parsed.data.productNameSnapshot,
      unitPriceCents: parsed.data.unitPriceCents,
      quantity: parsed.data.quantity,
      weightGramsSnapshot: parsed.data.weightGramsSnapshot,
      currency: parsed.data.currency ?? "ARS",
    },
  });

  return NextResponse.json(item, { status: 201 });
}
