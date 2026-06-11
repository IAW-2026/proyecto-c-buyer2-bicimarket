"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, ShoppingCart, Package, ArrowLeft, Truck, ShieldCheck, RefreshCw, Trash2 } from "lucide-react";
import { useProduct, useFavoriteItems, useBuyerCart } from "@/hooks/use-buyer";
import { useCartMutations } from "@/hooks/querys/cart/useCartMutations";
import { useFavoriteMutations } from "@/hooks/querys/favorites/useFavoriteMutations";
import { ProductImage } from "@/components/shared/product-image";
import { PriceDisplay } from "@/components/shared/price-display";
import { EmptyState } from "@/components/shared/empty-state";
import { Can } from "@/components/shared/can";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  params: Promise<{ productId: string }>;
};

const GUARANTEES = [
  { Icon: Truck, label: "Envío hoy si comprás antes de las 14 hs" },
  { Icon: ShieldCheck, label: "Compra protegida — si no llega, te devolvemos la plata" },
  { Icon: RefreshCw, label: "Cambios y devoluciones hasta 30 días" },
];

export default function ProductDetailPage({ params }: Props) {
  const { productId } = use(params);
  const router = useRouter();
  const { data: product, isLoading, error } = useProduct(productId);
  const { data: favoritesResult } = useFavoriteItems();
  const favorites = favoritesResult?.data;
  const { data: cart } = useBuyerCart();
  const { addItem: addCartItem, removeItem: removeCartItem } = useCartMutations();
  const { addItem: addFavoriteItem, removeItem: removeFavoriteItem } = useFavoriteMutations();

  if (isLoading) return <ProductDetailSkeleton />;

  if (error || !product) {
    return (
      <div className="px-6 py-16">
        <EmptyState
          icon={Package}
          title="Producto no encontrado"
          description="No pudimos encontrar este producto."
          action={
            <Link href="/shop" className={buttonVariants({ variant: "outline" })}>
              Volver a la tienda
            </Link>
          }
        />
      </div>
    );
  }

  const isFavorite = favorites?.some((f) => f.productId === product.id) ?? false;
  const isInCart = cart?.items.some((i) => i.productId === product.id) ?? false;
  const existingFavorite = favorites?.find((f) => f.productId === product.id);

  async function handleRemoveFromCart() {
    const cartItem = cart?.items.find((i) => i.productId === product!.id);
    if (cartItem) await removeCartItem.mutateAsync(cartItem.id);
  }

  async function handleAddToCart() {
    await addCartItem.mutateAsync({
      productId: product!.id,
      sellerProfileId: product!.sellerId ?? "unknown",
      quantity: 1,
    });
  }

  async function handleToggleFavorite() {
    if (existingFavorite) {
      await removeFavoriteItem.mutateAsync(existingFavorite.id);
    } else {
      await addFavoriteItem.mutateAsync({ productId: product!.id });
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Breadcrumb */}
      <motion.nav
        className="mb-6 flex items-center gap-2 text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          href="/shop"
          className="flex items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Tienda
        </Link>
        <span>/</span>
        <span className="line-clamp-1 font-medium text-foreground">{product.title}</span>
      </motion.nav>

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-16">
        {/* Image */}
        <motion.div
          className="w-full lg:w-[480px] lg:shrink-0"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/20">
            <ProductImage
              src={product.imageUrl}
              alt={product.title}
              size="lg"
              className="w-full rounded-none"
            />
          </div>
        </motion.div>

        {/* Info */}
        <motion.div
          className="flex flex-1 flex-col gap-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {product.sellerName && (
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              {product.sellerName}
            </p>
          )}

          <div>
            <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">
              {product.title}
            </h1>
            {!product.isActive && (
              <span className="mt-2 inline-block rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                Sin stock
              </span>
            )}
          </div>

          <PriceDisplay amount={product.priceCents ?? 0} className="font-heading text-4xl font-bold" />

          {product.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            {product.isActive &&
              (isInCart ? (
                <>
                  <Button variant="outline" disabled className="gap-2 rounded-full px-6 border-primary text-primary">
                    <ShoppingCart className="size-4" />
                    En el carrito
                  </Button>
                  <button
                    onClick={handleRemoveFromCart}
                    disabled={removeCartItem.isPending}
                    className="flex size-11 items-center justify-center rounded-full border border-border bg-card transition-colors hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    title="Quitar del carrito"
                  >
                    <Trash2 className="size-5 text-muted-foreground" />
                  </button>
                </>
              ) : (
                <Can action="cart.add">
                  {(granted) => (
                    <Button
                      onClick={granted ? handleAddToCart : () => router.push("/sign-in")}
                      disabled={granted && addCartItem.isPending}
                      className="gap-2 rounded-full px-6"
                    >
                      <ShoppingCart className="size-4" />
                      {addCartItem.isPending ? "Agregando…" : "Agregar al carrito"}
                    </Button>
                  )}
                </Can>
              ))}

            <Can action="favorites.toggle">
              {(granted) => (
                <button
                  onClick={granted ? handleToggleFavorite : () => router.push("/sign-in")}
                  disabled={granted && (addFavoriteItem.isPending || removeFavoriteItem.isPending)}
                  className="flex size-11 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-accent"
                  title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                >
                  <Heart
                    className={`size-5 transition-colors ${
                      isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
                    }`}
                  />
                </button>
              )}
            </Can>
          </div>

          {/* Guarantees */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <ul className="space-y-3">
              {GUARANTEES.map(({ Icon, label }) => (
                <li key={label} className="flex items-center gap-3 text-sm">
                  <Icon className="size-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Skeleton className="mb-6 h-4 w-48" />
      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-16">
        <Skeleton className="aspect-square w-full rounded-2xl lg:w-[480px]" />
        <div className="flex flex-1 flex-col gap-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-12 w-36" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-11 w-44 rounded-full" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
