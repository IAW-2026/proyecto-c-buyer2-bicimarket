"use client";

import { useApiMutation } from "@/hooks/querys/common/useApiMutation";
import { checkoutCart, payOrder, type CheckoutBody, type CheckoutResult } from "@/services/api/checkout";

const CART_KEY = ["buyer-cart"];
const ORDERS_KEY = ["buyer-orders"];

export function useCheckoutMutations() {
  return {
    checkout: useApiMutation<CheckoutResult, CheckoutBody>({
      mutationFn: checkoutCart,
      invalidateKeys: [CART_KEY, ORDERS_KEY],
      loadingMessage: "Procesando pago...",
    }),
  };
}

export function usePayOrderMutation() {
  return useApiMutation<CheckoutResult, { orderId: string; returnUrl: string }>({
    mutationFn: ({ orderId, returnUrl }) => payOrder(orderId, returnUrl),
    invalidateKeys: [ORDERS_KEY],
    loadingMessage: "Generando enlace de pago...",
  });
}
