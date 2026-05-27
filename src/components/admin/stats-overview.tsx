"use client";

import { useEffect, useState } from "react";
import { Users, Package, ShoppingCart, TrendingUp, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Stats = {
  totalBuyers: number;
  ordersByStatus: Record<string, number>;
  cartsByStatus: Record<string, number>;
  revenueCents: number;
  ordersLast24h: number;
};

const fmt = (cents: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(cents / 100);

export function StatsOverview() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  const totalOrders = stats
    ? Object.values(stats.ordersByStatus).reduce((a, b) => a + b, 0)
    : 0;

  const cards = [
    {
      label: "Compradores",
      value: stats ? stats.totalBuyers.toLocaleString("es-AR") : null,
      icon: Users,
      sub: "Usuarios registrados",
    },
    {
      label: "Órdenes totales",
      value: stats ? totalOrders.toLocaleString("es-AR") : null,
      icon: Package,
      sub: `${stats?.ordersLast24h ?? 0} en las últimas 24h`,
    },
    {
      label: "Revenue",
      value: stats ? fmt(stats.revenueCents) : null,
      icon: TrendingUp,
      sub: "Órdenes pagadas / completadas",
    },
    {
      label: "Carritos activos",
      value: stats ? (stats.cartsByStatus["ACTIVE"] ?? 0).toLocaleString("es-AR") : null,
      icon: ShoppingCart,
      sub: `${stats?.cartsByStatus["ABANDONED"] ?? 0} abandonados`,
    },
    {
      label: "Órdenes últimas 24h",
      value: stats ? stats.ordersLast24h.toLocaleString("es-AR") : null,
      icon: Clock,
      sub: "Nuevas órdenes hoy",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <div className="flex size-7 items-center justify-center rounded-md bg-muted">
                <Icon className="size-3.5 text-muted-foreground" />
              </div>
            </div>
            {card.value !== null ? (
              <p className="font-heading text-2xl font-bold tracking-tight">{card.value}</p>
            ) : (
              <Skeleton className="h-8 w-24" />
            )}
            <p className="text-[11px] text-muted-foreground">{card.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
