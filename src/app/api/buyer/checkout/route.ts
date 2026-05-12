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
  returnUrl: z.string().url(), // URL a la que el usuario será redirigido después del pago (url esta tachado porque no se esta usando pero se deja para futuras implementaciones)
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
      { error: parsed.error.issues.map((item) => item.message).join(", ") },
      { status: 400 },
    );
  }

  const profile = await getOrCreateBuyerProfile(userId);
  const cart = await prisma.cart.findUnique({
    where: { buyerProfileId: profile.id },
    include: { items: true },
  });

  if (!cart || cart.items.length === 0) {
    return NextResponse.json(
      { error: "El carrito está vacío" },
      { status: 400 },
    );
  }

  const items = cart.items.map((item) => ({
    ...item,
    subtotal: Number((item.unitPrice * item.quantity).toFixed(2)),
  }));

  const groupedItems = groupItemsBySeller(items);
  const groupedData = Object.entries(groupedItems).map(
    ([sellerId, sellerItems]) => ({
      sellerId,
      sellerName: sellerItems[0]?.sellerName ?? "Vendedor",
      shippingCost: getShippingQuoteForSeller(sellerItems),
      status: "PENDING" as const,
      sellerItems,
    }),
  );

  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
  const shippingAmount = groupedData.reduce(
    (sum, group) => sum + group.shippingCost,
    0,
  );
  const orderNumber = `ORD-${Date.now()}`;

  const order = await prisma.order.create({
    data: {
      buyerProfileId: profile.id,
      orderNumber,
      status: "PENDING_PAYMENT",
      totalAmount,
      shippingAmount,
      shippingAddressId: parsed.data.shippingAddressId,
    },
  });

  const createdGroups = await Promise.all(
    groupedData.map((group) =>
      prisma.orderSellerGroup.create({
        data: {
          orderId: order.id,
          sellerId: group.sellerId,
          sellerName: group.sellerName,
          shippingCost: group.shippingCost,
          status: group.status,
        },
      }),
    ),
  );

  const orderItems = createdGroups.flatMap((group, index) =>
    groupedData[index].sellerItems.map((item) => ({
      orderId: order.id,
      orderSellerGroupId: group.id,
      productId: item.productId,
      title: item.title,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      sellerId: item.sellerId,
    })),
  );

  if (orderItems.length > 0) {
    await prisma.orderItem.createMany({
      data: orderItems,
    });
  }

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  const payment = await createPaymentSession(
    order.id,
    totalAmount + shippingAmount,
  );

  const orderUpdate = await prisma.order.update({
    where: { id: order.id },
    data: { paymentId: payment.paymentId },
  });

  return NextResponse.json({
    paymentUrl: payment.paymentUrl,
    orderId: orderUpdate.id,
  });
}
