import fs from 'node:fs/promises';
import path from 'node:path';
import { loadPosts } from './loadPosts';
import { deduplicateHistory, type HistoryPost } from './publication-history';
const platforms=new Set(['instagram','youtube','naver','report']);
function clean(value:unknown):HistoryPost|null {
 if(!value||typeof value!=='object')return null;const p=value as Record<string,unknown>;
 if(!platforms.has(String(p.platform))||typeof p.post_id!=='string'||typeof p.url!=='string'||typeof p.title_or_caption!=='string'||typeof p.date!=='string')return null;
 return {platform:String(p.platform),post_id:p.post_id.slice(0,200),url:p.url,title_or_caption:p.title_or_caption.slice(0,10000),date:p.date,category:typeof p.category==='string'?p.category:'TBD',tags:Array.isArray(p.tags)?p.tags.filter((x):x is string=>typeof x==='string').slice(0,100):[],...(typeof p.body==='string'?{body:p.body.slice(0,50000)}:{}),content_scope:typeof p.content_scope==='string'?p.content_scope:'수집된 제목·캡션 · 전체 본문/영상 미검증'};
}
async function extra(name:string){
 try {const raw=await fs.readFile(path.join(process.cwd(),'data',name),'utf8');if(Buffer.byteLength(raw)>30_000_000)throw new Error('history_capacity');const d=JSON.parse(raw);if(!Array.isArray(d.posts))throw new Error('invalid_history');return{posts:d.posts.map(clean).filter((p:HistoryPost|null):p is HistoryPost=>Boolean(p)),available:true};}
 catch{return{posts:[] as HistoryPost[],available:false};}
}
export async function loadPublicationHistory(){
 const [current,archive,reports]=await Promise.all([loadPosts(),extra('publication-archive.json'),extra('report-history.json')]);
 const active=current.posts.map(clean).filter((p):p is HistoryPost=>Boolean(p));
 const activeKeys=new Set(active.map(p=>p.platform+':'+p.post_id));
 const historic=archive.posts.map((p:HistoryPost)=>activeKeys.has(p.platform+':'+p.post_id)?p:{...p,content_scope:(p.content_scope||'보관 텍스트')+' · 과거 수집 이력, 현재 공개 여부 미확인'});
 const posts=deduplicateHistory([...active,...historic,...reports.posts]);
 const counts:Record<string,number>={};for(const p of posts)counts[p.platform]=(counts[p.platform]||0)+1;
 const limitations=['SNS는 수집된 제목·캡션 중심이며 네이버·유튜브 전체 본문과 영상·사진의 내용은 모두 보관하지 않았습니다.','리포트는 공개 리포트센터의 제목·소개문을 비교합니다. PDF 전체 본문은 아직 검색 범위에 포함되지 않습니다.','수집 한도 밖의 과거 게시물·삭제·비공개 글과 발행 직후의 새 글이 누락될 수 있습니다. 검색·유사도 검출 없음은 중복 없음의 보장이 아닙니다.','보관 이력은 과거 수집 사실을 뜻하며 현재 공개 여부와 카카오 발송 완료를 보증하지 않습니다.'];
 if(!archive.available)limitations.push('누적 보관 이력을 읽지 못해 현재 수집 자료만 비교합니다.');
 if(!reports.available)limitations.push('주간 리포트 이력을 읽지 못했습니다. 리포트와의 중복은 미확인입니다.');
 return{posts,coverage:{count:posts.length,fetched_at:current.fetched_at,platforms:counts,limitations},categories:[...new Set(posts.map(p=>p.category))].sort()};
}
