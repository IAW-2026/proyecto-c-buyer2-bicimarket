import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateBuyerProfile } from "@/lib/buyer-service";
import { createCartId, createCartItemId } from "@/lib/entity-ids";
import { getSellerProducts } from "@/lib/seller-api";
import type { SellerProduct } from "@/types/inter-service";

const cartItemSchema = z.object({
  product_id: z.string().min(1),
  seller_profile_id: z.string().min(1),
  quantity: z.number().int().positive(),
});

function buildEnrichedItem(
  item: { id: string; cartId: string; productId: string; sellerProfileId: string; quantity: number; addedAt: Date },
  product: SellerProduct | undefined,
) {
  return {
    id: item.id,
    cart_id: item.cartId,
    product_id: item.productId,
    seller_profile_id: item.sellerProfileId,
    quantity: item.quantity,
    added_at: item.addedAt,
    product_name: product?.title ?? "Producto no disponible",
    unit_price_cents: product?.price_cents ?? 0,
    currency: product?.currency ?? "ARS",
    weight_grams: product?.weight_grams ?? 0,
    image_url: product?.main_image_url ?? null,
  };
}

async function enrichItems(
  items: { id: string; cartId: string; productId: string; sellerProfileId: string; quantity: number; addedAt: Date }[],
) {
  const { data: products } = await getSellerProducts();
  const productMap = new Map(products.map((p) => [p.id, p]));
  return items.map((item) => buildEnrichedItem(item, productMap.get(item.productId)));
}

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
    });
    return NextResponse.json({
      id: newCart.id,
      buyer_profile_id: newCart.buyerProfileId,
      status: newCart.status,
      created_at: newCart.createdAt,
      updated_at: newCart.updatedAt,
      items: [],
      total_cents: 0,
      item_count: 0,
    });
  }

  const enrichedItems = await enrichItems(cart.items);
  const totalCents = enrichedItems.reduce((sum, i) => sum + i.unit_price_cents * i.quantity, 0);
  const itemCount = enrichedItems.reduce((sum, i) => sum + i.quantity, 0);

  return NextResponse.json({
    id: cart.id,
    buyer_profile_id: cart.buyerProfileId,
    status: cart.status,
    created_at: cart.createdAt,
    updated_at: cart.updatedAt,
    items: enrichedItems,
    total_cents: totalCents,
    item_count: itemCount,
  });
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

  const { product_id, seller_profile_id, quantity } = parsed.data;

  const profile = await getOrCreateBuyerProfile(userId);

  const cart = await prisma.cart.upsert({
    where: { buyerProfileId: profile.id },
    create: { id: createCartId(), buyerProfileId: profile.id },
    update: { status: "ACTIVE" },
  });

  const isNew = !(await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId: product_id },
    select: { id: true },
  }));

  const item = await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId: product_id } },
    create: {
      id: createCartItemId(),
      cartId: cart.id,
      productId: product_id,
      sellerProfileId: seller_profile_id,
      quantity,
    },
    update: {
      quantity: { increment: quantity },
    },
  });

  const { data: products } = await getSellerProducts();
  const product = products.find((p) => p.id === product_id);

  return NextResponse.json(buildEnrichedItem(item, product), { status: isNew ? 201 : 200 });
}
