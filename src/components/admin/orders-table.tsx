"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrderStatus } from "@/generated/prisma/client";

type OrderRow = {
  id: string;
  status: OrderStatus;
  totalCents: number;
  currency: string;
  createdAt: string;
  buyerProfile: { id: string; fullName: string; email: string };
  _count: { items: number };
};

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

const STATUS_VARIANT: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING_PAYMENT: "outline",
  PAID: "default",
  PAYMENT_FAILED: "destructive",
  PARTIALLY_SHIPPED: "secondary",
  SHIPPED: "secondary",
  DELIVERED: "default",
  COMPLETED: "default",
  CANCELLED: "destructive",
  REFUNDED: "outline",
};

const fmt = (cents: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(cents / 100);

export function OrdersTable({ statusFilter }: { statusFilter?: OrderStatus }) {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);

  useEffect(() => {
    const url = statusFilter ? `/api/admin/orders?status=${statusFilter}` : "/api/admin/orders";
    fetch(url)
      .then((r) => r.json())
      .then(setOrders);
  }, [statusFilter]);

  if (!orders) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">No hay órdenes.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/40 text-xs text-muted-foreground">
            <th className="px-4 py-3 text-left font-medium">ID</th>
            <th className="px-4 py-3 text-left font-medium">Comprador</th>
            <th className="px-4 py-3 text-left font-medium">Estado</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
            <th className="px-4 py-3 text-right font-medium">Items</th>
            <th className="px-4 py-3 text-left font-medium">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-mono text-xs">
                <Link href={`/admin/orders/${order.id}`} className="text-primary hover:underline">
                  {order.id.slice(0, 8)}…
                </Link>
              </td>
              <td className="px-4 py-3">
                <p className="font-medium leading-tight">{order.buyerProfile.fullName}</p>
                <p className="text-[11px] text-muted-foreground">{order.buyerProfile.email}</p>
              </td>
              <td className="px-4 py-3">
                <Badge variant={STATUS_VARIANT[order.status]} className="text-[11px]">
                  {STATUS_LABELS[order.status]}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right font-medium">{fmt(order.totalCents)}</td>
              <td className="px-4 py-3 text-right text-muted-foreground">{order._count.items}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {new Date(order.createdAt).toLocaleDateString("es-AR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
