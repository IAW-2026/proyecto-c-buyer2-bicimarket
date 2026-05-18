"use client";

import Link from "next/link";
import { useDashboardData } from "@/hooks/use-dashboard";
import { OrderStatusBadge } from "@/components/shared/status-badge";
import { PriceDisplay } from "@/components/shared/price-display";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function LastOrderPreview() {
  const { lastOrder, isLoading } = useDashboardData();

  if (isLoading) {
    return (
      <div>
        <h2 className="mb-3 font-heading text-sm font-semibold">Última orden</h2>
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (!lastOrder) return null;

  const date = new Date(lastOrder.createdAt).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <h2 className="mb-3 font-heading text-sm font-semibold">Última orden</h2>
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card px-4 py-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">…{lastOrder.id.slice(-8)}</span>
            <OrderStatusBadge status={lastOrder.status} />
          </div>
          <p className="text-xs text-muted-foreground">
            {date} · {lastOrder.items.length} producto{lastOrder.items.length !== 1 ? "s" : ""} ·{" "}
            {lastOrder.sellerGroups.length} vendedor{lastOrder.sellerGroups.length !== 1 ? "es" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PriceDisplay amount={lastOrder.totalCents / 100} className="font-semibold" />
          <Link href={`/orders/${lastOrder.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Ver detalle
          </Link>
        </div>
      </div>
    </div>
  );
}
