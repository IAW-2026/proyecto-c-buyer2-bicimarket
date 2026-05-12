import { ProductImage } from "@/components/shared/product-image";
import { PriceDisplay } from "@/components/shared/price-display";
import type { CartItem } from "@/types/buyer";

type SellerGroup = {
  sellerId: string;
  sellerName: string;
  items: CartItem[];
  shippingCost: number;
};

type SellerGroupPreviewProps = {
  group: SellerGroup;
};

export function SellerGroupPreview({ group }: SellerGroupPreviewProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-muted/30">
        <span className="text-sm font-semibold">{group.sellerName}</span>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {group.items.length} {group.items.length === 1 ? "item" : "items"}
          </span>
          <span className="text-xs text-muted-foreground">
            Envío: <PriceDisplay amount={group.shippingCost} />
          </span>
        </div>
      </div>
      <div className="divide-y divide-border/60">
        {group.items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-3">
            <ProductImage src={item.imageUrl} alt={item.title} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {item.quantity} × <PriceDisplay amount={item.unitPrice} />
              </p>
            </div>
            <PriceDisplay amount={item.subtotal} className="text-sm font-semibold" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function groupCartItemsBySeller(items: CartItem[]): SellerGroup[] {
  const map = new Map<string, SellerGroup>();
  for (const item of items) {
    const id = item.sellerId;
    if (!map.has(id)) {
      map.set(id, {
        sellerId: id,
        sellerName: item.sellerName ?? "Vendedor",
        items: [],
        shippingCost: 0,
      });
    }
    map.get(id)!.items.push(item);
  }
  return Array.from(map.values());
}
