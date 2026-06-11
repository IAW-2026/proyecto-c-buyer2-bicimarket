import { api } from "@/lib/axios";
import { deepToCamelCase } from "@/lib/case-utils";
import type { FavoriteItem } from "@/types/buyer";

export async function addFavoriteItem(payload: {
  productId: string;
}): Promise<FavoriteItem> {
  const { data } = await api.post("/v1/buyer/favorites", {
    product_id: payload.productId,
  });
  return deepToCamelCase<FavoriteItem>(data);
}

export async function removeFavoriteItem(favoriteId: string): Promise<void> {
  await api.delete(`/v1/buyer/favorites/${favoriteId}`);
}
