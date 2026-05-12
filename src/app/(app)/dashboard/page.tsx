"use client";

import { useUser } from "@clerk/nextjs";
import { StatCards } from "@/components/dashboard/stat-cards";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { LastOrderPreview } from "@/components/dashboard/last-order-preview";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();

  const today = new Date().toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
          {isLoaded ? (
            <>
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </>
          ) : (
            <Skeleton className="size-full rounded-full" />
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{today}</p>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Hola, {isLoaded ? user?.firstName : "..."}
          </h1>
        </div>
      </div>

      <StatCards />
      <QuickActions />
      <LastOrderPreview />
    </div>
  );
}
