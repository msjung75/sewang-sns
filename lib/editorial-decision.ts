import {currentTasks,type IssueBoard,type IssueTopic} from './editorial-guidance';
export function topicDecision(board:IssueBoard,topic:IssueTopic){
 const tasks=currentTasks(board,topic),task=tasks.find(t=>t.status!=='done');
 if(topic.needs_review||task?.report_stale)return{kind:'review',label:'최신 내용 확인 필요',reason:'내용이 바뀌었습니다. 이전 결과로 진행하지 않고 다시 확인하세요.',task};
 if(task?.status==='blocked')return{kind:'weak',label:'근거 보강 필요',reason:'현재 근거로는 원고에 넣기 어렵습니다. 보완하거나 다른 주제를 고를 수 있습니다.',task};
 if(task?.status==='awaiting_review')return{kind:'ready',label:'대표님 판단 차례',reason:'결과와 한계를 읽고 다음 단계로 진행할지 결정하세요.',task};
 if(task)return{kind:'waiting',label:task.status==='running'?'AI가 조사·정리 중':'AI 작업 시작 대기',reason:task.status==='running'?'결과가 도착하면 알림으로 알려드립니다.':'접수는 저장됐습니다. 아직 실제 작업 시작 기록은 없습니다.',task};
 return{kind:'ready',label:'구성안 확인',reason:'구성안을 확인하고 원고에 담을지 결정하세요.',task};
}
