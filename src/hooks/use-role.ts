"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import type { Role } from "@/lib/auth/roles";

export function useRole(): Role {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  if (!isSignedIn) return "public";
  if (user?.publicMetadata?.admin) return "admin";
  return "buyer";
}
