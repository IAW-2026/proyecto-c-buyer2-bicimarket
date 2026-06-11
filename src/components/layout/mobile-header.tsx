"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useBuyerCart } from "@/hooks/use-buyer";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function MobileHeader() {
  const { data: cart } = useBuyerCart();
  const cartCount = cart?.itemCount ?? 0;

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/95 px-3 py-2 backdrop-blur-md md:hidden">
      <SidebarTrigger />

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
