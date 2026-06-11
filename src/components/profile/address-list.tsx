"use client";

import { useState, useMemo, useRef } from "react";
import { Plus, Trash2, MapPin, ChevronsUpDown, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useBuyerAddresses, usePostalCodes } from "@/hooks/use-buyer";
import type { PostalCodeEntry } from "@/hooks/use-buyer";
import { useAddressMutations } from "@/hooks/querys/addresses/useAddressMutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

interface PostalCodePickerProps {
  postalCodes: PostalCodeEntry[];
  value: string;
  onChange: (entry: PostalCodeEntry | null) => void;
}

function PostalCodePicker({ postalCodes, value, onChange }: PostalCodePickerProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return postalCodes.slice(0, 20);
    return postalCodes
      .filter(
        (pc) =>
          pc.cp.toLowerCase().includes(q) ||
          pc.city.toLowerCase().includes(q) ||
          pc.province.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [postalCodes, query]);

  const handleSelect = (pc: PostalCodeEntry) => {
    setQuery(`${pc.cp} — ${pc.city}, ${pc.province}`);
    setOpen(false);
    onChange(pc);
  };

  const handleClear = () => {
    setQuery("");
    setOpen(false);
    onChange(null);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) onChange(null);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar por CP, ciudad o provincia..."
          className="pr-16"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
          <ChevronsUpDown className="size-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-popover shadow-md">
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Sin resultados</p>
          ) : (
            filtered.map((pc) => (
              <button
                key={pc.cp}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(pc);
                }}
              >
                <span className="font-mono text-xs w-14 shrink-0 text-muted-foreground">{pc.cp}</span>
                <span>{pc.city}, {pc.province}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function AddressList() {
  const [page, setPage] = useState(1);
  const { data: result, isLoading } = useBuyerAddresses(page);
  const { data: postalCodes = [] } = usePostalCodes();
  const { create: createAddress, remove: deleteAddress } = useAddressMutations();
  const [showForm, setShowForm] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);

  const addresses = result?.data ?? [];
  const pagination = result?.pagination;

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: { alias: "", street: "", number: "", city: "", postalCode: "", country: "AR" },
  });

  const handlePostalCodeChange = (entry: PostalCodeEntry | null) => {
    if (entry) {
      form.setValue("postalCode", entry.cp, { shouldValidate: true });
      form.setValue("city", entry.city, { shouldValidate: true });
      form.setValue("province", entry.province, { shouldValidate: true });
    } else {
      form.setValue("postalCode", "", { shouldValidate: false });
      form.setValue("city", "", { shouldValidate: false });
      form.setValue("province", "", { shouldValidate: false });
    }
  };

  const onSubmit = async (values: AddressFormValues) => {
    await createAddress.mutateAsync({ ...values, province: values.province ?? "", isDefault: false });
    form.reset({ country: "AR" });
    setPickerKey((k) => k + 1);
    setShowForm(false);
  };

  const handleCancel = () => {
    setShowForm(false);
    setPickerKey((k) => k + 1);
    form.reset({ country: "AR" });
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
          </div>

          <div className="grid gap-1">
            <Label>Código postal</Label>
            <PostalCodePicker
              key={pickerKey}
              postalCodes={postalCodes}
              value=""
              onChange={handlePostalCodeChange}
            />
            {form.formState.errors.postalCode && (
              <p className="text-xs text-destructive">
                {form.formState.errors.postalCode.message}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label>Ciudad</Label>
              <Input
                value={form.watch("city")}
                readOnly
                disabled
                placeholder="Se completa al elegir el CP"
                className={cn(!form.watch("city") && "text-muted-foreground")}
              />
            </div>
            <div className="grid gap-1">
              <Label>Provincia</Label>
              <Input
                value={form.watch("province") ?? ""}
                readOnly
                disabled
                placeholder="Se completa al elegir el CP"
                className={cn(!form.watch("province") && "text-muted-foreground")}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={createAddress.isPending}>
              {createAddress.isPending ? "Guardando..." : "Guardar dirección"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
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
