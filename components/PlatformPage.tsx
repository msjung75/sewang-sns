"use client";
import { useMemo, useState } from "react";
import type { Post, Category, Platform } from "../lib/types";
import { PostGrid } from "./PostCard";

type SortKey = "date" | "views" | "likes" | "comments";
const CATS: (Category | "전체")[] = ["전체", "주요뉴스", "시장트렌드", "신제품", "거래처케이스", "세왕소식", "TBD"];
const SORTS: { key: SortKey; label: string }[] = [
  { key: "date", label: "최신순" },
  { key: "views", label: "조회수" },
  { key: "likes", label: "좋아요" },
  { key: "comments", label: "댓글" },
];

const PLATFORM_META: Record<Platform, { emoji: string; title: string; account: string; url: string }> = {
  instagram: { emoji: "📱", title: "Instagram", account: "@sewangliquor", url: "https://www.instagram.com/sewangliquor/" },
  youtube: { emoji: "▶️", title: "YouTube", account: "@sewangliquor", url: "https://www.youtube.com/@sewangliquor" },
  naver: { emoji: "📝", title: "네이버 블로그", account: "sewang88", url: "https://blog.naver.com/sewang88" },
};

export function PlatformPage({ posts, platform }: { posts: Post[]; platform: Platform }) {
  const [cat, setCat] = useState<Category | "전체">("전체");
  const [sort, setSort] = useState<SortKey>("date");
  const meta = PLATFORM_META[platform];
  const platformPosts = useMemo(() => posts.filter(p => p.platform === platform), [posts, platform]);

  const filtered = useMemo(() => {
    const xs = cat === "전체" ? platformPosts : platformPosts.filter(p => p.category === cat);
    return [...xs].sort((a, b) => sort === "date" ? b.date.localeCompare(a.date) : (b.metrics[sort] || 0) - (a.metrics[sort] || 0));
  }, [platformPosts, cat, sort]);

  const totalViews = platformPosts.reduce((s, p) => s + p.metrics.views, 0);
  const totalLikes = platformPosts.reduce((s, p) => s + p.metrics.likes, 0);
  const totalComments = platformPosts.reduce((s, p) => s + p.metrics.comments, 0);

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: 20 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>{meta.emoji} {meta.title}</h1>
        <a href={meta.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontSize: 13, textDecoration: "none" }}>{meta.account} ↗</a>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <Kpi label="포스트 수" value={platformPosts.length} />
        <Kpi label="조회수" value={totalViews.toLocaleString()} />
        <Kpi label="좋아요" value={totalLikes.toLocaleString()} />
        <Kpi label="댓글" value={totalComments.toLocaleString()} />
      </section>

      <section style={{ marginTop: 24 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {CATS.map(c => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c} ({c === "전체" ? platformPosts.length : platformPosts.filter(p => p.category === c).length})</Chip>)}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {SORTS.map(s => <Chip key={s.key} active={sort === s.key} onClick={() => setSort(s.key)}>{s.label}</Chip>)}
        </div>
        <PostGrid posts={filtered} />
      </section>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return <div style={{ background: "var(--card)", padding: 14, borderRadius: 8, border: "1px solid #1e2638" }}>
    <div style={{ fontSize: 11, color: "var(--muted)" }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{value}</div>
  </div>;
}
function Chip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid " + (active ? "var(--accent)" : "#2a3346"), background: active ? "var(--accent)" : "transparent", color: active ? "#fff" : "var(--fg)", cursor: "pointer", fontSize: 12 }}>{children}</button>;
}
