import { api } from "@/lib/axios";
import type { FavoriteItem } from "@/types/buyer";

export async function addFavoriteItem(payload: {
  productId: string;
}): Promise<FavoriteItem> {
  const { data } = await api.post<FavoriteItem>("/v1/buyer/favorites", payload);
  return data;
}

export async function removeFavoriteItem(favoriteId: string): Promise<void> {
  await api.delete(`/v1/buyer/favorites/${favoriteId}`);
}
