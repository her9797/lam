import type { Metadata } from "next";

import { CategoryManagementPage } from "@/features/menu/CategoryManagementPage";

export const metadata: Metadata = {
  title: "카테고리 관리 | LAM 관리자",
};

export default function Page() {
  return <CategoryManagementPage />;
}
