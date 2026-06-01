"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ProductImage } from "@/components/shared/product-image";
import { OrderStatusBadge } from "@/components/shared/status-badge";
import { PriceDisplay } from "@/components/shared/price-display";
import type { Order } from "@/types/buyer";

type OrderCardProps = {
  order: Order;
};

export function OrderCard({ order }: OrderCardProps) {
  const date = new Date(order.createdAt).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const previewItems = order.items.slice(0, 3);
  const extraCount = order.items.length - previewItems.length;

  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">…{order.id.slice(-8)}</span>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-xs text-muted-foreground">
            {date} · {order.items.length} producto{order.items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <PriceDisplay amount={order.totalCents} className="shrink-0 font-bold" />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {previewItems.map((item) => (
            <ProductImage key={item.id} src={undefined} alt={item.productNameSnapshot} size="sm" />
          ))}
          {extraCount > 0 && (
            <span className="flex size-10 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
              +{extraCount}
            </span>
          )}
          <p className="ml-1 text-xs text-muted-foreground">
            {previewItems.map((i) => i.productNameSnapshot).join(" · ")}
            {extraCount > 0 && ` +${extraCount} más`}
          </p>
        </div>
        <Link href={`/orders/${order.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Ver detalle
        </Link>
      </div>
    </div>
  );
}
