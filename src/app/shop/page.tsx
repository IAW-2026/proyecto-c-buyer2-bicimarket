"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Store, SlidersHorizontal } from "lucide-react";
import { useProducts, useFavoriteItems, useBuyerCart } from "@/hooks/use-buyer";
import { useCartMutations } from "@/hooks/querys/cart/useCartMutations";
import { useFavoriteMutations } from "@/hooks/querys/favorites/useFavoriteMutations";
import { useShopFilters } from "@/hooks/use-shop-filters";
import { FilterPanel } from "@/components/shop/filter-panel";
import { ProductCard } from "@/components/shop/product-card";
import { ProductGridSkeleton } from "@/components/shop/product-grid-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationControls } from "@/components/shared/pagination-controls";
import type { Product } from "@/types/buyer";

function ShopContent() {
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const category = searchParams.get("category") ?? "";

  const { data: productsResult, isLoading } = useProducts(page, category);
  const { data: favoritesResult } = useFavoriteItems();
  const favorites = favoritesResult?.data;
  const { data: cart } = useBuyerCart();
  const { addItem: addCartItem, removeItem: removeCartItem } = useCartMutations();
  const { addItem: addFavoriteItem, removeItem: removeFavoriteItem } = useFavoriteMutations();
  const shopFilters = useShopFilters(productsResult?.data);

  const pagination = productsResult?.pagination;
  const favoriteProductIds = new Set(favorites?.map((f) => f.productId) ?? []);
  const cartProductIds = new Set(cart?.items.map((i) => i.productId) ?? []);

  async function handleAddToCart(product: Product) {
    await addCartItem.mutateAsync({
      productId: product.id,
      sellerProfileId: product.sellerId ?? "unknown",
      productNameSnapshot: product.title,
      unitPriceCents: product.priceCents ?? 0,
      quantity: 1,
      weightGramsSnapshot: product.weightGrams ?? 0,
    });
  }

  async function handleRemoveFromCart(product: Product) {
    const cartItem = cart?.items.find((i) => i.productId === product.id);
    if (cartItem) await removeCartItem.mutateAsync(cartItem.id);
  }

  async function handleToggleFavorite(product: Product) {
    const existing = favorites?.find((f) => f.productId === product.id);
    if (existing) {
      await removeFavoriteItem.mutateAsync(existing.id);
    } else {
      await addFavoriteItem.mutateAsync({ productId: product.id });
    }
  }

  const activeCategory = shopFilters.filters.category;
  const activeSearch = shopFilters.filters.searchQuery;

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      {/* Filter panel */}
      <aside className="w-full border-b border-border/60 px-6 py-5 lg:sticky lg:top-[52px] lg:self-start lg:max-h-[calc(100vh-52px)] lg:overflow-y-auto lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r lg:py-8">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Filtros</h2>
        </div>
        <FilterPanel filters={shopFilters} />
      </aside>

      {/* Main grid */}
      <div className="flex-1 px-6 py-8">
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {activeCategory
              ? shopFilters.availableSellers.length > 0
                ? activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)
                : "Tienda"
              : "Tienda"}
          </h1>
          {!isLoading && pagination && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {(() => {
                const hasClientFilters = !!(
                  shopFilters.filters.searchQuery ||
                  shopFilters.filters.onlyInStock ||
                  shopFilters.filters.selectedSellers.length > 0 ||
                  shopFilters.filters.bikeType ||
                  searchParams.get("minPrice") ||
                  searchParams.get("maxPrice")
                );
                const count = hasClientFilters ? shopFilters.filtered.length : pagination.total;
                return <>{count} {count === 1 ? "producto" : "productos"}</>;
              })()}
              {activeSearch && (
                <span> para &ldquo;{activeSearch}&rdquo;</span>
              )}
            </p>
          )}
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {shopFilters.filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFavorite={favoriteProductIds.has(product.id)}
                isInCart={cartProductIds.has(product.id)}
                isAddingToCart={addCartItem.isPending}
                isRemovingFromCart={removeCartItem.isPending}
                isAddingFavorite={
                  addFavoriteItem.isPending || removeFavoriteItem.isPending
                }
                onAddToCart={handleAddToCart}
                onRemoveFromCart={handleRemoveFromCart}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}

        {pagination && (
          <PaginationControls
            page={page}
            total={pagination.total}
            limit={pagination.limit}
            onChange={shopFilters.setPage}
            className="mt-8"
          />
        )}
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton />}>
      <ShopContent />
    </Suspense>
  );
}
