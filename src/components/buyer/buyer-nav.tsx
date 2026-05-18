"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";

const links = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/shop", label: "Tienda" },
  { href: "/cart", label: "Carrito" },
  { href: "/orders", label: "Mis Pedidos" },
  { href: "/profile", label: "Perfil" },
];

export function BuyerNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-md">
      <div className="container mx-auto flex flex-wrap items-center gap-2 px-6 py-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={buttonVariants({
              variant: pathname === link.href ? "secondary" : "outline",
              size: "sm",
              className: "min-w-[120px] text-sm",
            })}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
