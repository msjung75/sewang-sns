import "./globals.css";
import type { Metadata } from "next";
import { Nav } from "../components/Nav";

export const metadata: Metadata = {
  title: "세왕상사 SNS 대시보드",
  description: "Instagram · YouTube · 네이버 블로그 통합 조회",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
