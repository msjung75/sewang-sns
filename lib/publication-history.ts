/** Deterministic text screening, not a semantic plagiarism or topic-equivalence model. */
export type HistoryPost={platform:string;post_id:string;url:string;title_or_caption:string;date:string;category:string;tags:string[];body?:string;content_scope?:string};
export type DuplicateResult={status:'exact'|'similar'|'none'|'unavailable';requires_review:boolean;matches:{post:HistoryPost;score:number;reason:string;matched_terms:string[]}[];method:string;limitations:string[]};
const COMMON=new Set(['주류','세왕상사','세왕','sewang','sewangliquor','소식','안내','공지','추천','상사','공유','오늘','이번','입니다']);
const METHOD='NFKC·구두점 정규화, 공통 브랜드어 제외, 삼글자 묶음 Jaccard ≥ 0.25 및 동일 카테고리 최근 14일 점검';
const exactText=(value:string)=>(value||'').normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
export function normalizeHistoryText(value:string):string{return exactText((value||'').replace(/https?:\/\/\S+/g,' '));}
const meaningful=(value:string)=>normalizeHistoryText(value).split(' ').filter(t=>t&&!COMMON.has(t)).join('');
function grams(value:string):Set<string>{const s=meaningful(value);return s.length<6?new Set():new Set(Array.from({length:s.length-2},(_,i)=>s.slice(i,i+3)));}
export function trigramSimilarity(a:string,b:string):number{const A=grams(a),B=grams(b);if(!A.size||!B.size)return 0;let shared=0;for(const g of A)if(B.has(g))shared++;return shared/(A.size+B.size-shared);}
const kstToday=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
function day(value:string):string|null{if(typeof value!=='string'||!/^\d{4}-\d\d-\d\d(?:$|T)/.test(value))return null;const date=value.slice(0,10);const d=new Date(date+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===date?date:null;}
function publicUrl(value:string):string|null{try{const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return null;u.hash='';for(const k of [...u.searchParams.keys()])if(/^utm_/i.test(k)||['fbclid','gclid'].includes(k))u.searchParams.delete(k);return u.href;}catch{return null;}}
/** Preserve the richest known text for each public URL, without mutating source records. */
export function deduplicateHistory(posts:HistoryPost[],today=kstToday()):HistoryPost[]{
 const cutoff=day(today);if(!cutoff)return[];const map=new Map<string,HistoryPost>();
 for(const p of posts){const d=day(p.date),url=publicUrl(p.url);if(!d||d>cutoff||!url)continue;const prior=map.get(url);if(!prior||(p.body?.length||0)+(p.title_or_caption?.length||0)>(prior.body?.length||0)+(prior.title_or_caption?.length||0))map.set(url,p);}
 return [...map.values()].sort((a,b)=>b.date.localeCompare(a.date)||a.url.localeCompare(b.url));
}
export function searchHistory(posts:HistoryPost[],filters:{q?:string;platform?:string;from?:string;to?:string;category?:string}):HistoryPost[]{
 const terms=normalizeHistoryText(filters.q||'').split(' ').filter(Boolean),from=filters.from?day(filters.from):null,to=filters.to?day(filters.to):null;
 if((filters.from&&!from)||(filters.to&&!to)||(from&&to&&from>to))return[];
 return deduplicateHistory(posts).filter(p=>{const d=day(p.date)!;if(filters.platform&&p.platform!==filters.platform||filters.category&&p.category!==filters.category||from&&d<from||to&&d>to)return false;
  const haystack=normalizeHistoryText([p.title_or_caption,p.body||'',p.category,...(p.tags||[])].join(' ')).replace(/ /g,'');return terms.every(t=>haystack.includes(t));});
}
function sharedTerms(a:string,b:string):string[]{const words=(s:string)=>normalizeHistoryText(s).split(' ').filter(t=>t.length>=2&&!COMMON.has(t));const A=words(a),B=new Set(words(b));const exact=[...new Set(A.filter(t=>B.has(t)))];if(exact.length)return exact.slice(0,12);const bg=grams(b);return [...grams(a)].filter(g=>bg.has(g)).slice(0,12);}
function fullBody(p:HistoryPost):boolean{return Boolean(p.body?.trim())&&p.content_scope==='full_body';}
export function checkDuplicates(input:{title:string;summary?:string;body?:string;category?:string;target_platform?:string},posts:HistoryPost[],today=kstToday()):DuplicateResult{
 const valid=deduplicateHistory(posts,today),limitations=['문자 비교는 의미가 같은 모든 재작성·사진·영상 중복을 검출하지 못합니다. 출처 원문과 사용 사진은 사람이 확인해야 합니다.'];
 if(valid.some(p=>!fullBody(p)))limitations.push('본문을 확보하지 못한 게시물은 제목·캡션 등 확인 가능한 텍스트만 비교합니다. 제목 일치만으로 전체 본문 중복을 확정하지 않습니다.');
 if(!valid.length)return{status:'unavailable',requires_review:true,matches:[],method:METHOD,limitations:[...limitations,'확인 가능한 과거 게시 이력이 없습니다. 중복 없음으로 판단할 수 없습니다.']};
 const query=[input.title,input.summary||'',input.body||''].join(' ');if(meaningful(query).length<6&&!input.category)return{status:'unavailable',requires_review:true,matches:[],method:METHOD,limitations:[...limitations,'비교할 구체적인 주제·원고가 부족합니다. 공통 브랜드어만으로 중복을 판정하지 않습니다.']};
 const matches:(DuplicateResult['matches'][number]&{exact:boolean})[]=[];
 for(const post of valid){
  const titleSame=meaningful(input.title).length>=6&&normalizeHistoryText(input.title)===normalizeHistoryText(post.title_or_caption);
  const exact=Boolean(input.body?.trim())&&fullBody(post)&&meaningful(input.body||'').length>=6&&exactText(input.body||'')===exactText(post.body||'');
  const score=exact||titleSame?1:Math.max(trigramSimilarity(input.title,post.title_or_caption),trigramSimilarity(query,[post.title_or_caption,post.body||''].join(' ')),input.body&&post.body?trigramSimilarity(input.body,post.body):0);
  const age=(Date.parse(day(today)!+'T00:00:00Z')-Date.parse(day(post.date)!+'T00:00:00Z'))/86400000;
  const category=Boolean(input.target_platform!=='report'&&input.category&&!['TBD','전체','미분류','unknown'].includes(input.category)&&input.category===post.category&&age>=0&&age<=14);
  const reasons:string[]=[];if(exact)reasons.push('확보된 전체 본문이 정규화 후 일치');else if(titleSame)reasons.push('제목·캡션 텍스트 일치: 전체 본문 중복은 미확정');else if(score>=0.25)reasons.push('삼글자 묶음 유사도 0.25 이상: 사람이 주제 중복 확인 필요');
  if(category)reasons.push(`동일 카테고리 최근 14일 내 게시 (${age}일 전): 편성 검토 필요`);
  if(reasons.length&&input.target_platform==='report'&&post.platform!=='report')reasons.push('다른 채널 재활용 후보 · 출처/게시일/새 관점 확인');
  if(reasons.length)matches.push({post,score:Math.round(score*10000)/10000,reason:reasons.join(' · '),matched_terms:sharedTerms(query,[post.title_or_caption,post.body||''].join(' ')),exact});
 }
 matches.sort((a,b)=>Number(b.exact)-Number(a.exact)||b.score-a.score||b.post.date.localeCompare(a.post.date));
 return{status:matches.some(m=>m.exact)?'exact':matches.length?'similar':'none',requires_review:matches.length>0,matches:matches.slice(0,20).map(({exact,...m})=>m),method:METHOD,limitations};
}
