"use client";

import { useState } from "react";
import { Plus, Trash2, MapPin } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useBuyerAddresses } from "@/hooks/use-buyer";
import { useAddressMutations } from "@/hooks/querys/addresses/useAddressMutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";

const addressSchema = z.object({
  alias: z.string().min(1, "Nombre requerido"),
  street: z.string().min(1, "Calle requerida"),
  number: z.string().min(1, "Número requerido"),
  apartment: z.string().optional(),
  city: z.string().min(1, "Ciudad requerida"),
  province: z.string().optional(),
  postalCode: z.string().min(1, "Código postal requerido"),
  country: z.string().min(1),
});

type AddressFormValues = z.infer<typeof addressSchema>;

export function AddressList() {
  const [page, setPage] = useState(1);
  const { data: result, isLoading } = useBuyerAddresses(page);
  const { create: createAddress, remove: deleteAddress } = useAddressMutations();
  const [showForm, setShowForm] = useState(false);

  const addresses = result?.data ?? [];
  const pagination = result?.pagination;

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: { alias: "", street: "", number: "", city: "", postalCode: "", country: "AR" },
  });

  const onSubmit = async (values: AddressFormValues) => {
    await createAddress.mutateAsync({ ...values, province: values.province ?? "", isDefault: false });
    form.reset({ country: "AR" });
    setShowForm(false);
  };

  if (isLoading) return <Skeleton className="h-32 w-full rounded-xl" />;

  return (
    <div className="space-y-3">
      {addresses.length === 0 && !showForm && (
        <EmptyState
          icon={MapPin}
          title="Sin direcciones"
          description="Agregá una dirección para poder hacer el checkout."
        />
      )}

      {addresses.map((address) => (
        <div
          key={address.id}
          className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
        >
          <div>
            <p className="text-sm font-semibold">{address.alias}</p>
            <p className="text-xs text-muted-foreground">
              {address.street} {address.number}
              {address.apartment ? `, ${address.apartment}` : ""}
              {" · "}{address.city}
              {address.province ? `, ${address.province}` : ""} · CP {address.postalCode}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => deleteAddress.mutate(address.id)}
            disabled={deleteAddress.isPending}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}

      {pagination && pagination.total > pagination.limit && (
        <PaginationControls
          page={page}
          total={pagination.total}
          limit={pagination.limit}
          onChange={setPage}
          className="pt-1"
        />
      )}

      {showForm && (
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="rounded-xl border border-border/60 bg-card p-4 space-y-3"
        >
          <p className="text-sm font-semibold">Nueva dirección</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label>Nombre (ej: Casa, Trabajo)</Label>
              <Input placeholder="Casa" {...form.register("alias")} />
            </div>
            <div className="grid gap-1">
              <Label>Calle</Label>
              <Input placeholder="Av. Corrientes" {...form.register("street")} />
            </div>
            <div className="grid gap-1">
              <Label>Número</Label>
              <Input placeholder="1234" {...form.register("number")} />
            </div>
            <div className="grid gap-1">
              <Label>Piso / Depto (opcional)</Label>
              <Input placeholder="3B" {...form.register("apartment")} />
            </div>
            <div className="grid gap-1">
              <Label>Ciudad</Label>
              <Input placeholder="Buenos Aires" {...form.register("city")} />
            </div>
            <div className="grid gap-1">
              <Label>Provincia</Label>
              <Input placeholder="Buenos Aires" {...form.register("province")} />
            </div>
            <div className="grid gap-1">
              <Label>Código postal</Label>
              <Input placeholder="1043" {...form.register("postalCode")} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={createAddress.isPending}>
              {createAddress.isPending ? "Guardando..." : "Guardar dirección"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {!showForm && (
        <Button variant="ghost" className="gap-1.5 text-primary" onClick={() => setShowForm(true)}>
          <Plus className="size-4" />
          Agregar nueva dirección
        </Button>
      )}
    </div>
  );
}
