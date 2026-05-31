import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateBuyerProfile } from "@/lib/buyer-service";

const addressSchema = z.object({
  alias: z.string().min(2).optional(),
  street: z.string().min(2).optional(),
  number: z.string().min(1).optional(),
  apartment: z.string().optional(),
  city: z.string().min(2).optional(),
  province: z.string().min(2).optional(),
  postalCode: z.string().min(2).optional(),
  country: z.string().min(2).optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ addressId: string }> },
) {
  const [{ userId }, { addressId }, body] = await Promise.all([
    auth(),
    context.params,
    request.json(),
  ]);
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "No autorizado", details: {} } },
      { status: 401 },
    );
  }

  const parsed = addressSchema.safeParse(body);
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
  const address = await prisma.address.findUnique({ where: { id: addressId } });

  if (!address || address.buyerProfileId !== profile.id) {
    return NextResponse.json(
      { error: { code: "ADDRESS_NOT_FOUND", message: "Dirección no encontrada", details: {} } },
      { status: 404 },
    );
  }

  if (parsed.data.isDefault) {
    await prisma.address.updateMany({
      where: { buyerProfileId: profile.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.address.update({
    where: { id: addressId },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _: NextRequest,
  context: { params: Promise<{ addressId: string }> },
) {
  const { userId } = await auth();
  const { addressId } = await context.params;
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "No autorizado", details: {} } },
      { status: 401 },
    );
  }

  const profile = await getOrCreateBuyerProfile(userId);
  const address = await prisma.address.findUnique({ where: { id: addressId } });

  if (!address || address.buyerProfileId !== profile.id) {
    return NextResponse.json(
      { error: { code: "ADDRESS_NOT_FOUND", message: "Dirección no encontrada", details: {} } },
      { status: 404 },
    );
  }

  await prisma.address.delete({ where: { id: addressId } });
  return NextResponse.json({ success: true });
}
