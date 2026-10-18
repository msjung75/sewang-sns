"use client";
import {FormEvent,useCallback,useEffect,useId,useState} from 'react';
import styles from './EditorialFlow.module.css';

type Topic={id:string;title:string;summary:string;origin:string;state:string;revision:number;note:string;needs_review:boolean;updated_at:string;candidate:unknown;in_snapshot:boolean};
type Task={id:string;topic_id:string|null;stage:string;owner:string;status:string;result:string;instruction?:string;updated_at:string;report_id:string|null;report_status:string|null};
type Board={topics:Topic[];tasks:Task[];updated_at:string|null};
const states:Record<string,string>={candidate:'검토할 후보',keep:'유지',select:'이번 호 선정',research:'추가 조사',hold:'다음 호 보류',exclude:'제외'};
const stages:Record<string,string>={discover:'새 주제 발굴',research:'근거 조사',analysis:'비교·분석',draft:'원고 작성',design:'디자인',review:'최종 검수'};
const taskStates:Record<string,string>={queued:'작업 대기',waiting:'앞 단계 완료 대기',running:'처리 중',done:'결과 등록 완료',blocked:'확인 필요',cancelled:'중단 · 이력 보관'};
const steps=[['주제 검토','총괄·분석'],['근거 조사','조사 담당'],['원고 작성','작가 담당'],['디자인','디자인 담당'],['최종 검수','검수 담당'],['승인·발행','대표 승인 후 진행']];
function time(at:string|null){if(!at)return '아직 수신 없음';const d=new Date(at);return Number.isFinite(d.getTime())?d.toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'시각 미확인';}
export function EditorialFlow({refreshKey,onChange}:{refreshKey:number;onChange:()=>void}){
 const uid=useId();
 const [board,setBoard]=useState<Board|null>(null),[filter,setFilter]=useState('active'),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [busy,setBusy]=useState(false),[title,setTitle]=useState(''),[query,setQuery]=useState(''),[pending,setPending]=useState<{kind:string;request_id:string;text:string}|null>(null);
 const load=useCallback(async(signal?:AbortSignal)=>{
  try{const r=await fetch('/api/ai-center/research/workflow',{cache:'no-store',credentials:'same-origin',signal});if(!r.ok)throw new Error();const data=await r.json();if(!Array.isArray(data.topics)||!Array.isArray(data.tasks))throw new Error();if(!signal?.aborted){setBoard(data);setError('');}}
  catch{if(!signal?.aborted)setError('주제·분담 현황을 불러오지 못했습니다. 새로 확인해 주세요.');}
 },[]);
 useEffect(()=>{const c=new AbortController();void load(c.signal);const timer=setInterval(()=>void load(c.signal),30000);return()=>{c.abort();clearInterval(timer);};},[load,refreshKey]);
 async function send(body:unknown){
  setBusy(true);setError('');setNotice('');
  try{const r=await fetch('/api/ai-center/research/workflow',{method:'POST',cache:'no-store',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error(r.status===409?'현황이 바뀌었습니다. 최신 내용을 확인한 뒤 다시 요청하세요.':'저장하지 못했습니다. 연결을 확인하고 다시 시도하세요.');await load();onChange();return true;}
  catch(e){setError(e instanceof Error?e.message:'저장 실패');return false;}finally{setBusy(false);}
 }
 async function submit(e:FormEvent,kind:'propose'|'discover'){
  e.preventDefault();const value=(kind==='propose'?title:query).trim();if(!value)return;
  const request=pending?.kind===kind&&pending.text===value?pending:{kind,request_id:crypto.randomUUID(),text:value};setPending(request);
  if(await send(request)){setPending(null);if(kind==='propose')setTitle('');else setQuery('');setNotice(kind==='propose'?'가져오신 주제를 유지하고 조사·분석 담당의 대기열에 등록했습니다.':'새 주제 발굴을 요청했습니다. 실제 조사 결과가 등록되면 이 진행판에 표시됩니다.');}
 }
 const topics=board?.topics||[],tasks=board?.tasks||[];
 const shown=topics.filter(t=>filter==='all'||(filter==='active'?!['exclude','hold'].includes(t.state):filter==='next'?['keep','research','hold'].includes(t.state):t.state===filter));
 const activeTasks=tasks.filter(t=>['queued','running','blocked'].includes(t.status));
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
   const own=tasks.filter(task=>task.topic_id===t.id&&task.status!=='cancelled'),next=own.find(task=>['queued','running','blocked'].includes(task.status));
   return <article key={t.id} className={styles.topic}><div className={styles.header}><div><span className={styles.badge}>{t.origin==='owner'?'대표 제안':'AI 조사 후보'} · {states[t.state]||t.state}</span><h4>{t.title}</h4></div>{t.in_snapshot&&<a href={`#topic-${t.id}`}>근거·중복 검토 후 이번 호 선정 ↓</a>}</div>
    {t.note&&<p>대표 의견: {t.note}</p>}{t.needs_review&&<p className="ai-notice">새 자료가 들어왔습니다. 기존 결정은 보존했으며, 아래 근거를 확인하고 유지·선정을 다시 기록해 주세요.</p>}
    <p><strong>다음 작업</strong> {next?`${next.owner} · ${stages[next.stage]} · ${taskStates[next.status]}`:t.state==='exclude'?'제외 이유와 이력 보관':t.state==='hold'?'다음 호 후보로 보관':t.needs_review?'새 근거 검토':own.some(task=>task.stage==='review'&&task.status==='done')?'아래 원고에서 대표 최종 검토':own.some(task=>task.stage==='analysis'&&task.status==='done')?'분석 결과 확인 후 이번 호 선정':'근거를 확인하고 유지·제외·조사 결정'}</p>
    {own.length>0&&<ol className={styles.handoffs}>{own.map(task=><li key={task.id} data-state={task.status}><strong>{stages[task.stage]}</strong><small>{taskStates[task.status]}</small>{task.result&&<details><summary>담당 결과</summary><p>{task.result}</p>{task.report_id&&<a href="#report-workspace">연결 원고 {task.report_id} · {task.report_status||'상태 확인 필요'} ↓</a>}</details>}</li>)}</ol>}
    <div className="ai-actions">{(['keep','research','hold','exclude'] as const).filter(a=>a!==t.state||t.needs_review).map(action=><button key={action} className="ai-secondary" disabled={busy||Boolean(error)} onClick={()=>void send({kind:'decision',topic_id:t.id,action,note:t.note||'',expected_revision:t.revision})}>{({keep:'유지',research:'더 조사',hold:'다음 호 보류',exclude:'제외'})[action]}</button>)}</div>
   </article>;
  })}</div>
  <details className={styles.queue}><summary>새 주제 발굴·전체 담당 대기열 ({activeTasks.length}건)</summary><p className="ai-muted">요청 등록과 실제 실행을 구분합니다. 작업을 맡은 시각과 결과가 수신돼야 진행·완료로 표시합니다. 자동 확인은 기존 15분 주기이며 Mac·앱·네트워크가 필요합니다.</p>
   {discover.map(task=><article key={task.id}><h4>{task.instruction}</h4><p>{task.owner} · {taskStates[task.status]} · {time(task.updated_at)}</p>{task.result&&<p>{task.result}</p>}</article>)}
   {activeTasks.filter(task=>task.stage!=='discover').map(task=><p key={task.id}><strong>{topics.find(t=>t.id===task.topic_id)?.title||'주제 확인 필요'}</strong> — {task.owner} · {stages[task.stage]} · {taskStates[task.status]}</p>)}
  </details>
 </section>;
}
