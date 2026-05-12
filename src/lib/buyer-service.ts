import { prisma } from "@/lib/prisma";

export async function getOrCreateBuyerProfile(userId: string) {
  const existing = await prisma.buyerProfile.findUnique({
    where: { userId },
  });

  if (existing) {
    return existing;
  }

  return prisma.buyerProfile.create({
    data: {
      userId,
      displayName: "Comprador",
    },
  });
}

export function calculateCartTotals<
  T extends { subtotal: number; quantity: number },
>(items: T[]) {
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return { total, itemCount };
}

export function groupItemsBySeller<
  T extends { sellerId: string | null | undefined },
>(items: T[]) {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const sellerKey = item.sellerId || "unknown";
    groups[sellerKey] = groups[sellerKey] ?? [];
    groups[sellerKey].push(item);
    return groups;
  }, {});
}

export function getShippingQuoteForSeller(items: unknown[]) {
  const totalWeight = items.length * 1.5;
  const quote = 800 + totalWeight * 50;
  return Number(quote.toFixed(2));
}

export async function createPaymentSession(orderId: string, amount: number) {
  return {
    paymentId: `pay_${orderId}`,
    paymentUrl: `https://example-payment.local/checkout?order=${orderId}`,
    amount,
  };
}
