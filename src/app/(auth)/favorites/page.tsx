"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useFavoriteItems, useProducts } from "@/hooks/use-buyer";
import { useFavoriteMutations } from "@/hooks/querys/favorites/useFavoriteMutations";
import { FavoriteCard } from "@/components/favorites/favorite-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

export default function FavoritesPage() {
  const [page, setPage] = useState(1);
  const { data: result, isLoading } = useFavoriteItems(page);
  const { data: products } = useProducts();
  const { removeItem: removeFavorite } = useFavoriteMutations();

  const favorites = result?.data ?? [];
  const pagination = result?.pagination;

  if (isLoading) return <FavoritesSkeleton />;

  const isEmpty = favorites.length === 0;

  return (
    <div className="px-6 py-8">
      <h1 className="font-heading mb-1 text-2xl font-bold tracking-tight">Mis favoritos</h1>
      {!isEmpty && (
        <p className="mb-6 text-xs text-muted-foreground">
          {pagination?.total ?? favorites.length} producto{(pagination?.total ?? favorites.length) !== 1 ? "s" : ""} guardados
        </p>
      )}

      {isEmpty ? (
        <EmptyState
          icon={Heart}
          title="Sin favoritos"
          description="Guardá productos que te interesan para encontrarlos rápido."
          action={
            <Link href="/shop" className={buttonVariants()}>
              Explorar tienda
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {favorites.map((item) => (
              <FavoriteCard
                key={item.id}
                item={item}
                product={products?.find((p) => p.id === item.productId)}
                onRemove={(id) => removeFavorite.mutate(id)}
                isRemoving={removeFavorite.isPending}
              />
            ))}
          </div>

          {pagination && (
            <PaginationControls
              page={page}
              total={pagination.total}
              limit={pagination.limit}
              onChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="mt-8"
            />
          )}
        </>
      )}
    </div>
  );
}

function FavoritesSkeleton() {
  return (
    <div className="px-6 py-8 space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-32" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
