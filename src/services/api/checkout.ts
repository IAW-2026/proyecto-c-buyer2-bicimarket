import { api } from "@/lib/axios";
import type { ShippingQuoteResponse } from "@/types/inter-service";

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

export async function fetchShippingPreview(addressId: string): Promise<ShippingQuoteResponse> {
  const { data } = await api.get<ShippingQuoteResponse>(
    `/v1/buyer/shipping-preview?address_id=${addressId}`,
  );
  return data;
}
