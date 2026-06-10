import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { prisma } from "@/lib/prisma";
import { getOrCreateBuyerProfile, groupItemsBySeller } from "@/lib/buyer-service";
import { getShippingQuotes, DEFAULT_PACKAGE_DIMS } from "@/lib/shipping-api";
import type { ShippingQuoteResponse } from "@/types/inter-service";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "No autorizado", details: {} } },
      { status: 401 },
    );
  }

  const addressId = request.nextUrl.searchParams.get("address_id");
  if (!addressId) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "address_id es requerido", details: {} } },
      { status: 400 },
    );
  }

  const profile = await getOrCreateBuyerProfile(userId);

  const [cart, address] = await Promise.all([
    prisma.cart.findUnique({
      where: { buyerProfileId: profile.id },
      include: { items: true },
    }),
    prisma.address.findUnique({ where: { id: addressId } }),
  ]);

  if (!cart || cart.items.length === 0) {
    return NextResponse.json(
      { error: { code: "CART_EMPTY", message: "El carrito está vacío", details: {} } },
      { status: 400 },
    );
  }

  if (!address || address.buyerProfileId !== profile.id) {
    return NextResponse.json(
      { error: { code: "ADDRESS_NOT_FOUND", message: "Dirección no encontrada", details: {} } },
      { status: 400 },
    );
  }

  const grouped = groupItemsBySeller(cart.items);

  try {
    const quoteResponse = await getShippingQuotes({
      pickups: Object.entries(grouped).map(([sellerProfileId, items]) => ({
        seller_profile_id: sellerProfileId,
        packages: [
          {
            weight_grams: items.reduce((sum, i) => sum + i.weightGramsSnapshot * i.quantity, 0),
            ...DEFAULT_PACKAGE_DIMS,
          },
        ],
      })),
      to: {
        city: address.city,
        province: address.province,
        postal_code: address.postalCode,
        country: address.country ?? "AR",
      },
      service_level: "standard",
    });

    console.log("Shipping quote response:", quoteResponse);
    
    return NextResponse.json(quoteResponse satisfies ShippingQuoteResponse);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return NextResponse.json(
        {
          error: {
            code: "UPSTREAM_ERROR",
            message: "Error al cotizar el envío",
            details: (error.response.data as { error?: unknown })?.error ?? {},
          },
        },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Error interno del servidor", details: {} } },
      { status: 500 },
    );
  }
}
