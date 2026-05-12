"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useDashboardData } from "@/hooks/use-dashboard";
import { OrderStatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";

export function StatCards() {
  const { ordersTotal, lastOrder, cartItemCount, favoritesCount, isLoading } =
    useDashboardData();

  if (isLoading) return <StatCardsSkeleton />;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Órdenes totales" sublabel="Histórico">
        <p className="text-3xl font-bold">{ordersTotal}</p>
      </StatCard>

      <StatCard label="Última orden" sublabel={lastOrder?.orderNumber.slice(-6) ? `ORD-...${lastOrder.orderNumber.slice(-4)}` : "—"}>
        {lastOrder ? (
          <OrderStatusBadge status={lastOrder.status} />
        ) : (
          <p className="text-sm text-muted-foreground">Sin órdenes</p>
        )}
      </StatCard>

      <StatCard label="En el carrito">
        <p className="text-3xl font-bold">{cartItemCount}</p>
        <Link href="/cart" className="flex items-center gap-1 text-xs text-primary hover:underline">
          Ir al carrito <ArrowRight className="size-3" />
        </Link>
      </StatCard>

      <StatCard label="Favoritos">
        <p className="text-3xl font-bold">{favoritesCount}</p>
        <Link href="/favorites" className="flex items-center gap-1 text-xs text-primary hover:underline">
          Ver favoritos <ArrowRight className="size-3" />
        </Link>
      </StatCard>
    </div>
  );
}

function StatCard({
  label,
  sublabel,
  children,
}: {
  label: string;
  sublabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      {children}
      {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
    </div>
  );
}

function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
