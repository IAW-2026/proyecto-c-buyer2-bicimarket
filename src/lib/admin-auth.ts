import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const user = await currentUser();
  if (!user?.publicMetadata?.admin) redirect("/dashboard");
}

export async function requireAdminApi(): Promise<NextResponse | null> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await currentUser();
  if (!user?.publicMetadata?.admin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}
