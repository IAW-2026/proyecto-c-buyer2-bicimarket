"use client";

import { Minus, Plus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CartItem } from "@/types/buyer";

type CartItemCardProps = {
  item: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
};

export function CartItemCard({
  item,
  onIncrement,
  onDecrement,
  onRemove,
}: CartItemCardProps) {
  return (
    <Card className="border border-border/60">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{item.productNameSnapshot}</CardTitle>
        </div>
        <Badge variant="outline">{item.sellerProfileId}</Badge>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Precio unitario: ${(item.unitPriceCents / 100).toFixed(2)}
          </p>
          <p className="text-sm text-muted-foreground">
            Subtotal: ${((item.unitPriceCents * item.quantity) / 100).toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">ID: {item.productId}</p>
        </div>

        <div className="flex flex-wrap gap-2 items-center justify-end">
          <div className="flex items-center gap-1 rounded-full border border-border px-2 py-1">
            <Button variant="outline" size="sm" onClick={onDecrement}>
              <Minus className="size-4" />
            </Button>
            <span className="min-w-[30px] text-center font-medium">
              {item.quantity}
            </span>
            <Button variant="outline" size="sm" onClick={onIncrement}>
              <Plus className="size-4" />
            </Button>
          </div>
          <Button variant="destructive" size="sm" onClick={onRemove}>
            <Trash className="size-4" />
            Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
