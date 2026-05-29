"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/axios";
import type {
  Address,
  BuyerProfile,
  Cart,
  FavoriteItem,
  Order,
  Product,
} from "@/types/buyer";

// ─── Perfil ───────────────────────────────────────────────────────────────────

export function useBuyerProfile() {
  return useQuery<BuyerProfile>({
    queryKey: ["buyer-profile"],
    queryFn: async () => {
      const { data } = await api.get<BuyerProfile>("/v1/buyer/profile");
      return data;
    },
  });
}

// ─── Direcciones ──────────────────────────────────────────────────────────────

export function useBuyerAddresses() {
  return useQuery<Address[]>({
    queryKey: ["buyer-addresses"],
    queryFn: async () => {
      const { data } = await api.get<Address[]>("/v1/buyer/addresses");
      return data;
    },
  });
}

// ─── Carrito ──────────────────────────────────────────────────────────────────

export function useBuyerCart() {
  const { isSignedIn } = useAuth();
  return useQuery<Cart>({
    queryKey: ["buyer-cart"],
    queryFn: async () => {
      const { data } = await api.get<Cart>("/v1/buyer/cart");
      return data;
    },
    enabled: !!isSignedIn,
  });
}

// ─── Favoritos ────────────────────────────────────────────────────────────────

export function useFavoriteItems() {
  const { isSignedIn } = useAuth();
  return useQuery<FavoriteItem[]>({
    queryKey: ["favorite-items"],
    queryFn: async () => {
      const { data } = await api.get<FavoriteItem[]>("/v1/buyer/favorites");
      return data;
    },
    enabled: !!isSignedIn,
  });
}

// ─── Órdenes ──────────────────────────────────────────────────────────────────

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

// ─── Productos (público) ──────────────────────────────────────────────────────

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await api.get<Product[]>("/products");
      return data;
    },
  });
}

export function useProduct(productId: string) {
  return useQuery<Product>({
    queryKey: ["products", productId],
    queryFn: async () => {
      const { data } = await api.get<Product>(`/products/${productId}`);
      return data;
    },
  });
}
