import { AdminScreen } from "@/components/screens/admin-screen";
import { getAppData } from "@/services/app-service";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const appData = await getAppData();
  return <AdminScreen initialData={appData} />;
}
