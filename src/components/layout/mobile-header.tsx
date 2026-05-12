"use client";

import Link from "next/link";
import { ShoppingCart, Bike } from "lucide-react";
import { useBuyerCart } from "@/hooks/use-buyer";

export function MobileHeader() {
  const { data: cart } = useBuyerCart();
  const cartCount = cart?.itemCount ?? 0;

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur-md md:hidden">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary">
          <Bike className="size-4 text-primary-foreground" />
        </div>
        <span className="font-heading text-base font-semibold tracking-tight">
          BiciMarket
        </span>
      </div>

      <Link href="/cart" className="relative p-1">
        <ShoppingCart className="size-5 text-foreground" />
        {cartCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {cartCount > 9 ? "9+" : cartCount}
          </span>
        )}
      </Link>
    </header>
  );
}
