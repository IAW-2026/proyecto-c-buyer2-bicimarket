import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OrderDetailView } from "@/components/admin/order-detail-view";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return (
    <div className="px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/orders"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Volver a órdenes
        </Link>
      </div>

      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Detalle de orden</h1>
      </div>

      <OrderDetailView orderId={orderId} />
    </div>
  );
}
