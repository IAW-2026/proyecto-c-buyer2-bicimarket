import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import type { SellerGroupStatus } from "@/generated/prisma/client";

const patchSchema = z.object({
  status: z.enum([
    "PENDING",
    "PREPARING",
    "READY_TO_SHIP",
    "IN_TRANSIT",
    "DELIVERED",
    "SETTLED",
    "CANCELLED",
    "REFUNDED",
  ]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string; groupId: string }> }
) {
  const deny = await requireAdminApi();
  if (deny) return deny;

  const { orderId, groupId } = await params;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          details: {},
        },
      },
      { status: 400 }
    );
  }

  const group = await prisma.orderSellerGroup.findUnique({
    where: { id: groupId },
    select: { id: true, status: true, orderId: true },
  });
  if (!group || group.orderId !== orderId) {
    return NextResponse.json(
      { error: { code: "GROUP_NOT_FOUND", message: "Grupo de vendedor no encontrado", details: {} } },
      { status: 404 },
    );
  }

  const newStatus = parsed.data.status as SellerGroupStatus;

  const [updated] = await Promise.all([
    prisma.orderSellerGroup.update({
      where: { id: groupId },
      data: { status: newStatus },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: group.status,
        toStatus: newStatus,
        source: "admin",
      },
    }),
  ]);

  return NextResponse.json({ id: updated.id, status: updated.status });
}
