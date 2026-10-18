"use client";
import {RecoveryRequest} from "./RecoveryRequest";
import {TaskActivity} from "./TaskActivity";
import {FormEvent,useCallback,useEffect,useId,useRef,useState} from 'react';
import styles from './EditorialFlow.module.css';
import {advanceLabels,stageNames} from '../lib/editorial-guidance';
import {KoreanSourceReview,type SourceReview} from './KoreanSourceReview';

type DuplicateCheck={status:string;requires_review:boolean;history_version:string;matches:{post:{url:string;title_or_caption:string};reason:string|string[]}[]};
type Topic={evidence?:{id:string;title:string;url:string}[];review_mode?:string;duplicate_check?:DuplicateCheck;id:string;title:string;summary:string;origin:string;state:string;revision:number;note:string;needs_review:boolean;updated_at:string;candidate:unknown;in_snapshot:boolean;plan:number;progress?:{completed:number;total:number;percent:number;awaiting_review:number}};
type Task={source_reviews?:SourceReview[];id:string;topic_id:string|null;stage:string;owner:string;status:string;result:string;instruction?:string;updated_at:string;report_id:string|null;report_status:string|null;plan:number;version:number;report_hash?:string|null;current_report_hash?:string|null;report_stale?:boolean;criteria?:{id:string;label:string;done:boolean}[];owner_note?:string};
type Board={topics:Topic[];tasks:Task[];updated_at:string|null};
const states:Record<string,string>={candidate:'검토할 후보',keep:'유지',select:'이번 호 선정',research:'추가 조사',hold:'다음 호 보류',exclude:'제외'};
const stages:Record<string,string>={discover:'새 주제 발굴',research:'근거 조사',analysis:'비교·분석',draft:'원고 작성',design:'디자인',review:'최종 검수'};
const taskStates:Record<string,string>={queued:'작업 대기',waiting:'앞 단계 완료 대기',running:'처리 중',done:'결과 등록 완료',blocked:'확인 필요',awaiting_review:'결과 준비 · 대표 확인 대기',cancelled:'중단 · 이력 보관'};

