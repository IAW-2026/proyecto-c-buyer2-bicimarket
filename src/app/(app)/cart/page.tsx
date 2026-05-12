"use client";

import { ShoppingCart } from "lucide-react";
import { useBuyerCart, useRemoveCartItem, useUpdateCartItem } from "@/hooks/use-buyer";
import { CartItemRow } from "@/components/cart/cart-item-row";
import { CartSummaryPanel } from "@/components/cart/cart-summary-panel";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

export default function CartPage() {
  const { data: cart, isLoading } = useBuyerCart();
  const updateCartItem = useUpdateCartItem();
  const removeCartItem = useRemoveCartItem();

  const isMutating = updateCartItem.isPending || removeCartItem.isPending;

  if (isLoading) return <CartSkeleton />;

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <div className="px-6 py-8">
      <h1 className="font-heading mb-1 text-2xl font-bold tracking-tight">Mi carrito</h1>
      {!isEmpty && (
        <p className="mb-6 text-xs text-muted-foreground">
          {cart.itemCount} producto{cart.itemCount !== 1 ? "s" : ""} ·{" "}
          {new Set(cart.items.map((i) => i.sellerId)).size} vendedor
          {new Set(cart.items.map((i) => i.sellerId)).size !== 1 ? "es" : ""}
        </p>
      )}

      {isEmpty ? (
        <EmptyState
          icon={ShoppingCart}
          title="Tu carrito está vacío"
          description="Agregá productos desde la tienda para empezar tu compra."
          action={
            <Link href="/shop" className={buttonVariants()}>
              Ir a la tienda
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex flex-1 flex-col gap-2">
            {cart.items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                isUpdating={isMutating}
                onIncrement={() =>
                  updateCartItem.mutate({ itemId: item.id, quantity: item.quantity + 1 })
                }
                onDecrement={() =>
                  updateCartItem.mutate({ itemId: item.id, quantity: Math.max(1, item.quantity - 1) })
                }
                onRemove={() => removeCartItem.mutate(item.id)}
              />
            ))}
          </div>

          <div className="w-full lg:w-72 lg:shrink-0">
            <CartSummaryPanel cart={cart} />
          </div>
        </div>
      )}
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="px-6 py-8 space-y-3">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-32" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}
