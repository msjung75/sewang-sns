"use client";
import {useCallback,useEffect,useState} from 'react';
import type {IssueBasket,IssueBoard,IssueReport} from '../lib/editorial-guidance';
import {SimpleEditorialDesk} from './SimpleEditorialDesk';
export type DeskView='overview'|'articles'|'workflow'|'reports'|'signals'|'history'|'settings';
export type DeskTarget={view:DeskView;topicId?:string;taskId?:string;reportId?:string;basket?:boolean};
export function IssueNavigator({refreshKey,reports,view,onNavigate,onChange}:{refreshKey:number;reports:IssueReport[];view:DeskView;onNavigate:(target:DeskTarget)=>void;onChange:()=>void;focusTopicId?:string}){
 const [basket,setBasket]=useState<IssueBasket|null>(null),[board,setBoard]=useState<IssueBoard|null>(null),[error,setError]=useState(''),[checkedAt,setCheckedAt]=useState<string|null>(null),[submission,setSubmission]=useState<{revision:number;topic_id:string}|null>(null);
 const load=useCallback(async(signal?:AbortSignal)=>{try{const rs=await Promise.all(['reading','workflow'].map(p=>fetch('/api/ai-center/research/'+p,{credentials:'same-origin',cache:'no-store',signal})));if(rs.some(r=>r.status===401))throw Error('로그인이 만료됐습니다. 새로고침 후 로그인해 주세요.');if(rs.some(r=>!r.ok))throw Error('연결을 확인하지 못했습니다. 저장된 선택과 요청은 유지됩니다.');const [r,b]=await Promise.all(rs.map(r=>r.json()));if(!r.basket||!Array.isArray(b.topics)||!Array.isArray(b.tasks))throw Error('응답을 확인하지 못했습니다.');if(!signal?.aborted){setBasket(r.basket);setSubmission(r.submission||null);setBoard(b);setCheckedAt(new Date().toISOString());setError('');}}catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:'연결을 확인해 주세요.');}},[]);
 useEffect(()=>{const c=new AbortController();void load(c.signal);const timer=setInterval(()=>void load(c.signal),20000);return()=>{c.abort();clearInterval(timer);};},[load,refreshKey]);
 return <SimpleEditorialDesk basket={basket} board={board} submission={submission} reports={reports} view={view} error={error} checkedAt={checkedAt} onNavigate={onNavigate} onRefresh={()=>load()} onChange={onChange}/>;
}
