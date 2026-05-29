"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrderStatus, SellerGroupStatus, ShippingStatus } from "@/generated/prisma/client";

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Pago pendiente",
  PAID: "Pagado",
  PAYMENT_FAILED: "Pago fallido",
  PARTIALLY_SHIPPED: "Enviado parcial",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

type OrderDetail = {
  id: string;
  status: OrderStatus;
  itemsTotalCents: number;
  shippingTotalCents: number;
  totalCents: number;
  currency: string;
  notes: string | null;
  createdAt: string;
  shippingAddressSnapshot: Record<string, string>;
  buyerProfile: { id: string; fullName: string; email: string; phone: string | null };
  sellerGroups: Array<{
    id: string;
    sellerProfileId: string;
    status: SellerGroupStatus;
    shippingStatus: ShippingStatus | null;
    itemsSubtotalCents: number;
    shippingCostCents: number;
    orderItems: Array<{
      id: string;
      productId: string;
      productNameSnapshot: string;
      unitPriceCents: number;
      quantity: number;
    }>;
  }>;
  statusHistory: Array<{
    id: string;
    fromStatus: string;
    toStatus: string;
    source: string;
    occurredAt: string;
  }>;
};

const fmt = (cents: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(cents / 100);

export function OrderDetailView({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  function loadOrder() {
    return fetch(`/api/admin/orders/${orderId}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setOrder)
      .catch(() => setError(true));
  }

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  async function handleStatusChange(newStatus: string) {
    if (!order || newStatus === order.status) return;
    setUpdating(true);
    setUpdateError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      await loadOrder();
    } catch {
      setUpdateError("No se pudo actualizar el estado.");
    } finally {
      setUpdating(false);
    }
  }

  if (error) return <p className="text-sm text-destructive">No se pudo cargar la orden.</p>;

  if (!order) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const addr = order.shippingAddressSnapshot as Record<string, string>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground">{order.id}</p>
          <h2 className="font-heading text-xl font-bold">{order.buyerProfile.fullName}</h2>
          <p className="text-sm text-muted-foreground">{order.buyerProfile.email}</p>
        </div>
        <Badge className="w-fit">{STATUS_LABELS[order.status]}</Badge>
      </div>

      {/* Cambiar estado */}
      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Cambiar estado
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={order.status}
            disabled={updating}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {updating && <span className="text-xs text-muted-foreground">Actualizando…</span>}
          {updateError && <span className="text-xs text-destructive">{updateError}</span>}
        </div>
      </div>

      {/* Totales */}
      <div className="grid gap-3 rounded-xl border border-border/60 bg-card p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Subtotal items</p>
          <p className="font-semibold">{fmt(order.itemsTotalCents)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Envío</p>
          <p className="font-semibold">{fmt(order.shippingTotalCents)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-heading text-lg font-bold">{fmt(order.totalCents)}</p>
        </div>
      </div>

      {/* Dirección */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Dirección de envío
        </p>
        <p className="text-sm">
          {addr.street} {addr.number}{addr.apartment ? `, ${addr.apartment}` : ""},{" "}
          {addr.city}, {addr.province} ({addr.postalCode}), {addr.country}
        </p>
      </div>

      {/* Grupos por vendedor */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Items por vendedor
        </p>
        {order.sellerGroups.map((group) => (
          <div key={group.id} className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono text-muted-foreground">Vendedor: {group.sellerProfileId.slice(0, 10)}…</p>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[11px]">{group.status}</Badge>
                {group.shippingStatus && (
                  <Badge variant="secondary" className="text-[11px]">{group.shippingStatus}</Badge>
                )}
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border/40">
                  <th className="pb-1 text-left font-medium">Producto</th>
                  <th className="pb-1 text-right font-medium">Precio unit.</th>
                  <th className="pb-1 text-right font-medium">Cant.</th>
                  <th className="pb-1 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {group.orderItems.map((item) => (
                  <tr key={item.id} className="border-b border-border/20 last:border-0">
                    <td className="py-1.5">{item.productNameSnapshot}</td>
                    <td className="py-1.5 text-right">{fmt(item.unitPriceCents)}</td>
                    <td className="py-1.5 text-right">{item.quantity}</td>
                    <td className="py-1.5 text-right font-medium">{fmt(item.unitPriceCents * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end gap-4 text-xs text-muted-foreground pt-1">
              <span>Envío: {fmt(group.shippingCostCents)}</span>
              <span className="font-medium text-foreground">
                Subtotal vendedor: {fmt(group.itemsSubtotalCents + group.shippingCostCents)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Historial de estados */}
      {order.statusHistory.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Historial de estados
          </p>
          <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
            {order.statusHistory.map((h) => (
              <div key={h.id} className="flex items-center gap-3 text-sm">
                <span className="text-[11px] text-muted-foreground w-32 shrink-0">
                  {new Date(h.occurredAt).toLocaleString("es-AR")}
                </span>
                <span className="text-xs font-mono text-muted-foreground">{h.fromStatus}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-xs font-mono font-medium">{h.toStatus}</span>
                <span className="text-[11px] text-muted-foreground ml-auto">{h.source}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
