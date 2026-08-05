import Link from "next/link";

type PrimaryNavProps = {
  active?: "menu" | "requests" | "events";
};

const items = [
  { href: "/menu", label: "메뉴", key: "menu" },
  { href: "/requests", label: "요청사항", key: "requests" },
  { href: "/events", label: "이벤트", key: "events" },
] as const;

export function PrimaryNav({ active }: PrimaryNavProps) {
  return (
    <nav className="primary-strip" aria-label="주요 메뉴">
      {items.map((item) => (
        <Link
          key={item.key}
          className={item.key === active ? "primary-pill active" : "primary-pill"}
          href={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
