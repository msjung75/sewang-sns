import type {Metadata} from 'next';
import {ApprovalCenter} from '../../components/ApprovalCenter';
import type {DeskView} from '../../components/IssueNavigator';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'세왕 AI 관리센터',description:'주제별 조사·구성·원고 진행과 대표 결정'};
export default function AICenterPage({searchParams}:{searchParams:{view?:string;topic?:string}}){
 const views=['overview','articles','workflow','reports','signals','history'];
 const view=views.includes(searchParams.view||'')?searchParams.view as DeskView:'overview';
 const topic=typeof searchParams.topic==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(searchParams.topic)?searchParams.topic:undefined;
 return <ApprovalCenter initialView={topic?'workflow':view} initialTopicId={topic}/>;
}
