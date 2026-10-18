import type {IssueTask} from './editorial-guidance';
export const QUEUE_WARNING_MS=20*60_000;
export const RUN_WARNING_MS=20*60_000;
export function taskActivity(task:IssueTask,now:number){
 const at=Date.parse(task.updated_at),valid=Number.isFinite(at)&&at<=now;
 const elapsed=valid?now-at:null;
 const delayed=elapsed!==null&&((task.status==='queued'&&elapsed>=QUEUE_WARNING_MS)||(task.status==='running'&&elapsed>=RUN_WARNING_MS));
 const label=task.status==='running'?(delayed?'진행 보고 지연 · 실행 확인 필요':'실행 시작 기록 있음'):task.status==='queued'?(delayed?'시작 지연 · 재점검 필요':'접수 완료 · 시작 대기'):task.status==='done'?'결과 저장 완료':task.status==='awaiting_review'?'결과 도착 · 대표 확인 대기':task.status==='blocked'?'조사 중단 · 사유 확인':'이전 단계 완료 대기';
 return{elapsed,delayed,label};
}
export function elapsedText(ms:number|null){if(ms===null)return '시간 확인 불가';const s=Math.floor(ms/1000);if(s<60)return `${s}초`;const m=Math.floor(s/60);return m<60?`${m}분 ${s%60}초`:`${Math.floor(m/60)}시간 ${m%60}분`;}
