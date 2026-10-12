import { loadPosts } from "../../lib/loadPosts";
import { PlatformPage } from "../../components/PlatformPage";

export const dynamic = "force-dynamic";

export default async function InstagramPage() {
  const { posts } = await loadPosts();
  return <PlatformPage posts={posts} platform="instagram" />;
}
