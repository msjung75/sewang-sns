"use client";
import {useEffect,useState} from 'react';
import type {IssueTask} from '../lib/editorial-guidance';
import {elapsedText,taskActivity} from '../lib/task-activity';
import styles from './SimpleEditorialDesk.module.css';
export function TaskActivity({task}:{task:IssueTask}){
 const [now,setNow]=useState<number|null>(null);
 useEffect(()=>{setNow(Date.now());const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);
 const activity=taskActivity(task,now??Date.parse(task.updated_at));
 return <div className={styles.activity} data-delayed={activity.delayed} data-running={task.status==='running'&&!activity.delayed}>
  <strong>{activity.label}</strong>
  <p>{task.status==='queued'?'접수·대기 전환 후':task.status==='running'?'마지막 실행 보고 후':'상태 변경 후'} <span suppressHydrationWarning>{now===null?'확인 중':elapsedText(activity.elapsed)}</span></p>
  <small>{Number.isFinite(Date.parse(task.updated_at))?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(task.updated_at)):'시각 미확인'} 기준 · 완료 예상 시간은 아직 확인되지 않았습니다.</small>
  {activity.delayed&&<p>20분 동안 새 상태 보고가 없습니다. 정상 진행으로 확인되지 않았습니다. 재점검 대상이며, 실제 재시도가 시작되면 작업 보고가 갱신됩니다.</p>}
  {task.status==='running'&&task.result&&<p className={styles.workLog}>최근 작업 보고: {task.result}</p>}
 </div>;
}
