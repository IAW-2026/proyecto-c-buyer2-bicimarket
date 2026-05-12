"use client";

import { Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FavoriteItem } from "@/types/buyer";

type FavoriteCardProps = {
  item: FavoriteItem;
  onRemove: (itemId: string) => void;
  isRemoving?: boolean;
};

export function FavoriteCard({
  item,
  onRemove,
  isRemoving,
}: FavoriteCardProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card p-4 gap-3">
      <div className="flex-1">
        <p className="text-xs text-muted-foreground mb-1">Producto</p>
        <p className="text-sm font-mono font-medium truncate">{item.productId}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Guardado el {new Date(item.addedAt).toLocaleDateString("es-AR")}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-xs"
          asChild
        >
          <a href={`/shop?product=${item.productId}`}>
            <ExternalLink className="size-3.5" />
            Ver producto
          </a>
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
  );
}
