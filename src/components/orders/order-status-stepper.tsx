"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatus, type OrderSellerGroup } from "@/types/buyer";

const OrderStatusFlow = dynamic(
  () => import("./order-status-flow").then((m) => m.OrderStatusFlow),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[150px] w-full rounded-lg" />,
  },
);

type OrderStatusStepperProps = {
  status: OrderStatus;
  sellerGroups?: OrderSellerGroup[];
};

export function OrderStatusStepper({ status, sellerGroups }: OrderStatusStepperProps) {
  return <OrderStatusFlow status={status} sellerGroups={sellerGroups} />;
}
