import { NextResponse } from "next/server";
import { fetchInstagram } from "../../../../scripts/fetch_instagram";
import { fetchYoutube } from "../../../../scripts/fetch_youtube";
import { fetchNaver } from "../../../../scripts/fetch_naver";
import fs from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  const [ig, yt, nv] = await Promise.allSettled([fetchInstagram(), fetchYoutube(), fetchNaver()]);
  const posts: any[] = [];
  const summary: Record<string, number | string> = {};
  for (const [name, r] of [["instagram", ig], ["youtube", yt], ["naver", nv]] as const) {
    if (r.status === "fulfilled") { posts.push(...r.value); summary[name] = r.value.length; }
    else summary[name] = `ERROR: ${(r.reason as Error).message}`;
  }
  const outPath = path.join(process.cwd(), "data", "posts.json");
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify({ fetched_at: new Date().toISOString(), summary, posts }, null, 2));
  return NextResponse.json({ ok: true, summary, count: posts.length });
}
