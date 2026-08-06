import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminScreen } from "@/components/screens/admin-screen";
import { getAdminCookieName, isAdminSessionValid } from "@/lib/auth";
import { getAppData } from "@/services/app-service";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get(getAdminCookieName())?.value;
  if (!isAdminSessionValid(adminSession)) {
    redirect("/admin/login");
  }

  const appData = await getAppData();
  return <AdminScreen initialData={appData} />;
}
