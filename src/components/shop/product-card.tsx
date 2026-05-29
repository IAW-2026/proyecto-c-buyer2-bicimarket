"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/shared/product-image";
import { PriceDisplay } from "@/components/shared/price-display";
import { Can } from "@/components/shared/can";
import type { Product } from "@/types/buyer";
import { cn } from "@/lib/utils";

type ProductCardProps = {
  product: Product;
  isFavorite?: boolean;
  isInCart?: boolean;
  isAddingToCart?: boolean;
  isAddingFavorite?: boolean;
  onAddToCart: (product: Product) => void;
  onToggleFavorite: (product: Product) => void;
};

function isNewProduct(createdAt: string): boolean {
  const daysSince = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince <= 14;
}

export function ProductCard({
  product,
  isFavorite,
  isInCart,
  isAddingToCart,
  isAddingFavorite,
  onAddToCart,
  onToggleFavorite,
}: ProductCardProps) {
  const router = useRouter();
  const isNew = isNewProduct(product.createdAt);
  const showSellerOnImage = product.sellerName && !isNew;

  return (
    <Link
      href={`/shop/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card transition-shadow hover:shadow-md"
    >
      {/* Image area */}
      <div className="relative">
        <ProductImage
          src={product.imageUrl}
          alt={product.title}
          size="lg"
          className="w-full rounded-none"
        />

        {/* "Nuevo" badge (top-left, only when new + in stock) */}
        {isNew && product.isActive && (
          <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
            Nuevo
          </span>
        )}

        {/* Out-of-stock overlay */}
        {!product.isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
            <span className="rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground">
              Sin stock
            </span>
          </div>
        )}

        {/* Seller name badge */}
        {showSellerOnImage && (
          <span className="absolute left-2 top-2 rounded-md bg-background/80 px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm">
            {product.sellerName}
          </span>
        )}

        {/* Favorite button */}
        <Can action="favorites.toggle">
          {(granted) => (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                granted ? onToggleFavorite(product) : router.push("/sign-in");
              }}
              disabled={granted && isAddingFavorite}
              className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-background"
            >
              <Heart
                className={cn(
                  "size-3.5 transition-colors",
                  isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground",
                )}
              />
            </button>
          )}
        </Can>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        {/* Seller name (when new badge is showing, print seller in content area) */}
        {isNew && product.sellerName && (
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {product.sellerName}
          </p>
        )}

        <p className="line-clamp-2 flex-1 text-sm font-semibold leading-snug">{product.title}</p>

        <div className="flex items-center justify-between gap-2">
          <PriceDisplay amount={product.price ?? 0} className="text-sm font-bold" />

          {!product.isActive ? null : isInCart ? (
            <span className="text-xs font-medium text-primary">✓ En carrito</span>
          ) : (
            <Can action="cart.add">
              {(granted) => (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 rounded-full px-3 text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    granted ? onAddToCart(product) : router.push("/sign-in");
                  }}
                  disabled={granted && isAddingToCart}
                >
                  <ShoppingCart className="size-3" />
                  Agregar
                </Button>
              )}
            </Can>
          )}
        </div>
      </div>
    </Link>
  );
}
