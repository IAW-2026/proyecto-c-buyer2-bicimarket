import { CartsTable } from "@/components/admin/carts-table";

export default function AdminCartsPage() {
  return (
    <div className="px-6 py-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Carritos</h1>
        <p className="text-sm text-muted-foreground mt-1">Estado de todos los carritos de la plataforma</p>
      </div>

      <CartsTable />
    </div>
  );
}
