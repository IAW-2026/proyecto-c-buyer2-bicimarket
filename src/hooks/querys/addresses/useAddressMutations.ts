"use client";

import { useApiMutation } from "@/hooks/querys/common/useApiMutation";
import {
  createAddress,
  deleteAddress,
  type CreateAddressBody,
} from "@/services/api/addresses";
import type { Address } from "@/types/buyer";

const ADDRESSES_KEY = ["buyer-addresses"];

export function useAddressMutations() {
  return {
    create: useApiMutation<Address, CreateAddressBody>({
      mutationFn: createAddress,
      invalidateKeys: [ADDRESSES_KEY],
      loadingMessage: "Guardando dirección...",
      successMessage: "Dirección guardada",
    }),

    remove: useApiMutation<void, string>({
      mutationFn: deleteAddress,
      invalidateKeys: [ADDRESSES_KEY],
      successMessage: "Dirección eliminada",
    }),
  };
}
