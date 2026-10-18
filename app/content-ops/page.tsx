import { loadOps, loadTrends } from "../../lib/ops";
import { OpsBoard } from "../../components/OpsBoard";
export const dynamic = "force-dynamic";
export default async function OpsPage(){const [ops,trends]=await Promise.all([loadOps(),loadTrends()]);return <OpsBoard ops={ops} trends={trends}/>;}
