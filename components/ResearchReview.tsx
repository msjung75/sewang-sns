"use client";

import { useCallback, useEffect, useId, useState } from "react";
import styles from "./ResearchReview.module.css";

type Evidence = {
  id: string; title: string; url: string; published_at: string; collected_at: string;
  source_type: string; summary: string; verification: string; limitations: string[];
};
type Candidate = {
  id: string; title: string; summary: string; evidence_ids: string[];
  counter_evidence: string[]; uncertainties: string[]; relevance: string[]; recommendation: string[];
  duplicate_check: DuplicateCheck;
};
type DuplicateCheck = {
  status: "exact" | "similar" | "none" | "unavailable"; requires_review: boolean;
  matches: { post: { platform: string; post_id: string; url: string; title_or_caption: string; date: string; category: string; tags: string[] }; score: number | null; reason: string[]; matched_terms: string[] }[];
  method: string; limitations: string[]; history_version: string;
};
type Snapshot = { content_hash: string; collected_at: string; evidence: Evidence[]; candidates: Candidate[] };
type DecisionAction = "select" | "research" | "hold";
const decisionLabels: Record<DecisionAction, string> = { select: "대표 주제 선택", research: "추가 조사 요청", hold: "보류" };
const sourceLabels: Record<string, string> = {
  "youtube.sometrend": "YouTube · 썸트렌드 수집", "sometrend.social": "썸트렌드 · 블로그",
  "apify.dataset": "Apify · 공개 게시물", "news.search": "공개 뉴스", "public_news": "공개 뉴스",
};
const verificationLabels: Record<string, string> = {
  UNVERIFIED: "미검증 · 사실 확인 필요", VERIFIED: "검증 완료 표시 · 근거 확인", PARTIAL: "일부 검증",
  NEEDS_REVIEW: "검토 필요", REJECTED: "검증 반려",
};
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function text(value: unknown, max = 3000): string { return typeof value === "string" ? value.slice(0, max) : ""; }
function texts(value: unknown): string[] {
  return (Array.isArray(value) ? value : [value]).filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 30).map(item => item.slice(0, 3000));
}
function parseDuplicate(value: unknown): DuplicateCheck {
  const row = object(value);
  const status = typeof row.requires_review === "boolean" && Array.isArray(row.matches) &&
    (row.status === "exact" || row.status === "similar" || row.status === "none") ? row.status : "unavailable";
  const matches = Array.isArray(row.matches) ? row.matches.slice(0, 20).map(item => {
    const match = object(item), post = object(match.post);
    return { post: { platform: text(post.platform, 80), post_id: text(post.post_id, 200), url: text(post.url, 2048), title_or_caption: text(post.title_or_caption, 1000), date: text(post.date, 60), category: text(post.category, 100), tags: texts(post.tags) },
      score: typeof match.score === "number" && Number.isFinite(match.score) ? match.score : null,
      reason: texts(match.reason), matched_terms: texts(match.matched_terms) };
  }) : [];
  return { status, requires_review: row.requires_review === true || status === "exact" || status === "similar", matches, method: text(row.method, 1000), limitations: texts(row.limitations), history_version: text(row.history_version, 128) };
}
function parseSnapshot(value: unknown): Snapshot | null {
  const raw = object(value);
  if (!Array.isArray(raw.evidence) || !Array.isArray(raw.candidates)) return null;
  const evidence = raw.evidence.slice(0, 200).map(item => {
    const row = object(item);
    return { id: text(row.id, 100), title: text(row.title, 500), url: text(row.url, 2048),
      published_at: text(row.published_at, 60), collected_at: text(row.collected_at, 60),
      source_type: text(row.source_type, 100), summary: text(row.summary),
      verification: text(row.verification, 500), limitations: texts(row.limitations) };
  }).filter(row => row.id);
  const candidates = raw.candidates.slice(0, 30).map(item => {
    const row = object(item);
    return { id: text(row.id, 100), title: text(row.title, 500), summary: text(row.summary),
      evidence_ids: texts(row.evidence_ids), counter_evidence: texts(row.counter_evidence),
      uncertainties: texts(row.uncertainties), relevance: texts(row.relevance), recommendation: texts(row.recommendation), duplicate_check: parseDuplicate(row.duplicate_check) };
  }).filter(row => row.id);
  return { content_hash: text(raw.content_hash, 128), collected_at: text(raw.collected_at, 60), evidence, candidates };
}
function sourceUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}
function duplicateKey(value: string): string {
  try { const url = new URL(value); url.hash = ""; return url.href; } catch { return value; }
}
function at(value: string): string {
  if (!value) return "미확인";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value + " (시각 미제공)";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "미확인" : date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}
