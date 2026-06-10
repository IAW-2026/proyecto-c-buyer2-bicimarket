import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import axios from "axios";
import { prisma } from "@/lib/prisma";
import { getOrCreateBuyerProfile, groupItemsBySeller } from "@/lib/buyer-service";
import { createPayment } from "@/lib/payments-api";
import { getShippingQuotes, DEFAULT_PACKAGE_DIMS } from "@/lib/shipping-api";
import {
  createOrderId,
  createOrderSellerGroupId,
  createOrderItemId,
  createOrderStatusHistoryId,
} from "@/lib/entity-ids";

const checkoutSchema = z.object({
  shipping_address_id: z.string().min(1),
  notes: z.string().optional(),
  return_url: z.string().url(),
});

export async function POST(request: NextRequest) {
  const [{ userId }, body] = await Promise.all([auth(), request.json()]);
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "No autorizado", details: {} } },
      { status: 401 },
    );
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues.map((i) => i.message).join(", "),
          details: {},
        },
      },
      { status: 400 },
    );
  }

  const profile = await getOrCreateBuyerProfile(userId);

  const [cart, address] = await Promise.all([
    prisma.cart.findUnique({
      where: { buyerProfileId: profile.id },
      include: { items: true },
    }),
    prisma.address.findUnique({ where: { id: parsed.data.shipping_address_id } }),
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
    weightGramsTotal: items.reduce(
      (sum, i) => sum + i.weightGramsSnapshot * i.quantity,
      0,
    ),
    itemsSubtotalCents: items.reduce(
      (sum, i) => sum + i.unitPriceCents * i.quantity,
      0,
    ),
  }));

  let quoteResponse;
  try {
    quoteResponse = await getShippingQuotes({
      pickups: groupedData.map((g) => ({
        seller_profile_id: g.sellerProfileId,
        packages: [{ weight_grams: g.weightGramsTotal, ...DEFAULT_PACKAGE_DIMS }],
      })),
      to: {
        city: address.city,
        province: address.province,
        postal_code: address.postalCode,
        country: address.country ?? "AR",
      },
      service_level: "standard",
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return NextResponse.json(
        {
          error: {
            code: "UPSTREAM_ERROR",
            message: "Error al cotizar el envío. Por favor, intentá de nuevo.",
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

  const shippingTotalCents = quoteResponse.total_net_cents;

  // Mapa por seller_profile_id para asignar quote individual a cada grupo
  const quotesBySeller = new Map(
    quoteResponse.quotes.map((q) => [q.seller_profile_id, q]),
  );
  const discountFactor = 1 - (quoteResponse.discount_pct ?? 0);

  const itemsTotalCents = groupedData.reduce((s, g) => s + g.itemsSubtotalCents, 0);
  const totalCents = itemsTotalCents + shippingTotalCents;

  const order = await prisma.order.create({
    data: {
      id: createOrderId(),
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
    groupedData.map((g) => {
      const quote = quotesBySeller.get(g.sellerProfileId);
      // Costo con descuento; si no hay quote para este seller (caso edge), reparte proporcionalmente
      const shippingCostCents = quote
        ? Math.round(quote.cost_cents * discountFactor)
        : Math.round(shippingTotalCents / groupedData.length);
      return prisma.orderSellerGroup.create({
        data: {
          id: createOrderSellerGroupId(),
          orderId: order.id,
          sellerProfileId: g.sellerProfileId,
          itemsSubtotalCents: g.itemsSubtotalCents,
          shippingCostCents,
          shippingQuoteId: quote?.id ?? null,
          weightGramsTotal: g.weightGramsTotal,
          status: "PENDING",
        },
      });
    }),
  );

  const orderItems = createdGroups.flatMap((group, index) =>
    groupedData[index].items.map((item) => ({
      id: createOrderItemId(),
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
        id: createOrderStatusHistoryId(),
        orderId: order.id,
        fromStatus: "",
        toStatus: "PENDING_PAYMENT",
        source: "buyer",
      },
    }),
    prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
    prisma.cart.update({ where: { id: cart.id }, data: { status: "CONVERTED" } }),
  ]);

  const itemsSummary = createdGroups.map((group, index) => ({
    seller_profile_id: groupedData[index].sellerProfileId,
    subtotal_cents: groupedData[index].itemsSubtotalCents,
    shipping_cost_cents: group.shippingCostCents,
    order_seller_group_id: group.id,
    items: groupedData[index].items.map((item) => ({
      product_id: item.productId,
      product_name_snapshot: item.productNameSnapshot,
      unit_price_cents: item.unitPriceCents,
      quantity: item.quantity,
    })),
  }));

  const baseReturnUrl = parsed.data.return_url;
  const payment = await createPayment({
    order_id: order.id,
    buyer_clerk_user_id: userId,
    buyer_profile_id: profile.id,
    buyer_email: profile.email,
    amount_cents: totalCents,
    currency: "ARS",
    items_summary: itemsSummary,
    return_urls: {
      success: `${baseReturnUrl}?result=success&order_id=${order.id}`,
      failure: `${baseReturnUrl}?result=failure&order_id=${order.id}`,
      pending: `${baseReturnUrl}?result=pending&order_id=${order.id}`,
    },
    idempotency_key: randomUUID(),
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { paymentId: payment.payment_id },
  });

  return NextResponse.json({ payment_url: payment.checkout_url, order_id: order.id });
}
