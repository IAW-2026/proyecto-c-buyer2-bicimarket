import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createPaymentSession,
  getOrCreateBuyerProfile,
  groupItemsBySeller,
  getShippingQuoteForSeller,
} from "@/lib/buyer-service";

const checkoutSchema = z.object({
  shippingAddressId: z.string().min(1),
  notes: z.string().optional(),
  returnUrl: z.string().url(),
});

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }

  const profile = await getOrCreateBuyerProfile(userId);

  const [cart, address] = await Promise.all([
    prisma.cart.findUnique({
      where: { buyerProfileId: profile.id },
      include: { items: true },
    }),
    prisma.address.findUnique({ where: { id: parsed.data.shippingAddressId } }),
  ]);

  if (!cart || cart.items.length === 0) {
    return NextResponse.json({ error: "El carrito está vacío" }, { status: 400 });
  }

  if (!address || address.buyerProfileId !== profile.id) {
    return NextResponse.json({ error: "Dirección no encontrada" }, { status: 400 });
  }

  const shippingAddressSnapshot = {
    id: address.id,
    alias: address.alias,
    street: address.street,
    number: address.number,
    apartment: address.apartment,
    city: address.city,
    province: address.province,
    postalCode: address.postalCode,
    country: address.country,
  };

  const grouped = groupItemsBySeller(cart.items);

  const groupedData = Object.entries(grouped).map(([sellerProfileId, items]) => ({
    sellerProfileId,
    items,
    shippingCostCents: getShippingQuoteForSeller(items),
    weightGramsTotal: items.reduce(
      (sum, i) => sum + i.weightGramsSnapshot * i.quantity,
      0,
    ),
    itemsSubtotalCents: items.reduce(
      (sum, i) => sum + i.unitPriceCents * i.quantity,
      0,
    ),
  }));

  const itemsTotalCents = groupedData.reduce((s, g) => s + g.itemsSubtotalCents, 0);
  const shippingTotalCents = groupedData.reduce((s, g) => s + g.shippingCostCents, 0);
  const totalCents = itemsTotalCents + shippingTotalCents;

  const order = await prisma.order.create({
    data: {
      buyerProfileId: profile.id,
      status: "PENDING_PAYMENT",
      itemsTotalCents,
      shippingTotalCents,
      totalCents,
      currency: cart.items[0]?.currency ?? "ARS",
      shippingAddressSnapshot,
      notes: parsed.data.notes,
    },
  });

  const createdGroups = await Promise.all(
    groupedData.map((g) =>
      prisma.orderSellerGroup.create({
        data: {
          orderId: order.id,
          sellerProfileId: g.sellerProfileId,
          itemsSubtotalCents: g.itemsSubtotalCents,
          shippingCostCents: g.shippingCostCents,
          weightGramsTotal: g.weightGramsTotal,
          status: "PENDING",
        },
      }),
    ),
  );

  const orderItems = createdGroups.flatMap((group, index) =>
    groupedData[index].items.map((item) => ({
      orderId: order.id,
      sellerGroupId: group.id,
      productId: item.productId,
      productNameSnapshot: item.productNameSnapshot,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      weightGramsSnapshot: item.weightGramsSnapshot,
    })),
  );

  await Promise.all([
    prisma.orderItem.createMany({ data: orderItems }),
    prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: "",
        toStatus: "PENDING_PAYMENT",
        source: "buyer",
      },
    }),
    prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
    prisma.cart.update({
      where: { id: cart.id },
      data: { status: "CONVERTED" },
    }),
  ]);

  const payment = await createPaymentSession(order.id, totalCents);

  await prisma.order.update({
    where: { id: order.id },
    data: { paymentId: payment.paymentId },
  });

  return NextResponse.json({ paymentUrl: payment.paymentUrl, orderId: order.id });
}
