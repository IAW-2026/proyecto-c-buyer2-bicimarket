"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Check, Loader2, Pencil } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useBuyerProfile } from "@/hooks/use-buyer";
import { useProfileMutations } from "@/hooks/querys/profile/useProfileMutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  fullName: z.string().min(2, "Nombre requerido"),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ProfileForm() {
  const { user } = useUser();
  const { data: profile, isLoading } = useBuyerProfile();
  const { update: updateProfile } = useProfileMutations();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", phone: "" },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        fullName: profile.fullName,
        phone: profile.phone ?? "",
      });
    }
  }, [profile, form]);

  const onSubmit = async (values: FormValues) => {
    await updateProfile.mutateAsync(values);
    form.reset(values);
    setIsEditing(false);
  };

  if (isLoading) {
    return <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Cargando perfil...</div>;
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 space-y-5">
      {/* Avatar + name header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted text-base font-semibold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>
        {!isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="size-3.5" />
            Editar
          </Button>
        )}
      </div>

      {/* View mode */}
      {!isEditing && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 grid gap-1">
            <Label>Nombre completo</Label>
            <p className="text-sm">{form.getValues("fullName") || "—"}</p>
          </div>
          <div className="grid gap-1">
            <Label>Teléfono</Label>
            <p className="text-sm text-muted-foreground">{form.getValues("phone") || "—"}</p>
          </div>
        </div>
      )}

      {/* Edit mode */}
      {isEditing && (
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 grid gap-1">
            <Label htmlFor="fullName">Nombre completo *</Label>
            <Input id="fullName" {...form.register("fullName")} />
            {form.formState.errors.fullName && (
              <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
            )}
          </div>

          <div className="grid gap-1">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" placeholder="+54 9 11 0000-0000" {...form.register("phone")} />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <Button type="submit" disabled={updateProfile.isPending || !form.formState.isDirty} className="gap-1.5">
              {updateProfile.isPending ? (
                <><Loader2 className="size-4 animate-spin" /> Guardando...</>
              ) : (
                <><Check className="size-4" /> Guardar cambios</>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                form.reset({ fullName: profile?.fullName ?? "", phone: profile?.phone ?? "" });
                setIsEditing(false);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {/* Account section */}
      <div className="border-t border-border/60 pt-4 space-y-3">
        <h3 className="text-sm font-semibold">Cuenta</h3>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm">Email</p>
            <p className="text-xs text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
          <span className="rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
            Verificado
          </span>
        </div>
      </div>
    </div>
  );
}
