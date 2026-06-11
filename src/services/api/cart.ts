import { api } from "@/lib/axios";
import { deepToCamelCase } from "@/lib/case-utils";
import type { CartItem } from "@/types/buyer";

export type AddCartItemBody = {
  productId: string;
  sellerProfileId: string;
  quantity: number;
};

export async function addCartItem(payload: AddCartItemBody): Promise<CartItem> {
  const { data } = await api.post("/v1/buyer/cart", {
    product_id: payload.productId,
    seller_profile_id: payload.sellerProfileId,
    quantity: payload.quantity,
  });
  return deepToCamelCase<CartItem>(data);
}

export async function updateCartItem(
  itemId: string,
  quantity: number,
): Promise<CartItem> {
  const { data } = await api.patch(`/v1/buyer/cart/${itemId}`, { quantity });
  return deepToCamelCase<CartItem>(data);
}

export async function removeCartItem(itemId: string): Promise<void> {
  await api.delete(`/v1/buyer/cart/${itemId}`);
}
