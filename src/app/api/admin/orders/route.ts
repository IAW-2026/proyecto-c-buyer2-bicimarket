import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  const deny = await requireAdminApi();
  if (deny) return deny;

  const { searchParams } = req.nextUrl;
  const statusParam = searchParams.get("status") as OrderStatus | null;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const where = statusParam ? { status: statusParam } : undefined;

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        status: true,
        totalCents: true,
        currency: true,
        createdAt: true,
        buyerProfile: { select: { id: true, fullName: true, email: true } },
        _count: { select: { items: true, sellerGroups: true } },
      },
    }),
  ]);

  return NextResponse.json({
    data: orders,
    pagination: {
      total,
      page,
      limit,
      has_more: skip + orders.length < total,
    },
  });
}
