import { api } from "@/lib/axios";
import type { CartItem } from "@/types/buyer";

export type AddCartItemBody = {
  productId: string;
  sellerProfileId: string;
  productNameSnapshot: string;
  unitPriceCents: number;
  quantity: number;
  weightGramsSnapshot: number;
  currency?: string;
};

export async function addCartItem(payload: AddCartItemBody): Promise<CartItem> {
  const { data } = await api.post<CartItem>("/v1/buyer/cart", payload);
  return data;
}

export async function updateCartItem(
  itemId: string,
  quantity: number,
): Promise<CartItem> {
  const { data } = await api.patch<CartItem>(`/v1/buyer/cart/${itemId}`, { quantity });
  return data;
}

export async function removeCartItem(itemId: string): Promise<void> {
  await api.delete(`/v1/buyer/cart/${itemId}`);
}