function TextList({ values, empty }: { values: string[]; empty: string }) {
  return values.length ? <ul className={styles.notes}>{values.map((value, index) => <li key={index}>{value}</li>)}</ul> : <p className="ai-muted">{empty}</p>;
}

export function ResearchReview() {
  const panelId = useId();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [decisions, setDecisions] = useState<Record<string, DecisionAction>>({});
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [duplicateReviewed, setDuplicateReviewed] = useState<Record<string, boolean>>({});

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai-center/research", { cache: "no-store", credentials: "same-origin", signal });
      if (!response.ok) throw new Error("research_unavailable");
      const data: unknown = await response.json();
      if (signal?.aborted) return;
      const incoming = object(data).snapshot;
      if (incoming === null) { setSnapshot(null); setDecisions({}); return; }
      const parsed = parseSnapshot(incoming);
      if (!parsed) throw new Error("research_unavailable");
      setSnapshot(parsed);
      setDuplicateReviewed({});
      const saved: Record<string, DecisionAction> = {};
      const rows = object(data).decisions;
      if (Array.isArray(rows)) for (const item of rows.slice(0, 100)) {
        const row = object(item);
        if (row.expected_hash === parsed.content_hash && typeof row.candidate_id === "string" &&
            (row.action === "select" || row.action === "research" || row.action === "hold")) {
          saved[row.candidate_id] = row.action;
        }
      }
      setDecisions(saved);
    } catch {
      if (!signal?.aborted) setError("조사 자료를 불러오지 못했습니다. 연결과 로그인 상태를 확인하세요.");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function decide(candidate: Candidate, action: DecisionAction) {
    if (!snapshot?.content_hash || busy || loading) return;
    if (action === "select" && (error || candidate.duplicate_check.status === "unavailable")) return;
    if (action === "select" && candidate.duplicate_check.requires_review &&
        (!duplicateReviewed[candidate.id] || !(notes[candidate.id] || "").trim())) {
      setError("기존 게시물을 확인하고 차별점을 의견에 적은 뒤 검토 확인에 체크하세요.");
      return;
    }
    setBusy(candidate.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/ai-center/research/decision", {
        method: "POST", cache: "no-store", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_id: candidate.id, action, expected_hash: snapshot.content_hash, note: notes[candidate.id] || "", ...(action === "select" ? { duplicate_reviewed: duplicateReviewed[candidate.id] === true, history_version: candidate.duplicate_check.history_version } : {}) }),
      });
      if (!response.ok) {
        setError(response.status === 409 ? "조사 자료가 갱신되었습니다. 최신 자료를 다시 불러온 뒤 선택하세요." : "선택을 저장하지 못했습니다. 연결과 로그인 상태를 확인한 뒤 다시 시도하세요.");
        return;
      }
      setDecisions(previous => ({ ...previous, [candidate.id]: action }));
      setNotice(`「${candidate.title}」의 ${decisionLabels[action]}을 기록했습니다. ${action === "hold" ? "후보를 보류했습니다." : "검토 작업 대기 상태이며 후속 작업은 15분 주기로 확인합니다."} 원고 승인이나 발송 예약은 수행하지 않았습니다.`);
    } catch { setError("연결을 확인한 뒤 다시 시도하세요."); }
    finally { setBusy(null); }
  }

  const evidenceById = new Map(snapshot?.evidence.map(item => [item.id, item]) || []);
  const duplicateCounts = new Map<string, number>();
  for (const item of snapshot?.evidence || []) {
    if (item.url) duplicateCounts.set(duplicateKey(item.url), (duplicateCounts.get(duplicateKey(item.url)) || 0) + 1);
  }
  return <section className="ai-panel" aria-labelledby={`${panelId}-heading`} aria-busy={loading || Boolean(busy)}>
    <div className={styles.heading}><div><p className="ai-kicker">조사 → 대표 방향 선택</p><h2 id={`${panelId}-heading`}>조사 근거와 이번 주 주제 후보</h2></div>
      <button type="button" className="ai-secondary" disabled={loading || Boolean(busy)} onClick={() => void load()}>최신 자료 확인</button></div>
    <p>수집 자료를 토대로 후보를 비교하고 다룰 방향을 선택합니다. AI 추천은 검토 의견이며 대표님의 선택과 구분해 기록합니다.</p>
    <p className="ai-muted">주제 선택은 원고 승인·번역 승인·발송 예약이 아닙니다. 대표님의 주제 입력은 선택 사항이며, 아래 원고 작성란에서 제안할 수 있습니다.</p>
    {error && <p className="ai-error" role="alert">{error}</p>}{notice && <p className="ai-notice" role="status">{notice}</p>}
    {loading && <p role="status">조사 자료를 확인하고 있습니다…</p>}
    {!loading && !snapshot && !error && <p className="ai-muted">아직 가져온 조사 자료가 없습니다. 자료가 수신되면 근거와 후보를 표시합니다.</p>}
    {snapshot && <>
      <p className="ai-muted">자료 수집 시각 {at(snapshot.collected_at)} · 근거 {snapshot.evidence.length}건 · 주제 후보 {snapshot.candidates.length}건 · 한국 시간</p>
      <h3>AI가 정리한 주제 후보</h3>
      {!snapshot.candidates.length && <p className="ai-muted">아직 주제 후보가 없습니다. 아래 수집 자료는 확인할 수 있습니다.</p>}
      <div className={styles.candidates}>{snapshot.candidates.map(candidate => <article className={styles.card} key={candidate.id}>
        <h4>{candidate.title || "제목 미확인"}</h4><p>{candidate.summary}</p>
        <h5>거래처 관련성</h5><TextList values={candidate.relevance} empty="관련성이 아직 정리되지 않았습니다."/>
        <h5>AI 추천 이유 · 대표 선택과 별개</h5><TextList values={candidate.recommendation} empty="아직 추천 이유가 없습니다."/>
        <h5>근거 자료</h5>{candidate.evidence_ids.length ? <ul className={styles.notes}>{candidate.evidence_ids.map((id, index) => {
          const item = evidenceById.get(id);
          return <li key={`${id}-${index}`}>{item ? <a href={`#${panelId}-evidence-${encodeURIComponent(id)}`} onClick={() => setEvidenceOpen(true)}>{item.title || "제목 미확인"}</a> : "이번 자료에서 해당 참조 근거를 확인하지 못했습니다."}</li>;
        })}</ul> : <p className="ai-muted">연결된 근거가 없습니다.</p>}
        <h5>반대 근거·다른 설명</h5><TextList values={candidate.counter_evidence} empty="현재 조사 범위에서 미확인입니다. 반대 근거가 없다는 뜻은 아닙니다."/>
        <h5>불확실성·추가 확인</h5><TextList values={candidate.uncertainties} empty="불확실성이 아직 정리되지 않았습니다. 검증 완료를 뜻하지 않습니다."/>
        <section className={styles.duplicate} aria-label="기존 게시 이력과의 중복 검토"><h5>기존 게시 이력과 비교</h5>
          <p>{({ exact: "같거나 매우 가까운 게시 이력 확인", similar: "유사한 게시 이력 확인", none: "가져온 이력에서 중복 후보 미검출", unavailable: "중복 검사 결과를 확인하지 못했습니다. 주제 선택 전에 최신 자료를 다시 확인하세요." })[candidate.duplicate_check.status]}</p>
          <p className="ai-muted">검출 없음은 중복 없음의 증명이 아닙니다. 가져온 게시 이력의 범위와 보관된 본문에 한계가 있습니다.</p>
          {candidate.duplicate_check.matches.length > 0 && <ul className={styles.notes}>{candidate.duplicate_check.matches.map((match, index) => <li key={`${match.post.platform}-${match.post.post_id}-${index}`}>
            <strong>{sourceUrl(match.post.url) ? <a href={sourceUrl(match.post.url)} target="_blank" rel="noopener noreferrer">{match.post.title_or_caption || "기존 원문 확인"} ↗</a> : match.post.title_or_caption || "제목 미확인"}</strong>
            <p className="ai-muted">{match.post.platform || "채널 미확인"} · 게시 {at(match.post.date)} · {match.post.category || "미분류"}</p>
            <TextList values={match.reason} empty="겹치는 이유는 아직 정리되지 않았습니다."/>
            {match.matched_terms.length > 0 && <p>겹치는 표현: {match.matched_terms.join(" · ")}</p>}
          </li>)}</ul>}
          {candidate.duplicate_check.method && <p className="ai-muted">검사 방법: {candidate.duplicate_check.method}</p>}
          <TextList values={candidate.duplicate_check.limitations} empty="검사 범위의 상세 한계는 미확인입니다."/>
          {candidate.duplicate_check.requires_review && <label className={styles.checkbox} htmlFor={`${panelId}-duplicate-${candidate.id}`}><input id={`${panelId}-duplicate-${candidate.id}`} type="checkbox" checked={duplicateReviewed[candidate.id] === true} disabled={Boolean(busy)} onChange={event => setDuplicateReviewed(previous => ({ ...previous, [candidate.id]: event.target.checked }))}/><span>기존 글을 확인했고 차별점을 검토했습니다</span></label>}
        </section>
        <label htmlFor={`${panelId}-note-${candidate.id}`}>{candidate.duplicate_check.requires_review ? "선택 시 차별점·다시 다룰 이유 필수 · 추가 조사·보류 의견은 선택 사항" : "선택·추가 조사·보류 의견 (선택 사항)"}<textarea id={`${panelId}-note-${candidate.id}`} maxLength={1000} disabled={Boolean(busy)} value={notes[candidate.id] || ""} onChange={event => setNotes(previous => ({ ...previous, [candidate.id]: event.target.value }))}/></label>
        {decisions[candidate.id] && <p className={styles.decision}>대표 기록: {decisionLabels[decisions[candidate.id]]}</p>}
        <div className="ai-actions">{(["select", "research", "hold"] as const).map(action => <button key={action} type="button" className={action === "select" ? undefined : "ai-secondary"} disabled={loading || Boolean(busy) || !snapshot.content_hash || (action === "select" && (Boolean(error) || candidate.duplicate_check.status === "unavailable" || (candidate.duplicate_check.requires_review && (!duplicateReviewed[candidate.id] || !(notes[candidate.id] || "").trim()))))} onClick={() => void decide(candidate, action)}>{busy === candidate.id ? "저장 중…" : decisionLabels[action]}</button>)}</div>
        {!snapshot.content_hash && <p className="ai-muted">자료 버전을 확인하지 못해 선택을 저장할 수 없습니다.</p>}
      </article>)}</div>
      <details open={evidenceOpen} onToggle={event => setEvidenceOpen(event.currentTarget.open)}><summary>수집 근거 전체 확인 ({snapshot.evidence.length}건)</summary>
        <p className="ai-muted">소수 SNS 게시물·언급량·조회수는 시장 전체 매출이나 수요를 뜻하지 않습니다. 중복 URL은 독립 근거 여러 건으로 세지 않으며 게시일과 수집일을 구분해 확인하세요.</p>
        <div className={styles.evidence}>{snapshot.evidence.map(item => <article id={`${panelId}-evidence-${encodeURIComponent(item.id)}`} className={styles.card} key={item.id}>
          <p className="ai-kicker">{sourceLabels[item.source_type] || item.source_type || "출처 유형 미확인"}</p>
          <h4>{sourceUrl(item.url) ? <a href={sourceUrl(item.url)} target="_blank" rel="noopener noreferrer">{item.title || "원문 확인"} ↗</a> : item.title || "제목 미확인"}</h4>
          <p className={styles.verification}>{verificationLabels[item.verification.toUpperCase()] || item.verification || "검증 상태 미확인"}</p>
          <p className="ai-muted">게시 {at(item.published_at)}<br/>수집 {at(item.collected_at)}</p><p>{item.summary}</p>
          {(duplicateCounts.get(duplicateKey(item.url)) || 0) > 1 && <p className="ai-muted">같은 URL 자료가 {duplicateCounts.get(duplicateKey(item.url))}건 있습니다. 중복 가능성이 있습니다.</p>}
          <h5>자료의 한계</h5><TextList values={item.limitations} empty="한계가 기록되지 않았습니다. 사실 확인과 출처 품질 점검이 필요합니다."/>
          {!sourceUrl(item.url) && <p className="ai-muted">안전하게 열 수 있는 원문 URL을 확인하지 못했습니다.</p>}
        </article>)}</div>
      </details>
    </>}
  </section>;
}
