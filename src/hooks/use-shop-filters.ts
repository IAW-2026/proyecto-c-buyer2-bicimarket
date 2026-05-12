"use client";

import { useState, useMemo } from "react";
import type { Product } from "@/types/buyer";

type ShopFilters = {
  minPrice: number;
  maxPrice: number;
  onlyInStock: boolean;
  selectedSellers: string[];
};

const DEFAULT_FILTERS: ShopFilters = {
  minPrice: 0,
  maxPrice: 10_000_000,
  onlyInStock: false,
  selectedSellers: [],
};

export function useShopFilters(products: Product[] | undefined) {
  const [filters, setFilters] = useState<ShopFilters>(DEFAULT_FILTERS);

  const availableSellers = useMemo(() => {
    if (!products) return [];
    const sellers = new Map<string, { id: string; name: string; count: number }>();
    for (const p of products) {
      const id = p.sellerId ?? "unknown";
      const name = p.sellerName ?? "Vendedor";
      const current = sellers.get(id);
      sellers.set(id, { id, name, count: (current?.count ?? 0) + 1 });
    }
    return Array.from(sellers.values());
  }, [products]);

  const priceRange = useMemo(() => {
    if (!products || products.length === 0) return { min: 0, max: 10_000_000 };
    const prices = products.map((p) => p.price ?? 0);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const price = p.price ?? 0;
      if (price < filters.minPrice || price > filters.maxPrice) return false;
      if (filters.onlyInStock && !p.isActive) return false;
      if (
        filters.selectedSellers.length > 0 &&
        !filters.selectedSellers.includes(p.sellerId ?? "unknown")
      )
        return false;
      return true;
    });
  }, [products, filters]);

  function setOnlyInStock(value: boolean) {
    setFilters((prev) => ({ ...prev, onlyInStock: value }));
  }

  function toggleSeller(sellerId: string) {
    setFilters((prev) => ({
      ...prev,
      selectedSellers: prev.selectedSellers.includes(sellerId)
        ? prev.selectedSellers.filter((id) => id !== sellerId)
        : [...prev.selectedSellers, sellerId],
    }));
  }

  function setPriceRange(min: number, max: number) {
    setFilters((prev) => ({ ...prev, minPrice: min, maxPrice: max }));
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  return {
    filters,
    filtered,
    availableSellers,
    priceRange,
    setOnlyInStock,
    toggleSeller,
    setPriceRange,
    clearFilters,
  };
}
