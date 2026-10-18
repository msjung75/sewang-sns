import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {checkDuplicates,type HistoryPost} from './publication-history';
export function historyVersion(posts:HistoryPost[]){return createHash('sha256').update(JSON.stringify(posts.map(p=>[p.platform,p.post_id,p.url,p.date,p.title_or_caption,p.body||'',p.category,p.content_scope||'']).sort((a,b)=>String(a[2]).localeCompare(String(b[2]))))).digest('hex');}
export async function candidatePublicationCheck(candidate:{id:string;title:string;summary:string},snapshotHash:string,posts:HistoryPost[]){
 const result=checkDuplicates({title:candidate.title,summary:candidate.summary,category:'시장트렌드',target_platform:'report'},posts);
 try{
  const data=JSON.parse(await fs.readFile(path.join(process.cwd(),'data/topic-overlap-review.json'),'utf8'));
  if(data.snapshot_hash===snapshotHash){
   for(const match of data.candidates?.[candidate.id]||[]){
    const post=posts.find(p=>p.url===match.url);if(!post||typeof match.reason!=='string')continue;
    const old=result.matches.find(m=>m.post.url===post.url);
    if(old)old.reason=match.reason+' · '+old.reason;
    else result.matches.unshift({post,score:0,reason:match.reason+(post.platform!=='report'?' · 다른 채널 재활용 후보: 출처·게시일·새 관점 확인':''),matched_terms:[]});
   }
   if((data.candidates?.[candidate.id]||[]).length){result.status=result.status==='exact'?'exact':'similar';result.requires_review=true;result.method+=' · 해당 후보의 기존 게시 내용 대조 메모 포함';}
  }
 }catch{result.limitations.push('후보별 의미·논지 대조 메모가 없으며 문자 유사도와 편성 규칙만 점검했습니다.');}
 return{...result,history_version:historyVersion(posts)};
}
