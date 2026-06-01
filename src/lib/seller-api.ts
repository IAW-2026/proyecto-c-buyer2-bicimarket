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

  try {
    const { data } = await client.get<PaginatedResponse<SellerProduct>>(
      "/api/v1/products",
      { params: { status: "active", limit: 100, ...params } },
    );
    return data;
  } catch {
    return {
      data: MOCK_PRODUCTS,
      pagination: { total: MOCK_PRODUCTS.length, page: 1, limit: 20, has_more: false },
    };
  }
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
      price_cents: mock.price_cents,
      weight_grams: mock.weight_grams,
      seller_profile_id: mock.seller_profile_id,
      seller_name: mock.seller_name ?? mock.seller_profile_id,
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
  // ─── BiciShop Buenos Aires ───────────────────────────────
  {
    id: "prd_mock_001",
    title: "Bicicleta de montaña Trek Marlin 5",
    description: "Bici de montaña 29\" con frenos de disco hidráulicos. Ideal para senderos y caminos de tierra.",
    price_cents: 130000000,
    weight_grams: 13500,
    seller_profile_id: "sel_mock_001",
    seller_name: "BiciShop Buenos Aires",
    main_image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Orbea_Occam_2020.jpg/250px-Orbea_Occam_2020.jpg",
    status: "active",
    category: "mtb",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prd_mock_003",
    title: "Casco ciclismo Giro Register",
    description: "Casco certificado con ajuste BOA para talla universal. Varios colores.",
    price_cents: 5500000,
    weight_grams: 320,
    seller_profile_id: "sel_mock_001",
    seller_name: "BiciShop Buenos Aires",
    main_image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Casque_v%C3%A9lo_de_course.jpg/250px-Casque_v%C3%A9lo_de_course.jpg",
    status: "active",
    category: "accessories",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prd_mock_004",
    title: "Bicicleta de ruta Specialized Allez",
    description: "Bici de ruta en aluminio con horquilla de carbono. Shimano Claris 16vel.",
    price_cents: 220000000,
    weight_grams: 9000,
    seller_profile_id: "sel_mock_001",
    seller_name: "BiciShop Buenos Aires",
    main_image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/RacingBicycle-non.JPG/330px-RacingBicycle-non.JPG",
    status: "active",
    category: "road",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prd_mock_009",
    title: "Set de luces LED USB delantera y trasera",
    description: "Luces recargables por USB. 3 modos de iluminación. Resistentes al agua.",
    price_cents: 1800000,
    weight_grams: 180,
    seller_profile_id: "sel_mock_001",
    seller_name: "BiciShop Buenos Aires",
    main_image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Fahrradlampe-led.jpg/250px-Fahrradlampe-led.jpg",
    status: "active",
    category: "accessories",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // ─── Urban Bike Store ────────────────────────────────────
  {
    id: "prd_mock_002",
    title: "Bicicleta urbana Totem City",
    description: "Bici urbana con canasto frontal, ideal para la ciudad. Cambios Shimano 7vel.",
    price_cents: 1800000000,
    weight_grams: 11000,
    seller_profile_id: "sel_mock_002",
    seller_name: "Urban Bike Store",
    main_image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Brosen_city_bicycle.jpg/250px-Brosen_city_bicycle.jpg",
    status: "active",
    category: "urban",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prd_mock_005",
    title: "BMX Freestyle Venzo rodado 20",
    description: "BMX con cuadro cromo-moly, manubrio elevado y ruedas 20\". Listo para trucos.",
    price_cents: 22000000,
    weight_grams: 11500,
    seller_profile_id: "sel_mock_002",
    seller_name: "Urban Bike Store",
    main_image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Chase-ACT-Carbon-1.jpg/250px-Chase-ACT-Carbon-1.jpg",
    status: "active",
    category: "bmx",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prd_mock_006",
    title: "E-bike plegable 250W batería 36V",
    description: "Bicicleta eléctrica plegable con motor trasero 250W y autonomía de 60 km.",
    price_cents: 120000000,
    weight_grams: 18000,
    seller_profile_id: "sel_mock_002",
    seller_name: "Urban Bike Store",
    main_image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Electric_Wheels_in_Fort_Lauderdale%2C_Florida.jpg/330px-Electric_Wheels_in_Fort_Lauderdale%2C_Florida.jpg",
    status: "active",
    category: "urban",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prd_mock_011",
    title: "Candado U antirrobo con cable",
    description: "Candado tipo U de acero templado con cable de seguridad de 1.2 m incluido.",
    price_cents: 2800000,
    weight_grams: 950,
    seller_profile_id: "sel_mock_002",
    seller_name: "Urban Bike Store",
    main_image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Generic_u-lock.jpg/250px-Generic_u-lock.jpg",
    status: "active",
    category: "accessories",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // ─── Ciclos del Sur ──────────────────────────────────────
  {
    id: "prd_mock_007",
    title: "Gravel Vairo XR cuadro cromoly",
    description: "Bici gravel con cuadro cromoly, horquilla de carbono y manubrio flare. Apta ripio y asfalto.",
    price_cents: 92000000,
    weight_grams: 10800,
    seller_profile_id: "sel_mock_003",
    seller_name: "Ciclos del Sur",
    main_image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Look_765_Gravel_Bicycle.jpg/250px-Look_765_Gravel_Bicycle.jpg",
    status: "active",
    category: "road",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prd_mock_008",
    title: "Bicicleta infantil rodado 16 con rueditas",
    description: "Bici para niños de 4 a 6 años con ruedas estabilizadoras removibles y freno de contrapedal.",
    price_cents: 9500000,
    weight_grams: 8500,
    seller_profile_id: "sel_mock_003",
    seller_name: "Ciclos del Sur",
    main_image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Suncross_Sweetie%2C_Eurobike_2024%2C_Frankfurt_am_Main_%28EB245525%29.jpg/250px-Suncross_Sweetie%2C_Eurobike_2024%2C_Frankfurt_am_Main_%28EB245525%29.jpg",
    status: "active",
    category: "kids",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prd_mock_010",
    title: "Inflador de pie con manómetro 160 PSI",
    description: "Inflador de piso con manómetro analógico, válvulas Presta y Schrader. Hasta 160 PSI.",
    price_cents: 2200000,
    weight_grams: 1100,
    seller_profile_id: "sel_mock_003",
    seller_name: "Ciclos del Sur",
    main_image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Bike_pump.jpg/250px-Bike_pump.jpg",
    status: "active",
    category: "accessories",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prd_mock_012",
    title: "Portaequipaje trasero de aluminio regulable",
    description: "Parrilla trasera de aluminio compatible con la mayoría de cuadros. Capacidad 25 kg.",
    price_cents: 3100000,
    weight_grams: 720,
    seller_profile_id: "sel_mock_003",
    seller_name: "Ciclos del Sur",
    main_image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Fahrradgepaecktraeger.jpg/250px-Fahrradgepaecktraeger.jpg",
    status: "active",
    category: "accessories",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
