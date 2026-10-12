// Instagram Graph API — ig_config.json 재활용.
// 환경변수: IG_LONG_LIVED_TOKEN, IG_USER_ID (business account id)
import { categorize } from "../lib/categorize";
import type { Post } from "../lib/types";

const TOKEN = process.env.IG_LONG_LIVED_TOKEN || "";
const USER_ID = process.env.IG_USER_ID || "";
const UA = "sewang-sns/0.1";
const FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count";
// IGAA = Instagram Business Login (graph.instagram.com), EAA = FB Login (graph.facebook.com)
const IS_IG_LOGIN = TOKEN.startsWith("IGAA");
const BASE = IS_IG_LOGIN ? "https://graph.instagram.com/v21.0" : "https://graph.facebook.com/v20.0";
const USER_PATH = IS_IG_LOGIN ? "me" : USER_ID;

async function fetchPage(url: string): Promise<{ data: any[]; next?: string }> {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`IG ${r.status}: ${await r.text()}`);
  const j: any = await r.json();
  return { data: j.data ?? [], next: j.paging?.next };
}

async function fetchInsights(mediaId: string): Promise<number> {
  try {
    const url = `${BASE}/${mediaId}/insights?metric=views&access_token=${TOKEN}`;
    const r = await fetch(url);
    if (!r.ok) return 0;
    const j: any = await r.json();
    return Number(j?.data?.[0]?.values?.[0]?.value ?? 0);
  } catch { return 0; }
}

function parseTags(caption: string): string[] {
  return (caption.match(/#\S+/g) ?? []).map(t => t.replace(/^#/, ""));
}

export async function fetchInstagram(limit = 100): Promise<Post[]> {
  if (!TOKEN) {
    console.error("[instagram] IG_LONG_LIVED_TOKEN 미설정 — skip");
    return [];
  }
  const results: Post[] = [];
  let url: string | undefined = `${BASE}/${USER_PATH}/media?fields=${FIELDS}&limit=50&access_token=${TOKEN}`;
  while (url && results.length < limit) {
    const { data, next }: any = await fetchPage(url);
    for (const m of data) {
      const caption = String(m.caption ?? "");
      const tags = parseTags(caption);
      const { category, sub_category } = categorize(caption, tags);
      const views = m.media_type === "VIDEO" || m.media_type === "REELS" ? await fetchInsights(m.id) : 0;
      results.push({
        platform: "instagram",
        post_id: m.id,
        url: m.permalink,
        title_or_caption: caption.slice(0, 200),
        date: m.timestamp?.slice(0, 10) ?? "",
        thumbnail: m.thumbnail_url || m.media_url || null,
        metrics: { views, likes: m.like_count ?? 0, comments: m.comments_count ?? 0 },
        category, sub_category, tags,
        fetched_at: new Date().toISOString(),
      });
      if (results.length >= limit) break;
    }
    url = next;
  }
  return results;
}

if (require.main === module) {
  fetchInstagram().then(posts => {
    console.log(JSON.stringify(posts, null, 2));
    console.error(`\n[instagram] fetched ${posts.length} posts`);
  }).catch(e => { console.error(e); process.exit(1); });
}
