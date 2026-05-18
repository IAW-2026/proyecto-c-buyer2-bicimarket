import { Badge } from "@/components/ui/badge";
import { OrderStatus, SellerGroupStatus } from "@/types/buyer";

type OrderStatusConfig = {
  label: string;
  className: string;
};

const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusConfig> = {
  [OrderStatus.PENDING_PAYMENT]: {
    label: "Pago pendiente",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  [OrderStatus.PAID]: {
    label: "Pagado",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  [OrderStatus.PARTIALLY_SHIPPED]: {
    label: "Envío parcial",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  [OrderStatus.SHIPPED]: {
    label: "En camino",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  [OrderStatus.DELIVERED]: {
    label: "Entregado",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  [OrderStatus.COMPLETED]: {
    label: "Completado",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  [OrderStatus.CANCELLED]: {
    label: "Cancelada",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  [OrderStatus.PAYMENT_FAILED]: {
    label: "Pago fallido",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  [OrderStatus.REFUNDED]: {
    label: "Reembolsado",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
};

const SELLER_GROUP_STATUS_CONFIG: Record<SellerGroupStatus, OrderStatusConfig> = {
  [SellerGroupStatus.PENDING]: {
    label: "Pendiente",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  [SellerGroupStatus.PREPARING]: {
    label: "Preparando",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  [SellerGroupStatus.READY_TO_SHIP]: {
    label: "Listo para enviar",
    className: "bg-cyan-100 text-cyan-700 border-cyan-200",
  },
  [SellerGroupStatus.IN_TRANSIT]: {
    label: "En camino",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  [SellerGroupStatus.DELIVERED]: {
    label: "Entregado",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  [SellerGroupStatus.SETTLED]: {
    label: "Liquidado",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
  [SellerGroupStatus.CANCELLED]: {
    label: "Cancelado",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  [SellerGroupStatus.REFUNDED]: {
    label: "Reembolsado",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
};

type OrderStatusBadgeProps = {
  status: OrderStatus;
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = ORDER_STATUS_CONFIG[status];
  return (
    <Badge
      variant="outline"
      className={`flex items-center gap-1 font-medium ${config.className}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {config.label}
    </Badge>
  );
}

type SellerGroupStatusBadgeProps = {
  status: SellerGroupStatus;
};

export function SellerGroupStatusBadge({ status }: SellerGroupStatusBadgeProps) {
  const config = SELLER_GROUP_STATUS_CONFIG[status];
  return (
    <Badge
      variant="outline"
      className={`flex items-center gap-1 font-medium ${config.className}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {config.label}
    </Badge>
  );
}
