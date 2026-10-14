export type Platform = "instagram" | "youtube" | "naver";

export type Category =
  | "주요뉴스"
  | "시장트렌드"
  | "신제품"
  | "거래처케이스"
  | "세왕소식"
  | "TBD";

export type SubCategory =
  | "국내"
  | "국외"
  | "신규오픈"
  | "잘되는업장"
  | "뜨는술집"
  | null;

export interface Post {
  platform: Platform;
  post_id: string;
  url: string;
  title_or_caption: string;
  date: string; // YYYY-MM-DD
  thumbnail: string | null;
  metrics: {
    views: number | null; // null = 미수집 또는 조회 실패, 0 = 확인된 조회수
    likes: number;
    comments: number;
  };
  category: Category;
  sub_category: SubCategory;
  tags: string[];
  fetched_at: string;
}

export interface CategoryOverride {
  post_id: string;
  platform: Platform;
  category: Category;
  sub_category: SubCategory;
  updated_at: string;
}
