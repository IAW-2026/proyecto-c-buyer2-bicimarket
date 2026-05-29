import { api } from "@/lib/axios";
import type { Address } from "@/types/buyer";

export type CreateAddressBody = Omit<
  Address,
  "id" | "buyerProfileId" | "createdAt" | "updatedAt"
>;

export async function createAddress(payload: CreateAddressBody): Promise<Address> {
  const { data } = await api.post<Address>("/v1/buyer/addresses", payload);
  return data;
}

export async function deleteAddress(addressId: string): Promise<void> {
  await api.delete(`/v1/buyer/addresses/${addressId}`);
}
