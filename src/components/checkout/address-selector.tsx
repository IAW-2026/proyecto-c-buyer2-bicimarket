"use client";

import { useState } from "react";
import { MapPin, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Address } from "@/types/buyer";

type AddressSelectorProps = {
  addresses: Address[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddNew: () => void;
};

export function AddressSelector({
  addresses,
  selectedId,
  onSelect,
  onAddNew,
}: AddressSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = addresses.find((a) => a.id === selectedId);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Direcciones guardadas</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
      >
        <MapPin className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate">
          {selected ? (
            <>
              <span className="font-medium">{selected.label}</span>
              <span className="text-muted-foreground">
                {" · "}
                {selected.street}, {selected.city}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Seleccioná una dirección</span>
          )}
        </span>
        <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="rounded-lg border border-border bg-background shadow-sm">
          {addresses.map((address) => (
            <button
              key={address.id}
              type="button"
              onClick={() => {
                onSelect(address.id);
                setOpen(false);
              }}
              className={`flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50 ${
                address.id === selectedId ? "bg-primary/5 text-primary" : ""
              }`}
            >
              <MapPin className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">{address.label}</p>
                <p className="text-xs text-muted-foreground">
                  {address.street}, {address.city}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-primary" onClick={onAddNew}>
        <Plus className="size-3.5" />
        Agregar nueva dirección
      </Button>
    </div>
  );
}
