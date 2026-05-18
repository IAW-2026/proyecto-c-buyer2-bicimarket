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
  const { data: orders, isLoading: ordersLoading } = useBuyerOrders();
  const { data: cart, isLoading: cartLoading } = useBuyerCart();
  const { data: favorites, isLoading: favoritesLoading } = useFavoriteItems();

  const lastOrder = orders
    ? [...orders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0]
    : undefined;

  return {
    ordersTotal: orders?.length ?? 0,
    lastOrder,
    cartItemCount: cart?.itemCount ?? 0,
    favoritesCount: favorites?.length ?? 0,
    isLoading: ordersLoading || cartLoading || favoritesLoading,
  };
}
