"use client";

import { Heart, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/shared/product-image";
import { PriceDisplay } from "@/components/shared/price-display";
import type { FavoriteItem } from "@/types/buyer";

type FavoriteCardProps = {
  item: FavoriteItem;
  onAddToCart: (item: FavoriteItem) => void;
  onRemove: (itemId: string) => void;
  isAddingToCart?: boolean;
  isRemoving?: boolean;
};

export function FavoriteCard({
  item,
  onAddToCart,
  onRemove,
  isAddingToCart,
  isRemoving,
}: FavoriteCardProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card">
      <div className="relative">
        <ProductImage
          src={item.imageUrl}
          alt={item.title}
          size="lg"
          className="w-full rounded-none"
        />
        {item.sellerName && (
          <span className="absolute left-2 top-2 rounded-md bg-background/80 px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm">
            {item.sellerName}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3">
        <div>
          <p className="text-sm font-semibold leading-tight">{item.title}</p>
          <p className="text-xs text-muted-foreground">{item.sellerName}</p>
        </div>

        <div className="flex flex-col gap-2 mt-auto">
          <Button
            size="sm"
            className="w-full gap-1.5 text-xs"
            onClick={() => onAddToCart(item)}
            disabled={isAddingToCart}
          >
            <ShoppingCart className="size-3.5" />
            Agregar al carrito
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-1.5 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(item.id)}
            disabled={isRemoving}
          >
            <Heart className="size-3.5 fill-red-400 text-red-400" />
            Quitar
          </Button>
        </div>
      </div>
    </div>
  );
}
