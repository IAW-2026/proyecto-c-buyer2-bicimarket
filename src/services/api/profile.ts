import { api } from "@/lib/axios";
import { deepToCamelCase } from "@/lib/case-utils";
import type { BuyerProfile } from "@/types/buyer";

export async function updateBuyerProfile(
  payload: Partial<BuyerProfile>,
): Promise<BuyerProfile> {
  const body: Record<string, unknown> = {};
  if (payload.fullName !== undefined) body.full_name = payload.fullName;
  if (payload.phone !== undefined) body.phone = payload.phone;

  const { data } = await api.patch("/v1/buyer/profile", body);
  return deepToCamelCase<BuyerProfile>(data);
}
