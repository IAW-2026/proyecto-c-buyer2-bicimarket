import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { PriceDisplay } from "@/components/shared/price-display";
import type { Cart } from "@/types/buyer";

type CartSummaryPanelProps = {
  cart: Cart;
};

export function CartSummaryPanel({ cart }: CartSummaryPanelProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4">
      <h2 className="font-heading text-base font-semibold">Resumen</h2>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Subtotal ({cart.itemCount} {cart.itemCount === 1 ? "item" : "items"})
        </span>
        <PriceDisplay amount={cart.totalCents} />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Envío</span>
        <span className="text-xs text-muted-foreground">Se calcula en el checkout</span>
      </div>

      <div className="border-t border-border/60 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Total estimado</span>
          <PriceDisplay amount={cart.totalCents} className="text-xl font-bold" />
        </div>
      </div>

      <Link
        href="/checkout"
        className={buttonVariants({ className: "w-full" })}
      >
        Continuar al checkout
      </Link>
      <Link
        href="/shop"
        className={buttonVariants({ variant: "ghost", className: "w-full text-sm" })}
      >
        Seguir comprando
      </Link>
    </div>
  );
}
