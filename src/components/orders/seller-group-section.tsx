import { Truck } from "lucide-react";
import { SellerGroupStatusBadge } from "@/components/shared/status-badge";
import { ProductImage } from "@/components/shared/product-image";
import { PriceDisplay } from "@/components/shared/price-display";
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
          <span className="font-semibold">{group.sellerName ?? "Vendedor"}</span>
          <SellerGroupStatusBadge status={group.status} />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Truck className="size-3.5" />
          <span>Envío: <PriceDisplay amount={group.shippingCost} /></span>
        </div>
      </div>

      <div className="divide-y divide-border/60">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-3">
            <ProductImage src={undefined} alt={item.title} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {item.quantity} × <PriceDisplay amount={item.unitPrice} />
              </p>
            </div>
            <PriceDisplay amount={item.subtotal} className="text-sm font-semibold" />
          </div>
        ))}
      </div>

      <div className="flex justify-end border-t border-border/60 px-4 py-2 text-xs text-muted-foreground">
        Costo de envío: <PriceDisplay amount={group.shippingCost} className="ml-1" />
      </div>
    </div>
  );
}
