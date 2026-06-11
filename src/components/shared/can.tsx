"use client";

import type { ReactNode } from "react";
import { useRole } from "@/hooks/use-role";
import { hasCapability, type Capability } from "@/lib/auth/roles";

interface CanProps {
  action: Capability;
  children: (granted: boolean) => ReactNode;
}

/**
 * Render-prop component that checks if the current user has a capability.
 * Use on public pages to conditionally enable/redirect buttons.
 *
 * @example
 * <Can action="cart.add">
 *   {(granted) => (
 *     <Button onClick={granted ? addToCart : () => router.push("/sign-in")}>
 *       Agregar
 *     </Button>
 *   )}
 * </Can>
 */
export function Can({ action, children }: CanProps) {
  const role = useRole();
  return <>{children(hasCapability(role, action))}</>;
}
