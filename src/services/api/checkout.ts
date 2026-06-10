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
  const { data } = await api.post("/v1/buyer/checkout", {
    shipping_address_id: payload.shippingAddressId,
    return_url: payload.returnUrl,
  });
  return {
    paymentUrl: data.payment_url,
    orderId: data.order_id,
  };
}
