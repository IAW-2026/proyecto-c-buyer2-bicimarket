"use client";

import { useApiMutation } from "@/hooks/querys/common/useApiMutation";
import {
  addCartItem,
  updateCartItem,
  removeCartItem,
  type AddCartItemBody,
} from "@/services/api/cart";
import type { CartItem } from "@/types/buyer";

const CART_KEY = ["buyer-cart"];

export function useCartMutations() {
  return {
    addItem: useApiMutation<CartItem, AddCartItemBody>({
      mutationFn: addCartItem,
      invalidateKeys: [CART_KEY],
      loadingMessage: "Agregando al carrito...",
      successMessage: "Producto agregado al carrito",
    }),

    updateItem: useApiMutation<CartItem, { itemId: string; quantity: number }>({
      mutationFn: ({ itemId, quantity }) => updateCartItem(itemId, quantity),
      invalidateKeys: [CART_KEY],
    }),

    removeItem: useApiMutation<void, string>({
      mutationFn: removeCartItem,
      invalidateKeys: [CART_KEY],
      loadingMessage: "Eliminando producto...",
      successMessage: "Producto eliminado del carrito",
    }),
  };
}
