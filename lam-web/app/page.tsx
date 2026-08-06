import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { HomeScreen } from "@/components/screens/home-screen";
import { getQrCookieName, isQrSessionValid } from "@/lib/auth";
import { getAppData, getFeaturedCategoryFromData, getFeaturedItemsFromData } from "@/services/app-service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const qrSession = cookieStore.get(getQrCookieName())?.value;
  if (!isQrSessionValid(qrSession)) {
    redirect("/access-required");
  }

  const appData = await getAppData();

  return (
    <HomeScreen
      store={appData.store}
      featuredCategory={getFeaturedCategoryFromData(appData)}
      featuredItems={getFeaturedItemsFromData(appData)}
    />
  );
}
