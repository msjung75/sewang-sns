// POST /api/refresh → GitHub Actions workflow_dispatch 트리거
// 환경변수 GH_DISPATCH_TOKEN (repo scope) 필요
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const token = process.env.GH_DISPATCH_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "GH_DISPATCH_TOKEN 미설정 (Vercel env var)" }, { status: 500 });
  }
  const r = await fetch("https://api.github.com/repos/msjung75/sewang-sns/actions/workflows/fetch.yml/dispatches", {
    method: "POST",
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref: "main" }),
  });
  if (!r.ok) {
    return NextResponse.json({ error: `GitHub API ${r.status}: ${await r.text()}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true, msg: "데이터 수집 시작됨. 1~2분 후 사이트 자동 재배포됩니다." });
}
