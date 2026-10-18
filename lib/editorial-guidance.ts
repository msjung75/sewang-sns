export type IssueEvidence={id:string;title:string;url?:string};
export type IssueBasket={revision:number;items:{evidence:IssueEvidence;note?:string}[];note:string;updated_at:string|null};
export type IssueTopic={id:string;title:string;origin:string;state:string;note:string;revision:number;plan:number;needs_review:boolean;summary?:string;candidate?:{recommendation?:string;uncertainties?:string[]}|null;evidence?:IssueEvidence[];created_at?:string;updated_at:string;progress?:{completed:number;total:number;percent:number}};
export type IssueTask={id:string;topic_id:string|null;stage:string;status:string;plan:number;version:number;result:string;instruction?:string;updated_at:string;report_id:string|null;report_stale?:boolean;current_report_hash?:string|null};
export type IssueBoard={recovery_requests?:{id:string;task_id:string;state:string;note:string}[];topics:IssueTopic[];tasks:IssueTask[];updated_at:string|null};
export type IssueReport={id:string;title:string;status:string};
export const stageNames:Record<string,string>={research:'근거 조사',analysis:'정보지 구성·분석',draft:'원고 작성',design:'디자인',review:'최종 검토'};
export const advanceLabels:Record<string,string>={research:'조사 확인 완료 · 구성·분석으로',analysis:'분석 확인 완료',draft:'원고 확인 완료 · 디자인으로',design:'디자인 확인 완료 · 최종 검토로',review:'최종 검토 완료 · 원문 승인으로'};
export function currentTasks(board:IssueBoard,topic:IssueTopic){return board.tasks.filter(t=>t.topic_id===topic.id&&t.plan===topic.plan&&t.status!=='cancelled');}
export function issueScope(board:IssueBoard,basket:IssueBasket){
 const topics=board.topics.filter(t=>(t.origin!=='evidence'||t.note.startsWith('키워드·주제 발견 요청:'))&&['keep','select','research'].includes(t.state));
 const sources=new Set([...topics.flatMap(t=>(t.evidence||[]).map(e=>e.id)),...basket.items.map(i=>i.evidence.id)]);
 return {topics,aiCount:topics.filter(t=>t.origin==='ai').length,keywordCount:topics.filter(t=>t.origin==='evidence').length,ownerCount:topics.filter(t=>t.origin==='owner').length,articles:basket.items,total:topics.length+basket.items.length,uniqueSources:sources.size};
}
export function matchingTopic(board:IssueBoard,basket:IssueBasket){
 const ids=basket.items.map(i=>i.evidence.id);
 return board.topics.filter(t=>t.origin==='evidence'&&!['exclude','hold'].includes(t.state)&&ids.length>0&&JSON.stringify((t.evidence||[]).map(e=>e.id))===JSON.stringify(ids)).sort((a,b)=>(b.created_at||b.updated_at).localeCompare(a.created_at||a.updated_at))[0];
}
export type Guidance={kind:'browse'|'compose'|'wait'|'task'|'adopt'|'report'|'topic';title:string;detail:string;button:string;topic?:IssueTopic;task?:IssueTask;report?:IssueReport;previousCount?:number};
export function issueGuidance(basket:IssueBasket,board:IssueBoard,reports:IssueReport[],preferredId?:string,submission?:{revision:number;topic_id:string}|null):Guidance{
 const preferred=preferredId?board.topics.find(t=>t.id===preferredId):undefined;
 const match=submission===undefined?matchingTopic(board,basket):submission?.revision===basket.revision?board.topics.find(t=>t.id===submission.topic_id&&!['hold','exclude'].includes(t.state)):undefined;
 const latest=board.topics.filter(t=>t.origin==='evidence'&&!['hold','exclude'].includes(t.state)).sort((a,b)=>(b.created_at||b.updated_at).localeCompare(a.created_at||a.updated_at))[0];
 if(!preferred&&basket.items.length&&!match)return{kind:'compose',title:`선택한 ${basket.items.length}건, 이제 조사를 시작하세요`,detail:latest?`이전 요청은 ${latest.evidence?.length||0}건입니다. 현재 선택한 ${basket.items.length}건은 아직 함께 요청되지 않았습니다. 새 요청을 만들고 이전 결과는 보관합니다.`:'자료는 후보함에 저장됐습니다. 아래 버튼을 누르면 조사 담당에게 전달합니다.',button:`선택한 ${basket.items.length}건으로 조사 시작`,previousCount:latest?.evidence?.length};
 const topic=preferred||match||latest;
 if(!topic)return{kind:'browse',title:'이번 정보지에 쓸 자료부터 골라보세요',detail:'한국어로 정리한 기사를 읽고 마음에 드는 자료를 체크하세요. 선택한 자료는 저장됩니다.',button:'자료 고르기'};
 if(['hold','exclude'].includes(topic.state))return{kind:'topic',topic,title:'이 요청은 보류·제외 상태입니다',detail:'현재 결정과 이유를 확인하세요. 다시 진행하려면 주제 상태를 직접 변경해야 합니다.',button:'요청 상태 확인'};
 if(topic.needs_review)return{kind:'topic',topic,title:'자료가 바뀌어 다시 확인이 필요합니다',detail:'이전 결정은 보관했습니다. 새 근거를 검토하기 전에는 제작을 계속하지 않습니다.',button:'변경된 근거 확인'};
 const tasks=currentTasks(board,topic),next=tasks.find(t=>t.status!=='done');
 if(next){
  const stage=stageNames[next.stage]||next.stage;
  if(next.report_stale)return{kind:'task',topic,task:next,title:'원고가 바뀌어 재확인이 필요합니다',detail:'이전 버전의 검토 결과로 다음 단계를 넘길 수 없습니다. 최신 원고와 보완 요청을 확인하세요.',button:'바뀐 원고·보완 내용 확인'};
  if(['awaiting_review','blocked'].includes(next.status))return{kind:'task',topic,task:next,title:next.status==='blocked'?`${stage}에서 확인할 사항이 있습니다`:`${stage} 결과가 도착했습니다`,detail:'결과와 미확인 사항을 읽은 뒤, 화면 아래의 확인 완료 버튼으로 다음 단계를 여세요.',button:`${stage} 결과 확인하기`};
  return{kind:'wait',topic,task:next,title:next.status==='running'?`${stage}를 진행하고 있습니다`:`${stage} 요청이 접수됐습니다`,detail:next.status==='running'?'담당자가 실제 작업을 시작했습니다. 결과가 도착하면 이곳에 확인 버튼이 나타납니다.':'아직 담당자의 작업 시작 기록이 없습니다. 추가 버튼을 누르거나 같은 요청을 반복할 필요가 없습니다. 결과가 준비돼야 다음 단계가 열립니다.',button:'진행 현황 보기'};
 }
 if(topic.origin==='evidence'&&topic.state!=='select'&&['research','analysis'].every(s=>tasks.some(t=>t.stage===s&&t.status==='done')))return{kind:'adopt',topic,title:'구성·분석을 마쳤습니다. 원고에 넣을지 결정하세요',detail:'포함 권고와 기존 게시물 중복을 확인한 뒤 원고 작성을 요청할 수 있습니다.',button:'구성안 확인 · 원고 작성으로'};
 const reportId=[...tasks].reverse().find(t=>t.report_id)?.report_id,report=reports.find(r=>r.id===reportId);
 if(report)return{kind:'report',topic,report,title:report.status==='TRANSLATION_PENDING'?'승인된 원고를 번역하는 단계입니다':report.status==='DRAFT'||report.status==='REJECTED'?'원고를 읽고 승인할 차례입니다':'원고·번역과 발송 준비를 확인하세요',detail:'아래 버튼으로 이 요청에 연결된 원고를 엽니다. 실제 발행과 카카오 발송은 별도 확인입니다.',button:'연결 원고 열기'};
 return{kind:'topic',topic,title:'현재 요청의 다음 작업을 확인하세요',detail:'단계 결과와 기존 결정을 확인할 수 있습니다. 아직 연결된 원고는 없습니다.',button:'요청 상세 확인'};
}
