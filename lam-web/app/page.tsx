import { HomeScreen } from "@/components/screens/home-screen";
import { getAppData, getFeaturedCategoryFromData, getFeaturedItemsFromData } from "@/services/app-service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const appData = await getAppData();

  return (
    <HomeScreen
      store={appData.store}
      featuredCategory={getFeaturedCategoryFromData(appData)}
      featuredItems={getFeaturedItemsFromData(appData)}
    />
  );
}
