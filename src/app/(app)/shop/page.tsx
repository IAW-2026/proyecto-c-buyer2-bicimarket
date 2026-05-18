"use client";

import { Store } from "lucide-react";
import { useProducts, useAddCartItem, useAddFavoriteItem, useFavoriteItems, useBuyerCart } from "@/hooks/use-buyer";
import { useShopFilters } from "@/hooks/use-shop-filters";
import { FilterPanel } from "@/components/shop/filter-panel";
import { ProductCard } from "@/components/shop/product-card";
import { ProductGridSkeleton } from "@/components/shop/product-grid-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import type { Product } from "@/types/buyer";

export default function ShopPage() {
  const { data: products, isLoading } = useProducts();
  const { data: favorites } = useFavoriteItems();
  const { data: cart } = useBuyerCart();
  const addCartItem = useAddCartItem();
  const addFavoriteItem = useAddFavoriteItem();
  const shopFilters = useShopFilters(products);

  const favoriteProductIds = new Set(favorites?.map((f) => f.productId) ?? []);
  const cartProductIds = new Set(cart?.items.map((i) => i.productId) ?? []);

  async function handleAddToCart(product: Product) {
    await addCartItem.mutateAsync({
      productId: product.id,
      sellerProfileId: product.sellerId ?? "unknown",
      productNameSnapshot: product.title,
      unitPriceCents: Math.round((product.price ?? 0) * 100),
      quantity: 1,
      weightGramsSnapshot: 0,
    });
  }

  async function handleToggleFavorite(product: Product) {
    await addFavoriteItem.mutateAsync({ productId: product.id });
  }

  return (
    <div className="flex min-h-full flex-col gap-0 lg:flex-row">
      {/* Filter panel */}
      <div className="w-full border-b border-border/60 px-6 py-5 lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r lg:py-8">
        <FilterPanel filters={shopFilters} />
      </div>

      {/* Main content */}
      <div className="flex-1 px-6 py-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">Tienda</h1>
            {!isLoading && (
              <p className="text-xs text-muted-foreground">
                {shopFilters.filtered.length} productos
              </p>
            )}
          </div>
        </div>

        {isLoading && <ProductGridSkeleton />}

        {!isLoading && shopFilters.filtered.length === 0 && (
          <EmptyState
            icon={Store}
            title="Sin productos"
            description="No hay productos que coincidan con los filtros seleccionados."
          />
        )}

        {!isLoading && shopFilters.filtered.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shopFilters.filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFavorite={favoriteProductIds.has(product.id)}
                isInCart={cartProductIds.has(product.id)}
                isAddingToCart={addCartItem.isPending}
                isAddingFavorite={addFavoriteItem.isPending}
                onAddToCart={handleAddToCart}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
