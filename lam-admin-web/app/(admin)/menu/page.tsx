import type { Metadata } from "next";

import { MenuManagementPage } from "@/features/menu/MenuManagementPage";

export const metadata: Metadata = {
  title: "메뉴 관리 | LAM 관리자",
};

export default function Page() {
  return <MenuManagementPage />;
}
