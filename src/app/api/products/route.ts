import { NextResponse } from "next/server";
import { getSellerProducts } from "@/lib/seller-api";
import { matchesCategory } from "@/lib/categories";
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
    category: SELLER_TO_BUYER_CATEGORY[p.category] ?? null,
    isActive: p.status === "active",
    createdAt: p.created_at,
    updatedAt: p.updated_at ?? p.created_at,
  };
}

// GET /api/products — catálogo de productos (proxied desde Seller App)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const categoryParam = url.searchParams.get("category") ?? "";
  const limit = 20;

  const { data } = await getSellerProducts({ status: "active" });
  let products = data.map(toProduct);

  if (categoryParam) {
    products = products.filter((p) => matchesCategory(p, categoryParam));
  }

  const total = products.length;
  const start = (page - 1) * limit;
  const paged = products.slice(start, start + limit);

  return NextResponse.json({
    data: paged,
    pagination: { total, page, limit, has_more: start + limit < total },
  });
}
