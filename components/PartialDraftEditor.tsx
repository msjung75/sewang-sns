"use client";
import {useId,useState} from 'react';
import {appendPassage,replacePassage} from '../lib/partial-draft';
export function PartialDraftEditor({value,onChange,disabled}:{value:string;onChange:(value:string)=>void;disabled:boolean}){
 const id=useId(),[passage,setPassage]=useState(''),[replacement,setReplacement]=useState(''),[addition,setAddition]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 function apply(kind:'replace'|'append'){
  setError('');setNotice('');
  try{onChange(kind==='replace'?replacePassage(value,passage,replacement):appendPassage(value,addition));if(kind==='replace'){setPassage('');setReplacement('');}else setAddition('');setNotice('본문에 적용했습니다. 아래 저장 버튼을 눌러야 새 버전으로 저장됩니다.');}
  catch(e){setError(e instanceof Error?e.message:'수정할 내용을 확인하세요.');}
 }
 return <details className="ai-decision"><summary>일부 문장 수정·내용 추가</summary><p className="ai-muted">선택한 부분만 바꾸거나 본문 끝에 내용을 추가합니다. 나머지 본문은 그대로 유지합니다.</p>
  {error&&<p className="ai-error" role="alert">{error}</p>}{notice&&<p className="ai-notice" role="status">{notice}</p>}
  <label htmlFor={`${id}-old`}>바꿀 원문 · 본문에서 그대로 복사<textarea id={`${id}-old`} value={passage} onChange={e=>setPassage(e.target.value)} maxLength={30000} disabled={disabled}/></label>
  <label htmlFor={`${id}-new`}>대신 넣을 문장 · 비워 두면 해당 부분 삭제<textarea id={`${id}-new`} value={replacement} onChange={e=>setReplacement(e.target.value)} maxLength={30000} disabled={disabled}/></label>
  <button type="button" className="ai-secondary" disabled={disabled||!passage.trim()} onClick={()=>apply('replace')}>이 부분만 본문에 적용</button>
  <label htmlFor={`${id}-add`}>추가할 내용<textarea id={`${id}-add`} value={addition} onChange={e=>setAddition(e.target.value)} maxLength={30000} disabled={disabled}/></label>
  <button type="button" className="ai-secondary" disabled={disabled||!addition.trim()} onClick={()=>apply('append')}>본문 끝에 추가</button>
 </details>;
}
