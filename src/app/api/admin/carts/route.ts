import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const deny = await requireAdminApi();
  if (deny) return deny;

  const carts = await prisma.cart.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      updatedAt: true,
      buyerProfile: { select: { id: true, fullName: true, email: true } },
      items: { select: { unitPriceCents: true, quantity: true } },
      _count: { select: { items: true } },
    },
  });

  const cartsWithTotal = carts.map((cart) => ({
    ...cart,
    estimatedTotalCents: cart.items.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0
    ),
  }));

  return NextResponse.json(cartsWithTotal);
}
