import { NextResponse } from "next/server";
import { getSellerProducts } from "@/lib/seller-api";
import type { Product } from "@/types/buyer";
import type { SellerProduct } from "@/types/inter-service";

function toProduct(p: SellerProduct): Product {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    price: p.price,
    imageUrl: p.image_url,
    sellerId: p.seller_profile_id,
    sellerName: p.seller_name,
    isActive: p.status === "active",
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

// GET /api/products — catálogo de productos (proxied desde Seller App)
export async function GET() {
  const { data } = await getSellerProducts({ status: "active" });
  return NextResponse.json(data.map(toProduct));
}
