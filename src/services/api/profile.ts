import { api } from "@/lib/axios";
import type { BuyerProfile } from "@/types/buyer";

export async function updateBuyerProfile(
  payload: Partial<BuyerProfile>,
): Promise<BuyerProfile> {
  const { data } = await api.patch<BuyerProfile>("/v1/buyer/profile", payload);
  return data;
}
