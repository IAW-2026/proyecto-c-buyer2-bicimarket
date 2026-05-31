"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, MapPin } from "lucide-react";
import { useBuyerAddresses, useBuyerCart } from "@/hooks/use-buyer";
import { useCheckoutMutations } from "@/hooks/querys/checkout/useCheckoutMutations";
import { useCartStore } from "@/store/use-cart-store";
import { AddressSelector } from "@/components/checkout/address-selector";
import { SellerGroupPreview, groupCartItemsBySeller } from "@/components/checkout/seller-group-preview";
import { PriceDisplay } from "@/components/shared/price-display";
import { EmptyState } from "@/components/shared/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

const checkoutSchema = z.object({
  shippingAddressId: z.string().min(1, "Seleccioná una dirección"),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const { data: cart, isLoading: cartLoading } = useBuyerCart();
  const { data: addressesResult, isLoading: addressesLoading } = useBuyerAddresses();
  const addresses = addressesResult?.data;
  const { checkout } = useCheckoutMutations();
  const selectedAddressId = useCartStore((s) => s.selectedAddressId);
  const setSelectedAddressId = useCartStore((s) => s.setSelectedAddressId);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { shippingAddressId: selectedAddressId ?? "" },
  });

  useEffect(() => {
    if (selectedAddressId) form.setValue("shippingAddressId", selectedAddressId);
  }, [selectedAddressId, form]);

  const onSubmit = async (values: CheckoutFormValues) => {
    const result = await checkout.mutateAsync({
      shippingAddressId: values.shippingAddressId,
      returnUrl: `${window.location.origin}/orders`,
    });
    if (result?.paymentUrl) window.location.href = result.paymentUrl;
  };

  if (cartLoading || addressesLoading) return <CheckoutSkeleton />;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="px-6 py-8">
        <EmptyState
          icon={CreditCard}
          title="Carrito vacío"
          description="Necesitás productos en el carrito para hacer el checkout."
          action={<Link href="/shop" className={buttonVariants()}>Ir a la tienda</Link>}
        />
      </div>
    );
  }

  const sellerGroups = groupCartItemsBySeller(cart.items);
  // Misma fórmula que el mock de shipping-api.ts: $10k base + $4k por vendedor
  const n = sellerGroups.length;
  const grossCents = 1_000_000 + 400_000 * n;
  const discountPct = Math.min(0.05 * (n - 1), 0.2);
  const totalShipping = Math.round(grossCents * (1 - discountPct)) / 100;
  const selectedAddress = addresses?.find((a) => a.id === form.watch("shippingAddressId"));

  return (
    <div className="px-6 py-8">
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/cart" className="hover:text-foreground">Carrito</Link>
        <span>›</span>
        <span className="font-medium text-foreground">Checkout</span>
        <span>›</span>
        <span>Confirmación</span>
      </nav>

      <h1 className="font-heading mb-6 text-2xl font-bold tracking-tight">Checkout</h1>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Left column */}
          <div className="flex-1 space-y-6">
            {/* Address section */}
            <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
              <div>
                <h2 className="font-heading text-base font-semibold">Dirección de envío</h2>
                <p className="text-xs text-muted-foreground">
                  Elegí dónde querés recibir el pedido.
                </p>
              </div>

              {!addresses || addresses.length === 0 ? (
                <EmptyState
                  icon={MapPin}
                  title="Sin direcciones"
                  description="Agregá una dirección en tu perfil para continuar."
                  action={<Link href="/profile" className={buttonVariants({ variant: "outline", size: "sm" })}>Ir a perfil</Link>}
                  className="py-8"
                />
              ) : (
                <AddressSelector
                  addresses={addresses}
                  selectedId={form.watch("shippingAddressId")}
                  onSelect={(id) => {
                    form.setValue("shippingAddressId", id);
                    setSelectedAddressId(id);
                  }}
                  onAddNew={() => router.push("/profile")}
                />
              )}
              {form.formState.errors.shippingAddressId && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.shippingAddressId.message}
                </p>
              )}
            </div>

            {/* Order summary grouped by seller */}
            <div className="space-y-2">
              <h2 className="font-heading text-base font-semibold">Tu pedido</h2>
              {sellerGroups.map((group) => (
                <SellerGroupPreview key={group.sellerProfileId} group={group} />
              ))}
            </div>
          </div>

          {/* Right column — Total panel */}
          <div className="w-full lg:w-72 lg:shrink-0">
            <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
              <h2 className="font-heading text-base font-semibold">Total</h2>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal productos</span>
                  <PriceDisplay amount={cart.totalCents / 100} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de envíos</span>
                  <PriceDisplay amount={totalShipping} />
                </div>
              </div>

              <div className="border-t border-border/60 pt-3">
                <div className="flex justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total</span>
                  <PriceDisplay
                    amount={cart.totalCents / 100 + totalShipping}
                    className="text-2xl font-bold"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={checkout.isPending || !selectedAddress}
              >
                {checkout.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Procesando pago...
                  </>
                ) : (
                  <>
                    <CreditCard className="size-4" />
                    Confirmar y pagar
                  </>
                )}
              </Button>
              <p className="text-center text-[10px] text-muted-foreground">
                Serás redirigido a Mercado Pago para completar el pago de forma segura.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="px-6 py-8 space-y-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-8 w-32" />
      <div className="flex gap-6">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-48 w-72 rounded-xl" />
      </div>
    </div>
  );
}
