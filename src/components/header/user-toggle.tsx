"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRole } from "@/hooks/use-role";
import { buttonVariants } from "@/components/ui/button";

export function UserToggle() {
  const role = useRole();
  const { user } = useUser();
  const { signOut } = useClerk();

  if (role === "public") {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/sign-in"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Ingresar
        </Link>
        <Link
          href="/sign-up"
          className={buttonVariants({ size: "sm" })}
        >
          Crear cuenta
        </Link>
      </div>
    );
  }

  const initials =
    (user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "") || "U";

  return (
    <div className="flex items-center gap-2">
      {role === "admin" && (
        <Link
          href="/admin"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Shield className="size-3.5" />
          Admin
        </Link>
      )}

      <div className="flex items-center gap-2">
        <Link
          href="/dashboard"
          className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-80"
          title={`${user?.firstName} ${user?.lastName}`}
        >
          {initials}
        </Link>
        <button
          onClick={() => signOut({ redirectUrl: "/" })}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Salir
        </button>
      </div>
    </div>
  );
}
