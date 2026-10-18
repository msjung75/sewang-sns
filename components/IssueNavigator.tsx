"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {currentTasks,issueGuidance,stageNames,type IssueBasket,type IssueBoard,type IssueReport,type IssueTopic} from '../lib/editorial-guidance';
import styles from './IssueNavigator.module.css';
export type DeskView='overview'|'articles'|'workflow'|'reports'|'signals'|'history';
export type DeskTarget={view:DeskView;topicId?:string;taskId?:string;reportId?:string;basket?:boolean};
export function IssueNavigator({refreshKey,reports,view,onNavigate,onChange,onTopics,focusTopicId}:{refreshKey:number;reports:IssueReport[];view:DeskView;onNavigate:(target:DeskTarget)=>void;onChange:()=>void;onTopics?:(topics:IssueTopic[])=>void;focusTopicId?:string}){
 const [basket,setBasket]=useState<IssueBasket|null>(null),[board,setBoard]=useState<IssueBoard|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[preferred,setPreferred]=useState('');
 useEffect(()=>{setPreferred(focusTopicId||'');},[focusTopicId]);
 useEffect(()=>{if(board)onTopics?.(board.topics);},[board,onTopics]);
 const [submission,setSubmission]=useState<{revision:number;topic_id:string}|null>(null);
 const pending=useRef<{revision:number;id:string}|null>(null);
 const load=useCallback(async(signal?:AbortSignal)=>{
  try{const responses=await Promise.all(['reading','workflow'].map(path=>fetch('/api/ai-center/research/'+path,{credentials:'same-origin',cache:'no-store',signal})));if(responses.some(r=>!r.ok))throw Error();const [reading,flow]=await Promise.all(responses.map(r=>r.json()));if(!reading.basket||!Array.isArray(flow.topics)||!Array.isArray(flow.tasks))throw Error();if(!signal?.aborted){setBasket(reading.basket);setSubmission(reading.submission||null);setBoard(flow);setError('');}}
  catch{if(!signal?.aborted)setError('진행 현황을 확인하지 못했습니다. 아래 새로 확인을 눌러주세요. 저장된 선택은 유지됩니다.');}
 },[]);
 useEffect(()=>{const c=new AbortController();void load(c.signal);const timer=setInterval(()=>void load(c.signal),20000);return()=>{c.abort();clearInterval(timer);};},[load,refreshKey]);
 const guide=basket&&board?issueGuidance(basket,board,reports,preferred||undefined,submission):null;
 const own=guide?.topic&&board?currentTasks(board,guide.topic):[],done=own.filter(t=>t.status==='done').length;
 const decisions=(board?.tasks||[]).filter(t=>t.status==='awaiting_review'&&board?.topics.some(topic=>topic.id===t.topic_id&&topic.plan===t.plan&&!topic.needs_review&&!['hold','exclude'].includes(topic.state)));
 const waiting=decisions.length,sourceCount=guide?.topic?.evidence?.length??basket?.items.length??0;
 async function next(){
  if(!guide||!basket||busy||error)return;
  if(guide.kind==='compose'){
   if(pending.current?.revision!==basket.revision)pending.current={revision:basket.revision,id:crypto.randomUUID()};
   setBusy(true);setNotice('');
   try{const r=await fetch('/api/ai-center/research/basket',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'compose',request_id:pending.current.id,expected_revision:basket.revision,mode:'include'})});const data=await r.json();if(!r.ok)throw Error(r.status===409?'선택한 자료가 바뀌었습니다. 새로 확인한 뒤 다시 요청하세요.':data.error||'요청을 저장하지 못했습니다.');pending.current=null;setPreferred(data.topic_id);setNotice('조사 요청을 접수했습니다. 결과가 도착하면 확인하고 다음 단계로 진행할 수 있습니다.');onChange();await load();onNavigate({view:'workflow',topicId:data.topic_id});}
   catch(e){setError(e instanceof Error?e.message:'요청을 저장하지 못했습니다.');}finally{setBusy(false);}return;
  }
  if(guide.kind==='browse')onNavigate({view:'articles'});
  else if(guide.kind==='report')onNavigate({view:'reports',reportId:guide.report?.id});
  else onNavigate({view:'workflow',topicId:guide.topic?.id,taskId:guide.task?.id});
 }

 return <section className={`${styles.desk} ${view!=='overview'?styles.compactDesk:''}`} aria-label="이번 정보지 진행 안내">
  <div className={styles.top}><p>이번 정보지 · 다음 행동 안내</p><button type="button" className="ai-secondary" disabled={busy} onClick={()=>void load()}>진행 현황 새로 확인</button></div>
  {error&&<p className="ai-error" role="alert">{error}</p>}{notice&&<p className="ai-notice" role="status">{notice}</p>}
  {!guide&&!error&&<p role="status">저장된 선택과 실제 작업 상태를 확인하고 있습니다…</p>}
  {guide&&<><div className={styles.hero} data-mode={guide.kind}><div><span className={styles.tag}>{guide.kind==='compose'?'대표님이 시작할 차례':guide.kind==='wait'?'AI 담당 작업 대기·진행':guide.kind==='task'?'대표님 확인 필요':'다음 단계 안내'}</span><h2>{guide.title}</h2><p>{guide.detail}</p>{guide.topic&&<small>현재 요청: {guide.topic.title}</small>}</div><div className={styles.next}><button type="button" disabled={busy||Boolean(error)} onClick={()=>void next()}>{busy?'요청 접수 중…':guide.button} <span aria-hidden="true">→</span></button>{guide.kind==='compose'&&<button type="button" className="ai-secondary" onClick={()=>onNavigate({view:'articles',basket:true})}>선택한 자료 먼저 확인</button>}<small>{guide.kind==='wait'?'결과가 준비되면 다음 단계 버튼이 바뀝니다.':'원문 승인·실제 발송은 별도 확인입니다.'}</small></div></div>
   <div className={styles.metrics}><div><span>{guide.topic?'이 요청의 자료':'선택한 자료'}</span><strong>{sourceCount}<small>건</small></strong><small>{guide.topic?`별도 후보함 ${basket?.items.length||0}건 보관`:'후보함에 보관 중'}</small></div><div><span>현재 요청 완료</span><strong>{own.length?done:'—'}<small>{own.length?` / ${own.length}단계`:'요청 전'}</small></strong><small>{own.length?'대표가 결과를 확인한 단계':'조사 요청 전'}</small></div><div><span>대표 확인 대기</span><strong>{waiting}<small>건</small></strong><small>{waiting?'전체 요청 중 확인할 결과':'새 결과 도착 시 표시'}</small></div></div>
   <ol className={styles.rail} aria-label="현재 요청 단계">{['자료 선택','research','analysis','draft','design','review','원문 승인·번역'].map((stage,i)=>{const task=own.find(t=>t.stage===stage),state=i===0?(basket?.items.length?'done':'active'):task?.status||'future';return <li key={stage} data-state={state} aria-current={guide.task?.id===task?.id&&task?'step':undefined}><span>{state==='done'?'✓':i+1}</span><strong>{stageNames[stage]||stage}</strong><small>{i===0?(sourceCount?`${sourceCount}건 저장`:'자료 고르기'):({done:'확인 완료',queued:'작업 대기',running:'작업 중',awaiting_review:'대표 확인 필요',blocked:'확인 사항 있음',waiting:'앞 단계 대기'} as Record<string,string>)[state]||'아직 시작 전'}</small></li>;})}</ol>
   {view==='overview'&&<div className={styles.explain}><strong>지금 할 일은 위 버튼 하나입니다.</strong><p>자료를 담기만 하면 조사가 시작되지 않습니다. 조사 요청 후에는 AI 결과를 기다리고, 결과가 도착하면 읽고 다음 단계로 넘깁니다.</p>{guide.kind==='compose'&&<p>선택한 기사만으로 페이지를 채우지 않습니다. 시장 변화·수치·키워드·사례·거래처 실행 항목 중 부족한 근거를 구성안에서 먼저 점검합니다.</p>}<details><summary>기존 정보지 수준으로 만들려면 무엇이 더 필요한가요?</summary><ul><li>시장 변화: 통계·보도 원문과 적용 범위</li><li>관심 신호: 검색 관심도·SNS 언급량의 같은 기간 비교</li><li>사례: 국내 현장과 해외 운영 방식의 차이</li><li>거래처 실행: 매장에서 점검·시험할 항목</li><li>기존 발행물과의 중복·이번 호 차별점</li></ul><p>분석 단계에서 각 꼭지의 ‘확보 / 보강 필요 / 이번 호 제외’를 제안합니다. 자료 수로 완성도를 판단하지 않습니다.</p></details></div>}
  </>}
  {view==='overview'&&board&&<section className={styles.portfolio} aria-label="전체 진행과 대표 결정"><h3>대표님이 확인할 결과 <span>{decisions.length}건</span></h3>{decisions.length===0?<p>아직 새 결과가 없습니다. 담당자가 결과를 등록하면 이곳에 확인 버튼이 나타납니다.</p>:decisions.map(task=>{const topic=board.topics.find(t=>t.id===task.topic_id)!;return <article className={styles.inbox} key={task.id}><div><span>대표 확인 필요 · {stageNames[task.stage]}</span><h4>{topic.title}</h4><p>{task.result.slice(0,180)}{task.result.length>180?'…':''}</p></div><button type="button" onClick={()=>onNavigate({view:'workflow',topicId:topic.id,taskId:task.id})}>결과 읽고 다음 단계로 →</button></article>;})}<h3>주제별 진행 상황</h3><div className={styles.table}><table><thead><tr><th>주제</th><th>현재 단계</th><th>상태</th><th>완료</th><th>작업실</th></tr></thead><tbody>{board.topics.filter(t=>!['exclude','hold'].includes(t.state)).map(topic=>{const tasks=currentTasks(board,topic),next=tasks.find(t=>t.status!=='done');return <tr key={topic.id}><td>{topic.title}</td><td>{next?stageNames[next.stage]||next.stage:'결과 확인'}</td><td>{next?({queued:'시작 대기',running:'AI 작업 중',awaiting_review:'대표 확인 필요',blocked:'확인 사항',waiting:'앞 단계 대기'} as Record<string,string>)[next.status]||next.status:'단계 확인 완료'}</td><td>{tasks.filter(t=>t.status==='done').length}/{tasks.length}</td><td><button type="button" className="ai-secondary" onClick={()=>onNavigate({view:'workflow',topicId:topic.id,taskId:next?.id})}>열기</button></td></tr>;})}</tbody></table></div></section>}
  {board&&board.topics.some(t=>t.origin==='evidence')&&<details className={styles.switch}><summary>다른 요청의 진행 현황 보기</summary><label>진행을 확인할 요청<select value={preferred} onChange={e=>setPreferred(e.target.value)}><option value="">현재 후보함 기준으로 자동 선택</option>{board.topics.filter(t=>t.origin==='evidence').map(t=><option key={t.id} value={t.id}>{t.title} · 자료 {t.evidence?.length||0}건</option>)}</select></label></details>}

 </section>;
}
