import {stageNames,type IssueBoard} from './editorial-guidance';
export type WorkflowAlert={key:string;taskId:string;topicId?:string;title:string;detail:string;at:string;kind:'info'|'action'|'warning';read:boolean};
export function workflowAlerts(board:IssueBoard,now:number):WorkflowAlert[]{
 return board.tasks.filter(t=>t.status!=='waiting'&&t.status!=='cancelled'&&(!t.topic_id||board.topics.some(p=>p.id===t.topic_id&&p.plan===t.plan&&!['hold','exclude'].includes(p.state)))).flatMap(t=>{
  const topic=board.topics.find(p=>p.id===t.topic_id),age=now-Date.parse(t.updated_at),delayed=t.status==='queued'&&age>=20*60000,stalled=t.status==='running'&&age>=60*60000;
  const label=({queued:'요청 접수',running:'작업 시작',awaiting_review:'결과 도착 · 대표 확인 필요',blocked:'작업 중단 · 확인 필요',done:'대표 확인 완료'} as Record<string,string>)[t.status];
  if(!label)return [];
  return [{key:`${t.id}:${t.version}:${t.status}:${delayed||stalled?'delay':'state'}`,taskId:t.id,topicId:t.topic_id||undefined,title:`${stageNames[t.stage]||'주제 발굴'} · ${delayed?'시작 지연':stalled?'진행 확인 필요':label}`,detail:`${topic?.title||'새 주제 발굴'} — ${delayed?'접수 후 20분 이상 작업 시작 기록이 없습니다. 접수는 보존돼 있습니다. Mac·Codex 실행과 자동 처리 연결 확인이 필요합니다.':stalled?'시작 후 1시간 이상 새 기록이 없습니다. 완료 여부를 확인해야 합니다.':t.status==='blocked'?t.result||'담당자의 중단 사유 확인이 필요합니다.':t.status==='awaiting_review'?'결과를 읽고 다음 단계로 진행할지 결정해 주세요.':t.status==='queued'?'서버에 접수됐습니다. 아직 작업 시작 전입니다.':t.status==='running'?'실제 작업 시작이 기록됐습니다.':'이 단계의 대표 확인을 기록했습니다.'}`,at:t.updated_at,kind:delayed||stalled||t.status==='blocked'?'warning':t.status==='awaiting_review'?'action':'info',read:false} as WorkflowAlert];
 }).sort((a,b)=>b.at.localeCompare(a.at));
}
