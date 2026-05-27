"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { CartStatus } from "@/generated/prisma/client";

type CartRow = {
  id: string;
  status: CartStatus;
  updatedAt: string;
  estimatedTotalCents: number;
  buyerProfile: { id: string; fullName: string; email: string };
  _count: { items: number };
};

const STATUS_LABELS: Record<CartStatus, string> = {
  ACTIVE: "Activo",
  CONVERTED: "Convertido",
  ABANDONED: "Abandonado",
};

const STATUS_VARIANT: Record<CartStatus, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  CONVERTED: "secondary",
  ABANDONED: "outline",
};

const fmt = (cents: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(cents / 100);

export function CartsTable() {
  const [carts, setCarts] = useState<CartRow[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/carts")
      .then((r) => r.json())
      .then(setCarts);
  }, []);

  if (!carts) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (carts.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">No hay carritos.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/40 text-xs text-muted-foreground">
            <th className="px-4 py-3 text-left font-medium">Comprador</th>
            <th className="px-4 py-3 text-left font-medium">Estado</th>
            <th className="px-4 py-3 text-right font-medium">Items</th>
            <th className="px-4 py-3 text-right font-medium">Total estimado</th>
            <th className="px-4 py-3 text-left font-medium">Última actividad</th>
          </tr>
        </thead>
        <tbody>
          {carts.map((cart) => (
            <tr key={cart.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium leading-tight">{cart.buyerProfile.fullName}</p>
                <p className="text-[11px] text-muted-foreground">{cart.buyerProfile.email}</p>
              </td>
              <td className="px-4 py-3">
                <Badge variant={STATUS_VARIANT[cart.status]} className="text-[11px]">
                  {STATUS_LABELS[cart.status]}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">{cart._count.items}</td>
              <td className="px-4 py-3 text-right font-medium">{fmt(cart.estimatedTotalCents)}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {new Date(cart.updatedAt).toLocaleString("es-AR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
