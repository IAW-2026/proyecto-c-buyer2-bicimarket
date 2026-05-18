"use client";

import { Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FavoriteItem, Product } from "@/types/buyer";

type FavoriteCardProps = {
  item: FavoriteItem;
  product?: Product;
  onRemove: (itemId: string) => void;
  isRemoving?: boolean;
};

export function FavoriteCard({
  item,
  product,
  onRemove,
  isRemoving,
}: FavoriteCardProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card gap-3">
      {product?.imageUrl && (
        <img
          src={product.imageUrl}
          alt={product.title}
          className="aspect-video w-full object-cover"
        />
      )}
      <div className="flex-1 px-4 pt-4">
        <p className="text-sm font-medium leading-snug line-clamp-2">
          {product?.title ?? item.productId}
        </p>
        {product?.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {product.description}
          </p>
        )}
        {product?.price != null && (
          <p className="text-sm font-semibold mt-2">
            {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(product.price)}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Guardado el {new Date(item.addedAt).toLocaleDateString("es-AR")}
        </p>
      </div>

      <div className="flex flex-col gap-2 px-4 pb-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-xs"
          nativeButton={false}
          render={<a href={`/shop?product=${item.productId}`} />}
        >
          <ExternalLink className="size-3.5" />
          Ver producto
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
