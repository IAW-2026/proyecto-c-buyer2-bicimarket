"use client";

import { use } from "react";
import Link from "next/link";
import { MapPin, CreditCard, Package } from "lucide-react";
import { useBuyerOrder } from "@/hooks/use-buyer";
import { OrderStatusStepper } from "@/components/orders/order-status-stepper";
import { SellerGroupSection } from "@/components/orders/seller-group-section";
import { OrderStatusBadge } from "@/components/shared/status-badge";
import { PriceDisplay } from "@/components/shared/price-display";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";

type Props = {
  params: Promise<{ orderId: string }>;
};

export default function OrderDetailPage({ params }: Props) {
  const { orderId } = use(params);
  const { data: order, isLoading, error } = useBuyerOrder(orderId);

  if (isLoading) return <OrderDetailSkeleton />;

  if (error || !order) {
    return (
      <div className="px-6 py-8">
        <EmptyState
          icon={Package}
          title="Orden no encontrada"
          description="No pudimos encontrar esta orden."
          action={<Link href="/orders" className={buttonVariants({ variant: "outline" })}>Volver a mis órdenes</Link>}
        />
      </div>
    );
  }

  const date = new Date(order.createdAt).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const shortId = order.id.slice(-8);
  const addr = order.shippingAddressSnapshot as Record<string, string>;

  return (
    <div className="px-6 py-8">
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/orders" className="hover:text-foreground">Mis órdenes</Link>
        <span>›</span>
        <span className="font-medium text-foreground">{shortId}</span>
      </nav>

      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Orden</div>
      <h1 className="font-heading mb-1 text-2xl font-bold tracking-tight">…{shortId}</h1>
      <div className="mb-6 flex items-center gap-2">
        <OrderStatusBadge status={order.status} />
        <span className="text-xs text-muted-foreground">· {date}</span>
      </div>

      {/* Status stepper */}
      <div className="mb-6 rounded-xl border border-border/60 bg-card p-5">
        <p className="mb-4 text-xs font-medium text-muted-foreground">Estado del envío</p>
        <OrderStatusStepper status={order.status} sellerGroups={order.sellerGroups} />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Seller groups */}
        <div className="flex-1 space-y-3">
          {order.sellerGroups.map((group) => {
            const groupItems = order.items.filter(
              (item) => item.sellerGroupId === group.id,
            );
            return (
              <SellerGroupSection key={group.id} group={group} items={groupItems} />
            );
          })}
        </div>

        {/* Right panel */}
        <div className="w-full space-y-3 lg:w-64 lg:shrink-0">
          {/* Totals */}
          <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
            <h3 className="text-sm font-semibold">Totales</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal items</span>
                <PriceDisplay amount={order.itemsTotalCents} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total envíos</span>
                <PriceDisplay amount={order.shippingTotalCents} />
              </div>
            </div>
            <div className="border-t border-border/60 pt-2 flex justify-between font-semibold">
              <span>TOTAL</span>
              <PriceDisplay amount={order.totalCents} />
            </div>
          </div>

          {/* Shipping address */}
          {addr && (
            <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <MapPin className="size-4 text-muted-foreground" />
                Dirección de envío
              </div>
              <p className="text-xs text-muted-foreground">
                {addr.street} {addr.number}{addr.apartment ? `, ${addr.apartment}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {addr.city}, {addr.province} {addr.postalCode}
              </p>
            </div>
          )}

          {/* Payment */}
          {order.paymentId && (
            <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <CreditCard className="size-4 text-muted-foreground" />
                Pago
              </div>
              <p className="text-xs text-muted-foreground">ID: {order.paymentId}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderDetailSkeleton() {
  return (
    <div className="px-6 py-8 space-y-4">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="flex gap-6">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="w-64 space-y-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
