"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type {
  Address,
  BuyerProfile,
  Cart,
  CartItem,
  FavoriteItem,
  Order,
  Product,
} from "@/types/buyer";

export function useBuyerProfile() {
  return useQuery<BuyerProfile>({
    queryKey: ["buyer-profile"],
    queryFn: async () => {
      const { data } = await api.get<BuyerProfile>("/v1/buyer/profile");
      return data;
    },
  });
}

export function useUpdateBuyerProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<BuyerProfile>) => {
      const { data } = await api.patch<BuyerProfile>("/v1/buyer/profile", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buyer-profile"] });
    },
  });
}

export function useBuyerAddresses() {
  return useQuery<Address[]>({
    queryKey: ["buyer-addresses"],
    queryFn: async () => {
      const { data } = await api.get<Address[]>("/v1/buyer/addresses");
      return data;
    },
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      address: Omit<Address, "id" | "buyerProfileId" | "createdAt" | "updatedAt">,
    ) => {
      const { data } = await api.post<Address>("/v1/buyer/addresses", address);
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["buyer-addresses"] }),
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (addressId: string) => {
      await api.delete(`/v1/buyer/addresses/${addressId}`);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["buyer-addresses"] }),
  });
}

export function useBuyerCart() {
  return useQuery<Cart>({
    queryKey: ["buyer-cart"],
    queryFn: async () => {
      const { data } = await api.get<Cart>("/v1/buyer/cart");
      return data;
    },
  });
}

export function useAddCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      productId: string;
      sellerProfileId: string;
      productNameSnapshot: string;
      unitPriceCents: number;
      quantity: number;
      weightGramsSnapshot: number;
      currency?: string;
    }) => {
      const { data } = await api.post<CartItem>("/v1/buyer/cart", payload);
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["buyer-cart"] }),
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId,
      quantity,
    }: {
      itemId: string;
      quantity: number;
    }) => {
      const { data } = await api.patch<CartItem>(`/v1/buyer/cart/${itemId}`, {
        quantity,
      });
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["buyer-cart"] }),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/v1/buyer/cart/${itemId}`);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["buyer-cart"] }),
  });
}

export function useFavoriteItems() {
  return useQuery<FavoriteItem[]>({
    queryKey: ["favorite-items"],
    queryFn: async () => {
      const { data } = await api.get<FavoriteItem[]>("/v1/buyer/favorites");
      return data;
    },
  });
}

export function useAddFavoriteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { productId: string }) => {
      const { data } = await api.post<FavoriteItem>(
        "/v1/buyer/favorites",
        payload,
      );
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["favorite-items"] }),
  });
}

export function useRemoveFavoriteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (favoriteId: string) => {
      await api.delete(`/v1/buyer/favorites/${favoriteId}`);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["favorite-items"] }),
  });
}

export function useBuyerOrders() {
  return useQuery<Order[]>({
    queryKey: ["buyer-orders"],
    queryFn: async () => {
      const { data } = await api.get<Order[]>("/v1/buyer/orders");
      return data;
    },
  });
}

export function useBuyerOrder(orderId: string) {
  return useQuery<Order>({
    queryKey: ["buyer-orders", orderId],
    queryFn: async () => {
      const { data } = await api.get<Order>(`/v1/buyer/orders/${orderId}`);
      return data;
    },
    enabled: Boolean(orderId),
  });
}

export function useCheckoutCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      shippingAddressId: string;
      returnUrl: string;
    }) => {
      const { data } = await api.post<{ paymentUrl: string; orderId: string }>(
        "/v1/buyer/checkout",
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buyer-cart"] });
      queryClient.invalidateQueries({ queryKey: ["buyer-orders"] });
    },
  });
}

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await api.get<Product[]>("/products");
      return data;
    },
  });
}

