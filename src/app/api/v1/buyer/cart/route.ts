import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateBuyerProfile, calculateCartTotals } from "@/lib/buyer-service";
import { createCartId, createCartItemId } from "@/lib/entity-ids";
import { deepToSnakeCase, deepToCamelCase } from "@/lib/case-utils";

const cartItemSchema = z.object({
  product_id: z.string().min(1),
  seller_profile_id: z.string().min(1),
  product_name_snapshot: z.string().min(1),
  unit_price_cents: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  weight_grams_snapshot: z.number().int().nonnegative(),
  currency: z.string().optional(),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "No autorizado", details: {} } },
      { status: 401 },
    );
  }

  const profile = await getOrCreateBuyerProfile(userId);
  const cart = await prisma.cart.findUnique({
    where: { buyerProfileId: profile.id },
    include: { items: true },
  });

  if (!cart) {
    const newCart = await prisma.cart.create({
      data: { id: createCartId(), buyerProfileId: profile.id },
      include: { items: true },
    });
    return NextResponse.json({ ...(deepToSnakeCase(newCart) as Record<string, unknown>), total_cents: 0, item_count: 0 });
  }

  const { totalCents, itemCount } = calculateCartTotals(cart.items);
  return NextResponse.json({ ...(deepToSnakeCase(cart) as Record<string, unknown>), total_cents: totalCents, item_count: itemCount });
}

export async function POST(request: NextRequest) {
  const [{ userId }, body] = await Promise.all([auth(), request.json()]);
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "No autorizado", details: {} } },
      { status: 401 },
    );
  }

  const parsed = cartItemSchema.safeParse(body);
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
  const d = deepToCamelCase<{
    productId: string;
    sellerProfileId: string;
    productNameSnapshot: string;
    unitPriceCents: number;
    quantity: number;
    weightGramsSnapshot: number;
    currency?: string;
  }>(parsed.data);

  const cart = await prisma.cart.upsert({
    where: { buyerProfileId: profile.id },
    create: { id: createCartId(), buyerProfileId: profile.id },
    update: { status: "ACTIVE" },
  });

  const isNew = !(await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId: d.productId },
    select: { id: true },
  }));

  const item = await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId: d.productId } },
    create: {
      id: createCartItemId(),
      cartId: cart.id,
      productId: d.productId,
      sellerProfileId: d.sellerProfileId,
      productNameSnapshot: d.productNameSnapshot,
      unitPriceCents: d.unitPriceCents,
      quantity: d.quantity,
      weightGramsSnapshot: d.weightGramsSnapshot,
      currency: d.currency ?? "ARS",
    },
    update: {
      quantity: { increment: d.quantity },
      unitPriceCents: d.unitPriceCents,
    },
  });

  return NextResponse.json(deepToSnakeCase(item), { status: isNew ? 201 : 200 });
}
