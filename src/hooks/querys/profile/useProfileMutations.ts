"use client";

import { useApiMutation } from "@/hooks/querys/common/useApiMutation";
import { updateBuyerProfile } from "@/services/api/profile";
import type { BuyerProfile } from "@/types/buyer";

const PROFILE_KEY = ["buyer-profile"];

export function useProfileMutations() {
  return {
    update: useApiMutation<BuyerProfile, Partial<BuyerProfile>>({
      mutationFn: updateBuyerProfile,
      invalidateKeys: [PROFILE_KEY],
      loadingMessage: "Guardando cambios...",
      successMessage: "Perfil actualizado correctamente",
    }),
  };
}
