import test from 'node:test';import assert from 'node:assert/strict';
import {issueGuidance,type IssueBasket,type IssueBoard,type IssueTopic,type IssueTask} from '../lib/editorial-guidance';
const basket:IssueBasket={revision:2,items:[{evidence:{id:'a',title:'기사 A'}},{evidence:{id:'b',title:'기사 B'}}],note:'',updated_at:null};
const topic:IssueTopic={id:'request',title:'선택 자료',origin:'evidence',state:'research',note:'',plan:1,revision:1,needs_review:false,evidence:basket.items.map(i=>i.evidence),updated_at:'2026-10-18T10:00:00Z'};
const task=(stage:string,status:string):IssueTask=>({id:stage,topic_id:topic.id,stage,status,plan:1,version:1,result:status==='awaiting_review'?'조사 결과':'',updated_at:'2026-10-18T10:00:00Z',report_id:null});
test('a basket is not an actual research request; additions and reordering need an explicit new request',()=>{
 let board:IssueBoard={topics:[],tasks:[],updated_at:null};assert.equal(issueGuidance(basket,board,[]).kind,'compose');
 board={...board,topics:[{...topic,evidence:[basket.items[0].evidence]}]};assert.equal(issueGuidance(basket,board,[]).previousCount,1);
 board.topics=[{...topic,evidence:[...topic.evidence!].reverse()}];assert.equal(issueGuidance(basket,board,[]).kind,'compose');
});
test('queued/running work waits, ready results request a review, and accepted analysis opens adoption only',()=>{
 const board:IssueBoard={topics:[topic],tasks:[task('research','queued'),task('analysis','waiting')],updated_at:null};assert.equal(issueGuidance(basket,board,[]).kind,'wait');
 board.tasks[0]=task('research','awaiting_review');assert.equal(issueGuidance(basket,board,[]).kind,'task');
 board.tasks=[task('research','done'),task('analysis','awaiting_review')];assert.equal(issueGuidance(basket,board,[]).kind,'task');
 board.tasks[1]=task('analysis','done');assert.equal(issueGuidance(basket,board,[]).kind,'adopt');
});
test('stale original and reworked plans never appear complete, and only the linked report is opened',()=>{
 const board:IssueBoard={topics:[{...topic,state:'select',plan:2}],tasks:[{...task('research','done'),plan:1},{...task('draft','awaiting_review'),plan:2,report_stale:true}],updated_at:null};assert.match(issueGuidance(basket,board,[]).title,/바뀌어/);
 board.tasks=[{...task('review','done'),plan:2,report_id:'correct'}];const guide=issueGuidance(basket,board,[{id:'wrong',title:'다른 원고',status:'DRAFT'},{id:'correct',title:'연결 원고',status:'DRAFT'}]);assert.equal(guide.report?.id,'correct');
 board.topics[0].needs_review=true;assert.equal(issueGuidance(basket,board,[]).kind,'topic');
});