function time(at:string|null){if(!at)return '아직 수신 없음';const d=new Date(at);return Number.isFinite(d.getTime())?d.toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'시각 미확인';}
export function EditorialFlow({refreshKey,onChange,focusTopicId,focusTaskId,onReport,onTopic}:{refreshKey:number;onChange:()=>void;focusTopicId?:string;focusTaskId?:string;onReport?:(id:string)=>void;onTopic?:(id:string)=>void}){
 const uid=useId();
 const [activeTopic,setActiveTopic]=useState(''),[activeTask,setActiveTask]=useState('');
 useEffect(()=>{if(focusTopicId)setActiveTopic(focusTopicId);if(focusTaskId)setActiveTask(focusTaskId);},[focusTopicId,focusTaskId]);
 const reworkRequest=useRef<{key:string;id:string}|null>(null);
 const [board,setBoard]=useState<Board|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [gateNotes,setGateNotes]=useState<Record<string,string>>({}),[reworkNotes,setReworkNotes]=useState<Record<string,string>>({}),[reworkStages,setReworkStages]=useState<Record<string,string>>({});
 const [adoptReviewed,setAdoptReviewed]=useState<Record<string,boolean>>({});
 const [notes,setNotes]=useState<Record<string,string>>({});
 useEffect(()=>{setNotice('');setError('');},[focusTopicId]);
 const [busy,setBusy]=useState(false),[title,setTitle]=useState(''),[query,setQuery]=useState(''),[pending,setPending]=useState<{kind:string;request_id:string;text:string}|null>(null);
 const load=useCallback(async(signal?:AbortSignal)=>{
  try{const r=await fetch('/api/ai-center/research/workflow',{cache:'no-store',credentials:'same-origin',signal});if(!r.ok)throw new Error();const data=await r.json();if(!Array.isArray(data.topics)||!Array.isArray(data.tasks))throw new Error();if(!signal?.aborted){setBoard(data);setError('');}}
  catch{if(!signal?.aborted)setError('주제·분담 현황을 불러오지 못했습니다. 새로 확인해 주세요.');}
 },[]);
 useEffect(()=>{const c=new AbortController();void load(c.signal);const timer=setInterval(()=>void load(c.signal),30000);return()=>{c.abort();clearInterval(timer);};},[load,refreshKey,focusTopicId]);
 async function send(body:unknown){
  setBusy(true);setError('');setNotice('');
  try{const r=await fetch('/api/ai-center/research/workflow',{method:'POST',cache:'no-store',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok){const data=await r.json().catch(()=>({}));throw new Error(data.error||(r.status===409?'현황이 바뀌었습니다. 최신 내용을 확인한 뒤 다시 요청하세요.':'저장하지 못했습니다. 연결을 확인하고 다시 시도하세요.'));}await load();onChange();return true;}
  catch(e){setError(e instanceof Error?e.message:'저장 실패');return false;}finally{setBusy(false);}
 }
 async function submit(e:FormEvent,kind:'propose'|'discover'){
  e.preventDefault();const value=(kind==='propose'?title:query).trim();if(!value)return;
  const request=pending?.kind===kind&&pending.text===value?pending:{kind,request_id:crypto.randomUUID(),text:value};setPending(request);
  if(await send(request)){setPending(null);if(kind==='propose')setTitle('');else setQuery('');setNotice(kind==='propose'?'가져오신 주제를 유지하고 조사·분석 담당의 대기열에 등록했습니다.':'새 주제 발굴을 요청했습니다. 실제 조사 결과가 등록되면 이 진행판에 표시됩니다.');}
 }
 async function rework(topic:Topic,own:Task[]){
  const report=own.find(task=>task.report_id),stage=reworkStages[topic.id]||(report?'draft':'research');
  if(!reworkNotes[topic.id]?.trim())return;
  const key=JSON.stringify([topic.id,topic.revision,topic.plan,stage,reworkNotes[topic.id],report?.current_report_hash]);
  if(reworkRequest.current?.key!==key)reworkRequest.current={key,id:crypto.randomUUID()};
  const ok=await send({kind:'rework',request_id:reworkRequest.current.id,topic_id:topic.id,expected_revision:topic.revision,expected_plan:topic.plan,stage,note:reworkNotes[topic.id],report_id:report?.report_id||null,expected_hash:report?.current_report_hash||null});
  if(ok){reworkRequest.current=null;setReworkNotes(v=>({...v,[topic.id]:''}));setNotice('요청한 단계부터 보완 작업을 등록했습니다. 기존 결과와 원고는 보존하고, 새 결과를 다시 확인하게 됩니다.');}
 }
 const topics=board?.topics||[],tasks=board?.tasks||[];
 const discovery=focusTaskId?tasks.find(t=>t.id===focusTaskId&&!t.topic_id):undefined;
 const picked=activeTopic?topics.find(t=>t.id===activeTopic):[...topics].filter(t=>t.origin==='evidence').reverse()[0]||topics[0];
 const own=picked?tasks.filter(t=>t.topic_id===picked.id&&t.status!=='cancelled'&&t.plan===picked.plan):[];
 const next=own.find(t=>t.status!=='done');
 const task=own.find(t=>t.id===activeTask)||next||own.at(-1);
 const missing=(task?.criteria||[]).filter(c=>!c.done);
 const canAdvance=task&&task.status==='awaiting_review'&&Boolean(task.result)&&!task.report_stale&&!picked?.needs_review;
 const canAdopt=picked?.origin==='evidence'&&picked.state!=='select'&&!['hold','exclude'].includes(picked.state)&&['research','analysis'].every(stage=>own.some(t=>t.stage===stage&&t.status==='done'));
 const linked=own.find(t=>t.report_id);
 return <section id="editorial-flow" className={`ai-panel ${styles.panel}`} aria-labelledby={`${uid}-heading`} aria-busy={busy}>
  <div className={styles.header}><div><p className="ai-kicker">결과와 한계를 읽고 진행 여부를 결정하세요</p><h2 id={`${uid}-heading`}>조사 결과와 다음 결정</h2></div><button type="button" className="ai-secondary" disabled={busy} onClick={()=>void load()}>작업실 새로 확인</button></div>
  {error&&<p className="ai-error" role="alert">{error}</p>}{notice&&<p className="ai-notice" role="status">{notice}</p>}
  <details><summary>다른 주제 결과 열기</summary><label htmlFor={`${uid}-topic`}>현재 작업할 주제<select id={`${uid}-topic`} value={picked?.id||''} onChange={e=>{setActiveTopic(e.target.value);setActiveTask('');onTopic?.(e.target.value);}}>{topics.map(t=><option key={t.id} value={t.id}>{t.title} · 자료 {t.evidence?.length||0}건 · {states[t.state]||t.state}</option>)}</select></label></details>
  {!board&&!error&&<p role="status">선택한 주제와 작업 기록을 불러오고 있습니다…</p>}
  {board&&!picked&&<p>{activeTopic?'선택한 작업실을 불러오고 있습니다. ':''}아직 표시할 작업이 없습니다. 자료 선택 화면에서 기사를 고르고 조사 시작을 눌러주세요.</p>}
  {discovery&&<article className={styles.topic}><h3>키워드·새 주제 조사 요청</h3><TaskActivity task={discovery}/><RecoveryRequest task={discovery} onChange={onChange}/><p>{taskStates[discovery.status]||discovery.status}</p><p style={{whiteSpace:'pre-wrap'}}>{discovery.instruction}</p><h4>조사 결과</h4><p style={{whiteSpace:'pre-wrap'}}>{discovery.result||'아직 조사 결과가 등록되지 않았습니다. 접수와 완료는 다릅니다.'}</p><p>조사 결과는 검토용 제안입니다. 근거와 한계를 확인하고 채택할 주제를 결정한 뒤 원고 제작으로 진행합니다.</p></article>}
  {!discovery&&picked&&<article className={styles.topic}>
   <span className={styles.badge}>{picked.origin==='evidence'?'직접 선택한 자료':'주제 후보'} · {states[picked.state]||picked.state}</span><h3>{picked.title}</h3>
   <p>선택 자료 {picked.evidence?.length||0}건 · 결과 확인 완료 {own.filter(t=>t.status==='done').length}/{own.length}단계</p>
   {picked.needs_review&&<p className="ai-error">근거가 바뀌었습니다. 새 자료를 다시 검토한 뒤 진행해야 합니다.</p>}
   <details><summary>전체 제작 단계 보기</summary><nav className={styles.taskTabs} aria-label="주제 세부 단계">{own.map(t=><button type="button" key={t.id} className="ai-secondary" aria-current={task?.id===t.id?'step':undefined} onClick={()=>setActiveTask(t.id)}><span>{t.status==='done'?'✓':t.status==='awaiting_review'?'확인 필요':'○'}</span><strong>{stageNames[t.stage]||stages[t.stage]}</strong><small>{taskStates[t.status]||t.status}</small></button>)}</nav></details>
   {task&&<section id={`task-${task.id}`} className={styles.currentTask} aria-label="현재 단계 결과" data-state={task.status}>
    <div className={styles.header}><h3>{stageNames[task.stage]||task.stage}</h3><span className={styles.state}>{taskStates[task.status]||task.status}</span></div>
    <p className="ai-muted">담당 {task.owner} · 마지막 상태 변경 {time(task.updated_at)}</p>
    {['queued','running','waiting'].includes(task.status)&&<div className={styles.waiting}><strong>{task.status==='queued'?'요청은 접수됐으며, 아직 담당 작업 시작 전입니다.':task.status==='running'?'담당자가 작업 중입니다. 결과가 등록되면 확인 버튼이 나타납니다.':'앞 단계의 결과를 대표님이 확인하면 이 단계가 열립니다.'}</strong><p>같은 요청을 반복할 필요가 없습니다. 기다리는 동안 다른 자료와 키워드를 살펴볼 수 있습니다.</p><p className="ai-muted">예정 시간이 아닌 실제 시작·결과 기록을 기준으로 표시합니다. 자동 확인은 기존 15분 주기이며 Mac·앱·네트워크 연결이 필요합니다.</p></div>}
    <TaskActivity task={task}/><RecoveryRequest task={task} onChange={onChange}/>{task.result&&<div className={styles.result}><h4>담당자가 준비한 결과</h4><p>{task.result}</p>{task.report_id&&<button type="button" className="ai-secondary" onClick={()=>onReport?.(task.report_id!)}>연결 원고 열기 · {task.report_status||'상태 확인'}</button>}</div>}
    {task.source_reviews?.map(r=><details key={r.evidence_id}><summary>{picked.evidence?.find(e=>e.id===r.evidence_id)?.title||'선택 자료'} · 한국어 상세 해설</summary><KoreanSourceReview review={r}/></details>)}
    {task.report_stale&&<p className="ai-error">검토 후 원고가 변경됐습니다. 아래 보완 요청으로 최신 버전을 다시 확인하세요.</p>}
    {task.result&&<details><summary>확인 항목 · {(task.criteria||[]).filter(c=>c.done).length}/{(task.criteria||[]).length}개</summary><ul className={styles.checks}>{(task.criteria||[]).map(c=><li key={c.id}>{c.done?'✓ 확인함':'○ 미확인'} · {c.label}</li>)}</ul></details>}
    {canAdvance&&<div className={styles.decisionBox}><h4>이 내용으로 계속 진행할까요?</h4>{(missing.length>0||task.status==='blocked')&&<p className="ai-notice">아직 확인하지 못한 항목이 있습니다. 이 상태로 진행하려는 이유를 적거나, 아래에서 보완을 요청하세요.</p>}
     <label htmlFor={`${uid}-gate`}>{missing.length||task.status==='blocked'?'미확인 사항을 남기고 진행할 이유 · 5자 이상':'다음 단계 진행 의견 · 선택 사항'}<textarea id={`${uid}-gate`} value={gateNotes[task.id]||''} maxLength={2000} disabled={busy} onChange={e=>setGateNotes(v=>({...v,[task.id]:e.target.value}))}/></label>
     <button type="button" disabled={busy||Boolean(error)||Boolean((missing.length||task.status==='blocked')&&(gateNotes[task.id]||'').trim().length<5)} onClick={async()=>{if(await send({kind:'advance',task_id:task.id,expected_version:task.version,note:gateNotes[task.id]||''})){setActiveTask('');setNotice(task.stage==='analysis'&&picked.state!=='select'?'분석 확인을 마쳤습니다. 아래에서 구성안을 원고에 반영할지 결정하세요.':'확인 완료를 기록했습니다. 다음 단계 현황을 아래에서 볼 수 있습니다.');}}}>{advanceLabels[task.stage]||'결과 확인 완료 · 다음 단계로'}</button>
    </div>}
    {task.status==='done'&&<p className="ai-notice">이 단계는 대표 확인을 마쳤습니다. 위 단계 탭에서 다음 작업을 볼 수 있습니다.</p>}
   </section>}
   {canAdopt&&<section id="issue-adopt" className={styles.decisionBox} aria-label="구성안 원고 반영 결정"><h3>다음 단계: 이 구성안으로 원고 작성</h3><p>자료를 많이 고르는 것보다 충분한 근거가 중요합니다. 위 분석 결과의 포함·보류 의견과 부족한 꼭지를 확인하세요.</p>
    <p>{picked.duplicate_check?.requires_review?'기존 게시물과 겹치는 부분이 있습니다. 아래에서 차별점을 확인하세요.':picked.duplicate_check?.status==='unavailable'?'기존 게시 이력을 불러오지 못해 원고 작성 요청이 잠겨 있습니다. 새로 확인하세요.':'가져온 게시 이력에서 중복 후보는 발견되지 않았습니다. 전체 본문·영상의 중복을 모두 확인한 것은 아닙니다.'}</p>
    {picked.duplicate_check?.matches.map((m,i)=><p key={i}><a href={m.post.url} target="_blank" rel="noopener noreferrer">{m.post.title_or_caption}</a> · {Array.isArray(m.reason)?m.reason.join(' · '):m.reason}</p>)}
    <label htmlFor={`${uid}-adopt-note`}>원고에 담을 방향{picked.duplicate_check?.requires_review?' · 기존 글과의 차별점 5자 이상':' · 선택 사항'}<textarea id={`${uid}-adopt-note`} value={notes[picked.id]??picked.note??''} maxLength={1000} onChange={e=>setNotes(v=>({...v,[picked.id]:e.target.value}))}/></label>
    {picked.duplicate_check?.requires_review&&<label className={styles.checkLabel}><input type="checkbox" checked={adoptReviewed[picked.id]===true} onChange={e=>setAdoptReviewed(v=>({...v,[picked.id]:e.target.checked}))}/>기존 글을 읽고 이번 구성안의 차별점을 확인했습니다.</label>}
    <button type="button" disabled={busy||Boolean(error)||!picked.duplicate_check||picked.duplicate_check.status==='unavailable'||Boolean(picked.duplicate_check.requires_review&&(!adoptReviewed[picked.id]||(notes[picked.id]??picked.note??'').trim().length<5))} onClick={async()=>{if(await send({kind:'adopt',topic_id:picked.id,expected_revision:picked.revision,expected_plan:picked.plan,note:notes[picked.id]??picked.note??'',duplicate_reviewed:adoptReviewed[picked.id]===true,history_version:picked.duplicate_check?.history_version})){setActiveTask('');setNotice('원고 작성 요청을 접수했습니다. 작가 담당이 초안을 만들며, 최종 원문 승인은 따로 받습니다.');}}}>이 구성안으로 원고 작성 시작 →</button>
   </section>}
   {linked&&own.every(t=>t.status==='done')&&<button type="button" onClick={()=>onReport?.(linked.report_id!)}>제작 결과 확인 · 원문 승인 화면으로 →</button>}
   <details><summary>선택 자료·대표 의견·이전 작업 기록</summary>{picked.evidence?.map(e=><p key={e.id}><a href={e.url} target="_blank" rel="noopener noreferrer">{e.title}</a></p>)}{picked.note&&<p>대표 의견: {picked.note}</p>}{tasks.filter(t=>t.topic_id===picked.id&&t.plan!==picked.plan).map(t=><p key={t.id}>{stages[t.stage]} · {taskStates[t.status]}<br/>{t.result||'결과 없음'}</p>)}</details>
   {own.length>0&&!['hold','exclude'].includes(picked.state)&&<details className={styles.rework}><summary>결과가 부족한가요? 수정·추가 조사 요청</summary><label htmlFor={`${uid}-stage`}>보완할 단계<select id={`${uid}-stage`} value={reworkStages[picked.id]||(linked?'draft':'research')} onChange={e=>setReworkStages(v=>({...v,[picked.id]:e.target.value}))}>{Object.entries(stages).filter(([s])=>s!=='discover').map(([s,label])=><option key={s} value={s}>{label}</option>)}</select></label><label htmlFor={`${uid}-rework`}>수정·추가할 내용<textarea id={`${uid}-rework`} value={reworkNotes[picked.id]||''} maxLength={2000} onChange={e=>setReworkNotes(v=>({...v,[picked.id]:e.target.value}))}/></label><button type="button" className="ai-secondary" disabled={busy||!reworkNotes[picked.id]?.trim()} onClick={()=>void rework(picked,own)}>이 부분 보완 요청</button></details>}
   <details><summary>이 주제 유지·보류·제외하기</summary><label>결정 이유<textarea value={notes[picked.id]??picked.note??''} maxLength={1000} onChange={e=>setNotes(v=>({...v,[picked.id]:e.target.value}))}/></label><div className="ai-actions">{(['keep','research','hold','exclude'] as const).map(action=><button type="button" key={action} className="ai-secondary" disabled={busy} onClick={()=>void send({kind:'decision',topic_id:picked.id,action,note:notes[picked.id]??picked.note??'',expected_revision:picked.revision})}>{({keep:'유지',research:'추가 조사',hold:'다음 호 보류',exclude:'제외'})[action]}</button>)}</div></details>
  </article>}
  <details><summary>다른 주제 제안·새 주제 발굴</summary><div className={styles.forms}><form onSubmit={e=>void submit(e,'propose')}><h3>가져온 주제</h3><label>검토할 주제<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={500}/></label><button disabled={busy||!title.trim()}>주제 조사 요청</button></form><form onSubmit={e=>void submit(e,'discover')}><h3>추가 주제 찾기</h3><label>찾을 키워드·질문<textarea value={query} onChange={e=>setQuery(e.target.value)} maxLength={2000}/></label><button disabled={busy||!query.trim()}>새 주제 발굴 요청</button></form></div></details>
 </section>;
}
