"use client";

import { type FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import styles from "./PublicationHistory.module.css";

type Post = { platform: string; post_id: string; url: string; title_or_caption: string; date: string; category: string; tags: string[]; body: string; content_scope: string };
type Result = { posts: Post[]; total: number; coverage: { count: number; fetched_at: string; platforms: Record<string, number>; limitations: string[] }; categories: string[] };
const emptyFilters = { q: "", platform: "", from: "", to: "", category: "" };
const platformNames: Record<string, string> = { instagram: "인스타그램", blog: "블로그", naver_blog: "네이버 블로그", naver: "네이버 블로그", report: "주간 리포트", kakao: "카카오 채널", youtube: "유튜브" };
function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown, cap = 3000) { return typeof value === "string" ? value.slice(0, cap) : ""; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 100).map(item => item.slice(0, 1000)) : []; }
function count(value: unknown) { return typeof value === "number" && Number.isInteger(value) && value >= 0 ? Math.min(value, 1_000_000) : 0; }
function parse(value: unknown): Result {
  const data = record(value), coverage = record(data.coverage), platforms: Record<string, number> = {};
  if (!Array.isArray(data.posts)) throw new Error("history_unavailable");
  for (const [key, value] of Object.entries(record(coverage.platforms)).slice(0, 30)) platforms[key.slice(0, 80)] = count(value);
  return { posts: data.posts.slice(0, 500).map(item => { const row = record(item); return {
    platform: text(row.platform, 80), post_id: text(row.post_id, 200), url: text(row.url, 2048),
    title_or_caption: text(row.title_or_caption, 10000), date: text(row.date, 60), category: text(row.category, 200),
    tags: strings(row.tags), body: text(row.body, 50000), content_scope: text(row.content_scope, 500),
  }; }), total: count(data.total), coverage: { count: count(coverage.count), fetched_at: text(coverage.fetched_at, 60), platforms, limitations: strings(coverage.limitations) }, categories: strings(data.categories) };
}
function url(value: string) { try { const parsed = new URL(value); return ["https:", "http:"].includes(parsed.protocol) && !parsed.username && !parsed.password ? parsed.href : undefined; } catch { return undefined; } }
function dateLabel(value: string) { if (!value) return "미확인"; if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value; const date = new Date(value); return Number.isNaN(date.getTime()) ? "미확인" : date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }); }

