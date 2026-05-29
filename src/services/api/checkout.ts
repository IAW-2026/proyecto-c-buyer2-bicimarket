import { api } from "@/lib/axios";

export type CheckoutBody = {
  shippingAddressId: string;
  returnUrl: string;
};

export type CheckoutResult = {
  paymentUrl: string;
  orderId: string;
};

export async function checkoutCart(payload: CheckoutBody): Promise<CheckoutResult> {
  const { data } = await api.post<CheckoutResult>("/v1/buyer/checkout", payload);
  return data;
}
