"use client";

import { use } from "react";
import Link from "next/link";
import { Heart, ShoppingCart, Package } from "lucide-react";
import {
  useProduct,
  useAddCartItem,
  useAddFavoriteItem,
  useRemoveFavoriteItem,
  useFavoriteItems,
  useBuyerCart,
} from "@/hooks/use-buyer";
import { ProductImage } from "@/components/shared/product-image";
import { PriceDisplay } from "@/components/shared/price-display";
import { EmptyState } from "@/components/shared/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  params: Promise<{ productId: string }>;
};

export default function ProductDetailPage({ params }: Props) {
  const { productId } = use(params);
  const { data: product, isLoading, error } = useProduct(productId);
  const { data: favorites } = useFavoriteItems();
  const { data: cart } = useBuyerCart();
  const addCartItem = useAddCartItem();
  const addFavoriteItem = useAddFavoriteItem();
  const removeFavoriteItem = useRemoveFavoriteItem();

  if (isLoading) return <ProductDetailSkeleton />;

  if (error || !product) {
    return (
      <div className="px-6 py-8">
        <EmptyState
          icon={Package}
          title="Producto no encontrado"
          description="No pudimos encontrar este producto."
          action={
            <Link href="/shop" className={buttonVariants({ variant: "outline" })}>
              Volver a la tienda
            </Link>
          }
        />
      </div>
    );
  }

  const isFavorite = favorites?.some((f) => f.productId === product.id) ?? false;
  const isInCart = cart?.items.some((i) => i.productId === product.id) ?? false;
  const existingFavorite = favorites?.find((f) => f.productId === product.id);

  async function handleAddToCart() {
    await addCartItem.mutateAsync({
      productId: product!.id,
      sellerProfileId: product!.sellerId ?? "unknown",
      productNameSnapshot: product!.title,
      unitPriceCents: Math.round((product!.price ?? 0) * 100),
      quantity: 1,
      weightGramsSnapshot: 0,
    });
  }

  async function handleToggleFavorite() {
    if (existingFavorite) {
      await removeFavoriteItem.mutateAsync(existingFavorite.id);
    } else {
      await addFavoriteItem.mutateAsync({ productId: product!.id });
    }
  }

  return (
    <div className="px-6 py-8">
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/shop" className="hover:text-foreground">
          Tienda
        </Link>
        <span>›</span>
        <span className="font-medium text-foreground line-clamp-1">{product.title}</span>
      </nav>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Image */}
        <div className="w-full lg:w-96 lg:shrink-0">
          <ProductImage
            src={product.imageUrl}
            alt={product.title}
            size="lg"
            className="w-full rounded-xl"
          />
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-6">
          {product.sellerName && (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {product.sellerName}
            </p>
          )}

          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">{product.title}</h1>
            {!product.isActive && (
              <span className="mt-1 inline-block text-sm text-muted-foreground">Sin stock</span>
            )}
          </div>

          <PriceDisplay amount={product.price ?? 0} className="text-3xl font-bold" />

          {product.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
          )}

          <div className="flex items-center gap-3">
            {product.isActive && (
              isInCart ? (
                <Button disabled className="gap-2">
                  <ShoppingCart className="size-4" />
                  En carrito
                </Button>
              ) : (
                <Button
                  onClick={handleAddToCart}
                  disabled={addCartItem.isPending}
                  className="gap-2"
                >
                  <ShoppingCart className="size-4" />
                  Agregar al carrito
                </Button>
              )
            )}

            <button
              onClick={handleToggleFavorite}
              disabled={addFavoriteItem.isPending || removeFavoriteItem.isPending}
              className="flex size-10 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-accent"
            >
              <Heart
                className={`size-5 transition-colors ${
                  isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="px-6 py-8">
      <Skeleton className="mb-4 h-3 w-40" />
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <Skeleton className="aspect-video w-full rounded-xl lg:w-96" />
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    </div>
  );
}
