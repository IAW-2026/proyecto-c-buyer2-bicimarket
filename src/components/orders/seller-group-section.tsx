import { ProductImage } from "@/components/shared/product-image";
import { PriceDisplay } from "@/components/shared/price-display";
import { SellerGroupStatusBadge } from "@/components/shared/status-badge";
import type { OrderSellerGroup, OrderItem } from "@/types/buyer";

type SellerGroupSectionProps = {
  group: OrderSellerGroup;
  items: OrderItem[];
  trackingNumber?: string;
};

export function SellerGroupSection({ group, items }: SellerGroupSectionProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-muted-foreground">Vendedor {group.sellerProfileId.slice(-6)}</span>
        </div>
        <SellerGroupStatusBadge status={group.status} />
      </div>

      <div className="divide-y divide-border/60">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-3">
            <ProductImage src={undefined} alt={item.productNameSnapshot} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">{item.productNameSnapshot}</p>
              <p className="text-xs text-muted-foreground">
                {item.quantity} × <PriceDisplay amount={item.unitPriceCents} />
              </p>
            </div>
            <PriceDisplay amount={item.unitPriceCents * item.quantity} className="text-sm font-semibold" />
          </div>
        ))}
      </div>

    </div>
  );
}
