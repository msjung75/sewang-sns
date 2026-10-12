import { loadPosts } from "../lib/loadPosts";
import { HomeDashboard } from "../components/HomeDashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { posts, fetched_at, summary } = await loadPosts();
  return <HomeDashboard posts={posts} fetched_at={fetched_at} summary={summary} />;
}
