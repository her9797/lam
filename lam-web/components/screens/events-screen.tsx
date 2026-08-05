import { FloatingHomeBadge } from "@/components/navigation/floating-home-badge";
import { PrimaryNav } from "@/components/navigation/primary-nav";
import { ScrollTopButton } from "@/components/navigation/scroll-top-button";
import { notices, store } from "@/data/menu-data";

export function EventsScreen() {
  return (
    <main className="page-shell">
      <FloatingHomeBadge />
      <ScrollTopButton />
      <div className="phone-frame">
        <header className="hero-card compact">
          <p className="eyebrow">BAR LAM</p>
          <h1>이벤트</h1>
          <p className="hero-copy">{store.name}의 공지와 운영 이벤트를 모아봤습니다.</p>
        </header>

        <PrimaryNav active="events" />

        <section className="content-card">
          <div className="section-header">
            <div>
              <p className="section-kicker">event</p>
              <h2>진행 중 안내</h2>
            </div>
          </div>
          <div className="notice-list">
            {notices.map((notice) => (
              <p key={notice.id} className="notice-item">
                {notice.text}
              </p>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
