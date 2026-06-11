import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateBuyerProfile } from "@/lib/buyer-service";
import { createPayment } from "@/lib/payments-api";

const bodySchema = z.object({
  return_url: z.url(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "No autorizado", details: {} } },
      { status: 401 },
    );
  }

  const { orderId } = await context.params;
  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join(", "), details: {} } },
      { status: 400 },
    );
  }

  const profile = await getOrCreateBuyerProfile(userId);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      sellerGroups: { include: { orderItems: true } },
    },
  });

  if (!order || order.buyerProfileId !== profile.id) {
    return NextResponse.json(
      { error: { code: "ORDER_NOT_FOUND", message: "Orden no encontrada", details: {} } },
      { status: 404 },
    );
  }

  if (order.status !== "PENDING_PAYMENT") {
    return NextResponse.json(
      { error: { code: "ORDER_NOT_PAYABLE", message: "La orden no puede ser pagada en su estado actual", details: {} } },
      { status: 409 },
    );
  }

  const itemsSummary = order.sellerGroups.map((group) => ({
    seller_profile_id: group.sellerProfileId,
    shipping_quote_id: group.shippingQuoteId,
    subtotal_cents: group.itemsSubtotalCents,
    shipping_cost_cents: group.shippingCostCents,
    order_seller_group_id: group.id,
    items: group.orderItems.map((item) => ({
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
    amount_cents: order.totalCents,
    currency: order.currency as "ARS",
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
