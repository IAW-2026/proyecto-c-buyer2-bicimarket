import { NextResponse } from "next/server";
import { getSellerProducts } from "@/lib/seller-api";
import type { Product } from "@/types/buyer";
import type { SellerProduct } from "@/types/inter-service";

const SELLER_TO_BUYER_CATEGORY: Record<string, string> = {
  mtb: "bicicletas",
  road: "bicicletas",
  urban: "bicicletas",
  kids: "bicicletas",
  bmx: "bicicletas",
  parts: "componentes",
  accessories: "accesorios",
  indumentaria: "indumentaria",
};

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
    category: SELLER_TO_BUYER_CATEGORY[p.category] ?? null,
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
