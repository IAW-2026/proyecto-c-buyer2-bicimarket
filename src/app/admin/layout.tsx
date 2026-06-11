import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <main className="flex-1 overflow-y-auto">
      {children}
    </main>
  );
}
