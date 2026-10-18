"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/content-ops", label: "SNS 제작 운영보드" },
  { href: "/", label: "홈" },
  { href: "/instagram", label: "📱 Instagram" },
  { href: "/youtube", label: "▶️ YouTube" },
  { href: "/blog", label: "📝 블로그" },
  { href: "/calendar", label: "📅 발행 캘린더" },
];

export function Nav() {
  const path = usePathname();
  if(path.startsWith("/ai-center")||path==="/ops")return null;
  return (
    <nav style={{ display: "flex", gap: 8, padding: "16px 20px", borderBottom: "1px solid #1e2638", overflowX: "auto", background: "#0b0f17", position: "sticky", top: 0, zIndex: 10 }}>
      <Link href="/" style={{ fontWeight: 700, color: "var(--fg)", textDecoration: "none", marginRight: 20 }}>세왕 SNS</Link>
      {LINKS.map(l => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} style={{
            padding: "6px 14px", borderRadius: 999, fontSize: 13,
            background: active ? "var(--accent)" : "transparent",
            border: "1px solid " + (active ? "var(--accent)" : "#2a3346"),
            color: active ? "#fff" : "var(--fg)",
            textDecoration: "none", whiteSpace: "nowrap"
          }}>{l.label}</Link>
        );
      })}
    </nav>
  );
}
