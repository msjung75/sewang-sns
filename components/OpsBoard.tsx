"use client";
import { useState } from "react";
import type { Ops, Trends, PipelineItem, TrendPoint, TrendItem } from "../lib/ops";

const STEPS = ["주제", "디자인", "글", "게시"] as const;

const C = {
  card: "var(--card)", fg: "var(--fg)", muted: "var(--muted)", accent: "var(--accent)",
  border: "#1e2638", border2: "#2a3346",
  high: "#ff6b6b", mid: "#ffb84d", ok: "#4ade80",
};

export function OpsBoard({ ops, trends }: { ops: Ops | null; trends: Trends | null }) {
  const [tab, setTab] = useState<"파이프라인" | "트렌드" | "중복체크" | "분업표">("파이프라인");

  if (!ops) {
    return (
      <main style={wrap}>
        <h1 style={h1}>운영보드</h1>
        <p style={{ color: C.muted }}>
          data/ops.json 이 없습니다. <code style={code}>python3 scripts/build_ops.py &lt;인스타폴더&gt; .</code> 를 먼저 실행하세요.
        </p>
      </main>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const empty = ops.pipeline.filter(p => p.date >= today && !p.folder).length;

  return (
    <main style={wrap}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={h1}>운영보드</h1>
        <p style={{ color: C.muted, fontSize: 12, margin: "4px 0 0" }}>
          파일 상태에서 역산한 진행상황 · 생성 {new Date(ops.generated_at).toLocaleString("ko-KR")}
        </p>
      </header>

      {ops.alerts.length > 0 && (
        <section style={{ display: "grid", gap: 8, marginBottom: 20 }}>
          {ops.alerts.map((a, i) => (
            <div key={i} style={{
              background: C.card, borderRadius: 8, padding: "12px 14px",
              borderLeft: `3px solid ${a.level === "high" ? C.high : a.level === "mid" ? C.mid : C.ok}`,
              border: `1px solid ${C.border}`, borderLeftWidth: 3,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                <span style={{ color: a.level === "high" ? C.high : a.level === "mid" ? C.mid : C.ok, marginRight: 6 }}>
                  {a.level === "high" ? "●" : a.level === "mid" ? "●" : "●"}
                </span>
                {a.msg}
              </div>
              {a.action && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>→ {a.action}</div>}
            </div>
          ))}
        </section>
      )}

      <section style={grid4}>
        <Kpi label="누적 회차" value={ops.stats.total_rounds} />
        <Kpi label="게시 완료" value={ops.stats.published} />
        <Kpi label="빈 날짜 (14일내)" value={empty} tone={empty > 0 ? "high" : "ok"} />
        <Kpi label="거래처 사진 대기" value={ops.material.raw_count} tone={ops.material.raw_count > 0 ? "ok" : "mid"} />
      </section>

      <nav style={{ display: "flex", gap: 8, margin: "24px 0 16px", flexWrap: "wrap" }}>
        {(["파이프라인", "트렌드", "중복체크", "분업표"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={chip(tab === t)}>{t}</button>
        ))}
      </nav>

      {tab === "파이프라인" && <Pipeline items={ops.pipeline} today={today} />}
      {tab === "트렌드" && <TrendQueue trends={trends} />}
      {tab === "중복체크" && <DupCheck ops={ops} />}
      {tab === "분업표" && <Roles ops={ops} />}
    </main>
  );
}

/* ---------------- 파이프라인 ---------------- */

function Pipeline({ items, today }: { items: PipelineItem[]; today: string }) {
  return (
    <section>
      <p style={note}>
        네 단계(주제 → 디자인 → 글 → 게시)가 각 날짜마다 어디까지 갔는지 보여줍니다.
        채워진 점은 해당 파일이 실제로 폴더에 있다는 뜻입니다.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>날짜</th>
              <th style={th}>진행</th>
              <th style={th}>회차</th>
              <th style={th}>담당</th>
              <th style={th}>반응</th>
              <th style={th}>확인 필요</th>
            </tr>
          </thead>
          <tbody>
            {items.map(p => {
              const future = p.date >= today;
              return (
                <tr key={p.date} style={{ background: p.date === today ? "#17203200" : undefined }}>
                  <td style={{ ...td, whiteSpace: "nowrap", fontWeight: p.date === today ? 700 : 400 }}>
                    {p.date.slice(5)}{p.date === today && <span style={{ color: C.accent, marginLeft: 6, fontSize: 11 }}>오늘</span>}
                  </td>
                  <td style={td}>
                    <span style={{ display: "inline-flex", gap: 4 }}>
                      {STEPS.map(s => (
                        <span key={s} title={s} style={{
                          width: 9, height: 9, borderRadius: 99, display: "inline-block",
                          background: p.steps[s] ? C.accent : "transparent",
                          border: `1px solid ${p.steps[s] ? C.accent : C.border2}`,
                        }} />
                      ))}
                    </span>
                  </td>
                  <td style={{ ...td, color: p.folder ? C.fg : C.muted, fontSize: 12 }}>
                    {p.folder ?? (future ? "— 미정 —" : "—")}
                  </td>
                  <td style={{ ...td, fontSize: 12, color: C.muted }}>{p.folder ? p.owner : "수집·판단"}</td>
                  <td style={{ ...td, fontSize: 12, color: C.muted }}>{p.reaction || "—"}</td>
                  <td style={td}>
                    {p.warnings.length === 0
                      ? <span style={{ color: C.ok, fontSize: 12 }}>이상 없음</span>
                      : p.warnings.map((w, i) => (
                        <span key={i} style={tag(w.includes("올릴 것 없음") || w.includes("미등록") ? C.high : C.mid)}>{w}</span>
                      ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------------- 트렌드 큐 ---------------- */

function Spark({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) return null;
  const W = 260, H = 48, P = 3;
  const vals = points.map(p => p.freq);
  const max = Math.max(...vals), min = Math.min(...vals);
  const span = max - min || 1;
  const x = (i: number) => P + (i * (W - 2 * P)) / (points.length - 1);
  const y = (v: number) => H - P - ((v - min) / span) * (H - 2 * P);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.freq).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;
  const last = points[points.length - 1];
  return (
    <figure style={{ margin: "10px 0 0" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`언급량 추이: 최저 ${min.toLocaleString()}에서 최고 ${max.toLocaleString()}, 마지막 ${last.freq.toLocaleString()}`}>
        <path d={area} fill={C.accent} opacity="0.14" />
        <path d={line} fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(points.length - 1)} cy={y(last.freq)} r="3" fill={C.accent} />
      </svg>
      <figcaption style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
        {points[0].date ?? points[0].week} → {last.date ?? last.week} · 최고 {max.toLocaleString()}건
      </figcaption>
    </figure>
  );
}

function TrendQueue({ trends }: { trends: Trends | null }) {
  if (!trends) return <p style={{ color: C.muted }}>data/trends.json 이 없습니다.</p>;
  return (
    <section>
      <p style={note}>{trends.method.selection_rule}</p>
      <p style={{ ...note, color: C.muted, fontSize: 11 }}>{trends.method.note}</p>
      <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
        {trends.items.map(t => <TrendCard key={t.id} t={t} />)}
      </div>
    </section>
  );
}

function TrendCard({ t }: { t: TrendItem }) {
  const pts = t.trend_daily ?? t.trend_weekly_last_year ?? [];
  const hot = t.preempt.saturation === "포화";
  return (
    <article style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18 }}>{t.keyword}</h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted }}>
            감지 {t.detected_on} · 피크 예상 {t.peak_forecast}
          </p>
        </div>
        <span style={tag(hot ? C.mid : C.ok)}>{t.status}</span>
      </div>

      <Spark points={pts} />
      <p style={{ fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 1.6 }}>{t.peak_basis}</p>

      {t.related_drinks && t.related_drinks.length > 0 && (
        <p style={{ fontSize: 12, marginTop: 10 }}>
          <span style={{ color: C.muted }}>연관 주류 — </span>
          {t.related_drinks.map(d => `${d.label} ${d.freq}`).join(" · ")}
        </p>
      )}

      <div style={box}>
        <h4 style={h4}>선점 확인 — {t.preempt.saturation}</h4>
        {t.preempt.count !== undefined && (
          <p style={{ fontSize: 12, color: C.muted, margin: "0 0 8px" }}>
            {t.preempt.channel} · {t.preempt.window} · {t.preempt.count}건 확인
          </p>
        )}
        {t.preempt.first_movers.length === 0
          ? <p style={{ fontSize: 13, color: C.ok, margin: 0 }}>먼저 올린 곳 없음 — 선점 가능</p>
          : (
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: 8 }}>
              {t.preempt.first_movers.map(m => (
                <li key={m.url} style={{ fontSize: 12, lineHeight: 1.6 }}>
                  <a href={m.url} target="_blank" rel="noreferrer" style={{ color: C.accent, textDecoration: "none" }}>
                    {m.date.slice(5)} · {m.format}
                  </a>
                  <span style={{ color: C.muted }}> — ♥{m.likes} 💬{m.comments}</span>
                  {m.note && <div style={{ color: C.muted }}>{m.note}</div>}
                </li>
              ))}
            </ul>
          )}
        {t.preempt.crowded_angles && (
          <p style={{ fontSize: 12, color: C.muted, marginTop: 10, marginBottom: 0 }}>
            포화된 각도: {t.preempt.crowded_angles.join(" / ")}
          </p>
        )}
        <p style={{ fontSize: 13, marginTop: 10, marginBottom: 0 }}>
          <strong style={{ color: C.ok }}>비어 있는 각도</strong> — {t.preempt.open_angle}
        </p>
      </div>

      <div style={{ ...box, borderColor: C.accent }}>
        <h4 style={h4}>세왕상사 제안안</h4>
        <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>{t.sewang_angle.title}</p>
        <p style={{ fontSize: 12, color: C.muted, margin: "0 0 8px" }}>형식: {t.sewang_angle.format}</p>
        <p style={{ fontSize: 13, lineHeight: 1.7, margin: "0 0 8px" }}>{t.sewang_angle.content}</p>
        <p style={{ fontSize: 13, lineHeight: 1.7, margin: "0 0 8px" }}>
          <span style={{ color: C.muted }}>우리만 할 수 있는 이유 — </span>{t.sewang_angle.why_us}
        </p>
        <p style={{ fontSize: 13, margin: 0 }}>
          <span style={tag(C.accent)}>권장 게시일 {t.sewang_angle.suggested_date}</span>
          <span style={{ color: C.mid, marginLeft: 8 }}>{t.sewang_angle.deadline_note}</span>
        </p>
      </div>
    </article>
  );
}

/* ---------------- 중복 체크 ---------------- */

function DupCheck({ ops }: { ops: Ops }) {
  const cats = Object.entries(ops.category_counts).sort((a, b) => b[1] - a[1]);
  return (
    <section style={{ display: "grid", gap: 24 }}>
      <div>
        <h3 style={h3}>유사 주제 쌍</h3>
        <p style={note}>회차 이름의 3글자 묶음 겹침으로 판정합니다. 0.25 이상이면 사람이 한 번 봐야 합니다.</p>
        {ops.duplicates.length === 0
          ? <p style={{ color: C.ok, fontSize: 13 }}>겹치는 주제 없음</p>
          : (
            <table style={table}>
              <thead><tr><th style={th}>유사도</th><th style={th}>간격</th><th style={th}>회차 A</th><th style={th}>회차 B</th></tr></thead>
              <tbody>
                {ops.duplicates.map((d, i) => (
                  <tr key={i}>
                    <td style={td}><span style={tag(d.similarity >= 0.45 ? C.high : C.mid)}>{d.similarity}</span></td>
                    <td style={{ ...td, fontSize: 12, color: d.gap_days <= 14 ? C.high : C.muted }}>{d.gap_days}일</td>
                    <td style={{ ...td, fontSize: 12 }}>{d.a}</td>
                    <td style={{ ...td, fontSize: 12 }}>{d.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
      <div>
        <h3 style={h3}>카테고리별 마지막 사용일</h3>
        <p style={note}>같은 카테고리를 연달아 쓰면 피드가 단조로워집니다. 오래 안 쓴 쪽을 고르는 게 안전합니다.</p>
        <table style={table}>
          <thead><tr><th style={th}>카테고리</th><th style={th}>누적</th><th style={th}>마지막</th></tr></thead>
          <tbody>
            {cats.map(([c, n]) => (
              <tr key={c}>
                <td style={{ ...td, fontSize: 13 }}>{c}</td>
                <td style={{ ...td, fontSize: 12, color: C.muted }}>{n}회</td>
                <td style={{ ...td, fontSize: 12, color: C.muted }}>{ops.category_last_used?.[c] ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------------- 분업표 ---------------- */

function Roles({ ops }: { ops: Ops }) {
  return (
    <section>
      <p style={note}>
        네 단계를 네 명이 나눠 들면 핸드오프에서 맥락이 떨어집니다. 그래서 판단과 제작만 쪼개고,
        디자인과 글은 한 사람이 같이 합니다. 승인은 대표님, 네이버 블로그 발행은 ChatGPT입니다.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginTop: 16 }}>
        {ops.roles.map(r => (
          <div key={r.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>{r.name}</h3>
              <span style={tag(r.owner === "대표님" ? C.mid : r.owner === "ChatGPT" ? C.border2 : C.accent)}>{r.owner}</span>
            </div>
            <ul style={{ margin: "10px 0 0", paddingLeft: 16, fontSize: 12.5, lineHeight: 1.8, color: C.fg }}>
              {r.scope.map(s => <li key={s}>{s}</li>)}
            </ul>
            <p style={{ fontSize: 11.5, color: C.muted, marginTop: 10, marginBottom: 0 }}>산출물 — {r.output}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- 공용 ---------------- */

function Kpi({ label, value, tone }: { label: string; value: number | string; tone?: "high" | "mid" | "ok" }) {
  const col = tone === "high" ? C.high : tone === "mid" ? C.mid : tone === "ok" ? C.ok : C.fg;
  return (
    <div style={{ background: C.card, padding: 16, borderRadius: 8, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 11, color: C.muted }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: col }}>{value}</div>
    </div>
  );
}

const wrap: React.CSSProperties = { maxWidth: 1280, margin: "0 auto", padding: 20 };
const h1: React.CSSProperties = { fontSize: 22, fontWeight: 700, margin: 0 };
const h3: React.CSSProperties = { fontSize: 15, fontWeight: 600, margin: "0 0 6px" };
const h4: React.CSSProperties = { fontSize: 13, fontWeight: 700, margin: "0 0 8px" };
const grid4: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 };
const note: React.CSSProperties = { fontSize: 12.5, color: C.muted, lineHeight: 1.7, margin: "0 0 4px" };
const box: React.CSSProperties = { marginTop: 14, padding: 14, borderRadius: 8, border: `1px solid ${C.border}`, background: "#0e131d" };
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", borderBottom: `1px solid ${C.border2}`, fontSize: 11, color: C.muted, fontWeight: 600, whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "9px 10px", borderBottom: `1px solid ${C.border}`, verticalAlign: "top" };
const code: React.CSSProperties = { background: "#0e131d", padding: "2px 6px", borderRadius: 4, fontSize: 12 };
const chip = (active: boolean): React.CSSProperties => ({
  padding: "6px 14px", borderRadius: 999, fontSize: 12.5, cursor: "pointer",
  border: `1px solid ${active ? C.accent : C.border2}`,
  background: active ? C.accent : "transparent", color: active ? "#fff" : C.fg,
});
const tag = (color: string): React.CSSProperties => ({
  display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11,
  border: `1px solid ${color}`, color, marginRight: 4, marginBottom: 2, whiteSpace: "nowrap",
});
