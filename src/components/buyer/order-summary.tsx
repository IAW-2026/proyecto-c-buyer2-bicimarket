import type { Order } from "@/types/buyer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type OrderSummaryProps = {
  order: Order;
};

export function OrderSummary({ order }: OrderSummaryProps) {
  return (
    <Card className="border border-border/70">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Pedido {order.orderNumber}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Creado el {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Badge variant="secondary">{order.status.replace("_", " ")}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div>Total de artículos: {order.items.length}</div>
          <div>Envío: ${order.shippingAmount.toFixed(2)}</div>
          <div>Monto total: ${order.totalAmount.toFixed(2)}</div>
          <div>Pago: {order.paymentId ?? "Pendiente"}</div>
        </div>
      </CardContent>
    </Card>
  );
}
