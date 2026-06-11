"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Handle,
  Position,
  type NodeProps,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ShoppingBag,
  CreditCard,
  Package,
  Truck,
  PackageCheck,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OrderStatus, SellerGroupStatus, type OrderSellerGroup } from "@/types/buyer";

type NodeState = "completed" | "current" | "upcoming" | "error";

type StatusNodeData = {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  state: NodeState;
};

const STEP_DEFS = [
  { id: "pedido", label: "Pedido", Icon: ShoppingBag },
  { id: "pago", label: "Pago", Icon: CreditCard },
  { id: "preparacion", label: "Preparación", Icon: Package },
  { id: "camino", label: "En camino", Icon: Truck },
  { id: "entregado", label: "Entregado", Icon: PackageCheck },
];

const STATUS_STEP: Partial<Record<OrderStatus, number>> = {
  [OrderStatus.PENDING_PAYMENT]: 0,
  [OrderStatus.PAID]: 2,
  [OrderStatus.PREPARING]: 3,
  [OrderStatus.PARTIALLY_SHIPPED]: 3,
  [OrderStatus.SHIPPED]: 3,
  [OrderStatus.DELIVERED]: 4,
  [OrderStatus.COMPLETED]: 4,
};

const CANCELLED_SET = new Set<OrderStatus>([
  OrderStatus.PAYMENT_FAILED,
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
]);

function StatusNode({ data }: NodeProps) {
  const { label, Icon, state } = data as unknown as StatusNodeData;
  const isCompleted = state === "completed";
  const isCurrent = state === "current";
  const isError = state === "error";

  return (
    <div className="flex flex-col items-center gap-1.5 select-none pointer-events-none" style={{ width: 80 }}>
      <Handle
        type="target"
        position={Position.Left}
        style={{ top: 24, opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: "none", background: "transparent" }}
        isConnectable={false}
      />

      <div
        className={cn(
          "relative flex size-12 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500",
          isCompleted && "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25",
          isCurrent && "border-primary bg-background text-primary",
          !isCompleted && !isCurrent && !isError && "border-border bg-card text-muted-foreground",
          isError && "border-destructive bg-destructive/10 text-destructive",
        )}
      >
        {isCompleted ? (
          <CheckCheck className="size-5" />
        ) : (
          <Icon className="size-5" />
        )}

        {isCurrent && (
          <span
            className="absolute inset-0 rounded-full border-2 border-primary animate-ping"
            style={{ opacity: 0.35 }}
            aria-hidden="true"
          />
        )}
      </div>

      <span
        className={cn(
          "text-center leading-tight transition-colors duration-500",
          "text-[10px]",
          isCompleted && "font-medium text-primary",
          isCurrent && "font-semibold text-primary",
          !isCompleted && !isCurrent && !isError && "text-muted-foreground",
          isError && "text-destructive",
        )}
        style={{ maxWidth: 72 }}
      >
        {label}
      </span>

      <Handle
        type="source"
        position={Position.Right}
        style={{ top: 24, opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: "none", background: "transparent" }}
        isConnectable={false}
      />
    </div>
  );
}

const nodeTypes: NodeTypes = { status: StatusNode };

const X_STEP = 165;

const PREPARING_GROUP_STATUSES = new Set<SellerGroupStatus>([
  SellerGroupStatus.PREPARING,
  SellerGroupStatus.READY_TO_SHIP,
  SellerGroupStatus.IN_TRANSIT,
  SellerGroupStatus.DELIVERED,
  SellerGroupStatus.SETTLED,
]);

export function OrderStatusFlow({
  status,
  sellerGroups,
}: {
  status: OrderStatus;
  sellerGroups?: OrderSellerGroup[];
}) {
  const baseStep = CANCELLED_SET.has(status) ? -1 : (STATUS_STEP[status] ?? 0);
  const isCancelled = baseStep === -1;
  const isFinished = status === OrderStatus.DELIVERED || status === OrderStatus.COMPLETED;
  const isInTransit = status === OrderStatus.PARTIALLY_SHIPPED || status === OrderStatus.SHIPPED;

  // If any group is already preparing (regardless of Order.status), advance preparacion to completed
  const anyGroupPreparing = sellerGroups?.some((g) => PREPARING_GROUP_STATUSES.has(g.status)) ?? false;
  const effectiveStep = anyGroupPreparing && baseStep < 3 ? 3 : baseStep;

  // "En camino" should only pulse when order is actually in transit, not just because a group is preparing
  const currentIsUpcoming = effectiveStep === 3 && !isInTransit && !isCancelled;

  const nodes: Node[] = useMemo(
    () =>
      STEP_DEFS.map((step, i) => {
        let state: NodeState;
        if (isCancelled) {
          state = "error";
        } else if (i < effectiveStep || (isFinished && i === effectiveStep)) {
          state = "completed";
        } else if (i === effectiveStep && !currentIsUpcoming) {
          state = "current";
        } else {
          state = "upcoming";
        }
        return {
          id: step.id,
          type: "status",
          position: { x: i * X_STEP, y: 0 },
          data: { label: step.label, Icon: step.Icon, state },
          selectable: false,
          draggable: false,
        };
      }),
    [effectiveStep, isCancelled, isFinished, currentIsUpcoming],
  );

  const edges: Edge[] = useMemo(
    () =>
      STEP_DEFS.slice(0, -1).map((step, i) => {
        const isActive = !isCancelled && i < effectiveStep;
        const isAnimating = !isCancelled && i === effectiveStep - 1;
        const isErrorEdge = isCancelled;

        return {
          id: `e${i}`,
          source: step.id,
          target: STEP_DEFS[i + 1].id,
          type: "smoothstep",
          animated: isAnimating,
          style: {
            stroke: isErrorEdge
              ? "var(--color-destructive)"
              : isActive || isAnimating
                ? "var(--color-primary)"
                : "var(--color-border)",
            strokeWidth: 2.5,
            transition: "stroke 0.5s ease, opacity 0.5s ease",
            opacity: !isCancelled && !isActive && !isAnimating ? 0.5 : 1,
          },
        };
      }),
    [effectiveStep, isCancelled, currentIsUpcoming],
  );

  return (
    <div style={{ height: 150, width: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1.1 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        preventScrolling={false}
        style={{ background: "transparent" }}
        proOptions={{ hideAttribution: true }}
      />
    </div>
  );
}
