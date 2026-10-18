import {NextRequest,NextResponse} from 'next/server';
import {authorized} from '../../../../lib/approval-auth';
import {loadPublicationHistory} from '../../../../lib/loadPublicationHistory';
import {searchHistory} from '../../../../lib/publication-history';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 if(!await authorized(req))return NextResponse.json({error:'대표 로그인 후 사용할 수 있습니다.'},{status:401});
 const p=req.nextUrl.searchParams;const filters={q:p.get('q')||'',platform:p.get('platform')||'',from:p.get('from')||'',to:p.get('to')||'',category:p.get('category')||''};
 if(filters.q.length>300||filters.category.length>100||filters.platform.length>30||[filters.from,filters.to].some(v=>v&&!/^\d{4}-\d\d-\d\d$/.test(v))||(filters.from&&filters.to&&filters.from>filters.to))return NextResponse.json({error:'검색어와 날짜 범위를 확인하세요.'},{status:400});
 try{const {posts,coverage,categories}=await loadPublicationHistory();const found=searchHistory(posts,filters);return NextResponse.json({posts:found.slice(0,200),total:found.length,coverage,categories},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'게시 이력을 읽지 못했습니다.'},{status:503});}
}
