"use client";
import { useState } from "react";

export function RefreshButton() {
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState<string>("");

  async function trigger() {
    setState("loading"); setMsg("");
    try {
      const r = await fetch("/api/refresh", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "요청 실패");
      setState("ok");
      setMsg(j.msg || "요청 전송됨");
      // 2분 후 자동 새로고침 (재배포 반영)
      setTimeout(() => location.reload(), 120000);
    } catch (e: any) {
      setState("error");
      setMsg(e.message || "에러");
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button onClick={trigger} disabled={state === "loading"} style={{
        padding: "8px 16px", borderRadius: 6,
        border: "1px solid " + (state === "error" ? "#ef4444" : "var(--accent)"),
        background: state === "loading" ? "transparent" : "var(--accent)",
        color: state === "loading" ? "var(--muted)" : "#fff",
        cursor: state === "loading" ? "wait" : "pointer",
        fontSize: 13, fontWeight: 500,
      }}>
        {state === "loading" ? "⏳ 수집 중…" : "🔄 데이터 새로고침"}
      </button>
      {msg && <span style={{ fontSize: 12, color: state === "error" ? "#ef4444" : "var(--muted)" }}>{msg}</span>}
    </div>
  );
}
