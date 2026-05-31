import { ProductImage } from "@/components/shared/product-image";
import { PriceDisplay } from "@/components/shared/price-display";
import type { CartItem } from "@/types/buyer";

type SellerGroup = {
  sellerProfileId: string;
  items: CartItem[];
};

type SellerGroupPreviewProps = {
  group: SellerGroup;
};

export function SellerGroupPreview({ group }: SellerGroupPreviewProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-muted/30">
        <span className="text-sm font-semibold text-muted-foreground">
          Vendedor {group.sellerProfileId.slice(-6)}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
          {group.items.length} {group.items.length === 1 ? "item" : "items"}
        </span>
      </div>
      <div className="divide-y divide-border/60">
        {group.items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-3">
            <ProductImage src={undefined} alt={item.productNameSnapshot} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm">{item.productNameSnapshot}</p>
              <p className="text-xs text-muted-foreground">
                {item.quantity} × <PriceDisplay amount={item.unitPriceCents / 100} />
              </p>
            </div>
            <PriceDisplay amount={(item.unitPriceCents * item.quantity) / 100} className="text-sm font-semibold" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function groupCartItemsBySeller(items: CartItem[]): SellerGroup[] {
  const map = new Map<string, SellerGroup>();
  for (const item of items) {
    const id = item.sellerProfileId;
    if (!map.has(id)) {
      map.set(id, { sellerProfileId: id, items: [] });
    }
    map.get(id)!.items.push(item);
  }
  return Array.from(map.values());
}
