import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateBuyerProfile } from "@/lib/buyer-service";
import { createAddressId } from "@/lib/entity-ids";
import { deepToSnakeCase, deepToCamelCase } from "@/lib/case-utils";

const addressSchema = z.object({
  alias: z.string().min(2),
  street: z.string().min(2),
  number: z.string().min(1),
  apartment: z.string().optional(),
  city: z.string().min(2),
  province: z.string().min(2),
  postal_code: z.string().min(2),
  country: z.string().min(2),
  is_default: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "No autorizado", details: {} } },
      { status: 401 },
    );
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const profile = await getOrCreateBuyerProfile(userId);
  const where = { buyerProfileId: profile.id };

  const [total, addresses] = await Promise.all([
    prisma.address.count({ where }),
    prisma.address.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    data: addresses.map((a) => deepToSnakeCase(a)),
    pagination: {
      total,
      page,
      limit,
      has_more: skip + addresses.length < total,
    },
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

  const addrData = deepToCamelCase<{
    alias: string;
    street: string;
    number: string;
    apartment?: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    isDefault?: boolean;
  }>(parsed.data);

  if (addrData.isDefault) {
    await prisma.address.updateMany({
      where: { buyerProfileId: profile.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.create({
    data: {
      id: createAddressId(),
      buyerProfileId: profile.id,
      ...addrData,
      isDefault: addrData.isDefault ?? false,
    },
  });

  return NextResponse.json(deepToSnakeCase(address), { status: 201 });
}
