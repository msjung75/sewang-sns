"use client";
import {useEffect,useRef,useState} from 'react';
import {workflowAlerts,type WorkflowAlert} from '../lib/workflow-alerts';
import type {IssueBoard} from '../lib/editorial-guidance';
import type {DeskTarget} from './IssueNavigator';
import styles from './WorkflowAlerts.module.css';
const KEY='sewang-workflow-alerts-v1',PREF='sewang-desktop-alerts-v1';
export function WorkflowAlerts({board,checkedAt,error,onNavigate}:{board:IssueBoard|null;checkedAt:string|null;error:string;onNavigate:(target:DeskTarget)=>void}){
 const [toast,setToast]=useState<WorkflowAlert|null>(null);
 const [events,setEvents]=useState<WorkflowAlert[]>([]),[open,setOpen]=useState(false),[enabled,setEnabled]=useState(false),[message,setMessage]=useState(''),[tick,setTick]=useState(Date.now());
 const seen=useRef(new Set<string>()),initialized=useRef(false),desktop=useRef(false);
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(saved)){const valid=saved.filter(e=>typeof e.key==='string'&&typeof e.title==='string'&&typeof e.detail==='string').slice(0,50);setEvents(valid);seen.current=new Set(valid.map(e=>e.key));}desktop.current=localStorage.getItem(PREF)==='on';setEnabled(desktop.current);}catch{}initialized.current=true;const timer=setInterval(()=>setTick(Date.now()),30000);return()=>clearInterval(timer);},[]);
 const first=useRef(true);
 useEffect(()=>{if(!board||!initialized.current)return;const next=workflowAlerts(board,tick).filter(e=>!seen.current.has(e.key));if(next.length){if(!first.current)setToast(next[0]);next.forEach(e=>seen.current.add(e.key));setEvents(old=>{const value=[...next,...old].slice(0,50);try{localStorage.setItem(KEY,JSON.stringify(value));}catch{}return value;});if(!first.current&&desktop.current&&typeof Notification!=='undefined'&&Notification.permission==='granted'){for(const e of next.slice(0,3)){try{const n=new Notification('세왕 AI · '+e.title,{body:e.detail.slice(0,180),tag:e.taskId});n.onclick=()=>{window.focus();onNavigate({view:'workflow',topicId:e.topicId,taskId:e.taskId});n.close();};}catch{}}}}first.current=false;},[board,tick,onNavigate]);
 async function toggle(){if(enabled){desktop.current=false;setEnabled(false);try{localStorage.setItem(PREF,'off');}catch{}return;}if(typeof Notification==='undefined'){setMessage('이 브라우저는 시스템 알림을 지원하지 않습니다. 아래 알림함에서 확인하세요.');return;}try{const permission=await Notification.requestPermission();if(permission==='granted'){desktop.current=true;setEnabled(true);localStorage.setItem(PREF,'on');setMessage('브라우저 알림을 켰습니다. 이 화면이 열려 있고 연결돼 있을 때 상태 변경을 알려드립니다.');}else setMessage('브라우저에서 알림을 허용하지 않았습니다. 알림함은 계속 사용할 수 있습니다.');}catch{setMessage('시스템 알림을 켜지 못했습니다. 알림함을 사용해 주세요.');}}
 function readAll(){setEvents(old=>{const value=old.map(e=>({...e,read:true}));try{localStorage.setItem(KEY,JSON.stringify(value));}catch{}return value;});}
 const unread=events.filter(e=>!e.read).length,warnings=board?workflowAlerts(board,tick).filter(e=>e.kind==='warning'):[];
 return <section className={styles.panel} aria-label="작업 알림과 연결 상태"><div className={styles.header}><div><strong>작업 알림 {unread>0?`· 새 알림 ${unread}건`:''}</strong><p role="status">{error?'연결 확인 실패 · 마지막 정상 상태를 표시 중':checkedAt?`자동 확인 중 · 최근 성공 ${new Date(checkedAt).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul'})} · 20초 간격`:'서버 상태 확인 중'}</p></div><div><button type="button" className="ai-secondary" onClick={()=>setOpen(!open)} aria-expanded={open}>{open?'알림 접기':'알림함 열기'}</button><button type="button" className="ai-secondary" onClick={()=>void toggle()}>{enabled?'브라우저 알림 끄기':'브라우저 알림 켜기'}</button></div></div>
 {toast&&<div className={styles.warning} role="alert"><strong>새 상태 · {toast.title}</strong><p>{toast.detail}</p><button type="button" className="ai-secondary" onClick={()=>{onNavigate({view:'workflow',topicId:toast.topicId,taskId:toast.taskId});setToast(null);}}>결과·작업 확인 →</button><button type="button" className="ai-secondary" onClick={()=>setToast(null)}>알림 닫기</button></div>}
 {message&&<p role="status">{message}</p>}{error&&<p className="ai-error" role="alert">{error} 요청을 다시 만들지 말고 ‘진행 현황 새로 확인’을 눌러주세요. 로그인이 만료됐다면 페이지를 새로고침해 로그인하세요.</p>}
 {warnings.length>0&&<p className={styles.warning} role="status">확인이 필요한 작업 {warnings.length}건 · {warnings[0].title}. 알림함에서 사유를 확인하세요.</p>}
 <p className={styles.hint}>화면 알림은 자동 저장됩니다. 시스템 알림은 브라우저가 지원하고 이 화면이 열려 있어야 합니다. 화면을 닫아도 받을 휴대폰 푸시는 위의 ‘휴대폰 앱’에서 별도로 등록하세요. 카카오 알림은 연결하지 않았습니다.</p>
 {open&&<><button type="button" className="ai-secondary" onClick={readAll}>모두 읽음</button><ol className={styles.list}>{events.length?events.map(e=><li key={e.key} data-kind={e.kind}><strong>{e.read?'':'● '}{e.title}</strong><time>{new Date(e.at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</time><p>{e.detail}</p><button type="button" className="ai-secondary" onClick={()=>onNavigate({view:'workflow',topicId:e.topicId,taskId:e.taskId})}>해당 작업 보기 →</button></li>):<li>새 상태 기록을 기다리고 있습니다.</li>}</ol></>}
 </section>;
}
