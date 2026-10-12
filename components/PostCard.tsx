"use client";
import type { Post } from "../lib/types";

const PLATFORM_LABEL: Record<string, string> = { instagram: "📱", youtube: "▶️", naver: "📝" };
const PLATFORM_COLOR: Record<string, string> = { instagram: "#E1306C", youtube: "#FF0000", naver: "#03C75A" };

export function PostCard({ p }: { p: Post }) {
  return (
    <a href={p.url} target="_blank" rel="noreferrer" style={card} onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")} onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}>
      {p.thumbnail && (
        <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", overflow: "hidden", borderRadius: 6, background: "#1e2638" }}>
          <img src={p.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
          <span style={{ position: "absolute", top: 6, left: 6, padding: "2px 8px", borderRadius: 4, background: PLATFORM_COLOR[p.platform] + "cc", color: "#fff", fontSize: 10, fontWeight: 700 }}>
            {PLATFORM_LABEL[p.platform]} {p.platform.toUpperCase()}
          </span>
        </div>
      )}
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
        {p.date} · <span style={{ color: "var(--accent)" }}>{p.category}{p.sub_category ? ` / ${p.sub_category}` : ""}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {p.title_or_caption}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6, display: "flex", gap: 10 }}>
        <span>👁 {p.metrics.views.toLocaleString()}</span>
        <span>♥ {p.metrics.likes.toLocaleString()}</span>
        <span>💬 {p.metrics.comments.toLocaleString()}</span>
      </div>
    </a>
  );
}

const card: React.CSSProperties = {
  display: "block", background: "var(--card)", padding: 10, borderRadius: 8,
  textDecoration: "none", color: "inherit", border: "1px solid #1e2638",
  transition: "transform 0.15s ease, box-shadow 0.15s ease",
  cursor: "pointer",
};

export function PostGrid({ posts }: { posts: Post[] }) {
  if (!posts.length) return <p style={{ color: "var(--muted)", padding: 20, textAlign: "center" }}>데이터 없음</p>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
      {posts.map(p => <PostCard key={`${p.platform}:${p.post_id}`} p={p} />)}
    </div>
  );
}
