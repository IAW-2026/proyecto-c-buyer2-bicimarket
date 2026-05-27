"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrderStatus } from "@/generated/prisma/client";

type BuyerRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  createdAt: string;
  _count: { orders: number };
  orders: Array<{ id: string; status: OrderStatus; totalCents: number; createdAt: string }>;
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

export function BuyersTable() {
  const [buyers, setBuyers] = useState<BuyerRow[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/buyers")
      .then((r) => r.json())
      .then(setBuyers);
  }, []);

  if (!buyers) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (buyers.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">No hay compradores registrados.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/40 text-xs text-muted-foreground">
            <th className="px-4 py-3 text-left font-medium">Nombre</th>
            <th className="px-4 py-3 text-left font-medium">Email</th>
            <th className="px-4 py-3 text-left font-medium">Teléfono</th>
            <th className="px-4 py-3 text-right font-medium">Órdenes</th>
            <th className="px-4 py-3 text-left font-medium">Última orden</th>
            <th className="px-4 py-3 text-left font-medium">Registrado</th>
          </tr>
        </thead>
        <tbody>
          {buyers.map((buyer) => {
            const lastOrder = buyer.orders[0];
            return (
              <tr key={buyer.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{buyer.fullName}</td>
                <td className="px-4 py-3 text-muted-foreground">{buyer.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{buyer.phone ?? "—"}</td>
                <td className="px-4 py-3 text-right">{buyer._count.orders}</td>
                <td className="px-4 py-3">
                  {lastOrder ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[11px]">
                        {STATUS_LABELS[lastOrder.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(lastOrder.createdAt).toLocaleDateString("es-AR")}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin órdenes</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(buyer.createdAt).toLocaleDateString("es-AR")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
