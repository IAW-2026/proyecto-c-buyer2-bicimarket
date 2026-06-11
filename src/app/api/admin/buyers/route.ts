import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const deny = await requireAdminApi();
  if (deny) return deny;

  const buyers = await prisma.buyerProfile.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      createdAt: true,
      orders: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, totalCents: true, createdAt: true },
      },
      _count: { select: { orders: true } },
    },
  });

  return NextResponse.json(buyers);
}
