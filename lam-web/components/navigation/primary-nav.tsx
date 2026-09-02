import Link from "next/link";

import { TableSessionBadge } from "@/components/table/table-session-badge";

type PrimaryNavProps = {
  active?: "menu" | "song-requests" | "requests" | "special-requests" | "events";
  canEditTable?: boolean;
};

const items = [
  { href: "/song-requests", label: "노래신청", key: "song-requests" },
  { href: "/requests", label: "사장님께 한마디", key: "requests" },
  { href: "/special-requests", label: "특별한 요청", key: "special-requests" },
  { href: "/events", label: "공지 및 이벤트", key: "events" },
] as const;

export function PrimaryNav({ active, canEditTable = false }: PrimaryNavProps) {
  return (
    <>
      <TableSessionBadge canEdit={canEditTable} />
      <nav className="primary-strip" aria-label="주요 메뉴">
        {items.map((item) => (
          <Link
            key={item.key}
            className={[
              "primary-pill",
              item.key === "special-requests" ? "primary-pill-special" : "",
              item.key === active ? "active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            href={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
