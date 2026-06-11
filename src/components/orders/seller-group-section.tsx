import { ExternalLink } from "lucide-react";
import { ProductImage } from "@/components/shared/product-image";
import { PriceDisplay } from "@/components/shared/price-display";
import { SellerGroupStatusBadge } from "@/components/shared/status-badge";
import type { OrderSellerGroup, OrderItem } from "@/types/buyer";

type SellerGroupSectionProps = {
  group: OrderSellerGroup;
  items: OrderItem[];
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

      {group.trackingNumber && (
        <div className="border-t border-border/60 px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Código de seguimiento</p>
            <p className="text-sm font-mono font-medium">{group.trackingNumber}</p>
          </div>
          {group.trackingUrl && (
            <a
              href={group.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline shrink-0"
            >
              Rastrear envío
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
