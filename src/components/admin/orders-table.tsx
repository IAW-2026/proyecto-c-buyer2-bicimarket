"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControls } from "@/components/shared/pagination-controls";
import type { OrderStatus } from "@/generated/prisma/client";
import type { PaginationMeta } from "@/hooks/use-buyer";

type OrderRow = {
  id: string;
  status: OrderStatus;
  totalCents: number;
  currency: string;
  createdAt: string;
  buyerProfile: { id: string; fullName: string; email: string };
  _count: { items: number; sellerGroups: number };
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Pago pendiente",
  PAID: "Pagado",
  PREPARING: "En preparación",
  PAYMENT_FAILED: "Pago fallido",
  PARTIALLY_SHIPPED: "Enviado parcial",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

const STATUS_CLASS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-700 border-amber-200",
  PAID: "bg-green-100 text-green-700 border-green-200",
  PREPARING: "bg-blue-100 text-blue-700 border-blue-200",
  PAYMENT_FAILED: "bg-red-100 text-red-700 border-red-200",
  PARTIALLY_SHIPPED: "bg-blue-100 text-blue-700 border-blue-200",
  SHIPPED: "bg-blue-100 text-blue-700 border-blue-200",
  DELIVERED: "bg-green-100 text-green-700 border-green-200",
  COMPLETED: "bg-green-100 text-green-700 border-green-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
  REFUNDED: "bg-orange-200 text-orange-900 border-orange-400",
};

const fmt = (cents: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(cents / 100);

export function OrdersTable({ statusFilter }: { statusFilter?: OrderStatus }) {
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  useEffect(() => {
    setOrders(null);
    setPagination(null);
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    setOrders(null);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (statusFilter) params.set("status", statusFilter);
    fetch(`/api/admin/orders?${params}`)
      .then((r) => r.json())
      .then((res) => {
        setOrders(res.data ?? []);
        setPagination(res.pagination ?? null);
      });
  }, [statusFilter, page]);

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
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-xs text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">ID</th>
              <th className="px-4 py-3 text-left font-medium">Comprador</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-right font-medium">Items</th>
              <th className="px-4 py-3 text-right font-medium">Vendedores</th>
              <th className="px-4 py-3 text-left font-medium">Fecha</th>
              <th className="px-4 py-3 text-left font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">
                  {order.id.slice(0, 8)}…
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium leading-tight">{order.buyerProfile.fullName}</p>
                  <p className="text-[11px] text-muted-foreground">{order.buyerProfile.email}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={`text-[11px] ${STATUS_CLASS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right font-medium">{fmt(order.totalCents)}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{order._count.items}</td>
                <td className="px-4 py-3 text-right">
                  {order._count.sellerGroups > 1 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {order._count.sellerGroups}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{order._count.sellerGroups}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString("es-AR")}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    Ver detalle
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex flex-col items-center gap-2">
          <PaginationControls
            page={page}
            total={pagination.total}
            limit={pagination.limit}
            onChange={setPage}
          />
          <p className="text-xs text-muted-foreground">
            {pagination.total} orden{pagination.total !== 1 ? "es" : ""} en total
          </p>
        </div>
      )}
    </div>
  );
}
