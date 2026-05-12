"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/shared/product-image";
import { PriceDisplay } from "@/components/shared/price-display";
import type { CartItem } from "@/types/buyer";

type CartItemRowProps = {
  item: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  isUpdating?: boolean;
};

export function CartItemRow({
  item,
  onIncrement,
  onDecrement,
  onRemove,
  isUpdating,
}: CartItemRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3">
      <ProductImage src={item.imageUrl} alt={item.title} size="sm" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">{item.title}</p>
        <p className="text-xs text-muted-foreground">{item.sellerName}</p>
        <p className="text-xs text-muted-foreground">
          <PriceDisplay amount={item.unitPrice} /> c/u
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          onClick={onDecrement}
          disabled={isUpdating || item.quantity <= 1}
        >
          <Minus className="size-3" />
        </Button>
        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          onClick={onIncrement}
          disabled={isUpdating}
        >
          <Plus className="size-3" />
        </Button>
      </div>

      <PriceDisplay amount={item.subtotal} className="w-24 text-right text-sm font-semibold" />

      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        disabled={isUpdating}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
