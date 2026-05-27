import { BuyersTable } from "@/components/admin/buyers-table";

export default function AdminBuyersPage() {
  return (
    <div className="px-6 py-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Compradores</h1>
        <p className="text-sm text-muted-foreground mt-1">Todos los usuarios registrados</p>
      </div>

      <BuyersTable />
    </div>
  );
}
