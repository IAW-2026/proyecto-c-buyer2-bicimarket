"use client";

import { useBuyerOrders, useBuyerCart, useFavoriteItems } from "@/hooks/use-buyer";
import type { Order } from "@/types/buyer";

type DashboardData = {
  ordersTotal: number;
  lastOrder: Order | undefined;
  cartItemCount: number;
  favoritesCount: number;
  isLoading: boolean;
};

export function useDashboardData(): DashboardData {
  const { data: ordersResult, isLoading: ordersLoading } = useBuyerOrders();
  const { data: cart, isLoading: cartLoading } = useBuyerCart();
  const { data: favoritesResult, isLoading: favoritesLoading } = useFavoriteItems();

  const orders = ordersResult?.data;
  const favorites = favoritesResult?.data;

  const lastOrder = orders
    ? [...orders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0]
    : undefined;

  return {
    ordersTotal: ordersResult?.pagination?.total ?? orders?.length ?? 0,
    lastOrder,
    cartItemCount: cart?.itemCount ?? 0,
    favoritesCount: favoritesResult?.pagination?.total ?? favorites?.length ?? 0,
    isLoading: ordersLoading || cartLoading || favoritesLoading,
  };
}
