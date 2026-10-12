import { fetchInstagram } from "./fetch_instagram";
import { fetchYoutube } from "./fetch_youtube";
import { fetchNaver } from "./fetch_naver";
import { applyOverrides } from "../lib/categorize";
import fs from "node:fs/promises";
import path from "node:path";
import type { CategoryOverride, Post } from "../lib/types";

async function main() {
  const [ig, yt, nv] = await Promise.allSettled([fetchInstagram(), fetchYoutube(), fetchNaver()]);
  const posts: Post[] = [];
  const summary: Record<string, number | string> = {};
  for (const [name, r] of [["instagram", ig], ["youtube", yt], ["naver", nv]] as const) {
    if (r.status === "fulfilled") {
      posts.push(...r.value);
      summary[name] = r.value.length;
    } else {
      summary[name] = `ERROR: ${(r.reason as Error).message}`;
    }
  }

  // override 적용
  const ovPath = path.join(process.cwd(), "data", "category_overrides.json");
  try {
    const raw = await fs.readFile(ovPath, "utf8");
    const list: CategoryOverride[] = JSON.parse(raw);
    const map = Object.fromEntries(list.map(o => [`${o.platform}:${o.post_id}`, { category: o.category, sub_category: o.sub_category }]));
    const applied = applyOverrides(posts, map);
    await writeOut(applied, summary);
  } catch {
    await writeOut(posts, summary);
  }
}

async function writeOut(posts: Post[], summary: Record<string, number | string>) {
  const outPath = path.join(process.cwd(), "data", "posts.json");
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify({ fetched_at: new Date().toISOString(), summary, posts }, null, 2));
  console.log(`[fetch_all] wrote ${posts.length} posts →`, outPath);
  console.log("summary:", summary);
}

main().catch(e => { console.error(e); process.exit(1); });
