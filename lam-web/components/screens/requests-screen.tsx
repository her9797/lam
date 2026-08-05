import { FloatingHomeBadge } from "@/components/navigation/floating-home-badge";
import { PrimaryNav } from "@/components/navigation/primary-nav";
import { ScrollTopButton } from "@/components/navigation/scroll-top-button";
import type { NoticeItem, StoreInfo } from "@/data/menu-data";

type RequestsScreenProps = {
  store: StoreInfo;
  requestGuides: NoticeItem[];
};

export function RequestsScreen({ store, requestGuides }: RequestsScreenProps) {
  return (
    <main className="page-shell">
      <FloatingHomeBadge />
      <ScrollTopButton />
      <div className="phone-frame">
        <header className="hero-card compact">
          <p className="eyebrow">BAR LAM</p>
          <h1>요청사항</h1>
          <p className="hero-copy">{store.name} 이용 전 확인해두면 좋은 안내입니다.</p>
        </header>

        <PrimaryNav active="requests" />

        <section className="content-card">
          <div className="section-header">
            <div>
              <p className="section-kicker">guide</p>
              <h2>주문 전 확인</h2>
            </div>
          </div>
          <div className="notice-list">
            {requestGuides.map((guide) => (
              <p key={guide.id} className="notice-item">
                {guide.text}
              </p>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
