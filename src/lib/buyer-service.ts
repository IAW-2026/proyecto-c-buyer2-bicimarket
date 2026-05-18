import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function getOrCreateBuyerProfile(clerkUserId: string) {
  const existing = await prisma.buyerProfile.findUnique({
    where: { clerkUserId },
  });

  if (existing) return existing;

  const clerkUser = await currentUser();
  const fullName =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
    "Comprador";
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "";

  return prisma.buyerProfile.create({
    data: { clerkUserId, fullName, email },
  });
}

export function calculateCartTotals<
  T extends { unitPriceCents: number; quantity: number },
>(items: T[]) {
  const totalCents = items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return { totalCents, itemCount };
}

export function groupItemsBySeller<
  T extends { sellerProfileId: string },
>(items: T[]) {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    groups[item.sellerProfileId] = groups[item.sellerProfileId] ?? [];
    groups[item.sellerProfileId].push(item);
    return groups;
  }, {});
}

export function getShippingQuoteForSeller(
  items: { weightGramsSnapshot: number; quantity: number }[],
) {
  const totalGrams = items.reduce(
    (sum, item) => sum + item.weightGramsSnapshot * item.quantity,
    0,
  );
  // Mock: 800 ARS base + 50 per 100g
  return Math.round(800 + (totalGrams / 100) * 50);
}

export async function createPaymentSession(orderId: string, totalCents: number) {
  return {
    paymentId: `pay_${orderId}`,
    paymentUrl: `https://example-payment.local/checkout?order=${orderId}`,
    totalCents,
  };
}
