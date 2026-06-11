"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { LayoutDashboard, Users, Package, ShoppingCart, Bike, LogOut, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Órdenes", icon: Package },
  { href: "/admin/buyers", label: "Compradores", icon: Users },
  { href: "/admin/carts", label: "Carritos", icon: ShoppingCart },
];

export function AdminHeader() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user } = useUser();

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b border-border/40 bg-background px-6">
      <div className="flex items-center gap-2 mr-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary">
          <Bike className="size-4 text-sidebar-primary-foreground" />
        </div>
        <span className="font-heading text-sm font-semibold tracking-tight">BiciMarket</span>
        <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 ml-1">Admin</span>
      </div>

      <nav className="flex items-center gap-1 flex-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Volver a la app
        </Link>
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="size-3.5" />
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
