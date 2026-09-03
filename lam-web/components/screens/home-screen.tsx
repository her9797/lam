import { FloatingHomeBadge } from "@/components/navigation/floating-home-badge";
import { PrimaryNav } from "@/components/navigation/primary-nav";
import type { MenuCategory, MenuItem, StoreInfo } from "@/data/menu-data";
import Link from "next/link";

type HomeScreenProps = {
  store: StoreInfo;
  featuredCategory?: MenuCategory;
  featuredItems: MenuItem[];
  canEditTable: boolean;
};

export function HomeScreen({ store, canEditTable }: HomeScreenProps) {
  return (
    <main className="page-shell">
      <FloatingHomeBadge active />
      <div className="phone-frame">
        <header className="hero-card">
          <p className="eyebrow">BAR LAAM</p>
          <h1>{store.name}</h1>
          <div className="hero-badge-row">
            <a
              className="hero-link-badge"
              href="https://www.instagram.com/bar_laam/"
              target="_blank"
              rel="noreferrer"
            >
              Instagram
            </a>
          </div>
          <p className="hero-meta">{store.address}</p>
        </header>
        <PrimaryNav canEditTable={canEditTable} />

        <section className="home-vinyl-card" aria-label="BAR LAAM 음악 안내">
          <div className="home-vinyl-copy">
            <p className="section-kicker">after dark</p>
            <h2>
              COME AS
              <br />
              <span>YOU ARE.</span>
            </h2>
            <p>편하게 머물다 가세요.</p>
          </div>
          <div className="home-vinyl-record" aria-hidden="true">
            <div className="home-vinyl-label">
              <span>laam</span>
            </div>
          </div>
          <nav className="home-feature-links" aria-label="손님 메뉴 안내">
            <Link href="/song-requests">
              <strong>노래신청</strong>
              <span>듣고 싶은 곡을 남겨주세요.</span>
              <b aria-hidden="true">→</b>
            </Link>
            <Link href="/requests">
              <strong>사장님께 한마디</strong>
              <span>편하게 전하고 싶은 말을 남겨주세요.</span>
              <b aria-hidden="true">→</b>
            </Link>
            <Link href="/special-requests">
              <strong>특별한 요청</strong>
              <span>신청하면 특별한 일이 생길지도..?</span>
              <b aria-hidden="true">→</b>
            </Link>
            <Link href="/events">
              <strong>공지 및 이벤트</strong>
              <span>오늘의 소식과 이벤트를 확인하세요.</span>
              <b aria-hidden="true">→</b>
            </Link>
          </nav>
        </section>
      </div>
    </main>
  );
}
