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
  Shield,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useBuyerCart } from "@/hooks/use-buyer";

type NavItem = { href: string; label: string; icon: React.ElementType };

const navItems: NavItem[] = [
  { href: "/shop", label: "Tienda", icon: Store },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cart", label: "Carrito", icon: ShoppingCart },
  { href: "/orders", label: "Mis órdenes", icon: Package },
  { href: "/favorites", label: "Favoritos", icon: Heart },
];

const adminNavItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: Shield },
  { href: "/admin/orders", label: "Órdenes", icon: Package },
  { href: "/admin/buyers", label: "Compradores", icon: Users },
  { href: "/admin/carts", label: "Carritos", icon: ShoppingCart },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { data: cart } = useBuyerCart();
  const cartCount = cart?.itemCount ?? 0;
  const isAdmin = !!user?.publicMetadata?.admin;
  const initials = (user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "");

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Comprar</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive =
                item.href === "/shop"
                  ? pathname === "/shop"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={isActive}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  {item.href === "/cart" && cartCount > 0 && (
                    <SidebarMenuBadge>{cartCount > 9 ? "9+" : cartCount}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarMenu>
              {adminNavItems.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="mt-auto flex flex-row " >
        <Link href="/profile" className="w-full flex flex-row items-center gap-3 rounded-md p-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground text-xs font-semibold">
            {initials}
          </div>
          <div className="grid flex-1 min-w-0 text-left text-sm leading-tight">
            <span className="truncate font-semibold">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="truncate text-xs text-sidebar-foreground/60">
              {user?.primaryEmailAddress?.emailAddress}
            </span>
          </div>
          </Link>
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className="shrink-0 rounded-md p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="size-4" />
          </button>
      </SidebarFooter>
    </Sidebar>
  );
}
