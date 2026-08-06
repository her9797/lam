import Link from "next/link";

export default function AccessRequiredPage() {
  return (
    <main className="page-shell">
      <div className="phone-frame">
        <section className="content-card">
          <div className="section-header">
            <div>
              <p className="section-kicker">qr only</p>
              <h2>QR로 접속해주세요</h2>
            </div>
          </div>
          <p className="notice-item" style={{ paddingTop: 0 }}>
            이 메뉴는 매장 QR 스캔을 통해서만 입장할 수 있습니다.
          </p>
          <Link className="primary-pill" href="/">
            다시 시도
          </Link>
        </section>
      </div>
    </main>
  );
}