export function PublicationHistory() {
  const id = useId();
  const [filters, setFilters] = useState(emptyFilters);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const search = useCallback(async (values: typeof emptyFilters) => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError("");
    const query = new URLSearchParams(values);
    try {
      const response = await fetch("/api/ai-center/history?" + query.toString(), { cache: "no-store", credentials: "same-origin", signal: controller.signal });
      if (!response.ok) throw new Error("history_unavailable");
      const data = parse(await response.json());
      if (!controller.signal.aborted) setResult(data);
    } catch { if (!controller.signal.aborted) setError("게시 이력을 불러오지 못했습니다. 연결과 로그인 상태를 확인한 뒤 다시 검색하세요."); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, []);
  useEffect(() => { void search(emptyFilters); return () => request.current?.abort(); }, [search]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (filters.from && filters.to && filters.from > filters.to) { setError("시작일은 종료일보다 늦을 수 없습니다."); return; }
    void search(filters);
  }
  return <details className="ai-panel"><summary className={styles.summary}>기존 게시 이력 검색 · 중복 주제 확인</summary>
    <section aria-labelledby={`${id}-heading`} aria-busy={loading}>
      <h2 id={`${id}-heading`}>가져온 기존 게시 이력</h2>
      <p>예전에 다룬 주제·거래처·게시물을 찾아 이번 후보와 비교합니다. 이 목록은 수집된 게시 이력이며 승인 대기 원고나 발행 준비 목록과 별개입니다.</p>
      <form onSubmit={submit}><div className={styles.filters}>
        <label htmlFor={`${id}-q`}>키워드 · 제목·보관 본문·태그·거래처<input id={`${id}-q`} value={filters.q} maxLength={300} onChange={event => setFilters({ ...filters, q: event.target.value })} placeholder="예: 하이볼, 잔술, 거래처명"/></label>
        <label htmlFor={`${id}-platform`}>채널<select id={`${id}-platform`} value={filters.platform} onChange={event => setFilters({ ...filters, platform: event.target.value })}><option value="">전체 채널</option>{Object.keys(result?.coverage.platforms || {}).map(platform => <option key={platform} value={platform}>{platformNames[platform] || platform}</option>)}</select></label>
        <label htmlFor={`${id}-from`}>게시 시작일<input id={`${id}-from`} type="date" value={filters.from} onChange={event => setFilters({ ...filters, from: event.target.value })}/></label>
        <label htmlFor={`${id}-to`}>게시 종료일<input id={`${id}-to`} type="date" value={filters.to} onChange={event => setFilters({ ...filters, to: event.target.value })}/></label>
        <label htmlFor={`${id}-category`}>분류<select id={`${id}-category`} value={filters.category} onChange={event => setFilters({ ...filters, category: event.target.value })}><option value="">전체 분류</option>{result?.categories.map(category => <option value={category} key={category}>{category}</option>)}</select></label>
      </div><div className="ai-actions"><button type="submit" disabled={loading}>검색</button><button type="button" className="ai-secondary" disabled={loading} onClick={() => { setFilters(emptyFilters); void search(emptyFilters); }}>검색 초기화</button></div></form>
      {error && <p className="ai-error" role="alert">{error}</p>}{loading && <p role="status">게시 이력을 검색하고 있습니다…</p>}
      {result && <>
        <aside className={styles.coverage}><h3>검색 범위와 한계</h3><p>가져온 이력 {result.coverage.count}건 · 자료 갱신 {dateLabel(result.coverage.fetched_at)} · 한국 시간</p>
          <p>{Object.entries(result.coverage.platforms).map(([platform, total]) => `${platformNames[platform] || platform} ${total}건`).join(" · ") || "채널별 범위 미확인"}</p>
          <p>검색 결과가 없다고 과거에 발행하지 않았다는 뜻은 아닙니다. 보관되지 않은 본문·누락 채널·최근 게시물은 검색에서 빠질 수 있습니다.</p>
          {result.coverage.limitations.length > 0 && <ul>{result.coverage.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul>}
        </aside>
        <p role="status">검색 결과 {result.total}건{result.total > result.posts.length ? ` · 현재 ${result.posts.length}건 표시` : ""}{loading || error ? " · 아래는 이전에 조회한 결과입니다." : ""}</p>
        {!result.posts.length && !loading && !error && <p className="ai-muted">가져온 이력에서 일치하는 결과를 찾지 못했습니다. 키워드나 날짜 범위를 넓혀보세요.</p>}
        <div className={styles.posts}>{result.posts.map((post, index) => <article className={styles.post} key={`${post.platform}-${post.post_id}-${index}`}>
          <p className="ai-kicker">{platformNames[post.platform] || post.platform || "채널 미확인"} · {dateLabel(post.date)} · {post.category || "미분류"}</p>
          <h3>{url(post.url) ? <a href={url(post.url)} target="_blank" rel="noopener noreferrer">{post.title_or_caption.slice(0, 180) || "원문 확인"} ↗</a> : post.title_or_caption.slice(0, 180) || "제목 미확인"}</h3>
          <p className={styles.snippet}>{(post.body || post.title_or_caption).slice(0, 400)}{(post.body || post.title_or_caption).length > 400 ? "…" : ""}</p>
          {post.tags.length > 0 && <p className="ai-muted">태그 {post.tags.join(" · ")}</p>}
          <p className="ai-muted">본문 보관 범위: {post.content_scope || (post.body ? "저장된 본문만 검색" : "제목·캡션·태그 중심 · 본문 미보관")}</p>
          {post.body && <details><summary>보관된 본문 보기</summary><p className={styles.body}>{post.body}</p></details>}
          {!url(post.url) && <p className="ai-muted">안전하게 열 수 있는 원문 링크 미확인</p>}
        </article>)}</div>
      </>}
    </section>
  </details>;
}
