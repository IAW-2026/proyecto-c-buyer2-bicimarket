import { create } from "zustand";

type CartStore = {
  selectedAddressId: string | null;
  orderNote: string;
  setSelectedAddressId: (addressId: string | null) => void;
  setOrderNote: (note: string) => void;
  resetCartState: () => void;
};

export const useCartStore = create<CartStore>((set) => ({
  selectedAddressId: null,
  orderNote: "",
  setSelectedAddressId: (addressId) => set({ selectedAddressId: addressId }),
  setOrderNote: (note) => set({ orderNote: note }),
  resetCartState: () => set({ selectedAddressId: null, orderNote: "" }),
}));
