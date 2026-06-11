import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateBuyerProfile } from "@/lib/buyer-service";
import { deepToSnakeCase, deepToCamelCase } from "@/lib/case-utils";

const updateProfileSchema = z.object({
  full_name: z.string().min(2).optional(),
  phone: z.string().optional(),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "No autorizado", details: {} } },
      { status: 401 },
    );
  }

  const profile = await getOrCreateBuyerProfile(userId);
  return NextResponse.json(deepToSnakeCase(profile));
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "No autorizado", details: {} } },
      { status: 401 },
    );
  }

  const body = await request.json();
  const parsed = updateProfileSchema.safeParse(body);
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
  const profileData = deepToCamelCase<{ fullName?: string; phone?: string }>(parsed.data);
  const updated = await prisma.buyerProfile.update({
    where: { id: profile.id },
    data: profileData,
  });

  return NextResponse.json(deepToSnakeCase(updated));
}
