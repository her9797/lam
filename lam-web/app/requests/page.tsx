import { RequestsScreen } from "@/components/screens/requests-screen";
import { getAppData, getVisibleRequestGuidesFromData } from "@/services/app-service";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const appData = await getAppData();
  return <RequestsScreen store={appData.store} requestGuides={getVisibleRequestGuidesFromData(appData)} />;
}
