import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  const deny = await requireAdminApi();
  if (deny) return deny;

  const { searchParams } = req.nextUrl;
  const statusParam = searchParams.get("status") as OrderStatus | null;

  const orders = await prisma.order.findMany({
    where: statusParam ? { status: statusParam } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      totalCents: true,
      currency: true,
      createdAt: true,
      buyerProfile: { select: { id: true, fullName: true, email: true } },
      _count: { select: { items: true, sellerGroups: true } },
    },
  });

  return NextResponse.json(orders);
}
