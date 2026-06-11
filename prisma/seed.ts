import {
  PrismaClient,
  OrderStatus,
  SellerGroupStatus,
  ShippingStatus,
} from "../src/generated/prisma";
import {
  createAddressId,
  createCartId,
  createCartItemId,
  createFavoriteId,
  createOrderId,
  createOrderSellerGroupId,
  createOrderItemId,
  createOrderStatusHistoryId,
} from "../src/lib/entity-ids";

const prisma = new PrismaClient();

// Mismos productos mock que seller-api.ts
const MOCK_PRODUCTS = [
  {
    id: "prd_mock_001",
    name: "Bicicleta de montaña Trek Marlin 5",
    price: 450000,
    weightGrams: 13500,
    sellerId: "sel_mock_001",
    sellerName: "BiciShop Buenos Aires",
  },
  {
    id: "prd_mock_002",
    name: "Bicicleta urbana Totem City",
    price: 18000000,
    weightGrams: 11000,
    sellerId: "sel_mock_002",
    sellerName: "Urban Bike Store",
  },
  {
    id: "prd_mock_003",
    name: "Casco ciclismo Giro Register",
    price: 55000,
    weightGrams: 320,
    sellerId: "sel_mock_001",
    sellerName: "BiciShop Buenos Aires",
  },
];

