import {NextRequest,NextResponse} from 'next/server';
import {authorized,sameOrigin} from '../../../../../lib/approval-auth';
import {loadPublicationHistory} from '../../../../../lib/loadPublicationHistory';
import {checkDuplicates} from '../../../../../lib/publication-history';
export const dynamic='force-dynamic';
export async function POST(req:NextRequest){
 if(!await authorized(req))return NextResponse.json({error:'대표 로그인 후 사용할 수 있습니다.'},{status:401});
 if(!sameOrigin(req))return NextResponse.json({error:'허용되지 않은 요청'},{status:403});
 const raw=await req.text();if(Buffer.byteLength(raw)>150000)return NextResponse.json({error:'입력 길이 초과'},{status:413});
 let b;try{b=JSON.parse(raw);}catch{return NextResponse.json({error:'입력 오류'},{status:400});}
 if(!b||typeof b.title!=='string'||b.title.length>1000||['summary','body','category'].some(k=>b[k]!==undefined&&typeof b[k]!=='string'))return NextResponse.json({error:'제목과 비교 원고를 확인하세요.'},{status:400});
 try{const {posts,coverage}=await loadPublicationHistory();return NextResponse.json({...checkDuplicates(b,posts),coverage},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'중복 검사에 필요한 이력을 읽지 못했습니다.'},{status:503});}
}
