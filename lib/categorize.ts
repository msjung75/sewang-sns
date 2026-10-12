import type { Category, SubCategory, Post } from "./types";

// 룰베이스 키워드 매칭 — 매칭 안 되면 TBD → UI에서 사장님이 수정
// 수정 내역은 category_overrides.json에 저장되고, 다음 fetch 때 override 적용.

interface Rule {
  category: Category;
  sub?: SubCategory;
  keywords: string[]; // 하나라도 매칭되면 적용
}

// 순서대로 평가. 먼저 매칭되는 룰이 이김.
const RULES: Rule[] = [
  // 거래처케이스 — 서브 우선
  { category: "거래처케이스", sub: "신규오픈", keywords: ["신규오픈", "오픈", "그랜드오픈", "개업", "창업", "오픈기념"] },
  { category: "거래처케이스", sub: "뜨는술집", keywords: ["뜨는", "핫플", "핫한", "맛집", "줄서는", "웨이팅"] },
  { category: "거래처케이스", sub: "잘되는업장", keywords: ["잘되는", "성공사례", "매출", "번창", "거래처", "사장님노트", "사장님 노트"] },

  // 신제품
  { category: "신제품", sub: null, keywords: ["신제품", "신상", "출시", "론칭", "런칭", "NEW", "new "] },

  // 시장트렌드
  { category: "시장트렌드", sub: "국외", keywords: ["해외", "글로벌", "유럽", "미국", "일본", "중국", "수입", "import", "글로벌트렌드"] },
  { category: "시장트렌드", sub: "국내", keywords: ["트렌드", "시장", "소비자", "국내시장", "통계", "리포트", "분석"] },

  // 세왕소식
  { category: "세왕소식", sub: null, keywords: ["세왕", "세왕상사", "공지", "안내", "휴무", "채용", "행사"] },

  // 주요뉴스
  { category: "주요뉴스", sub: null, keywords: ["뉴스", "속보", "주류법", "주세", "규제", "정책", "국세청"] },
];

export function categorize(text: string, tags: string[] = []): { category: Category; sub_category: SubCategory } {
  const haystack = (text + " " + tags.join(" ")).toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some(k => haystack.includes(k.toLowerCase()))) {
      return { category: rule.category, sub_category: rule.sub ?? null };
    }
  }
  return { category: "TBD", sub_category: null };
}

export function applyOverrides(posts: Post[], overrides: Record<string, { category: Category; sub_category: SubCategory }>) {
  return posts.map(p => {
    const key = `${p.platform}:${p.post_id}`;
    const ov = overrides[key];
    return ov ? { ...p, category: ov.category, sub_category: ov.sub_category } : p;
  });
}
