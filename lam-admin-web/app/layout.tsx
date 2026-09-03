import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "LAM 관리자",
  description: "LAM 매장 운영자를 위한 관리자 웹",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <a href="#main-content" className="skip-link">
          본문으로 바로가기
        </a>
        {children}
      </body>
    </html>
  );
}
