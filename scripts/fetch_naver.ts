// 네이버 블로그 수집:
// 1) RSS → 포스트 목록
// 2) 모바일 포스트 페이지 → 조회수 (SPA면 Puppeteer 필요 — MVP는 inline 시도)
// 3) blog.like.naver.com public API → 공감(likes)
// 4) blog.naver.com/CommentList.naver → 댓글 수
import { XMLParser } from "fast-xml-parser";
import { categorize } from "../lib/categorize";
import type { Post } from "../lib/types";

const BLOG_ID = process.env.NAVER_BLOG_ID || "sewang88";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)";

async function fetchRss(): Promise<Array<{ title: string; link: string; description: string; pubDate: string; category?: string; tag?: string }>> {
  const url = `https://rss.blog.naver.com/${BLOG_ID}.xml`;
  const xml = await fetch(url, { headers: { "User-Agent": UA } }).then(r => r.text());
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
  const items = parsed?.rss?.channel?.item ?? [];
  return (Array.isArray(items) ? items : [items]).map((it: any) => ({
    title: String(it.title ?? ""),
    link: String(it.link ?? ""),
    description: String(it.description ?? ""),
    pubDate: String(it.pubDate ?? ""),
    category: it.category ? String(it.category) : undefined,
    tag: it.tag ? String(it.tag) : undefined,
  }));
}

function extractLogNo(link: string): string | null {
  const m = link.match(/sewang88\/(\d+)/) || link.match(/logNo=(\d+)/);
  return m ? m[1] : null;
}

function extractThumbnail(description: string): string | null {
  const m = description.match(/<img[^>]+src=["']([^"']+)["']/);
  return m ? m[1] : null;
}

async function fetchLikes(logNo: string): Promise<number> {
  try {
    const q = encodeURIComponent(`BLOG[${BLOG_ID}_${logNo}]`);
    const url = `https://blog.like.naver.com/v1/search/contents?suppress_response_codes=true&q=${q}&isDuplication=false&cssIds=BASIC_MOBILE&displayId=MBLOG`;
    const data: any = await fetch(url, { headers: { "User-Agent": UA } }).then(r => r.json());
    const reactions = data?.contents?.[0]?.reactions ?? [];
    return reactions.reduce((sum: number, r: any) => sum + (r.count ?? 0), 0);
  } catch { return 0; }
}

async function fetchCommentCount(logNo: string): Promise<number> {
  try {
    const url = `https://blog.naver.com/CommentList.naver?blogId=${BLOG_ID}&logNo=${logNo}&categoryNo=0&parentCommentNo=&page=1`;
    const html = await fetch(url, { headers: { "User-Agent": UA } }).then(r => r.text());
    // 패턴 1: "전체 N" / 패턴 2: data-total-count="N"
    const m1 = html.match(/전체[^0-9]{0,5}(\d+)/);
    const m2 = html.match(/totalCount["']?\s*[:=]\s*["']?(\d+)/);
    return Number((m1 ?? m2)?.[1] ?? 0);
  } catch { return 0; }
}

async function fetchViewCount(logNo: string): Promise<number> {
  // Naver 모바일 페이지에서 inline 추출 시도. SPA면 0 리턴 (추후 puppeteer 전환).
  try {
    const url = `https://m.blog.naver.com/${BLOG_ID}/${logNo}`;
    const html = await fetch(url, { headers: { "User-Agent": UA } }).then(r => r.text());
    const m = html.match(/조회수[^0-9]{0,10}(\d[\d,]*)/) || html.match(/visitorCount["']?\s*[:=]\s*["']?(\d+)/);
    return Number((m?.[1] ?? "0").replace(/,/g, ""));
  } catch { return 0; }
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export async function fetchNaver(): Promise<Post[]> {
  const items = await fetchRss();
  const results: Post[] = [];
  for (const it of items) {
    const logNo = extractLogNo(it.link);
    if (!logNo) continue;
    const [likes, comments, views] = await Promise.all([
      fetchLikes(logNo), fetchCommentCount(logNo), fetchViewCount(logNo)
    ]);
    const tags = it.tag ? it.tag.split(",").map(s => s.trim()) : [];
    const { category, sub_category } = categorize(it.title + " " + stripHtml(it.description), tags);
    results.push({
      platform: "naver",
      post_id: logNo,
      url: it.link.split("?")[0],
      title_or_caption: it.title,
      date: new Date(it.pubDate).toISOString().slice(0, 10),
      thumbnail: extractThumbnail(it.description),
      metrics: { views, likes, comments },
      category, sub_category, tags,
      fetched_at: new Date().toISOString(),
    });
  }
  return results;
}

if (require.main === module) {
  fetchNaver().then(posts => {
    console.log(JSON.stringify(posts, null, 2));
    console.error(`\n[naver] fetched ${posts.length} posts`);
  }).catch(e => { console.error(e); process.exit(1); });
}
