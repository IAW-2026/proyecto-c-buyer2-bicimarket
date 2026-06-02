import { NextResponse } from "next/server";
import { getSellerProducts } from "@/lib/seller-api";
import type { Product } from "@/types/buyer";
import type { SellerProduct } from "@/types/inter-service";

function toProduct(p: SellerProduct): Product {
  const description = p.description
    ?? [p.brand, p.model].filter(Boolean).join(" ")
    ?? "";
  return {
    id: p.id,
    title: p.title,
    description,
    priceCents: p.price_cents,
    weightGrams: p.weight_grams,
    imageUrl: p.main_image_url,
    sellerId: p.seller_profile_id,
    sellerName: p.seller_display_name ?? p.seller_name ?? null,
    isActive: p.status === "active",
    createdAt: p.created_at,
    updatedAt: p.updated_at ?? p.created_at,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;
  const { data } = await getSellerProducts();
  const found = data.find((p) => p.id === productId);
  if (!found) {
    return NextResponse.json(
      { error: { code: "PRODUCT_NOT_FOUND", message: "Producto no encontrado", details: {} } },
      { status: 404 },
    );
  }
  return NextResponse.json(toProduct(found));
}
