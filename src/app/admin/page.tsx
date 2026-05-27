import { StatsOverview } from "@/components/admin/stats-overview";
import { OrdersTable } from "@/components/admin/orders-table";

export default function AdminPage() {
  return (
    <div className="px-6 py-8 space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Vista general de la plataforma</p>
      </div>

      <StatsOverview />

      <div className="space-y-3">
        <h2 className="font-heading text-base font-semibold">Órdenes recientes</h2>
        <OrdersTable />
      </div>
    </div>
  );
}
