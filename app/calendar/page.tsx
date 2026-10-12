import { loadPosts } from "../../lib/loadPosts";
import { CalendarView } from "../../components/CalendarView";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const { posts } = await loadPosts();
  return <CalendarView posts={posts} />;
}
