import {observedTopics} from '../../../../lib/keyword-signals';
import {approvalOrigin} from '../../../../lib/approval-origin';
import { NextRequest,NextResponse } from 'next/server';
import { authorized,sameOrigin } from '../../../../lib/approval-auth';
import {loadPublicationHistory} from '../../../../lib/loadPublicationHistory';
import {candidatePublicationCheck} from '../../../../lib/review-publication-check';
export const dynamic='force-dynamic';
const ORIGIN=approvalOrigin();
async function upstream(route:string,method='GET',body?:string){return fetch(ORIGIN+'/v1/admin/editorial'+(route?'/'+route:''),{method,headers:{Authorization:'Bearer '+process.env.AI_CONTROL_TOKEN,'Content-Type':'application/json','User-Agent':'SewangAIWorker/0.1'},body,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)});}
async function proxy(req:NextRequest,{params}:{params:{path?:string[]}}) {
 if(!await authorized(req))return NextResponse.json({error:'대표 로그인 후 사용할 수 있습니다.'},{status:401});
 if(req.method!=='GET'&&!sameOrigin(req))return NextResponse.json({error:'허용되지 않은 요청'},{status:403});
 const route=(params.path||[]).join('/');
 if(!(route===''&&req.method==='GET')&&!(route==='research'&&req.method==='GET')&&!(route==='research/signals'&&req.method==='GET')&&!(route==='research/reading'&&req.method==='GET')&&!(route==='research/basket'&&req.method==='POST')&&!(route==='research/workflow'&&['GET','POST'].includes(req.method))&&!(route==='research/decision'&&req.method==='POST')&&!(route==='reports'&&req.method==='POST')&&!(/^[A-Za-z0-9_-]{1,80}\/(decision|translations|schedule|receipt|cancel)$/.test(route)&&!route.startsWith('research/')&&req.method==='POST'))return NextResponse.json({error:'허용되지 않은 경로'},{status:404});
 let body=req.method==='GET'?undefined:await req.text();
 if(body&&Buffer.byteLength(body)>180000)return NextResponse.json({error:'입력 길이 초과'},{status:413});
 try{
  if(route==='research/decision'){
   let input;try{input=JSON.parse(body||'');}catch{return NextResponse.json({error:'입력 오류'},{status:400});}
   if(!input||typeof input!=='object')return NextResponse.json({error:'입력 오류'},{status:400});
   if(input.action==='select'){
    const [r,history]=await Promise.all([upstream('research'),loadPublicationHistory()]);if(!r.ok)throw new Error('research_unavailable');const data=await r.json();
    if(!data.snapshot||input.expected_hash!==data.snapshot.content_hash)return NextResponse.json({error:'조사 자료가 갱신되었습니다. 최신 자료를 확인하세요.'},{status:409});
    const candidate=data.snapshot.candidates.find((c:{id:string})=>c.id===input.candidate_id);if(!candidate)return NextResponse.json({error:'후보를 확인하세요.'},{status:404});
    const check=await candidatePublicationCheck(candidate,data.snapshot.content_hash,history.posts);
    if(check.status==='unavailable')return NextResponse.json({error:'게시 이력이 없어 중복 검토를 완료할 수 없습니다.'},{status:409});
    if(input.history_version!==check.history_version)return NextResponse.json({error:'기존 게시 이력이 갱신되었습니다. 최신 후보와 중복 검토를 다시 확인하세요.'},{status:409});
    if(check.requires_review&&(input.duplicate_reviewed!==true||typeof input.note!=='string'||input.note.trim().length<5))return NextResponse.json({error:'이전 글을 확인하고 이번 글의 차별점을 5자 이상 적어주세요.'},{status:400});
   }
   body=JSON.stringify({candidate_id:input.candidate_id,action:input.action,expected_hash:input.expected_hash,note:input.note});
  }
  if(route==='research/workflow'&&req.method==='POST'){
   let input;try{input=JSON.parse(body||'');}catch{return NextResponse.json({error:'입력 오류'},{status:400});}
   if(input?.kind==='adopt'){
    const [r,history]=await Promise.all([upstream('research/workflow'),loadPublicationHistory()]);if(!r.ok)throw new Error('workflow_unavailable');
    const board=await r.json(),topic=board.topics.find((t:{id:string})=>t.id===input.topic_id);
    if(!topic||topic.revision!==input.expected_revision||topic.plan!==input.expected_plan)return NextResponse.json({error:'현황이 바뀌었습니다. 최신 결과를 확인하세요.'},{status:409});
    const check=await candidatePublicationCheck(topic,topic.snapshot_hash||'',history.posts);
    if(check.status==='unavailable'||input.history_version!==check.history_version)return NextResponse.json({error:'게시 이력이 바뀌었습니다. 최신 중복 검토를 확인하세요.'},{status:409});
    if(check.requires_review&&(input.duplicate_reviewed!==true||typeof input.note!=='string'||input.note.trim().length<5))return NextResponse.json({error:'기존 글을 확인하고 차별점을 5자 이상 적어주세요.'},{status:400});
    body=JSON.stringify({kind:'adopt',topic_id:input.topic_id,expected_revision:input.expected_revision,expected_plan:input.expected_plan,note:input.note});
   }
  }
  if(route==='research/signals'){
   const [metrics,sources]=await Promise.all([upstream(route),upstream('research')]);
   if(!metrics.ok||!sources.ok)throw new Error('signals_unavailable');const data=await metrics.json(),research=await sources.json();
   return NextResponse.json({...data,observations:observedTopics(research.snapshot?.evidence||[]),observation_as_of:research.snapshot?.collected_at||null},{headers:{'Cache-Control':'no-store'}});
  }
  const response=await upstream(route,req.method,body);const data=await response.json();
  if(response.ok&&route==='research'&&data.snapshot){const history=await loadPublicationHistory();data.snapshot.candidates=await Promise.all(data.snapshot.candidates.map(async(c:{id:string;title:string;summary:string})=>({...c,duplicate_check:await candidatePublicationCheck(c,data.snapshot.content_hash,history.posts)})));data.publication_coverage=history.coverage;const flow=await upstream('research/workflow');if(!flow.ok)throw new Error('workflow_unavailable');data.workflow=await flow.json();}
  if(response.ok&&route==='research/workflow'&&req.method==='GET'){const history=await loadPublicationHistory();data.topics=await Promise.all(data.topics.map(async(t:{id:string;title:string;summary:string;origin:string;snapshot_hash:string})=>t.origin==='evidence'?{...t,duplicate_check:await candidatePublicationCheck(t,t.snapshot_hash||'',history.posts)}:t));}
  if(!response.ok&&data.error){const messages:Record<string,string>={basket_context_too_long:'구성 메모와 기사별 메모의 합계를 줄인 뒤 다시 요청하세요.',basket_version_conflict:'후보함이 바뀌었습니다. 최신 선택을 확인하세요.',basket_capacity:'이번 호 후보는 최대 10건입니다.',reading_source_changed:'기사 원문 정보가 변경되어 다시 확인해야 합니다.',evidence_analysis_required:'조사와 분석 결과를 먼저 확인하고 단계 완료를 기록하세요.',research_version_conflict:'자료가 갱신되었습니다. 최신 자료를 확인하고 다시 선택하세요.',invalid_evidence_selection:'자료를 1~10건 선택하세요.',owner_override_reason_required:'미확인 항목을 남기고 진행할 이유를 5자 이상 적어주세요.',handoff_result_required:'담당 결과가 등록된 뒤 다음 단계로 진행할 수 있습니다.',handoff_report_changed:'원고가 변경되었습니다. 새 버전을 확인하고 보완을 요청하세요.',handoff_draft_required:'저장된 검토 원고가 있어야 다음 단계로 진행할 수 있습니다.',handoff_version_conflict:'단계 상태가 바뀌었습니다. 최신 현황을 확인하세요.',handoff_topic_changed:'주제 결정이나 근거가 바뀌었습니다. 최신 주제를 다시 확인하세요.',rework_prior_stage_incomplete:'앞 단계 결과가 아직 없습니다. 현재 진행 중인 단계부터 보완을 요청하세요.',external_reservation_requires_cancellation:'실제 예약을 취소한 뒤 수정할 수 있습니다.',editorial_version_conflict:'원고가 갱신되었습니다. 최신 원고를 다시 선택하세요.',rework_report_context_required:'연결된 원고가 바뀌었습니다. 현황을 새로 확인하세요.'};data.error=messages[data.error]||data.error;}
  return NextResponse.json(data,{status:response.status,headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'승인 서버 또는 게시 이력 연결을 확인하세요. 요청 결과를 재조회한 후 다시 처리하세요.'},{status:502});}
}
export {proxy as GET,proxy as POST};
