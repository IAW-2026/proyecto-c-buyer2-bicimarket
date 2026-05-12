import Link from "next/link";
import { ChevronRight, Store, ShoppingCart, Package } from "lucide-react";
import { useDashboardData } from "@/hooks/use-dashboard";

type ActionItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string | ((data: ReturnType<typeof useDashboardData>) => string);
};

const actions: ActionItem[] = [
  {
    href: "/shop",
    icon: Store,
    label: "Ir a la tienda",
    description: "Explorá el catálogo",
  },
  {
    href: "/cart",
    icon: ShoppingCart,
    label: "Ver mi carrito",
    description: (d) =>
      d.cartItemCount > 0 ? `${d.cartItemCount} productos esperando` : "Carrito vacío",
  },
  {
    href: "/orders",
    icon: Package,
    label: "Mis órdenes",
    description: (d) =>
      d.ordersTotal > 0 ? `${d.ordersTotal} pedido${d.ordersTotal !== 1 ? "s" : ""}` : "Sin pedidos aún",
  },
];

export function QuickActions() {
  const data = useDashboardData();

  return (
    <div>
      <h2 className="mb-3 font-heading text-sm font-semibold">Acciones rápidas</h2>
      <div className="grid gap-2 sm:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          const description =
            typeof action.description === "function"
              ? action.description(data)
              : action.description;

          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="size-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{action.label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
