"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, ShoppingCart, Package, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBuyerCart } from "@/hooks/use-buyer";

type TabItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

const tabs: TabItem[] = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/shop", label: "Tienda", icon: Store },
  { href: "/cart", label: "Carrito", icon: ShoppingCart },
  { href: "/orders", label: "Órdenes", icon: Package },
  { href: "/profile", label: "Perfil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data: cart } = useBuyerCart();
  const cartCount = cart?.itemCount ?? 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md md:hidden">
      <ul className="flex items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const isCart = tab.href === "/cart";

          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span className="relative">
                  <Icon className="size-5" />
                  {isCart && cartCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                      {cartCount > 9 ? "9+" : cartCount}
                    </span>
                  )}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
