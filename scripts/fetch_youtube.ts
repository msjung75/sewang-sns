// YouTube Data API v3. @sewangliquor → channelId → uploads playlist → videos.list
// 환경변수: YOUTUBE_API_KEY, YOUTUBE_CHANNEL_HANDLE (default @sewangliquor)
import { categorize } from "../lib/categorize";
import type { Post } from "../lib/types";

const KEY = process.env.YOUTUBE_API_KEY || "";
const HANDLE = (process.env.YOUTUBE_CHANNEL_HANDLE || "@sewangliquor").replace(/^@/, "");

async function j<T = any>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`YT ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

async function resolveChannelId(): Promise<{ channelId: string; uploadsPlaylistId: string }> {
  const data: any = await j(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=@${HANDLE}&key=${KEY}`);
  const item = data.items?.[0];
  if (!item) throw new Error(`channel @${HANDLE} not found`);
  return { channelId: item.id, uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads };
}

async function fetchAllVideoIds(uploadsPlaylistId: string): Promise<string[]> {
  const ids: string[] = [];
  let pageToken = "";
  while (true) {
    const data: any = await j(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${uploadsPlaylistId}&pageToken=${pageToken}&key=${KEY}`);
    for (const it of data.items ?? []) ids.push(it.contentDetails.videoId);
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return ids;
}

async function fetchVideoDetails(ids: string[]): Promise<any[]> {
  const results: any[] = [];
  // videos.list는 최대 50개 id/call
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50).join(",");
    const data: any = await j(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${chunk}&key=${KEY}`);
    results.push(...(data.items ?? []));
  }
  return results;
}

export async function fetchYoutube(): Promise<Post[]> {
  if (!KEY) {
    console.error("[youtube] YOUTUBE_API_KEY 미설정 — skip");
    return [];
  }
  const { uploadsPlaylistId } = await resolveChannelId();
  const ids = await fetchAllVideoIds(uploadsPlaylistId);
  const vids = await fetchVideoDetails(ids);
  return vids.map((v: any) => {
    const title = v.snippet.title as string;
    const desc = v.snippet.description as string;
    const tags = (v.snippet.tags ?? []) as string[];
    const { category, sub_category } = categorize(title + " " + desc, tags);
    return {
      platform: "youtube",
      post_id: v.id,
      url: `https://www.youtube.com/watch?v=${v.id}`,
      title_or_caption: title,
      date: (v.snippet.publishedAt as string).slice(0, 10),
      thumbnail: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.default?.url || null,
      metrics: {
        views: Number(v.statistics?.viewCount ?? 0),
        likes: Number(v.statistics?.likeCount ?? 0),
        comments: Number(v.statistics?.commentCount ?? 0),
      },
      category, sub_category, tags,
      fetched_at: new Date().toISOString(),
    } as Post;
  });
}

if (require.main === module) {
  fetchYoutube().then(posts => {
    console.log(JSON.stringify(posts, null, 2));
    console.error(`\n[youtube] fetched ${posts.length} posts`);
  }).catch(e => { console.error(e); process.exit(1); });
}
