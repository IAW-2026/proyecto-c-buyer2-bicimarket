"use client";

import { useState, useMemo } from "react";
import { OrderStatus, type Order } from "@/types/buyer";

type TabKey = "all" | "pending" | "in_transit" | "delivered" | "cancelled";

type TabConfig = {
  key: TabKey;
  label: string;
  statuses: OrderStatus[];
};

const TABS: TabConfig[] = [
  { key: "all", label: "Todas", statuses: [] },
  {
    key: "pending",
    label: "Pendientes",
    statuses: [OrderStatus.PENDING_PAYMENT, OrderStatus.PAID, OrderStatus.PREPARING],
  },
  {
    key: "in_transit",
    label: "En camino",
    statuses: [OrderStatus.PARTIALLY_SHIPPED, OrderStatus.SHIPPED],
  },
  {
    key: "delivered",
    label: "Entregadas",
    statuses: [OrderStatus.DELIVERED, OrderStatus.COMPLETED],
  },
  {
    key: "cancelled",
    label: "Canceladas",
    statuses: [OrderStatus.CANCELLED, OrderStatus.REFUNDED],
  },
];

export function useOrderTabs(orders: Order[] | undefined) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const filtered = useMemo(() => {
    if (!orders) return [];
    const tab = TABS.find((t) => t.key === activeTab);
    if (!tab || tab.statuses.length === 0) return orders;
    return orders.filter((o) => tab.statuses.includes(o.status));
  }, [orders, activeTab]);

  const tabsWithCount = useMemo(() => {
    if (!orders) return TABS.map((t) => ({ ...t, count: 0 }));
    return TABS.map((t) => ({
      ...t,
      count:
        t.statuses.length === 0
          ? orders.length
          : orders.filter((o) => t.statuses.includes(o.status)).length,
    }));
  }, [orders]);

  return { activeTab, setActiveTab, filtered, tabsWithCount };
}
