"use client";

import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/components/shared/price-display";
import type { useShopFilters } from "@/hooks/use-shop-filters";

type FilterPanelProps = {
  filters: ReturnType<typeof useShopFilters>;
};

export function FilterPanel({ filters }: FilterPanelProps) {
  const { onlyInStock, selectedSellers } = filters.filters;

  return (
    <aside className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Filtros</h3>
        <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground" onClick={filters.clearFilters}>
          Limpiar
        </Button>
      </div>

      {/* Price range */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Rango de precio</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatPrice(filters.priceRange.min)}</span>
          <span>{formatPrice(filters.priceRange.max)}</span>
        </div>
      </div>

      {/* Stock toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium">Solo con stock</p>
          <p className="text-[10px] text-muted-foreground">Ocultar agotados</p>
        </div>
        <Switch checked={onlyInStock} onCheckedChange={filters.setOnlyInStock} />
      </div>

      {/* Seller checkboxes */}
      {filters.availableSellers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Vendedor</p>
          <ul className="space-y-1.5">
            {filters.availableSellers.map((seller) => (
              <li key={seller.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={seller.id}
                    checked={selectedSellers.includes(seller.id)}
                    onCheckedChange={() => filters.toggleSeller(seller.id)}
                  />
                  <Label htmlFor={seller.id} className="cursor-pointer text-xs font-normal">
                    {seller.name}
                  </Label>
                </div>
                <span className="text-[10px] text-muted-foreground">{seller.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
