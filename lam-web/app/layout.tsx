import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "bar-lam",
  description: "lam QR menu mobile web",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
