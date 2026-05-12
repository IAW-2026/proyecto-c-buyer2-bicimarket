import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrderStatus } from "@/types/buyer";

type Step = {
  key: OrderStatus[];
  label: string;
};

const STEPS: Step[] = [
  { key: [OrderStatus.PENDING_PAYMENT], label: "Pedido" },
  { key: [OrderStatus.PAID], label: "Pago" },
  { key: [OrderStatus.PARTIALLY_SHIPPED, OrderStatus.SHIPPED], label: "Preparación" },
  { key: [OrderStatus.SHIPPED, OrderStatus.PARTIALLY_SHIPPED], label: "En camino" },
  { key: [OrderStatus.DELIVERED, OrderStatus.COMPLETED], label: "Entregado" },
];

const STATUS_STEP_INDEX: Record<OrderStatus, number> = {
  [OrderStatus.PENDING_PAYMENT]: 0,
  [OrderStatus.PAID]: 1,
  [OrderStatus.PAYMENT_FAILED]: -1,
  [OrderStatus.PARTIALLY_SHIPPED]: 2,
  [OrderStatus.SHIPPED]: 3,
  [OrderStatus.DELIVERED]: 4,
  [OrderStatus.COMPLETED]: 4,
  [OrderStatus.CANCELLED]: -1,
  [OrderStatus.REFUNDED]: -1,
};

type OrderStatusStepperProps = {
  status: OrderStatus;
};

export function OrderStatusStepper({ status }: OrderStatusStepperProps) {
  const currentStep = STATUS_STEP_INDEX[status] ?? 0;
  const isCancelled = currentStep === -1;

  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, index) => {
        const isCompleted = !isCancelled && index < currentStep;
        const isCurrent = !isCancelled && index === currentStep;

        return (
          <div key={step.label} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {/* Left connector */}
              {index > 0 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 transition-colors",
                    isCompleted || isCurrent ? "bg-primary" : "bg-border",
                  )}
                />
              )}
              {/* Circle */}
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCurrent
                      ? "border-primary bg-background"
                      : "border-border bg-background",
                )}
              >
                {isCompleted ? (
                  <Check className="size-3.5" />
                ) : (
                  <div
                    className={cn(
                      "size-2 rounded-full",
                      isCurrent ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
              </div>
              {/* Right connector */}
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 transition-colors",
                    isCompleted ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </div>
            <p className={cn("mt-1.5 text-center text-[10px]", isCurrent ? "font-semibold text-primary" : "text-muted-foreground")}>
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
