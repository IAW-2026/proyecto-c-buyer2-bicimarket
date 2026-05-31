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

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

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

export function useBuyerAddresses(page = 1) {
  return useQuery<{ data: Address[]; pagination: PaginationMeta }>({
    queryKey: ["buyer-addresses", page],
    queryFn: async () => {
      const { data } = await api.get<{ data: Address[]; pagination: PaginationMeta }>(
        `/v1/buyer/addresses?page=${page}&limit=10`,
      );
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

export function useFavoriteItems(page = 1) {
  const { isSignedIn } = useAuth();
  return useQuery<{ data: FavoriteItem[]; pagination: PaginationMeta }>({
    queryKey: ["favorite-items", page],
    queryFn: async () => {
      const { data } = await api.get<{ data: FavoriteItem[]; pagination: PaginationMeta }>(
        `/v1/buyer/favorites?page=${page}&limit=12`,
      );
      return data;
    },
    enabled: !!isSignedIn,
  });
}

// ─── Órdenes ──────────────────────────────────────────────────────────────────

export function useBuyerOrders(page = 1) {
  return useQuery<{ data: Order[]; pagination: PaginationMeta }>({
    queryKey: ["buyer-orders", page],
    queryFn: async () => {
      const { data } = await api.get<{ data: Order[]; pagination: PaginationMeta }>(
        `/v1/buyer/orders?page=${page}&limit=10`,
      );
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
    enabled: !!productId,
  });
}
