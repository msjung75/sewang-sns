# sewang-sns

세왕상사 SNS 통합 관리 대시보드 (MVP).

플랫폼: Instagram `@sewangliquor` · YouTube `@sewangliquor` · 네이버 블로그 `sewang88`

## 로컬 실행

```bash
pnpm i   # 또는 npm i
pnpm dev # http://localhost:3000
```

## 데이터 수집

```bash
# 환경변수(.env.local)
IG_LONG_LIVED_TOKEN=...           # ig_config.json 재활용
IG_USER_ID=...                    # Instagram business account id
YOUTUBE_API_KEY=AIza...           # Google Cloud Console → YouTube Data API v3
YOUTUBE_CHANNEL_HANDLE=@sewangliquor
NAVER_BLOG_ID=sewang88

# 실행
pnpm fetch:all
```

결과는 `data/posts.json`에 저장되며, 그 즉시 UI에 반영됩니다.

## 카테고리

1. 주요뉴스
2. 시장트렌드 (국내 / 국외)
3. 신제품
4. 거래처케이스 (신규오픈 / 잘되는업장 / 뜨는술집)
5. 세왕소식
6. TBD (자동분류 실패 → UI에서 수정)

수동 수정 내역은 `data/category_overrides.json`에 축적되어 다음 fetch 시 반영됩니다.

## 배포

Vercel에 `main` 브랜치 push 시 자동 배포. Env Vars 는 Vercel dashboard에서 등록.
Cron: `vercel.json`에 일 1회(03:00 KST) `/api/fetch/all` 호출.
