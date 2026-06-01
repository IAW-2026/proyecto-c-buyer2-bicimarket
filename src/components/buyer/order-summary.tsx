import type { Order } from "@/types/buyer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PriceDisplay } from "@/components/shared/price-display";

type OrderSummaryProps = {
  order: Order;
};

export function OrderSummary({ order }: OrderSummaryProps) {
  return (
    <Card className="border border-border/70">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Pedido …{order.id.slice(-8)}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Creado el {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Badge variant="secondary">{order.status.replace("_", " ")}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div>Total de artículos: {order.items.length}</div>
          <div>Envío: <PriceDisplay amount={order.shippingTotalCents} /></div>
          <div>Monto total: <PriceDisplay amount={order.totalCents} /></div>
          <div>Pago: {order.paymentId ?? "Pendiente"}</div>
        </div>
      </CardContent>
    </Card>
  );
}
