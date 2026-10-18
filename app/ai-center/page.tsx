import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'세왕 AI센터',description:'주간 시장동향 리포트 — 조사부터 발행까지 (클로드 앱)'};
// 2026-10-18 대표 지시: /ai-center 는 클로드 아티팩트 「세왕 AI센터」로 이동. 이전 화면은 /ai-center-legacy 에 보관.
const NEW_AI_CENTER='https://claude.ai/artifact/8yW1cxg4PZmtsnFtrvorSS';
export default function AICenterPage(){
 redirect(NEW_AI_CENTER);
}
