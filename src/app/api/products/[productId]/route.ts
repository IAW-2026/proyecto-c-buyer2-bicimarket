import { NextResponse } from "next/server";
import { getSellerProducts } from "@/lib/seller-api";
import type { Product } from "@/types/buyer";
import type { SellerProduct } from "@/types/inter-service";

function toProduct(p: SellerProduct): Product {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    priceCents: p.price_cents,
    weightGrams: p.weight_grams,
    imageUrl: p.main_image_url,
    sellerId: p.seller_profile_id,
    sellerName: p.seller_name,
    isActive: p.status === "active",
    createdAt: p.created_at,
    updatedAt: p.updated_at,
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
