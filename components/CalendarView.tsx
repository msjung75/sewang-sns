"use client";
import { useMemo, useState } from "react";
import type { Post, Category, Platform } from "../lib/types";
import { PostGrid } from "./PostCard";

type Granularity = "week" | "month";

const CATS: Category[] = ["주요뉴스", "시장트렌드", "신제품", "거래처케이스", "세왕소식", "TBD"];
const CAT_COLOR: Record<Category, string> = {
  "주요뉴스": "#ef4444", "시장트렌드": "#f59e0b", "신제품": "#10b981",
  "거래처케이스": "#3b82f6", "세왕소식": "#a855f7", "TBD": "#64748b"
};
const PLATFORM_EMOJI: Record<Platform, string> = { instagram: "📱", youtube: "▶️", naver: "📝" };

// 날짜 → ISO week string "YYYY-WW" / month "YYYY-MM"
function bucketKey(date: string, g: Granularity): string {
  const d = new Date(date);
  if (g === "month") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  // ISO week
  const t = new Date(d.getTime());
  t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  const week1 = new Date(t.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((t.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${t.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function bucketLabel(key: string, g: Granularity): string {
  if (g === "month") {
    const [y, m] = key.split("-");
    return `${y}년 ${parseInt(m)}월`;
  }
  return key.replace("-W", " W");
}

export function CalendarView({ posts }: { posts: Post[] }) {
  const [g, setG] = useState<Granularity>("week");
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);

  // 버킷별 집계
  const buckets = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of posts) {
      if (!p.date) continue;
      const key = bucketKey(p.date, g);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])); // 최신순
  }, [posts, g]);

  const selectedPosts = selectedBucket ? (buckets.find(([k]) => k === selectedBucket)?.[1] ?? []) : null;

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: 20 }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>📅 발행 캘린더</h1>
        <p style={{ color: "var(--muted)", fontSize: 13 }}>주/월 단위로 어떤 카테고리·플랫폼이 몇 건 올라갔는지</p>
      </header>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <Btn active={g === "week"} onClick={() => { setG("week"); setSelectedBucket(null); }}>주별</Btn>
        <Btn active={g === "month"} onClick={() => { setG("month"); setSelectedBucket(null); }}>월별</Btn>
      </div>

      {/* 범례 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16, fontSize: 11 }}>
        {CATS.map(c => (
          <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: CAT_COLOR[c] }} />
            {c}
          </span>
        ))}
      </div>

      {/* 버킷 리스트 */}
      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {buckets.map(([key, bucketPosts]) => {
          const byCat = CATS.map(c => ({ cat: c, count: bucketPosts.filter(p => p.category === c).length }));
          const total = bucketPosts.length;
          const byPlat: Record<string, number> = {};
          bucketPosts.forEach(p => { byPlat[p.platform] = (byPlat[p.platform] ?? 0) + 1; });
          const active = selectedBucket === key;
          return (
            <div key={key} onClick={() => setSelectedBucket(active ? null : key)} style={{
              background: "var(--card)", border: "1px solid " + (active ? "var(--accent)" : "#1e2638"),
              borderRadius: 8, padding: 14, cursor: "pointer",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{bucketLabel(key, g)}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {Object.entries(byPlat).map(([p, c]) => `${PLATFORM_EMOJI[p as Platform]}${c}`).join(" · ")} · 총 {total}건
                </div>
              </div>
              {/* 카테고리 바 */}
              <div style={{ display: "flex", height: 24, borderRadius: 4, overflow: "hidden" }}>
                {byCat.filter(x => x.count > 0).map(({ cat, count }) => (
                  <div key={cat} title={`${cat}: ${count}건`} style={{
                    flex: count, background: CAT_COLOR[cat],
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 11, fontWeight: 600,
                  }}>
                    {count}
                  </div>
                ))}
              </div>
              {active && (
                <div style={{ marginTop: 14 }}>
                  <PostGrid posts={bucketPosts.sort((a, b) => b.date.localeCompare(a.date))} />
                </div>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}

function Btn({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} style={{
    padding: "8px 16px", borderRadius: 6, border: "1px solid " + (active ? "var(--accent)" : "#2a3346"),
    background: active ? "var(--accent)" : "transparent", color: active ? "#fff" : "var(--fg)",
    cursor: "pointer", fontSize: 13, fontWeight: 500,
  }}>{children}</button>;
}
