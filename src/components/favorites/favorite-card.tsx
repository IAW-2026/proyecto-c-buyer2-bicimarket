"use client";

import Link from "next/link";
import { Heart, ExternalLink } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { PriceDisplay } from "@/components/shared/price-display";
import { cn } from "@/lib/utils";
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
        {product?.priceCents != null && (
          <p className="text-sm font-semibold mt-2">
            <PriceDisplay amount={product.priceCents} />
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Guardado el {new Date(item.addedAt).toLocaleDateString("es-AR")}
        </p>
      </div>

      <div className="flex flex-col gap-2 px-4 pb-4">
        <Link
          href={`/shop/${item.productId}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full gap-1.5 text-xs")}
        >
          <ExternalLink className="size-3.5" />
          Ver producto
        </Link>
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