async function seedProfile(profileId: string, email: string) {
  // ----- Address -----
  const existingAddress = await prisma.address.findFirst({
    where: { buyerProfileId: profileId },
  });

  let addressId: string;
  if (existingAddress) {
    addressId = existingAddress.id;
  } else {
    const address = await prisma.address.create({
      data: {
        id: createAddressId(),
        buyerProfileId: profileId,
        alias: "Casa",
        street: "Av. Corrientes",
        number: "1234",
        apartment: "3B",
        city: "Buenos Aires",
        province: "CABA",
        postalCode: "C1043",
        country: "Argentina",
        isDefault: true,
      },
    });
    addressId = address.id;

    await prisma.buyerProfile.update({
      where: { id: profileId },
      data: { defaultShippingAddressId: addressId },
    });
  }

  // ----- Cart -----
  // Eliminar cart previo de seed para ser idempotente
  const existingCart = await prisma.cart.findUnique({
    where: { buyerProfileId: profileId },
    include: { items: true },
  });

  if (existingCart) {
    await prisma.cartItem.deleteMany({ where: { cartId: existingCart.id } });
    await prisma.cart.delete({ where: { id: existingCart.id } });
  }

  const trek = MOCK_PRODUCTS[0];
  const casco = MOCK_PRODUCTS[2];

  await prisma.cart.create({
    data: {
      id: createCartId(),
      buyerProfileId: profileId,
      items: {
        create: [
          {
            id: createCartItemId(),
            productId: trek.id,
            sellerProfileId: trek.sellerId,
            quantity: 1,
          },
          {
            id: createCartItemId(),
            productId: casco.id,
            sellerProfileId: casco.sellerId,
            quantity: 2,
          },
        ],
      },
    },
  });

  // ----- Favorites -----
  for (const p of MOCK_PRODUCTS) {
    await prisma.favoriteItem.upsert({
      where: { buyerProfileId_productId: { buyerProfileId: profileId, productId: p.id } },
      update: {},
      create: { id: createFavoriteId(), buyerProfileId: profileId, productId: p.id },
    });
  }

  // ----- Order 1: COMPLETED -----
  // Trek Marlin (sel_mock_001) + Casco (sel_mock_001) → 1 seller group
  const addressSnapshot = {
    alias: "Casa",
    street: "Av. Corrientes",
    number: "1234",
    apartment: "3B",
    city: "Buenos Aires",
    province: "CABA",
    postalCode: "C1043",
    country: "Argentina",
  };

  const itemsTotal1 = trek.price + casco.price * 2; // 450000 + 70000 = 520000
  // 1 vendedor → $10k + $4k = $14,000 ARS
  const shipping1 = 1_400_000;

  const order1 = await prisma.order.create({
    data: {
      id: createOrderId(),
      buyerProfileId: profileId,
      paymentId: "pay_seed_completed_001",
      status: OrderStatus.COMPLETED,
      itemsTotalCents: itemsTotal1,
      shippingTotalCents: shipping1,
      totalCents: itemsTotal1 + shipping1,
      currency: "ARS",
      shippingAddressSnapshot: addressSnapshot,
      notes: "Orden de prueba — seed",
    },
  });

  const group1 = await prisma.orderSellerGroup.create({
    data: {
      id: createOrderSellerGroupId(),
      orderId: order1.id,
      sellerProfileId: "sel_mock_001",
      itemsSubtotalCents: itemsTotal1,
      shippingCostCents: 0,
      shippingQuoteId: "quote_seed_001",
      shipmentId: "ship_seed_001",
      weightGramsTotal: trek.weightGrams + casco.weightGrams * 2,
      status: SellerGroupStatus.SETTLED,
      shippingStatus: ShippingStatus.DELIVERED,
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        id: createOrderItemId(),
        orderId: order1.id,
        sellerGroupId: group1.id,
        productId: trek.id,
        productNameSnapshot: trek.name,
        unitPriceCents: trek.price,
        quantity: 1,
        weightGramsSnapshot: trek.weightGrams,
      },
      {
        id: createOrderItemId(),
        orderId: order1.id,
        sellerGroupId: group1.id,
        productId: casco.id,
        productNameSnapshot: casco.name,
        unitPriceCents: casco.price,
        quantity: 2,
        weightGramsSnapshot: casco.weightGrams,
      },
    ],
  });

  await prisma.orderStatusHistory.createMany({
    data: [
      {
        id: createOrderStatusHistoryId(),
        orderId: order1.id,
        fromStatus: "PENDING_PAYMENT",
        toStatus: "PAID",
        source: "payments_webhook",
        payload: { payment_id: "pay_seed_completed_001" },
        occurredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        id: createOrderStatusHistoryId(),
        orderId: order1.id,
        fromStatus: "PAID",
        toStatus: "SHIPPED",
        source: "seller_webhook",
        occurredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        id: createOrderStatusHistoryId(),
        orderId: order1.id,
        fromStatus: "SHIPPED",
        toStatus: "COMPLETED",
        source: "shipping_webhook",
        occurredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // ----- Order 2: PENDING_PAYMENT -----
  const totem = MOCK_PRODUCTS[1];
  const itemsTotal2 = totem.price;
  // 1 vendedor → $10k + $4k = $14,000 ARS
  const shipping2 = 1_400_000;

  const order2 = await prisma.order.create({
    data: {
      id: createOrderId(),
      buyerProfileId: profileId,
      status: OrderStatus.PENDING_PAYMENT,
      itemsTotalCents: itemsTotal2,
      shippingTotalCents: shipping2,
      totalCents: itemsTotal2 + shipping2,
      currency: "ARS",
      shippingAddressSnapshot: addressSnapshot,
    },
  });

  const group2 = await prisma.orderSellerGroup.create({
    data: {
      id: createOrderSellerGroupId(),
      orderId: order2.id,
      sellerProfileId: totem.sellerId,
      itemsSubtotalCents: itemsTotal2,
      shippingCostCents: 0,
      shippingQuoteId: "quote_seed_002",
      weightGramsTotal: totem.weightGrams,
      status: SellerGroupStatus.PENDING,
    },
  });

  await prisma.orderItem.create({
    data: {
      id: createOrderItemId(),
      orderId: order2.id,
      sellerGroupId: group2.id,
      productId: totem.id,
      productNameSnapshot: totem.name,
      unitPriceCents: totem.price,
      quantity: 1,
      weightGramsSnapshot: totem.weightGrams,
    },
  });

  console.log(`  ✓ ${email} — carrito, favoritos y 2 órdenes creados`);
}

async function main() {
  console.log("🌱 Iniciando seed...\n");

  const profiles = await prisma.buyerProfile.findMany();

  if (profiles.length === 0) {
    console.log(
      "⚠️  No hay BuyerProfiles en la DB. Logueate primero en la app y volvé a correr el seed."
    );
    return;
  }

  for (const profile of profiles) {
    await seedProfile(profile.id, profile.email);
  }

  console.log(`\n✅ Seed completo — ${profiles.length} perfil(es) procesado(s)`);
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
