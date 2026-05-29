"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatus } from "@/types/buyer";

const OrderStatusFlow = dynamic(
  () => import("./order-status-flow").then((m) => m.OrderStatusFlow),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[150px] w-full rounded-lg" />,
  },
);

type OrderStatusStepperProps = {
  status: OrderStatus;
};

export function OrderStatusStepper({ status }: OrderStatusStepperProps) {
  return <OrderStatusFlow status={status} />;
}
