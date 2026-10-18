"use client";
import {useRef,useState} from 'react';
import type {IssueTask} from '../lib/editorial-guidance';
export function RecoveryRequest({task,onChange}:{task:IssueTask;onChange:()=>void}){
 const [note,setNote]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');const request=useRef<string>();
 if(!['queued','running','blocked'].includes(task.status))return null;
 async function submit(){setBusy(true);setMessage('');request.current??=crypto.randomUUID();try{const r=await fetch('/api/ai-center/research/workflow',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'retry',request_id:request.current,task_id:task.id,expected_version:task.version,note:note.trim()||'진행이 멈췄습니다. 현재 실행과 기존 결과를 확인한 뒤 복구해 주세요.'})});const d=await r.json();if(!r.ok)throw Error(r.status===409?'작업 상태가 바뀌었습니다. 새로 확인하고 요청하세요.':'문제를 접수하지 못했습니다. 이 대화에 알려주세요.');setMessage('복구 요청 접수: '+d.id+' · Mac의 다음 점검에서 확인합니다. 실제 시작 전에는 접수 상태입니다.');onChange();}catch(e){setMessage(e instanceof Error?e.message:'연결 오류 · 이 대화에 알려주세요.');}finally{setBusy(false);}}
 return <details><summary>진행 문제 전달 · 다시 실행 요청</summary><p>여기에서 멈춘 작업과 불편한 점을 접수할 수 있습니다. 기존 실행을 확인해 중복 없이 복구하며, 조사 내용과 대표 결정을 지우지 않습니다.</p><label>문제 설명 · 선택 사항<textarea maxLength={600} value={note} onChange={e=>setNote(e.target.value)} placeholder="예: 접수 이후 결과가 오지 않습니다."/></label><button type="button" className="ai-secondary" disabled={busy||message.startsWith('복구 요청 접수:')} onClick={()=>void submit()}>문제 접수하고 재실행 요청</button>{message&&<p role="status">{message}</p>}</details>;
}
