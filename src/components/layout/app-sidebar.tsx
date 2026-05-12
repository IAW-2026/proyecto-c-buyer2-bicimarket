"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Store,
  ShoppingCart,
  Package,
  Heart,
  User,
  Bike,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBuyerCart } from "@/hooks/use-buyer";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/shop", label: "Tienda", icon: Store },
  { href: "/cart", label: "Carrito", icon: ShoppingCart },
  { href: "/orders", label: "Mis órdenes", icon: Package },
  { href: "/favorites", label: "Favoritos", icon: Heart },
  { href: "/profile", label: "Perfil", icon: User },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { data: cart } = useBuyerCart();
  const cartCount = cart?.itemCount ?? 0;

  return (
    <aside className="flex h-screen w-[185px] shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary">
          <Bike className="size-4 text-sidebar-primary-foreground" />
        </div>
        <span className="font-heading text-base font-semibold tracking-tight">
          BiciMarket
        </span>
      </div>

      <nav className="flex-1 px-3 py-2">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
          Comprar
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
              badge={item.href === "/cart" && cartCount > 0 ? cartCount : undefined}
            />
          ))}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border px-3 py-4 space-y-3">
        <div className="flex items-center gap-2 px-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium leading-tight">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-[10px] text-sidebar-foreground/50">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ redirectUrl: "/" })}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-3.5" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

type NavLinkProps = {
  item: NavItem;
  isActive: boolean;
  badge?: number;
};

function NavLink({ item, isActive, badge }: NavLinkProps) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="flex-1">{item.label}</span>
        {badge !== undefined && (
          <span className="flex size-5 items-center justify-center rounded-full bg-sidebar-primary-foreground/20 text-[10px] font-semibold text-sidebar-primary-foreground">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </Link>
    </li>
  );
}
