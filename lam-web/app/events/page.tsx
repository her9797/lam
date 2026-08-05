import { EventsScreen } from "@/components/screens/events-screen";
import { getAppData } from "@/services/app-service";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const appData = await getAppData();
  return <EventsScreen store={appData.store} notices={appData.notices} />;
}
