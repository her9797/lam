import type { Metadata } from "next";

import { RequestListPage } from "@/features/requests/RequestListPage";

export const metadata: Metadata = {
  title: "노래 신청 | LAM 관리자",
};

export default function Page() {
  return <RequestListPage kind="song" />;
}
