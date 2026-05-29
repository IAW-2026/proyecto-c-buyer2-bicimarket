"use client";

import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/shared/product-image";
import { PriceDisplay } from "@/components/shared/price-display";
import type { Product } from "@/types/buyer";

type ProductCardProps = {
  product: Product;
  isFavorite?: boolean;
  isInCart?: boolean;
  isAddingToCart?: boolean;
  isAddingFavorite?: boolean;
  onAddToCart: (product: Product) => void;
  onToggleFavorite: (product: Product) => void;
};

export function ProductCard({
  product,
  isFavorite,
  isInCart,
  isAddingToCart,
  isAddingFavorite,
  onAddToCart,
  onToggleFavorite,
}: ProductCardProps) {
  return (
    <Link
      href={`/shop/${product.id}`}
      className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative">
        <ProductImage
          src={product.imageUrl}
          alt={product.title}
          size="lg"
          className="w-full rounded-none"
        />
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(product); }}
          disabled={isAddingFavorite}
          className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-background"
        >
          <Heart
            className={`size-4 transition-colors ${
              isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
            }`}
          />
        </button>
        {product.sellerName && (
          <span className="absolute left-2 top-2 rounded-md bg-background/80 px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm">
            {product.sellerName}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex-1">
          <p className="text-sm font-semibold leading-tight">{product.title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {product.description}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <PriceDisplay amount={product.price ?? 0} className="font-bold" />
          {!product.isActive ? (
            <span className="text-xs text-muted-foreground">Sin stock</span>
          ) : isInCart ? (
            <span className="text-xs font-medium text-primary">✓ En carrito</span>
          ) : (
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddToCart(product); }}
              disabled={isAddingToCart}
            >
              <ShoppingCart className="size-3.5" />
              Agregar
            </Button>
          )}
        </div>
      </div>
    </Link>
  );
}
