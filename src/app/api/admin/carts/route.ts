import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getSellerProducts } from "@/lib/seller-api";

export async function GET() {
  const deny = await requireAdminApi();
  if (deny) return deny;

  const [carts, { data: products }] = await Promise.all([
    prisma.cart.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        status: true,
        updatedAt: true,
        buyerProfile: { select: { id: true, fullName: true, email: true } },
        items: { select: { productId: true, quantity: true } },
        _count: { select: { items: true } },
      },
    }),
    getSellerProducts(),
  ]);

  const priceMap = new Map(products.map((p) => [p.id, p.price_cents]));

  const cartsWithTotal = carts.map((cart) => ({
    ...cart,
    estimatedTotalCents: cart.items.reduce(
      (sum, item) => sum + (priceMap.get(item.productId) ?? 0) * item.quantity,
      0,
    ),
  }));

  return NextResponse.json(cartsWithTotal);
}
