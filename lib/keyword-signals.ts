export type SignalEvidence={id:string;title:string;url:string;summary:string;collected_at:string};
const watch=[{keyword:'하이볼',category:'주류',terms:['하이볼','highball','ハイボール']},{keyword:'무알코올·저도수',category:'주류',terms:['무알코올','논알코올','노알코올','저도수','alcohol-free','non-alcohol','alkoholfrei','ノンアル']},{keyword:'새 주류·신제품',category:'상품 탐색',terms:['신제품','신상품','신출시','新発売','新商品','new release']},{keyword:'외식·주류 창업',category:'창업',terms:['창업','개업','신규 오픈','새로 문','new bar','new restaurant','開業','新規開店','vient d’ouvrir']}];
export function observedTopics(evidence:SignalEvidence[]){
 const unique=[...new Map(evidence.filter(e=>e.url).map(e=>[e.url.split('#')[0],e])).values()];
 return watch.map(w=>{const examples=unique.filter(e=>w.terms.some(t=>(e.title+' '+e.summary).toLowerCase().includes(t.toLowerCase())));return{keyword:w.keyword,category:w.category,count:examples.length,examples:examples.slice(0,4).map(e=>({id:e.id,title:e.title,url:e.url})),label:'수집 자료에서 관측 · 인기도 순위 아님'};});
}
