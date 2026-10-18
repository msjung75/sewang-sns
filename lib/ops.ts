import fs from "node:fs/promises";
import path from "node:path";

export interface Role { id: string; name: string; owner: string; scope: string[]; output: string }
export interface Steps { 주제: boolean; 디자인: boolean; 글: boolean; 게시: boolean }
export interface PipelineItem {
  date: string; folder: string | null; category: string | null; slug: string | null;
  steps: Steps; owner: string; reaction: number; warnings: string[];
}
export interface Alert { level: "high" | "mid" | "ok"; msg: string; action: string }
export interface Dup { a: string; b: string; similarity: number; same_category: boolean; gap_days: number }

export interface Ops {
  generated_at: string;
  roles: Role[];
  pipeline: PipelineItem[];
  alerts: Alert[];
  duplicates: Dup[];
  category_counts: Record<string, number>;
  category_last_used: Record<string, string>;
  material: { raw_count: number; raw_files: string[] };
  stats: { total_rounds: number; published: number; queue_days: number };
}

export interface FirstMover { date: string; format: string; likes: number; comments: number; url: string; note?: string }
export interface TrendPoint { date?: string; week?: string; freq: number }
export interface TrendItem {
  id: string; keyword: string; synonyms: string[];
  detected_on: string; status: string;
  peak_forecast: string; peak_basis: string;
  trend_daily?: TrendPoint[];
  trend_weekly_last_year?: TrendPoint[];
  related_drinks?: { label: string; freq: number }[];
  preempt: {
    checked_on: string; channel: string; window?: string; count?: number;
    saturation: string; first_movers: FirstMover[];
    crowded_angles?: string[]; open_angle: string;
  };
  sewang_angle: {
    title: string; format: string; content: string; why_us: string;
    suggested_date: string; deadline_note: string;
  };
  state: string;
}
export interface Trends {
  generated_at: string;
  method: { source: string; note: string; selection_rule: string };
  items: TrendItem[];
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(process.cwd(), "data", file), "utf8")) as T;
  } catch {
    return null;
  }
}

export const loadOps = () => readJson<Ops>("ops.json");
export const loadTrends = () => readJson<Trends>("trends.json");
