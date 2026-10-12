import fs from "node:fs/promises";
import path from "node:path";
import type { Post } from "../lib/types";
import { Dashboard } from "../components/Dashboard";

export const dynamic = "force-dynamic";

async function loadPosts(): Promise<{ posts: Post[]; fetched_at: string; summary: Record<string, number | string> }> {
  const p = path.join(process.cwd(), "data", "posts.json");
  try {
    const raw = await fs.readFile(p, "utf8");
    return JSON.parse(raw);
  } catch {
    return { posts: [], fetched_at: "", summary: {} };
  }
}

export default async function Home() {
  const { posts, fetched_at, summary } = await loadPosts();
  return <Dashboard posts={posts} fetched_at={fetched_at} summary={summary} />;
}
