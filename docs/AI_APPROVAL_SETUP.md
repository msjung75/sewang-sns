# 세왕 SNS AI 진행·승인 개발 통합

기존 public 저장소 main은 운영 자동배포와 연결되어 있으므로 이 변경은 개발 브랜치에서만 검토한다. 운영 반영은 대표 승인 후 별도로 진행한다.

## 화면과 저장

- `/ops`: 대표 로그인 → 조사 진행 → AI/대표 주제 비교 → 대표 발행방향 선택 → 한국어 원고 버전 승인 → 영·일·중 번역 검수 → 수요일10시 카카오 예약 준비.
- `/content-ops`: 기존 로컬 설치본의 SNS 제작 운영보드를 보존한 경로. 기존 생성 스크립트를 포함하지만 개인 폴더명·미발행 원고·생성된 ops/trends 자료는 이 public 저장소에 올리지 않는다.
- 승인 기록은 별도 private Cloudflare staging SQLite Durable Object에 영속 보관한다. 정적 JSON/브라우저 localStorage를 승인 원장으로 사용하지 않는다.
- 원고·비교 근거·대표 방향은 서버 해시에 포함한다. 수정하면 이전 승인·번역·예약준비 무효. 실제 외부예약이 있으면 취소 확인 전 수정 금지.
- 미저장 수정이 있으면 승인 불가. 클라이언트 체크박스만으로 승인하지 않는다.

## 서버 환경 변수

실제 값은 저장소/로그/채팅/프론트에 넣지 않는다.

- `AI_APPROVAL_PASSWORD_HASH`: 충분히 긴 전용 승인 암호의 SHA-256 hex. 운영 공개 전 별도 관리자 인증 방식과 암호 전달/등록 절차 확정 필요.
- `AI_APPROVAL_SESSION_SECRET`: 32byte 이상의 무작위 서명키.
- `AI_CONTROL_TOKEN`: 현재 staging 관리자 토큰. 서버에서만 사용, NEXT_PUBLIC 접두사 금지.

설정 누락 시 승인 기능은 fail closed(503/로그인 필요). 세션은 HttpOnly/SameSite=Strict, 8시간 만료, 운영 HTTPS Secure 쿠키. 쓰기 요청 Origin검증. 백엔드는 관리자역할과 원고hash를 다시 검사한다. 로그인 시도 제한은 단일프로세스 내 제한이므로 운영 다중인스턴스에서는 공유 제한/관리형 인증으로 보완해야 한다. staging 관리자키 범위는 큐관리까지이므로 운영 전 승인 전용 credential 분리 권장.

## 번역과 카카오

기존 Codex 15분 일정에서 승인 해시가 일치하는 TRANSLATION_PENDING만 번역한다. 기존 Codex 앱·도구·Mac이 필요하고 외부 유료 번역 API를 추가하지 않는다. 원문 URL/숫자 표기를 보존하고 검수 후 전송한다. 한국어 원문 30,000문자, 각 번역 30,000문자, 총 요청150,000bytes 한도는 별도로 적용된다.

기존 채널 `_ZGIMG`, 한국어 안내 메시지 1회와 KO/EN/JA/ZH 리포트 링크 방식을 유지한다. 실제 완성 PDF/웹 산출물 발행은 별도 작업이다. `HANDOFF_READY`는 실제 카카오 예약이 아니다. 관리자센터에서 본문·완성본링크·대상·예상금액을 대표가 확인한 뒤 예약 ID와 같은 시각을 기록해야 `SCHEDULED`로 표시한다. 일반 카카오모먼트 API는 권한·비즈니스 토큰·광고계정ID가 필요하며 이번 작업에서 새 발급/예약/결제하지 않았다. 대표의 발송비 승인 전 자동 전송 금지.

기존 SNS수집 API나 GitHub Actions/게시 데이터는 수정하지 않는다. 기존 API의 인증되지 않은 refresh 문제는 별도 운영 정비 항목으로 남긴다. 운영 배포·발송·추가비용은 아직 승인되지 않았다.

개발 브랜치 feature/ai-editorial-approval의 Vercel 자동 배포는 git.deploymentEnabled에서 false로 지정했다. main의 기존 배포 규칙과 Cron은 변경하지 않는다. 공식 설정: https://vercel.com/docs/project-configuration/git-configuration
