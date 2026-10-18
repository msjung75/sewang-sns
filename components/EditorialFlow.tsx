"use client";
import {FormEvent,useCallback,useEffect,useId,useRef,useState} from 'react';
import styles from './EditorialFlow.module.css';
import {KoreanSourceReview,type SourceReview} from './KoreanSourceReview';

type DuplicateCheck={status:string;requires_review:boolean;history_version:string;matches:{post:{url:string;title_or_caption:string};reason:string|string[]}[]};
type Topic={evidence?:{id:string;title:string;url:string}[];review_mode?:string;duplicate_check?:DuplicateCheck;id:string;title:string;summary:string;origin:string;state:string;revision:number;note:string;needs_review:boolean;updated_at:string;candidate:unknown;in_snapshot:boolean;plan:number;progress?:{completed:number;total:number;percent:number;awaiting_review:number}};
type Task={source_reviews?:SourceReview[];id:string;topic_id:string|null;stage:string;owner:string;status:string;result:string;instruction?:string;updated_at:string;report_id:string|null;report_status:string|null;plan:number;version:number;report_hash?:string|null;current_report_hash?:string|null;report_stale?:boolean;criteria?:{id:string;label:string;done:boolean}[];owner_note?:string};
type Board={topics:Topic[];tasks:Task[];updated_at:string|null};
const states:Record<string,string>={candidate:'검토할 후보',keep:'유지',select:'이번 호 선정',research:'추가 조사',hold:'다음 호 보류',exclude:'제외'};
const stages:Record<string,string>={discover:'새 주제 발굴',research:'근거 조사',analysis:'비교·분석',draft:'원고 작성',design:'디자인',review:'최종 검수'};
const taskStates:Record<string,string>={queued:'작업 대기',waiting:'앞 단계 완료 대기',running:'처리 중',done:'결과 등록 완료',blocked:'확인 필요',awaiting_review:'결과 준비 · 대표 확인 대기',cancelled:'중단 · 이력 보관'};
const steps=[['주제 검토','총괄·분석'],['근거 조사','조사 담당'],['원고 작성','작가 담당'],['디자인','디자인 담당'],['최종 검수','검수 담당'],['승인·발행','대표 승인 후 진행']];
function time(at:string|null){if(!at)return '아직 수신 없음';const d=new Date(at);return Number.isFinite(d.getTime())?d.toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'시각 미확인';}
export function EditorialFlow({refreshKey,onChange}:{refreshKey:number;onChange:()=>void}){
 const uid=useId();
 const reworkRequest=useRef<{key:string;id:string}|null>(null);
 const [board,setBoard]=useState<Board|null>(null),[filter,setFilter]=useState('active'),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [gateNotes,setGateNotes]=useState<Record<string,string>>({}),[reworkNotes,setReworkNotes]=useState<Record<string,string>>({}),[reworkStages,setReworkStages]=useState<Record<string,string>>({});
 const [adoptReviewed,setAdoptReviewed]=useState<Record<string,boolean>>({});
 const [notes,setNotes]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState(false),[title,setTitle]=useState(''),[query,setQuery]=useState(''),[pending,setPending]=useState<{kind:string;request_id:string;text:string}|null>(null);
 const load=useCallback(async(signal?:AbortSignal)=>{
  try{const r=await fetch('/api/ai-center/research/workflow',{cache:'no-store',credentials:'same-origin',signal});if(!r.ok)throw new Error();const data=await r.json();if(!Array.isArray(data.topics)||!Array.isArray(data.tasks))throw new Error();if(!signal?.aborted){setBoard(data);setError('');}}
  catch{if(!signal?.aborted)setError('주제·분담 현황을 불러오지 못했습니다. 새로 확인해 주세요.');}
 },[]);
 useEffect(()=>{const c=new AbortController();void load(c.signal);const timer=setInterval(()=>void load(c.signal),30000);return()=>{c.abort();clearInterval(timer);};},[load,refreshKey]);
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
 const shown=topics.filter(t=>filter==='all'||(filter==='active'?!['exclude','hold'].includes(t.state):filter==='next'?['keep','research','hold'].includes(t.state):t.state===filter));
 const activeTasks=tasks.filter(t=>['queued','running','blocked','awaiting_review'].includes(t.status));
 const discover=tasks.filter(t=>t.stage==='discover'&&t.status!=='cancelled');
 return <section id="editorial-flow" className={`ai-panel ${styles.panel}`} aria-labelledby={`${uid}-heading`} aria-busy={busy}>
  <div className={styles.header}><div><p className="ai-kicker">하나의 프로젝트 · 총괄이 연결하는 분업</p><h2 id={`${uid}-heading`}>주제부터 다음 호까지, 한눈에</h2><p>가져온 주제를 고르고 새 후보를 보태면, 담당별 결과가 다음 작업으로 이어집니다.</p></div><button className="ai-secondary" disabled={busy} onClick={()=>void load()}>진행 상태 새로 확인</button></div>
  <ol className={styles.steps} aria-label="리포트 제작 순서">{steps.map(([name,owner],i)=><li key={name}><span>{i+1}</span><strong>{name}</strong><small>{owner}</small></li>)}</ol>
  <div className={styles.parallel}><strong>다음 호 조사도 함께 준비</strong><p>이번 호의 원고·디자인·승인과 별도로 새 주제를 찾습니다. 사용하지 않은 좋은 주제와 제외 이유는 주제함에 남습니다.</p></div>
  {error&&<p className="ai-error" role="alert">{error}</p>}{notice&&<p className="ai-notice" role="status">{notice}</p>}
  <div className={styles.forms}>
   <form onSubmit={e=>void submit(e,'propose')}><h3>가져온 주제 추가</h3><label htmlFor={`${uid}-title`}>검토할 주제<input id={`${uid}-title`} value={title} onChange={e=>setTitle(e.target.value)} maxLength={500} placeholder="예: 기존 인스타 사례를 리포트로 확장하기" required disabled={busy}/></label><p>제목만 넣으면 근거 조사와 중복 검토부터 준비합니다.</p><button disabled={busy||!title.trim()}>주제함에 넣고 조사 요청</button></form>
   <form onSubmit={e=>void submit(e,'discover')}><h3>추가 주제 찾아보기</h3><label htmlFor={`${uid}-query`}>더 찾고 싶은 분야·질문<textarea id={`${uid}-query`} value={query} onChange={e=>setQuery(e.target.value)} maxLength={2000} placeholder="예: 기존 주제와 겹치지 않는 음식점 사장님용 새 주제 3개. 선정 이유와 출처도 비교해줘." required disabled={busy}/></label><button disabled={busy||!query.trim()}>새 주제 발굴 요청</button></form>
  </div>
  <div className={styles.header}><h3>계속 이어지는 주제함 <small>{topics.length}개</small></h3><span className="ai-muted">마지막 변경 {time(board?.updated_at||null)}</span></div>
  <div className={styles.filters} role="group" aria-label="주제함 보기">{[['active','검토할 주제'],['select','이번 호'],['next','다음 호 후보'],['exclude','제외함'],['all','전체 이력']].map(([value,label])=><button key={value} className="ai-secondary" aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div>
  {!board&&!error&&<p role="status">기존 주제와 분담 현황을 연결하고 있습니다…</p>}
  {board&&!shown.length&&<p className="ai-muted">이 분류에 주제가 없습니다. 가져온 주제를 추가하거나 새 주제 발굴을 요청하세요.</p>}
  <div className={styles.topics}>{shown.map(t=>{
   const own=tasks.filter(task=>task.topic_id===t.id&&task.status!=='cancelled'&&task.plan===t.plan),next=own.find(task=>['awaiting_review','queued','running','blocked'].includes(task.status));
   const progress=t.progress||{completed:own.filter(task=>task.status==='done').length,total:own.length,percent:own.length?Math.round(own.filter(task=>task.status==='done').length/own.length*100):0,awaiting_review:0};
   const history=tasks.filter(task=>task.topic_id===t.id&&task.plan!==t.plan);
   return <article key={t.id} className={styles.topic}><div className={styles.header}><div><span className={styles.badge}>{t.origin==='evidence'?'대표 선택 자료':t.origin==='owner'?'대표 제안':t.origin==='revision'?'원고 보완':'AI 조사 후보'} · {states[t.state]||t.state}</span><h4>{t.title}</h4></div>{t.in_snapshot&&t.state!=='exclude'&&<a href={`#topic-${t.id}`}>근거·중복 검토 후 이번 호 선정 ↓</a>}</div>
    {t.origin==='evidence'&&<details open><summary>선택 자료 {t.evidence?.length||0}건 · {t.review_mode==='include'?'정보지 반영 검토':'심층 분석'}</summary>{t.evidence?.map(e=><p key={e.id}>{/^https?:\/\//.test(e.url)?<a href={e.url} target="_blank" rel="noopener noreferrer">{e.title} ↗</a>:e.title}</p>)}<p className="ai-muted">선택 당시의 자료와 검증 상태를 보관했습니다. AI의 포함 권고를 확인한 뒤 원고 반영을 결정하세요.</p></details>}
    {t.note&&<p>대표 의견: {t.note}</p>}{t.needs_review&&<p className="ai-notice">새 자료가 들어왔습니다. 기존 결정은 보존했으며, 아래 근거를 확인하고 유지·선정을 다시 기록해 주세요.</p>}
    {progress.total>0&&<div className={styles.progress}><label htmlFor={`${uid}-progress-${t.id}`}>제작 진행 {progress.percent}% · 완료 {progress.completed}/{progress.total}단계</label><progress id={`${uid}-progress-${t.id}`} value={progress.percent} max={100}/><p className="ai-muted">완료된 단계 수의 비율입니다. 자료의 신뢰도나 경과 시간을 뜻하지 않습니다. 담당 결과를 확인한 뒤 대표님이 다음 단계로 넘깁니다.</p></div>}
    <p><strong>다음 작업</strong> {next?`${next.owner} · ${stages[next.stage]} · ${taskStates[next.status]}`:t.state==='exclude'?'제외 이유와 이력 보관':t.state==='hold'?'다음 호 후보로 보관':t.needs_review?'새 근거 검토':own.some(task=>task.stage==='review'&&task.status==='done')?'아래 원고에서 대표 최종 검토':own.some(task=>task.stage==='analysis'&&task.status==='done')?'분석 결과 확인 후 이번 호 선정':'근거를 확인하고 유지·제외·조사 결정'}</p>
    {own.length>0&&<ol className={styles.handoffs}>{own.map(task=>{
     const criteria=task.criteria||[],missing=criteria.filter(c=>!c.done),canAdvance=['awaiting_review','blocked'].includes(task.status)&&Boolean(task.result)&&!task.report_stale;
     return <li key={task.id} data-state={task.status}><strong>{stages[task.stage]}</strong><small>{taskStates[task.status]}</small>
      <p className="ai-muted">확인 {criteria.filter(c=>c.done).length}/{criteria.length}항목</p>
      {criteria.length>0&&<ul className={styles.checks}>{criteria.map(c=><li key={c.id}>{c.done?'✓':'○'} {c.label}</li>)}</ul>}
      {task.result&&<details open={task.status==='awaiting_review'||task.status==='blocked'}><summary>담당 결과</summary><p>{task.result}</p>{task.report_id&&<a href="#report-workspace">연결 원고 {task.report_id} · {task.report_status||'상태 확인 필요'} ↓</a>}</details>}
      {task.source_reviews?.map(r=><KoreanSourceReview key={r.evidence_id} review={r} title={t.evidence?.find(e=>e.id===r.evidence_id)?.title}/>)}
      {task.report_stale&&<p className="ai-error">원고가 바뀌었습니다. 새 버전을 검토하거나 아래에서 보완을 요청하세요.</p>}
      {canAdvance&&<><label htmlFor={`${uid}-gate-${task.id}`}>{missing.length||task.status==='blocked'?'미확인 항목을 남기고 진행할 이유 · 5자 이상':'다음 단계 진행 의견 (선택)'}<textarea id={`${uid}-gate-${task.id}`} value={gateNotes[task.id]||''} maxLength={2000} disabled={busy} onChange={e=>setGateNotes(v=>({...v,[task.id]:e.target.value}))}/></label>
       <button type="button" disabled={busy||Boolean(error)||Boolean((missing.length||task.status==='blocked')&&(gateNotes[task.id]||'').trim().length<5)} onClick={async()=>{if(await send({kind:'advance',task_id:task.id,expected_version:task.version,note:gateNotes[task.id]||''}))setNotice(task.stage==='review'?'제작 검토를 마쳤습니다. 아래 원고에서 최종 내용을 확인하고 원문을 승인하세요.':'대표 확인을 기록하고 다음 담당의 작업을 열었습니다.');}}>{task.stage==='review'?'제작 검토 마침 · 원고 승인으로':'이 결과로 다음 단계 진행'}</button>
       {missing.length>0&&<p className="ai-muted">미확인 항목은 완료로 바꾸지 않고 진행 사유와 함께 남깁니다.</p>}
      </>}
      {['queued','running','waiting'].includes(task.status)&&<p className="ai-muted">결과가 등록되면 확인하고 다음 단계로 진행할 수 있습니다.</p>}
      {task.owner_note&&<p>대표 진행 의견: {task.owner_note}</p>}
     </li>;
    })}</ol>}
    {t.origin==='evidence'&&t.state!=='select'&&!['exclude','hold'].includes(t.state)&&<section aria-label="선택 자료 원고 반영 결정"><h5>분석 의견 확인 후 정보지에 넣기</h5>
      <p>조사와 분석 결과를 각각 확인·완료한 뒤 원고 작성을 요청할 수 있습니다. 원고 승인과 발행 승인은 별도입니다.</p>
      <p>{t.duplicate_check?.status==='unavailable'?'중복 검사 연결 확인이 필요합니다.':t.duplicate_check?.requires_review?'유사한 기존 게시물이 있습니다. 차별점을 아래 의견에 적어주세요.':'현재 가져온 이력에서 중복 후보가 검출되지 않았습니다. 전체 본문·영상 검증은 별도입니다.'}</p>
      {t.duplicate_check?.matches.map((m,i)=><p key={i}><a href={m.post.url} target="_blank" rel="noopener noreferrer">{m.post.title_or_caption}</a> · {Array.isArray(m.reason)?m.reason.join(' · '):m.reason}</p>)}
      {t.duplicate_check?.requires_review&&<label><input type="checkbox" checked={adoptReviewed[t.id]===true} disabled={busy} onChange={e=>setAdoptReviewed(v=>({...v,[t.id]:e.target.checked}))}/> 기존 게시물을 확인하고 아래 의견에 차별점을 적었습니다</label>}
      <button type="button" disabled={busy||Boolean(error)||!t.duplicate_check||t.duplicate_check.status==='unavailable'||!['research','analysis'].every(stage=>own.some(task=>task.stage===stage&&task.status==='done'))||Boolean(t.duplicate_check.requires_review&&(!adoptReviewed[t.id]||(notes[t.id]??t.note??'').trim().length<5))} onClick={async()=>{if(await send({kind:'adopt',topic_id:t.id,expected_revision:t.revision,expected_plan:t.plan,note:notes[t.id]??t.note??'',duplicate_reviewed:adoptReviewed[t.id]===true,history_version:t.duplicate_check?.history_version}))setNotice('대표님의 원고 반영 결정을 기록했습니다. 선택 자료와 조사·분석 결과를 작가에게 전달했습니다.');}}>분석 확인 · 이번 호 원고 작성 요청</button>
    </section>}
    {own.length>0&&!['hold','exclude'].includes(t.state)&&<details className={styles.rework}><summary>부족한 단계 보완·수정 요청</summary><label htmlFor={`${uid}-stage-${t.id}`}>다시 시작할 단계<select id={`${uid}-stage-${t.id}`} value={reworkStages[t.id]||(own.some(task=>task.report_id)?'draft':'research')} disabled={busy} onChange={e=>setReworkStages(v=>({...v,[t.id]:e.target.value}))}>{Object.entries(stages).filter(([stage])=>stage!=='discover').map(([stage,label])=><option key={stage} value={stage}>{label}</option>)}</select></label><label htmlFor={`${uid}-rework-${t.id}`}>수정·추가할 부분과 유지할 부분<textarea id={`${uid}-rework-${t.id}`} value={reworkNotes[t.id]||''} onChange={e=>setReworkNotes(v=>({...v,[t.id]:e.target.value}))} maxLength={2000} disabled={busy} placeholder="예: 수치의 원문만 추가 확인하고, 현재 정리한 사례는 유지해줘."/></label><button type="button" className="ai-secondary" disabled={busy||Boolean(error)||!reworkNotes[t.id]?.trim()} onClick={()=>void rework(t,own)}>이 단계부터 보완 요청</button><p className="ai-muted">요청한 단계와 이후 작업만 다시 엽니다. 기존 결과는 이력에 남고 원고는 보완 전까지 보존됩니다.</p></details>}
    {history.length>0&&<details><summary>이전 작업 이력 {history.length}건</summary>{history.slice(-20).map(task=><p key={task.id}><strong>{stages[task.stage]} · {taskStates[task.status]}</strong><br/>{task.result||'저장된 결과 없음'}</p>)}</details>}
    <label htmlFor={`${uid}-note-${t.id}`}>유지·제외·추가 조사 의견 (선택 사항)<textarea id={`${uid}-note-${t.id}`} maxLength={1000} value={notes[t.id]??t.note??''} onChange={e=>setNotes(v=>({...v,[t.id]:e.target.value}))} disabled={busy}/></label>
    <div className="ai-actions">{(['keep','research','hold','exclude'] as const).filter(a=>a!==t.state||t.needs_review).map(action=><button key={action} className="ai-secondary" disabled={busy||Boolean(error)} onClick={()=>void send({kind:'decision',topic_id:t.id,action,note:notes[t.id]??t.note??'',expected_revision:t.revision})}>{({keep:'유지',research:'더 조사',hold:'다음 호 보류',exclude:'제외'})[action]}</button>)}</div>
   </article>;
  })}</div>
  <details className={styles.queue}><summary>새 주제 발굴·전체 담당 대기열 ({activeTasks.length}건)</summary><p className="ai-muted">요청 등록과 실제 실행을 구분합니다. 작업을 맡은 시각과 결과가 수신돼야 진행·완료로 표시합니다. 자동 확인은 기존 15분 주기이며 Mac·앱·네트워크가 필요합니다.</p>
   {discover.map(task=><article key={task.id}><h4>{task.instruction}</h4><p>{task.owner} · {taskStates[task.status]} · {time(task.updated_at)}</p>{task.result&&<p>{task.result}</p>}</article>)}
   {activeTasks.filter(task=>task.stage!=='discover').map(task=><p key={task.id}><strong>{topics.find(t=>t.id===task.topic_id)?.title||'주제 확인 필요'}</strong> — {task.owner} · {stages[task.stage]} · {taskStates[task.status]}</p>)}
  </details>
 </section>;
}
