import test from 'node:test';
import assert from 'node:assert/strict';
import {checkDuplicates,searchHistory,trigramSimilarity,deduplicateHistory,type HistoryPost} from '../lib/publication-history';
const today='2026-10-18';
const post=(extra:Partial<HistoryPost>={}):HistoryPost=>({platform:'naver',post_id:'p1',url:'https://example.com/p1',title_or_caption:'와인 재고 관리 방법',date:'2026-10-01',category:'시장트렌드',tags:['와인','재고관리'],...extra});
test('NFKC and punctuation normalize real full body equality; title equality alone is not exact',()=>{
 const p=post({body:'와인 재고 ＡＢＣ 관리: 12병, 점검!',content_scope:'full_body'});
 assert.equal(checkDuplicates({title:'와인 재고 관리 방법',body:'와인 재고 ABC 관리 12병 점검'},[p],today).status,'exact');
 const titleOnly=checkDuplicates({title:'와인 재고 관리 방법'},[post()],today);assert.equal(titleOnly.status,'similar');assert.match(titleOnly.matches[0].reason,/전체 본문 중복은 미확정/);
 const metadata=checkDuplicates({title:'다른 본문 제목',body:p.body},[post({...p,content_scope:'headline_metadata_only'})],today);assert.notEqual(metadata.status,'exact');
});
test('Korean rephrasing and partial terms trigger review without claiming semantic certainty',()=>{
 const r=checkDuplicates({title:'와인 재고관리 점검 방법'},[post()],today);assert.equal(r.status,'similar');assert.equal(r.requires_review,true);assert.ok(r.matches[0].score>=0.25);assert.ok(r.matches[0].matched_terms.length);
 assert.ok(r.limitations.some(l=>l.includes('의미가 같은 모든')));
});
test('Jaccard threshold is inclusive at 0.25 and excludes below-threshold trigrams',()=>{
 // 4 trigrams in each set, three shared: 3/(4+4-3)=0.6.
 assert.equal(trigramSimilarity('abcdef','abcdeg'),0.6);
 // Four shared prefix trigrams among sixteen distinct trigrams: 4/16=0.25.
 const a='abcdef123456',b='abcdef654321';assert.equal(trigramSimilarity(a,b),0.25);
 assert.equal(checkDuplicates({title:a},[post({title_or_caption:b})],today).status,'similar');
 assert.equal(checkDuplicates({title:'abcdef'},[post({title_or_caption:'abxygh'})],today).status,'none');
});
test('common brand words do not create duplicate matches; insufficient input remains unavailable',()=>{
 const r=checkDuplicates({title:'세왕상사 주류 음식점 냉장고 점검'},[post({title_or_caption:'세왕상사 주류 위스키 테이스팅'})],today);assert.equal(r.status,'none');
 assert.equal(checkDuplicates({title:'주류 세왕상사'},[post({title_or_caption:'주류 세왕상사'})],today).status,'unavailable');
});
test('same category within 14 days is a separate planning warning, not full content equality',()=>{
 const p=post({date:'2026-10-04',title_or_caption:'음식점 장비 구성'});const r=checkDuplicates({title:'위스키 테이스팅 행사',category:p.category},[p],today);assert.equal(r.status,'similar');assert.match(r.matches[0].reason,/동일 카테고리 최근 14일/);assert.notEqual(r.status,'exact');
 assert.equal(checkDuplicates({title:'위스키 테이스팅 행사',category:p.category},[post({...p,date:'2026-10-03'})],today).status,'none');
 assert.equal(checkDuplicates({title:'위스키 테이스팅 행사',category:'TBD'},[post({...p,category:'TBD'})],today).status,'none');
});
test('exclude future/invalid dates, dedupe tracking URLs, preserve richer body and original records',()=>{
 const old=post(),rich=post({url:old.url+'?utm_source=mail#preview',body:'실제 확보된 전체 본문으로 관리'}),future=post({url:'https://example.com/future',date:'2026-10-19'}),invalid=post({url:'https://example.com/invalid',date:'2026-02-30'});
 assert.deepEqual(deduplicateHistory([old,rich,future,invalid],today),[rich]);assert.equal(rich.url,old.url+'?utm_source=mail#preview');
 assert.equal(checkDuplicates({title:old.title_or_caption},[future],today).status,'unavailable');
 assert.equal(checkDuplicates({title:'구체적인 와인 발주 계획'},[],today).status,'unavailable');
});
test('search combines partial Korean, tags, platform, category and inclusive date filters',()=>{
 const rows=[post({date:'2020-10-01'}),post({post_id:'p2',url:'https://example.com/p2',platform:'instagram',date:'2020-10-03',title_or_caption:'맥주 행사 준비',category:'신제품',tags:['생맥주']}),post({post_id:'p3',url:'https://example.com/p3',date:'2020-10-05',body:'냉장고 장비 점검 기준'})];
 assert.equal(searchHistory(rows,{q:'와인 재고관',platform:'naver',from:'2020-10-01',to:'2020-10-01',category:'시장트렌드'}).length,1);
 assert.equal(searchHistory(rows,{q:'생맥',platform:'instagram'})[0].post_id,'p2');assert.equal(searchHistory(rows,{q:'장비 점검'})[0].post_id,'p3');
 assert.deepEqual(searchHistory(rows,{from:'2020-10-05',to:'2020-10-01'}),[]);assert.deepEqual(searchHistory(rows,{from:'2020-02-30'}),[]);
});

test('body excerpts and partial report descriptions cannot establish full-content equality',()=>{
 for(const content_scope of [undefined,'title_caption','body_excerpt','report_description']){
  const p=post({body:'와인 메뉴판 점검과 첫잔 구성 비교',content_scope});
  assert.notEqual(checkDuplicates({title:p.title_or_caption,body:p.body},[p],today).status,'exact');
 }
 const original=post({body:'원문 출처 와인 점검 https://example.com/first',content_scope:'full_body'});
 assert.notEqual(checkDuplicates({title:original.title_or_caption,body:'원문 출처 와인 점검 https://example.com/second'},[original],today).status,'exact');
});

test('weekly reports allow repeated categories while cross-channel text reuse remains a review candidate',()=>{
 const p=post({platform:'instagram',date:'2026-10-17',category:'시장트렌드',title_or_caption:'와인 재고 관리 방법'});
 const unrelated={title:'외식업 장비 공급과 냉장고 유지보수',category:'시장트렌드'};
 assert.equal(checkDuplicates({...unrelated,target_platform:'report'},[p],today).status,'none');
 assert.equal(checkDuplicates(unrelated,[p],today).requires_review,true);
 const reuse=checkDuplicates({title:p.title_or_caption,category:p.category,target_platform:'report'},[p],today);
 assert.equal(reuse.status,'similar');assert.equal(reuse.requires_review,true);assert.match(reuse.matches[0].reason,/다른 채널 재활용 후보 · 출처\/게시일\/새 관점 확인/);
 assert.doesNotMatch(reuse.matches[0].reason,/동일 카테고리 최근 14일/);
 const existingReport=checkDuplicates({title:p.title_or_caption,target_platform:'report'},[post({...p,platform:'report'})],today);
 assert.doesNotMatch(existingReport.matches[0].reason,/다른 채널 재활용 후보/);
});
