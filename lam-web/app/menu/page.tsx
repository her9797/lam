import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";

import { CategoryScreen } from "@/components/screens/category-screen";
import { getQrCookieName, isQrSessionValid } from "@/lib/auth";
import {
  getAppData,
  getFeaturedCategoryFromData,
  getMenuItemsByCategoryFromData,
  getVisibleCategoriesFromData,
} from "@/services/app-service";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const cookieStore = await cookies();
  const qrSession = cookieStore.get(getQrCookieName())?.value;
  if (!isQrSessionValid(qrSession)) {
    redirect("/access-required");
  }

  const appData = await getAppData();
  const category = getFeaturedCategoryFromData(appData);

  if (!category) {
    notFound();
  }

  return (
    <CategoryScreen
      store={appData.store}
      categories={getVisibleCategoriesFromData(appData)}
      category={category}
      items={getMenuItemsByCategoryFromData(appData, category.id)}
    />
  );
}
