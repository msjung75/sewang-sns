"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {KoreanSourceReview,type SourceReview} from './KoreanSourceReview';
import styles from './ResearchReview.module.css';
export type Article={id:string;title:string;url:string;published_at:string;collected_at:string;source_type:string;summary:string;verification:string;limitations:string[]};
type Reading=SourceReview&{title_ko:string;case_country:string;source_language:string;failure_reason:string;reviewed_url?:string};
type Basket={revision:number;items:{evidence:Article;note:string;added_at:string}[];note:string;updated_at:string|null};
const emptyBasket:Basket={revision:0,items:[],note:'',updated_at:null};
const ranges:Record<string,string>={all:'전체',news:'공개 뉴스',connectors:'연결 도구',japan:'일본',us:'미국',europe:'유럽'};
function matches(a:Article,key:string,r?:Reading){
 const connector=/YouTube|썸트렌드|Apify|youtube|sometrend|apify/i.test(a.source_type),country=r?.case_country||'';
 if(key==='all')return true;if(key==='news')return /뉴스|news|^해외 사례/i.test(a.source_type)&&!connector;if(key==='connectors')return connector;
 // A search locale alone never establishes a case's country.
 if(country&&country!=='확인 중')return key==='japan'?country.includes('일본'):key==='us'?country.includes('미국'):key==='europe'?/영국|독일|프랑스|유럽|스페인|이탈리아/.test(country):false;
 return false;
}
function date(value:string){return value?value.slice(0,10):'게시일 미확인';}
function link(url:string){try{const u=new URL(url);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password?u.href:undefined;}catch{return undefined;}}
export function ArticleLibrary({articles,reviews,view,onChange}:{articles:Article[];reviews:Record<string,SourceReview>;view?:{kind:string;nonce:number};onChange?:()=>void}){
 const [notes,setNotes]=useState<Record<string,Reading>>({}),[basket,setBasket]=useState<Basket>(emptyBasket),[loaded,setLoaded]=useState(false);
 const [tab,setTab]=useState('ready'),[range,setRange]=useState('all'),[query,setQuery]=useState(''),[page,setPage]=useState(1),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [editingNote,setEditingNote]=useState('');const composeRef=useRef<{key:string;id:string}|null>(null);
 const [focusId,setFocusId]=useState('');
 const load=useCallback(async(signal?:AbortSignal)=>{try{const r=await fetch('/api/ai-center/research/reading',{credentials:'same-origin',cache:'no-store',signal});if(!r.ok)throw Error();const d=await r.json();if(signal?.aborted)return;setNotes(d.notes||{});setBasket(d.basket);setEditingNote(old=>old||d.basket.note||'');setLoaded(true);}catch{if(!signal?.aborted)setError('한국어 검토함·후보함을 불러오지 못했습니다. 다시 확인하세요.');}},[]);
 useEffect(()=>{const c=new AbortController();void load(c.signal);const t=setInterval(()=>void load(c.signal),60000);return()=>{c.abort();clearInterval(t);};},[load]);
 useEffect(()=>{if(view?.nonce){setRange(view.kind);setTab('all');setQuery('');setPage(1);}},[view]);
 useEffect(()=>{const listener=(event:Event)=>{const id=(event as CustomEvent<string>).detail;setFocusId(id);setTab('all');setRange('all');setQuery('');setPage(Math.floor(Math.max(0,articles.findIndex(a=>a.id===id))/10)+1);};window.addEventListener('sewang-open-evidence',listener);return()=>window.removeEventListener('sewang-open-evidence',listener);},[articles]);
 const review=(a:Article):Reading|undefined=>notes[a.id]||(reviews[a.id]?{...reviews[a.id],title_ko:/[가-힣]/.test(a.title)?a.title:'한국어 제목 정리 중',case_country:'확인 중',source_language:'확인 중',failure_reason:''}:undefined);
 const ready=(a:Article)=>{const r=review(a);return r?.read_scope==='full_text'&&r.title_ko!=='한국어 제목 정리 중';};
 const sources=tab==='basket'?basket.items.map(i=>i.evidence):articles;
 const filtered=sources.filter(a=>(tab==='ready'?ready(a):tab==='collecting'?!ready(a):true)&&matches(a,range,review(a))&&[review(a)?.title_ko,review(a)?.summary_ko,a.title,a.summary,a.source_type].join(' ').toLowerCase().includes(query.toLowerCase()));
 const pages=Math.max(1,Math.ceil(filtered.length/10)),current=Math.min(page,pages),rows=filtered.slice((current-1)*10,current*10);
 async function mutate(action:string,evidence_id='',value=''){
  if(busy||!loaded)return;setBusy(true);setError('');setNotice('');
  try{const r=await fetch('/api/ai-center/research/basket',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({expected_revision:basket.revision,action,evidence_id,value})});if(!r.ok)throw Error(r.status===409?'후보함이 다른 화면에서 바뀌었습니다. 새 내용을 불러왔으니 확인 후 다시 처리하세요.':'후보함을 저장하지 못했습니다.');setBasket(await r.json());setNotice('후보함에 저장했습니다. 다시 접속해도 유지됩니다.');}
  catch(e){setError(e instanceof Error?e.message:'저장 실패');await load();}finally{setBusy(false);}
 }
 async function compose(mode:'include'|'analyze'){
  if(busy||!loaded||!basket.items.length)return;
  if(editingNote!==basket.note){setError('구성 메모를 먼저 저장한 뒤 요청하세요.');setTab('basket');return;}
  const key=JSON.stringify([basket.revision,mode]);if(composeRef.current?.key!==key)composeRef.current={key,id:crypto.randomUUID()};
  setBusy(true);setError('');setNotice('');
  try{const r=await fetch('/api/ai-center/research/basket',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'compose',request_id:composeRef.current.id,expected_revision:basket.revision,mode})});if(!r.ok){const d=await r.json().catch(()=>({}));throw Error(r.status===409?'후보함 상태가 바뀌었습니다. 다시 확인하세요.':d.error||'검토 요청을 저장하지 못했습니다.');}composeRef.current=null;setNotice(mode==='include'?'선택 순서와 메모를 전달했습니다. 우선 원문 검토와 정보지 구성안을 준비하고, 대표님 확인 후 원고 작성으로 연결합니다.':'후보함 자료의 한국어 원문 검토를 우선 요청했습니다. 진행판에서 결과를 확인하세요.');onChange?.();}
  catch(e){setError(e instanceof Error?e.message:'요청 실패');await load();}finally{setBusy(false);}
 }
 function chooseTab(value:string){setTab(value);setPage(1);setRange('all');setQuery('');}
 return <section id="research-evidence" className={styles.library} aria-label="기사 검토와 이번 호 후보함">
  <div className={styles.heading}><div><h3>한국어 기사 검토함</h3><p className="ai-muted">짧게 비교하고, 필요한 기사를 이번 호 후보함에 담으세요.</p></div><button type="button" className="ai-secondary" disabled={busy} onClick={()=>void load()}>검토함 새로 확인</button></div>
  <div className="ai-actions" aria-label="검토 상태">{[['ready',`원문 검토 ${articles.filter(ready).length}건`],['collecting',`수집·검토 중 ${articles.filter(a=>!ready(a)).length}건`],['basket',`이번 호 후보 ${basket.items.length}건`],['all',`전체 ${articles.length}건`]].map(([key,label])=><button key={key} type="button" className="ai-secondary" aria-pressed={tab===key} onClick={()=>chooseTab(key)}>{label}</button>)}</div>
  <p className="ai-muted">원문 검토는 본문을 읽고 한국어로 정리한 상태입니다. 독립적인 사실 검증이나 발행 승인을 뜻하지 않습니다.</p>
  {error&&<p className="ai-error" role="alert">{error}</p>}{notice&&<p className="ai-notice" role="status">{notice}</p>}
  {!loaded&&<p role="status">저장된 한국어 자료와 후보함 확인 중…</p>}
  <div className="ai-actions" aria-label="사례 국가">{Object.entries(ranges).map(([key,label])=><button key={key} type="button" className="ai-secondary" aria-pressed={range===key} onClick={()=>{setRange(key);setPage(1);}}>{label}</button>)}</div>
  <p className="ai-muted">지역 필터는 확인된 사례 국가 기준입니다. 검색 국가만 알려진 자료는 전체에서 볼 수 있습니다.</p>
  <label>기사 검색<input value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}} placeholder="한국어 제목·요약·출처 검색"/></label>
  {tab==='basket'&&<section className={styles.selection} aria-label="정보지 구성 메모"><h4>이번 호 정보지 구성</h4><p>최대 10건 · 위에서 아래 순서로 전달합니다. 수집일이 바뀌어도 담은 자료는 보관합니다.</p><label>구성 방향·연결할 주제<textarea maxLength={2000} value={editingNote} onChange={e=>setEditingNote(e.target.value)} placeholder="예: 일본 사례를 먼저 소개하고, 국내 음식점에서 시험할 방법으로 마무리"/></label><button type="button" disabled={busy||editingNote===basket.note} onClick={()=>void mutate('note','',editingNote)}>구성 메모 저장</button><div className="ai-actions"><button type="button" disabled={busy||!loaded||!basket.items.length} onClick={()=>void compose('include')}>선택 기사로 정보지 구성안 만들기</button><button type="button" className="ai-secondary" disabled={busy||!loaded||!basket.items.length} onClick={()=>void compose('analyze')}>선택 기사 우선 검토</button></div></section>}
  <p role="status">{filtered.length?`${filtered.length}건 중 ${(current-1)*10+1}~${Math.min(current*10,filtered.length)}건`:'표시할 기사 0건'} · {current}/{pages}페이지</p>
  {!filtered.length&&<p>{tab==='ready'?'한국어 원문 검토가 완료된 자료를 준비 중입니다. 수집·검토 중 탭에서 관심 기사를 담으면 우선 검토를 요청할 수 있습니다.':'현재 조건에 맞는 기사가 없습니다.'}</p>}
  <div className={styles.evidence}>{rows.map(a=>{const r=review(a),selected=basket.items.some(i=>i.evidence.id===a.id),item=basket.items.find(i=>i.evidence.id===a.id),label=r?.title_ko||(/[가-힣]/.test(a.title)?a.title:'한국어 제목 정리 중'),position=basket.items.findIndex(i=>i.evidence.id===a.id);
   return <article key={a.id} id={`article-${a.id}`} className={styles.compact}>
    <label className={styles.checkbox}><input type="checkbox" aria-label={`${label} 이번 호 후보에 담기`} checked={selected} disabled={busy||!loaded||(!selected&&basket.items.length>=10)} onChange={()=>void mutate(selected?'remove':'add',a.id)}/><span>{selected?'이번 호 후보에 담김':'이번 호 후보에 담기'}</span></label>
    <h4>{label}</h4><p className="ai-muted">사례 국가: {r?.case_country||'확인 중'} · 원문 언어: {r?.source_language||'확인 중'} · {date(a.published_at)}</p>
    <span className={styles.verification}>{r?.read_scope==='full_text'?'원문 검토':r?.read_scope==='excerpt'?'본문 일부 확인':r?'제목 번역 · 본문 검토 대기':/[가-힣]/.test(a.title)?'본문 검토 대기':'한국어 정리 대기'}</span>
    <p className={styles.excerpt}>{r?.summary_ko||(/[가-힣]/.test(a.title)?a.summary:'한국어 제목·요약을 준비 중입니다. 관심 자료로 담아 우선 검토를 요청할 수 있습니다.')}</p>
    {r?.domestic_implications&&<p className={styles.excerpt}><strong>국내 참고점 · AI 의견</strong> {r.domestic_implications}</p>}
    <details open={focusId===a.id||undefined}><summary>상세 보기 · 원문과 확인 범위</summary><p><strong>원제</strong> {a.title}</p>{link(r?.reviewed_url||a.url)&&<a href={link(r?.reviewed_url||a.url)} target="_blank" rel="noopener noreferrer">원문 열기 ↗</a>}<p className="ai-muted">검색·수집 범위: {a.source_type} · 수집 {date(a.collected_at)}</p>{r?<KoreanSourceReview review={r}/>:<p>{a.summary}</p>}{r?.failure_reason&&<p>확인하지 못한 이유: {r.failure_reason}</p>}<details><summary>자료의 한계·수집 기록</summary><p>{a.verification}</p><ul>{a.limitations.map((l,i)=><li key={i}>{l}</li>)}</ul></details></details>
    {tab==='basket'&&<><div className="ai-actions"><button type="button" className="ai-secondary" aria-label={`${label} 위로`} disabled={busy||position===0} onClick={()=>void mutate('up',a.id)}>↑ 위로</button><button type="button" className="ai-secondary" aria-label={`${label} 아래로`} disabled={busy||position===basket.items.length-1} onClick={()=>void mutate('down',a.id)}>↓ 아래로</button><button type="button" className="ai-secondary" disabled={busy} onClick={()=>void mutate('remove',a.id)}>후보에서 빼기</button></div><label>기사별 메모<input key={`${a.id}-${item?.note}`} defaultValue={item?.note||''} maxLength={500} onBlur={e=>{if(e.target.value!==(item?.note||''))void mutate('note',a.id,e.target.value);}} placeholder="활용할 부분·확인할 질문"/></label>{!articles.some(current=>current.id===a.id)&&<p className="ai-muted">이전 수집일에 담은 자료입니다. 선택 당시 내용을 보관했습니다.</p>}</>}
   </article>;
  })}</div>
  <nav className={styles.pagination} aria-label="기사 페이지"><button type="button" className="ai-secondary" disabled={current===1} onClick={()=>{setPage(current-1);document.getElementById('research-evidence')?.scrollIntoView();}}>이전</button><span>{current} / {pages} · {current===pages?'마지막 페이지':'페이지당 10건'}</span><button type="button" className="ai-secondary" disabled={current===pages} onClick={()=>{setPage(current+1);document.getElementById('research-evidence')?.scrollIntoView();}}>다음</button></nav>
  <aside className={styles.basketBar} aria-label="고정 후보함"><strong>이번 호 후보 {basket.items.length}/10건</strong><button type="button" disabled={!loaded} onClick={()=>{chooseTab('basket');document.getElementById('research-evidence')?.scrollIntoView({behavior:'smooth'});}}>모아보기</button><small>선택과 메모는 서버에 저장됩니다.</small></aside>
 </section>;
}
