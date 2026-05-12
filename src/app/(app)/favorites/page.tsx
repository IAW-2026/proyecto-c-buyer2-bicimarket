"use client";

import { Heart } from "lucide-react";
import { useFavoriteItems, useRemoveFavoriteItem } from "@/hooks/use-buyer";
import { FavoriteCard } from "@/components/favorites/favorite-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

export default function FavoritesPage() {
  const { data: favorites, isLoading } = useFavoriteItems();
  const removeFavorite = useRemoveFavoriteItem();

  if (isLoading) return <FavoritesSkeleton />;

  const isEmpty = !favorites || favorites.length === 0;

  return (
    <div className="px-6 py-8">
      <h1 className="font-heading mb-1 text-2xl font-bold tracking-tight">Mis favoritos</h1>
      {!isEmpty && (
        <p className="mb-6 text-xs text-muted-foreground">
          {favorites.length} producto{favorites.length !== 1 ? "s" : ""} guardados
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {favorites.map((item) => (
            <FavoriteCard
              key={item.id}
              item={item}
              onRemove={(id) => removeFavorite.mutate(id)}
              isRemoving={removeFavorite.isPending}
            />
          ))}
        </div>
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
