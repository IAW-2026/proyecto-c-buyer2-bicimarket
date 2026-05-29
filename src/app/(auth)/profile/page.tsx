"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ProfileForm } from "@/components/profile/profile-form";
import { AddressList } from "@/components/profile/address-list";

type Tab = "profile" | "addresses";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  return (
    <div className="px-6 py-8">
      <h1 className="font-heading mb-1 text-2xl font-bold tracking-tight">Perfil</h1>
      <p className="mb-6 text-xs text-muted-foreground">
        Gestioná tu información personal y direcciones de envío
      </p>

      <div className="mb-5 flex items-center gap-1 border-b border-border/60">
        {([["profile", "Mi perfil"], ["addresses", "Mis direcciones"]] as [Tab, string][]).map(
          ([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "px-3 pb-2.5 text-sm transition-colors",
                activeTab === key
                  ? "border-b-2 border-foreground font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ),
        )}
      </div>

      {activeTab === "profile" && <ProfileForm />}
      {activeTab === "addresses" && <AddressList />}
    </div>
  );
}
