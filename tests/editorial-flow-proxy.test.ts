import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {NextRequest} from 'next/server';
import {GET,POST} from '../app/api/ai-center/[[...path]]/route';
import {COOKIE,session} from '../lib/approval-auth';
process.env.AI_APPROVAL_PASSWORD_HASH=createHash('sha256').update('synthetic-password').digest('hex');
process.env.AI_APPROVAL_SESSION_SECRET='synthetic-flow-session-secret-only';
process.env.AI_CONTROL_TOKEN='synthetic-flow-control-only';
const origin='https://flow.example';
function request(method:string,path:string,body?:unknown,logged=true,source=origin){return new NextRequest(origin+'/api/ai-center/'+path,{method,headers:{...(logged?{cookie:COOKIE+'='+session()}:{}),origin:source,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
test('workflow BFF authenticates reads, enforces write origin, and hides admin handoff route',async t=>{
 const original=global.fetch;const seen:string[]=[];
 global.fetch=async(input)=>{const url=String(input);seen.push(url);if(url.endsWith('/auth'))return Response.json({password_hash:null,password_salt:null,version:0});return Response.json({topics:[],tasks:[]});};t.after(()=>{global.fetch=original;});
 assert.equal((await GET(request('GET','research/workflow',undefined,false),{params:{path:['research','workflow']}})).status,401);assert.equal(seen.length,0);
 assert.equal((await POST(request('POST','research/workflow',{kind:'discover'},true,'https://other.example'),{params:{path:['research','workflow']}})).status,403);
 assert.equal((await POST(request('POST','research/handoff',{}),{params:{path:['research','handoff']}})).status,404);
 const response=await GET(request('GET','research/workflow'),{params:{path:['research','workflow']}});assert.equal(response.status,200);assert.deepEqual(await response.json(),{topics:[],tasks:[]});
});
test('owner topic proposal reaches fixed workflow endpoint without exposing credential in response',async t=>{
 const original=global.fetch;const payload={kind:'propose',request_id:'synthetic-owner-topic',text:'가져온 주제'};let forwarded:unknown;
 global.fetch=async(input,init)=>{if(String(input).endsWith('/auth'))return Response.json({password_hash:null,password_salt:null,version:0});assert.equal(String(input),'https://sewang-ai-queue-staging.msjung75.workers.dev/v1/admin/editorial/research/workflow');assert.equal(init?.method,'POST');forwarded=JSON.parse(String(init?.body));return Response.json({id:payload.request_id,kind:payload.kind});};t.after(()=>{global.fetch=original;});
 const response=await POST(request('POST','research/workflow',payload),{params:{path:['research','workflow']}});assert.equal(response.status,200);assert.deepEqual(forwarded,payload);assert.ok(!(await response.text()).includes(process.env.AI_CONTROL_TOKEN!));
});
test('adoption binds publication-history review and strips browser-only fields before forwarding',async t=>{
 const original=global.fetch;let writes=0,forwarded:Record<string,unknown>|undefined;
 const topic={id:'evidence-review',title:'와인',summary:'',origin:'evidence',revision:1,plan:1,snapshot_hash:'0'.repeat(64)};
 global.fetch=async(input,init)=>{if(String(input).endsWith('/auth'))return Response.json({password_hash:null,password_salt:null,version:0});if(init?.method==='POST'){writes++;forwarded=JSON.parse(String(init.body));return Response.json({state:'select'});}return Response.json({topics:[topic],tasks:[]});};t.after(()=>{global.fetch=original;});
 const payload={kind:'adopt',topic_id:topic.id,expected_revision:1,expected_plan:1,note:'차별점 설명',history_version:'stale',duplicate_reviewed:true};
 let r=await POST(request('POST','research/workflow',payload),{params:{path:['research','workflow']}});assert.equal(r.status,409);assert.equal(writes,0);
 const {loadPublicationHistory}=await import('../lib/loadPublicationHistory');const {candidatePublicationCheck}=await import('../lib/review-publication-check');const history=await loadPublicationHistory(),check=await candidatePublicationCheck(topic,topic.snapshot_hash,history.posts);
 r=await POST(request('POST','research/workflow',{...payload,history_version:check.history_version}),{params:{path:['research','workflow']}});assert.equal(r.status,200);assert.equal(writes,1);assert.equal(forwarded?.duplicate_reviewed,undefined);assert.equal(forwarded?.history_version,undefined);
});
