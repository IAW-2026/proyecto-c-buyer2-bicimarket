import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateBuyerProfile } from "@/lib/buyer-service";

const cartItemSchema = z.object({
  productId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().int().positive(),
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
  const cart = await prisma.cart.findUnique({
    where: { buyerProfileId: profile.id },
    include: { items: true },
  });

  if (!cart) {
    const newCart = await prisma.cart.create({
      data: { buyerProfileId: profile.id },
      include: { items: true },
    });
    return NextResponse.json({
      ...newCart,
      total: 0,
      itemCount: 0,
    });
  }

  const items = cart.items.map((item) => ({
    ...item,
    subtotal: Number((item.unitPrice * item.quantity).toFixed(2)),
  }));

  const total = Number(
    items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2),
  );
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return NextResponse.json({ ...cart, items, total, itemCount });
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
      { error: parsed.error.issues.map((item) => item.message).join(", ") },
      { status: 400 },
    );
  }

  const profile = await getOrCreateBuyerProfile(userId);
  const cart = await prisma.cart.upsert({
    where: { buyerProfileId: profile.id },
    create: { buyerProfileId: profile.id },
    update: {},
  });

  const existingItem = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId: parsed.data.productId },
  });

  if (existingItem) {
    const updated = await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: {
        quantity: existingItem.quantity + parsed.data.quantity,
        unitPrice: parsed.data.unitPrice,
        subtotal: Number(
          (
            (existingItem.quantity + parsed.data.quantity) *
            parsed.data.unitPrice
          ).toFixed(2),
        ),
      },
    });
    return NextResponse.json(updated, { status: 200 });
  }

  const item = await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId: parsed.data.productId,
      title: parsed.data.title,
      description: parsed.data.description,
      unitPrice: parsed.data.unitPrice,
      quantity: parsed.data.quantity,
      sellerId: parsed.data.sellerId,
      sellerName: parsed.data.sellerName,
      imageUrl: parsed.data.imageUrl,
      subtotal: Number(
        (parsed.data.unitPrice * parsed.data.quantity).toFixed(2),
      ),
    },
  });

  return NextResponse.json(item, { status: 201 });
}
