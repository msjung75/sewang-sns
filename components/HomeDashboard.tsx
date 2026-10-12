"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Post, Category } from "../lib/types";
import { PostGrid } from "./PostCard";
import { RefreshButton } from "./RefreshButton";

const CATS: (Category | "전체")[] = ["전체", "주요뉴스", "시장트렌드", "신제품", "거래처케이스", "세왕소식", "TBD"];

function reactionScore(p: Post): number {
  return (p.metrics.views || 0) + (p.metrics.likes || 0) * 10 + (p.metrics.comments || 0) * 20;
}

export function HomeDashboard({ posts, fetched_at, summary }: { posts: Post[]; fetched_at: string; summary: Record<string, number | string> }) {
  const [cat, setCat] = useState<Category | "전체">("전체");

  const filtered = useMemo(() => cat === "전체" ? posts : posts.filter(p => p.category === cat), [posts, cat]);
  const top10 = useMemo(() => [...filtered].sort((a, b) => reactionScore(b) - reactionScore(a)).slice(0, 10), [filtered]);
  const bottom5 = useMemo(() => [...filtered].sort((a, b) => reactionScore(a) - reactionScore(b)).slice(0, 5), [filtered]);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = posts.filter(p => new Date(p.date).getTime() >= weekAgo);
  const totalViews = posts.reduce((s, p) => s + (p.metrics.views || 0), 0);

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: 20 }}>
      <header style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <p style={{ color: "var(--muted)", fontSize: 12, margin: 0 }}>
          마지막 수집: {fetched_at ? new Date(fetched_at).toLocaleString("ko-KR") : "미수집"} ·{" "}
          IG {summary.instagram ?? "-"} · YT {summary.youtube ?? "-"} · 블로그 {summary.naver ?? "-"}
        </p>
        <RefreshButton />
      </header>

      <section style={grid4}>
        <Kpi label="총 포스트" value={posts.length} />
        <Kpi label="이번 주 신규" value={thisWeek.length} />
        <Kpi label="누적 조회수" value={totalViews.toLocaleString()} />
        <Kpi label="활성 플랫폼" value={new Set(posts.map(p => p.platform)).size} />
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={h2}>카테고리</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {CATS.map(c => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c} ({c === "전체" ? posts.length : posts.filter(p => p.category === c).length})</Chip>)}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={h2}>🔥 반응 TOP 10 {cat !== "전체" && <span style={muted}>— {cat}</span>}</h2>
        <PostGrid posts={top10} />
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={h2}>📉 반응 BOTTOM 5 {cat !== "전체" && <span style={muted}>— {cat}</span>}</h2>
        <PostGrid posts={bottom5} />
      </section>

      <section style={{ marginTop: 32, textAlign: "center" }}>
        <Link href="/calendar" style={ctaBtn}>📅 주/월 발행 캘린더 보기 →</Link>
      </section>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return <div style={{ background: "var(--card)", padding: 16, borderRadius: 8, border: "1px solid #1e2638" }}>
    <div style={{ fontSize: 11, color: "var(--muted)" }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{value}</div>
  </div>;
}
function Chip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid " + (active ? "var(--accent)" : "#2a3346"), background: active ? "var(--accent)" : "transparent", color: active ? "#fff" : "var(--fg)", cursor: "pointer", fontSize: 12 }}>{children}</button>;
}
const h2: React.CSSProperties = { fontSize: 16, fontWeight: 600, marginBottom: 12 };
const grid4: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 };
const muted: React.CSSProperties = { color: "var(--muted)", fontWeight: 400, fontSize: 13, marginLeft: 8 };
const ctaBtn: React.CSSProperties = { display: "inline-block", padding: "12px 24px", background: "var(--accent)", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 600 };
