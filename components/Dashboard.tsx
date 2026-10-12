"use client";
import { useMemo, useState } from "react";
import type { Post, Category, Platform } from "../lib/types";

type SortKey = "date" | "views" | "likes" | "comments";
const CATS: (Category | "전체")[] = ["전체", "주요뉴스", "시장트렌드", "신제품", "거래처케이스", "세왕소식", "TBD"];
const PLATFORMS: (Platform | "전체")[] = ["전체", "instagram", "youtube", "naver"];
const PLATFORM_LABEL: Record<string, string> = { instagram: "📱 IG", youtube: "▶️ YT", naver: "📝 블로그" };

export function Dashboard({ posts, fetched_at, summary }: { posts: Post[]; fetched_at: string; summary: Record<string, number | string> }) {
  const [cat, setCat] = useState<Category | "전체">("전체");
  const [plat, setPlat] = useState<Platform | "전체">("전체");
  const [sort, setSort] = useState<SortKey>("date");

  const filtered = useMemo(() => {
    let xs = posts;
    if (cat !== "전체") xs = xs.filter(p => p.category === cat);
    if (plat !== "전체") xs = xs.filter(p => p.platform === plat);
    return [...xs].sort((a, b) => {
      if (sort === "date") return b.date.localeCompare(a.date);
      return (b.metrics[sort] ?? 0) - (a.metrics[sort] ?? 0);
    });
  }, [posts, cat, plat, sort]);

  const top10 = useMemo(() => [...posts].sort((a, b) => reactionScore(b) - reactionScore(a)).slice(0, 10), [posts]);
  const bottom5 = useMemo(() => [...posts].sort((a, b) => reactionScore(a) - reactionScore(b)).slice(0, 5), [posts]);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = posts.filter(p => new Date(p.date).getTime() >= weekAgo);
  const totalViews = posts.reduce((s, p) => s + (p.metrics.views || 0), 0);

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 20 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>세왕상사 SNS 대시보드</h1>
        <p style={{ color: "var(--muted)", fontSize: 13 }}>
          마지막 수집: {fetched_at || "미수집"} · {JSON.stringify(summary)}
        </p>
      </header>

      <section style={grid4}>
        <Kpi label="총 포스트" value={posts.length} />
        <Kpi label="이번 주 신규" value={thisWeek.length} />
        <Kpi label="누적 조회수" value={totalViews.toLocaleString()} />
        <Kpi label="플랫폼" value={new Set(posts.map(p => p.platform)).size} />
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={h2}>반응 TOP 10</h2>
        <PostList posts={top10} />
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={h2}>반응 BOTTOM 5</h2>
        <PostList posts={bottom5} />
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={h2}>전체 글 (필터·정렬)</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {CATS.map(c => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {PLATFORMS.map(p => <Chip key={p} active={plat === p} onClick={() => setPlat(p)}>{p === "전체" ? "전체" : PLATFORM_LABEL[p]}</Chip>)}
          <select value={sort} onChange={e => setSort(e.target.value as SortKey)} style={select}>
            <option value="date">최신순</option>
            <option value="views">조회수</option>
            <option value="likes">좋아요</option>
            <option value="comments">댓글</option>
          </select>
        </div>
        <PostList posts={filtered} />
      </section>
    </main>
  );
}

function reactionScore(p: Post): number {
  return (p.metrics.views || 0) + (p.metrics.likes || 0) * 10 + (p.metrics.comments || 0) * 20;
}

function PostList({ posts }: { posts: Post[] }) {
  if (!posts.length) return <p style={{ color: "var(--muted)" }}>데이터 없음</p>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
      {posts.map(p => (
        <a key={`${p.platform}:${p.post_id}`} href={p.url} target="_blank" rel="noreferrer" style={card}>
          {p.thumbnail && <img src={p.thumbnail} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 6 }} />}
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
            {PLATFORM_LABEL[p.platform]} · {p.date} · <span style={{ color: "var(--accent)" }}>{p.category}{p.sub_category ? ` / ${p.sub_category}` : ""}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {p.title_or_caption}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            👁 {p.metrics.views.toLocaleString()} · ♥ {p.metrics.likes.toLocaleString()} · 💬 {p.metrics.comments.toLocaleString()}
          </div>
        </a>
      ))}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return <div style={{ ...card, padding: 16 }}><div style={{ fontSize: 11, color: "var(--muted)" }}>{label}</div><div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{value}</div></div>;
}
function Chip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid " + (active ? "var(--accent)" : "#2a3346"), background: active ? "var(--accent)" : "transparent", color: "var(--fg)", cursor: "pointer", fontSize: 12 }}>{children}</button>;
}
const h2 = { fontSize: 16, fontWeight: 600, marginBottom: 12 };
const card: React.CSSProperties = { display: "block", background: "var(--card)", padding: 12, borderRadius: 8, textDecoration: "none", color: "inherit", border: "1px solid #1e2638" };
const grid4: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 };
const select: React.CSSProperties = { background: "var(--card)", color: "var(--fg)", border: "1px solid #2a3346", padding: "6px 12px", borderRadius: 6, fontSize: 12 };
