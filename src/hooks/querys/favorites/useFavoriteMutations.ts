"use client";

import { useApiMutation } from "@/hooks/querys/common/useApiMutation";
import { addFavoriteItem, removeFavoriteItem } from "@/services/api/favorites";
import type { FavoriteItem } from "@/types/buyer";

const FAVORITES_KEY = ["favorite-items"];

export function useFavoriteMutations() {
  return {
    addItem: useApiMutation<FavoriteItem, { productId: string }>({
      mutationFn: addFavoriteItem,
      invalidateKeys: [FAVORITES_KEY],
      loadingMessage: "Guardando en favoritos...",
      successMessage: "Agregado a favoritos",
    }),

    removeItem: useApiMutation<void, string>({
      mutationFn: removeFavoriteItem,
      invalidateKeys: [FAVORITES_KEY],
      loadingMessage: "Quitando de favoritos...",
      successMessage: "Eliminado de favoritos",
    }),
  };
}
