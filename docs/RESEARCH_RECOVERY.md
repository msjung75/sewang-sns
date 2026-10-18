# 조사 초기화와 실제 재실행

대표의 요청에 따라 현재 조사 snapshot/decisions/topics/handoffs/request/reading/signals를 private backup_hash 백업과 일치할 때만 초기화한다. 기존 원고·발행물·로그인·푸시·일반 Worker 큐는 reset 대상에서 제외한다. 예전 제목 수집과 override의 자동 재유입은 curated_only 상태로 막는다.

조사/분석/새 주제 발굴은 Mac 기존5분 점검에서 editorial_executor가 기존 ChatGPT 로그인으로 직접 실행한다. 대화 heartbeat는 세 단계를 중복 claim하지 않는다. 단일 실행 잠금과 최신 task/version/plan/대표 상태 확인 후 CAS running을 기록한다. 읽기 전용 공개 원문 조사와 별도 읽기 전용 AI 검토를 수행하고 실제 결과만 저장한다. 각 모델 실행은 최대6분, 실패는15분 뒤1회 재시도하며2회 이후에는 추가 조치를 보고한다. 승인 대기/취소/보류/이전 plan과 소유자를 모르는 다른 running 작업은 실행하지 않는다.

화면의 ‘진행 문제 전달 · 다시 실행 요청’은 현재 작업 버전의 복구 요청을 저장한다. 접수만으로 재시작했다고 표시하지 않는다. 실제 handoff 버전에 따라 접수/시작/결과/추가조치 상태가 알림·설정에 남는다. 이 대화에서도 문제를 전달할 수 있다. 유료 서비스 추가·자동 원고 승인·발송·운영 게시와는 무관하다.
