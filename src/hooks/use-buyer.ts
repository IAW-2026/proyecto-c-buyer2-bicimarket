"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/axios";
import { deepToCamelCase } from "@/lib/case-utils";
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
      const { data } = await api.get("/v1/buyer/profile");
      return deepToCamelCase<BuyerProfile>(data);
    },
  });
}

// ─── Direcciones ──────────────────────────────────────────────────────────────

export function useBuyerAddresses(page = 1) {
  return useQuery<{ data: Address[]; pagination: PaginationMeta }>({
    queryKey: ["buyer-addresses", page],
    queryFn: async () => {
      const { data } = await api.get(`/v1/buyer/addresses?page=${page}&limit=10`);
      return {
        data: (data.data as unknown[]).map((a) => deepToCamelCase<Address>(a)),
        pagination: data.pagination as PaginationMeta,
      };
    },
  });
}

// ─── Carrito ──────────────────────────────────────────────────────────────────

export function useBuyerCart() {
  const { isSignedIn } = useAuth();
  return useQuery<Cart>({
    queryKey: ["buyer-cart"],
    queryFn: async () => {
      const { data } = await api.get("/v1/buyer/cart");
      return deepToCamelCase<Cart>(data);
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
      const { data } = await api.get(`/v1/buyer/favorites?page=${page}&limit=12`);
      return {
        data: (data.data as unknown[]).map((f) => deepToCamelCase<FavoriteItem>(f)),
        pagination: data.pagination as PaginationMeta,
      };
    },
    enabled: !!isSignedIn,
  });
}

// ─── Órdenes ──────────────────────────────────────────────────────────────────

export function useBuyerOrders(page = 1) {
  return useQuery<{ data: Order[]; pagination: PaginationMeta }>({
    queryKey: ["buyer-orders", page],
    queryFn: async () => {
      const { data } = await api.get(`/v1/buyer/orders?page=${page}&limit=10`);
      return {
        data: (data.data as unknown[]).map((o) => deepToCamelCase<Order>(o)),
        pagination: data.pagination as PaginationMeta,
      };
    },
  });
}

export function useBuyerOrder(orderId: string) {
  return useQuery<Order>({
    queryKey: ["buyer-orders", orderId],
    queryFn: async () => {
      const { data } = await api.get(`/v1/buyer/orders/${orderId}`);
      return deepToCamelCase<Order>(data);
    },
    enabled: Boolean(orderId),
  });
}

// ─── Productos (público) ──────────────────────────────────────────────────────

export function useProducts(page = 1, category = "") {
  return useQuery<{ data: Product[]; pagination: PaginationMeta }>({
    queryKey: ["products", page, category],
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(page), limit: "20" });
      if (category) qs.set("category", category);
      const { data } = await api.get<{ data: Product[]; pagination: PaginationMeta }>(
        `/products?${qs.toString()}`,
      );
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
