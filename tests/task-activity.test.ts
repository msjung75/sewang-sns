import test from 'node:test';import assert from 'node:assert/strict';import {taskActivity,elapsedText} from '../lib/task-activity';
const task={id:'a',topic_id:'t',plan:1,version:1,stage:'research',status:'queued',result:'',report_id:null,updated_at:'2026-10-18T00:00:00Z'};
const start=Date.parse(task.updated_at);
test('elapsed queue time never claims active research; delay threshold is inclusive',()=>{assert.equal(taskActivity(task,start+19*60000).delayed,false);assert.equal(taskActivity(task,start+20*60000).delayed,true);assert.match(taskActivity(task,start).label,/시작 대기/);});
test('running without fresh activity is unverified; owner review is never automatically retried',()=>{assert.match(taskActivity({...task,status:'running'},start+21*60000).label,/실행 확인 필요/);assert.equal(taskActivity({...task,status:'awaiting_review'},start+4*3600000).delayed,false);});
test('invalid or future time is unknown and elapsed formatting does not invent an ETA',()=>{assert.equal(taskActivity({...task,updated_at:'invalid'},start).elapsed,null);assert.equal(taskActivity(task,start-1).elapsed,null);assert.equal(elapsedText(65000),'1분 5초');});
