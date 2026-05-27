import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const deny = await requireAdminApi();
  if (deny) return deny;

  const [
    totalBuyers,
    ordersByStatus,
    cartsByStatus,
    revenueResult,
    ordersLast24h,
  ] = await Promise.all([
    prisma.buyerProfile.count(),
    prisma.order.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.cart.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.order.aggregate({
      _sum: { totalCents: true },
      where: { status: { in: ["PAID", "COMPLETED", "SHIPPED", "DELIVERED", "PARTIALLY_SHIPPED"] } },
    }),
    prisma.order.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
  ]);

  return NextResponse.json({
    totalBuyers,
    ordersByStatus: Object.fromEntries(ordersByStatus.map((r) => [r.status, r._count.id])),
    cartsByStatus: Object.fromEntries(cartsByStatus.map((r) => [r.status, r._count.id])),
    revenueCents: revenueResult._sum.totalCents ?? 0,
    ordersLast24h,
  });
}
