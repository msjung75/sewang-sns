"use client";

import { type FormEvent, useEffect, useId, useState } from "react";

export function PasswordSettings() {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    fetch("/api/ai-center/password", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("settings_unavailable");
      const data: unknown = await response.json();
      if (!data || typeof data !== "object" || !("initialized" in data) || typeof data.initialized !== "boolean") {
        throw new Error("settings_unavailable");
      }
      if (active) setInitialized(data.initialized);
    }).catch(() => {
      if (active) setLoadError(true);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  function clearInputs() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmation("");
  }

  function cancel() {
    clearInputs();
    setError("");
    setOpen(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || initialized === null || loadError) return;
    setError("");
    setNotice("");
    if (initialized && !currentPassword) {
      setError("현재 비밀번호를 입력하세요.");
      return;
    }
    if (newPassword.length < 12 || newPassword.length > 128) {
      setError("새 비밀번호는 12자 이상 128자 이하로 입력하세요.");
      return;
    }
    if (newPassword !== confirmation) {
      setError("새 비밀번호와 확인 입력이 일치하지 않습니다.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/ai-center/password", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          current_password: initialized ? currentPassword : "",
          new_password: newPassword,
          confirm_password: confirmation,
        }),
      });
      if (!response.ok) {
        setError(
          response.status === 401
            ? "현재 비밀번호와 로그인 상태를 확인하세요."
            : response.status === 429
              ? "요청이 많습니다. 잠시 후 다시 시도하세요."
              : response.status === 400
                ? "입력한 비밀번호의 길이와 확인 입력을 다시 확인하세요."
                : "비밀번호를 변경하지 못했습니다. 잠시 후 다시 시도하세요.",
        );
        return;
      }
      clearInputs();
      setOpen(false);
      setNotice(initialized
        ? "비밀번호 변경 완료. 현재 로그인은 유지되며, 이전 비밀번호는 더 이상 사용할 수 없습니다."
        : "새 비밀번호 설정 완료. 현재 로그인은 유지되며, 이제 설정한 비밀번호로 로그인할 수 있습니다.");
      setInitialized(true);
    } catch {
      setError("연결을 확인한 뒤 다시 시도하세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="ai-panel" aria-label="비밀번호 설정">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={formId}
        disabled={submitting}
        onClick={() => {
          if (open) cancel();
          else {
            setNotice("");
            setError("");
            setOpen(true);
          }
        }}
      >
        비밀번호 설정·변경
      </button>
      {notice && <p className="ai-notice" role="status">{notice}</p>}
      {open && (
        <form id={formId} onSubmit={submit} aria-busy={submitting}>
          <h2>비밀번호 설정·변경</h2>
          {initialized === null && !loadError && <p role="status">비밀번호 설정 상태를 확인하고 있습니다…</p>}
          {loadError && <p className="ai-error" role="alert">설정 상태를 확인하지 못했습니다. 연결을 확인한 뒤 페이지를 새로 열어주세요.</p>}
          {initialized !== null && <p>{initialized ? "현재 비밀번호와 사용할 새 비밀번호를 직접 입력하세요." : "사용할 새 비밀번호를 직접 입력하세요."} 새 비밀번호는 12~128자로 설정하세요.</p>}
          {error && <p className="ai-error" role="alert">{error}</p>}
          <fieldset disabled={submitting || initialized === null || loadError} style={{ border: 0, padding: 0, margin: 0 }}>
            {initialized && <>
            <label htmlFor={`${formId}-current`}>현재 비밀번호</label>
            <input
              id={`${formId}-current`}
              name="current_password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
            </>}
            <label htmlFor={`${formId}-new`}>새 비밀번호</label>
            <input
              id={`${formId}-new`}
              name="new_password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
            <label htmlFor={`${formId}-confirm`}>새 비밀번호 확인</label>
            <input
              id={`${formId}-confirm`}
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              required
            />
            <div className="ai-actions">
              <button type="submit">{submitting ? "저장 중…" : initialized === false ? "새 비밀번호 설정" : "비밀번호 변경"}</button>
              <button type="button" className="ai-secondary" onClick={cancel}>취소</button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}
