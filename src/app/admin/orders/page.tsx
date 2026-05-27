"use client";

import { useState } from "react";
import { OrdersTable } from "@/components/admin/orders-table";
import type { OrderStatus } from "@/generated/prisma/client";

const STATUS_OPTIONS: { value: OrderStatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "PENDING_PAYMENT", label: "Pago pendiente" },
  { value: "PAID", label: "Pagado" },
  { value: "PAYMENT_FAILED", label: "Pago fallido" },
  { value: "PARTIALLY_SHIPPED", label: "Enviado parcial" },
  { value: "SHIPPED", label: "Enviado" },
  { value: "DELIVERED", label: "Entregado" },
  { value: "COMPLETED", label: "Completado" },
  { value: "CANCELLED", label: "Cancelado" },
  { value: "REFUNDED", label: "Reembolsado" },
];

export default function AdminOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | "">("");

  return (
    <div className="px-6 py-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Órdenes</h1>
        <p className="text-sm text-muted-foreground mt-1">Todas las órdenes de la plataforma</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatus(opt.value as OrderStatus | "")}
            className={
              status === opt.value
                ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      <OrdersTable statusFilter={status || undefined} />
    </div>
  );
}
