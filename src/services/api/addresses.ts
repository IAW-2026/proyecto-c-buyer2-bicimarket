import { api } from "@/lib/axios";
import { deepToCamelCase } from "@/lib/case-utils";
import type { Address } from "@/types/buyer";

export type CreateAddressBody = Omit<
  Address,
  "id" | "buyerProfileId" | "createdAt" | "updatedAt"
>;

export async function createAddress(payload: CreateAddressBody): Promise<Address> {
  const { data } = await api.post("/v1/buyer/addresses", {
    alias: payload.alias,
    street: payload.street,
    number: payload.number,
    apartment: payload.apartment,
    city: payload.city,
    province: payload.province,
    postal_code: payload.postalCode,
    country: payload.country,
    is_default: payload.isDefault,
  });
  return deepToCamelCase<Address>(data);
}

export async function deleteAddress(addressId: string): Promise<void> {
  await api.delete(`/v1/buyer/addresses/${addressId}`);
}
