"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Product } from "@/types/buyer";
import { matchesCategory, matchesBikeType } from "@/lib/categories";

export function useShopFilters(products: Product[] | undefined) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchQuery = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const onlyInStock = searchParams.get("stock") === "1";
  const selectedSellers = searchParams.get("sellers")?.split(",").filter(Boolean) ?? [];
  const minPrice = Number(searchParams.get("minPrice") ?? 0);
  const maxPrice = Number(searchParams.get("maxPrice") ?? 10_000_000);
  const bikeType = searchParams.get("bikeType") ?? "";

  const filters = { searchQuery, category, onlyInStock, selectedSellers, minPrice, maxPrice, bikeType };

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
  }

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
      if (price < minPrice || price > maxPrice) return false;
      if (onlyInStock && !p.isActive) return false;
      if (selectedSellers.length > 0 && !selectedSellers.includes(p.sellerId ?? "unknown"))
        return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const haystack = `${p.title} ${p.description ?? ""} ${p.sellerName ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (category && !matchesCategory(p, category)) return false;
      if (category === "bicicletas" && bikeType && !matchesBikeType(p, bikeType)) return false;
      return true;
    });
  }, [products, minPrice, maxPrice, onlyInStock, selectedSellers, searchQuery, category, bikeType]);

  function setSearchQuery(value: string) {
    updateParams({ q: value || null });
  }

  function setCategory(value: string) {
    updateParams({ category: value || null, bikeType: null });
  }

  function setBikeType(value: string) {
    updateParams({ bikeType: value || null });
  }

  function setOnlyInStock(value: boolean) {
    updateParams({ stock: value ? "1" : null });
  }

  function toggleSeller(sellerId: string) {
    const next = selectedSellers.includes(sellerId)
      ? selectedSellers.filter((id) => id !== sellerId)
      : [...selectedSellers, sellerId];
    updateParams({ sellers: next.length ? next.join(",") : null });
  }

  function setPriceRange(min: number, max: number) {
    updateParams({
      minPrice: min > priceRange.min ? String(min) : null,
      maxPrice: max < priceRange.max ? String(max) : null,
    });
  }

  function clearFilters() {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  return {
    filters,
    filtered,
    availableSellers,
    priceRange,
    setOnlyInStock,
    toggleSeller,
    setPriceRange,
    setSearchQuery,
    setCategory,
    setBikeType,
    clearFilters,
  };
}
