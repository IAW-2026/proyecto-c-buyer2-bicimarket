import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateBuyerProfile } from "@/lib/buyer-service";

const addressSchema = z.object({
  label: z.string().min(2).optional(),
  street: z.string().min(2).optional(),
  city: z.string().min(2).optional(),
  state: z.string().optional(),
  zip: z.string().min(2).optional(),
  country: z.string().min(2).optional(),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ addressId: string }> },
) {
  const { userId } = await auth();
  const { addressId } = await context.params;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((item) => item.message).join(", ") },
      { status: 400 },
    );
  }

  const profile = await getOrCreateBuyerProfile(userId);
  const address = await prisma.address.findUnique({ where: { id: addressId } });

  if (!address || address.buyerProfileId !== profile.id) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getOrCreateBuyerProfile(userId);
  const address = await prisma.address.findUnique({ where: { id: addressId } });

  if (!address || address.buyerProfileId !== profile.id) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  await prisma.address.delete({ where: { id: addressId } });
  return NextResponse.json({ success: true });
}
