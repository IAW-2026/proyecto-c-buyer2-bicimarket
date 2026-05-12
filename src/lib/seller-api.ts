// Funciones para llamar a la Seller App.
// Requiere: SELLER_APP_URL y BUYER_TO_SELLER_SERVICE_TOKEN en variables de entorno.
//
// Si las variables no están configuradas, las funciones devuelven datos mock
// para que puedas desarrollar sin necesitar la Seller App corriendo.
//
// Ver documentacion/03-apis.md — sección "Seller App endpoints"

import { createServiceClient } from "@/lib/service-client";
import type {
  SellerProduct,
  SellerProductsParams,
  ProductAvailability,
} from "@/types/inter-service";
import type { PaginatedResponse } from "@/types/api";

function getClient() {
  const baseURL = process.env.SELLER_APP_URL;
  const token = process.env.BUYER_TO_SELLER_SERVICE_TOKEN;
  if (!baseURL || !token) return null;
  return createServiceClient(baseURL, token);
}

// GET /api/v1/products — catálogo público de productos del Seller App
export async function getSellerProducts(
  params?: SellerProductsParams,
): Promise<PaginatedResponse<SellerProduct>> {
  const client = getClient();

  if (!client) {
    // Mock: devuelve productos de ejemplo cuando Seller App no está disponible
    return {
      data: MOCK_PRODUCTS,
      pagination: { total: MOCK_PRODUCTS.length, page: 1, limit: 20, has_more: false },
    };
  }

  const { data } = await client.get<PaginatedResponse<SellerProduct>>(
    "/api/v1/products",
    { params: { status: "active", ...params } },
  );
  return data;
}

// GET /api/v1/products/{id}/availability — valida que el producto esté activo y obtiene precio/peso
export async function getProductAvailability(
  productId: string,
): Promise<ProductAvailability | null> {
  const client = getClient();

  if (!client) {
    const mock = MOCK_PRODUCTS.find((p) => p.id === productId);
    if (!mock) return null;
    return {
      product_id: mock.id,
      status: "active",
      price: mock.price,
      weight_grams: mock.weight_grams,
      seller_profile_id: mock.seller_profile_id,
      seller_name: mock.seller_name,
    };
  }

  try {
    const { data } = await client.get<ProductAvailability>(
      `/api/v1/products/${productId}/availability`,
    );
    return data;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------
// Datos mock para desarrollo sin Seller App
// ----------------------------------------------------------------
const MOCK_PRODUCTS: SellerProduct[] = [
  {
    id: "prd_mock_001",
    title: "Bicicleta de montaña Trek Marlin 5",
    description: "Bici de montaña 29\" con frenos de disco hidráulicos. Ideal para senderos y caminos de tierra.",
    price: 450000,
    weight_grams: 13500,
    seller_profile_id: "sel_mock_001",
    seller_name: "BiciShop Buenos Aires",
    image_url: null,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prd_mock_002",
    title: "Bicicleta urbana Totem City",
    description: "Bici urbana con canasto frontal, ideal para la ciudad. Cambios Shimano 7vel.",
    price: 180000,
    weight_grams: 11000,
    seller_profile_id: "sel_mock_002",
    seller_name: "Urban Bike Store",
    image_url: null,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prd_mock_003",
    title: "Casco ciclismo Giro Register",
    description: "Casco certificado con ajuste BOA para talla universal. Varios colores.",
    price: 35000,
    weight_grams: 320,
    seller_profile_id: "sel_mock_001",
    seller_name: "BiciShop Buenos Aires",
    image_url: null,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
