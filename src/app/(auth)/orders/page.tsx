"use client";

import { Package } from "lucide-react";
import { useBuyerOrders } from "@/hooks/use-buyer";
import { useOrderTabs } from "@/hooks/use-order-tabs";
import { OrderCard } from "@/components/orders/order-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function OrdersPage() {
  const { data: orders, isLoading } = useBuyerOrders();
  const { activeTab, setActiveTab, filtered, tabsWithCount } = useOrderTabs(orders);

  return (
    <div className="px-6 py-8">
      <h1 className="font-heading mb-1 text-2xl font-bold tracking-tight">Mis órdenes</h1>
      {!isLoading && (
        <p className="mb-5 text-xs text-muted-foreground">
          {orders?.length ?? 0} pedido{(orders?.length ?? 0) !== 1 ? "s" : ""} en total
        </p>
      )}

      {/* Tabs */}
      <div className="mb-5 flex items-center gap-1 overflow-x-auto">
        {tabsWithCount.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors",
              activeTab === tab.key
                ? "bg-foreground text-background font-medium"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={cn("ml-1.5 text-xs", activeTab === tab.key ? "opacity-70" : "")}>
                ({tab.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={Package}
          title="Sin pedidos"
          description={
            activeTab === "all"
              ? "Todavía no realizaste ninguna compra."
              : "No hay pedidos en esta categoría."
          }
        />
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
