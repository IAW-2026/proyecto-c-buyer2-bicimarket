"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Bike, Search, Heart, Package, ShoppingCart, LayoutDashboard, Users } from "lucide-react";
import { UserToggle } from "@/components/header/user-toggle";
import { useRole } from "@/hooks/use-role";
import { HEADER_CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/shop", label: "Tienda" },
  { href: "/shop?ofertas=true", label: "Ofertas" },
  { href: "/#vendedores", label: "Vendedores" },
];

const ADMIN_NAV_LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Órdenes", icon: Package },
  { href: "/admin/buyers", label: "Compradores", icon: Users },
  { href: "/admin/carts", label: "Carritos", icon: ShoppingCart },
];

function SearchForm() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    if (pathname.startsWith("/shop")) {
      setSearch(searchParams.get("q") ?? "");
    } else {
      setSearch("");
    }
  }, [pathname, searchParams]);

  function handleSearch(e: { preventDefault(): void }) {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  }

  return (
    <form onSubmit={handleSearch} className="mx-auto flex-1 lg:max-w-xl">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar bicicletas, cubiertas, cascos..."
          className="w-full rounded-full border border-border bg-muted/50 py-2 pl-9 pr-4 text-sm outline-none transition-colors focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary/30"
        />
      </div>
    </form>
  );
}

export function ShopHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const role = useRole();

  const isShopRoute =
    pathname === "/" || pathname === "/shop" || pathname.startsWith("/shop/");

  const showIcons =
    isShopRoute ||
    pathname === "/favorites" ||
    pathname === "/orders" ||
    pathname === "/cart";

  const showCategories = pathname === "/" || pathname === "/shop";

  function handleIconNav(href: string) {
    router.push(role === "public" ? "/sign-in" : href);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-md">
      {/* ── main bar ── */}
      <div className="mx-auto flex max-w-screen-2xl items-center gap-3 px-6 py-3">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
            <Bike className="size-3.5 text-primary-foreground" />
          </div>
          <span className="font-heading text-base font-semibold tracking-tight">BiciMarket</span>
        </Link>

        {/* Nav links — desktop only */}
        <nav className="ml-2 hidden items-center gap-0.5 md:flex">
          {pathname.startsWith("/admin")
            ? ADMIN_NAV_LINKS.map((link) => {
                const Icon = link.icon;
                const isActive =
                  link.href === "/admin"
                    ? pathname === "/admin"
                    : pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                      isActive ? "font-medium text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {link.label}
                  </Link>
                );
              })
            : NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                    pathname === link.href
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))}
        </nav>

        {/* Search bar — visible for all buyer routes, hidden in admin */}
        {!pathname.startsWith("/admin") && (
          <Suspense fallback={<div className="mx-auto flex-1 lg:max-w-xl h-9" />}>
            <SearchForm />
          </Suspense>
        )}

        {/* Right actions */}
        <div className={cn("flex items-center gap-1", pathname.startsWith("/admin") && "ml-auto")}>
          {showIcons && (
            <>
              <button
                onClick={() => handleIconNav("/favorites")}
                title="Favoritos"
                className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Heart className="size-4" />
              </button>
              <button
                onClick={() => handleIconNav("/orders")}
                title="Mis órdenes"
                className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Package className="size-4" />
              </button>
              <button
                onClick={() => handleIconNav("/cart")}
                title="Carrito"
                className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <ShoppingCart className="size-4" />
              </button>
            </>
          )}
          <UserToggle />
        </div>
      </div>

      {/* ── category strip ── */}
      {showCategories && (
        <div className="border-t border-border/40">
          <div className="mx-auto max-w-screen-2xl">
            <div className="flex items-center overflow-x-auto px-6 scrollbar-hide">
              {HEADER_CATEGORIES.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/shop?category=${cat.id}`}
                  className="shrink-0 whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
