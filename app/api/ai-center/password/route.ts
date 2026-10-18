import {NextRequest,NextResponse} from "next/server";
import {authConfig,authorized,changePassword,verifyPassword,sameOrigin,session,COOKIE,cookieOptions} from "../../../../lib/approval-auth";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){try{const c=await authConfig();if(!await authorized(req,c))return NextResponse.json({error:"로그인 후 사용할 수 있습니다."},{status:401});return NextResponse.json({initialized:c.version>0},{headers:{"Cache-Control":"no-store"}});}catch{return NextResponse.json({error:"설정 연결을 확인 중입니다."},{status:503});}}
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:"허용되지 않은 요청입니다."},{status:403});
 try{
  const c=await authConfig();if(!await authorized(req,c))return NextResponse.json({error:"로그인 후 사용할 수 있습니다."},{status:401});
  const raw=await req.text();if(Buffer.byteLength(raw)>3000)return NextResponse.json({error:"입력이 너무 깁니다."},{status:413});
  const b=JSON.parse(raw);
  if(!b||typeof b.new_password!=="string"||b.new_password.length<12||b.new_password.length>128||b.new_password!==b.confirm_password)return NextResponse.json({error:"새 비밀번호를 12~128자로 입력하고 확인란을 맞춰주세요."},{status:400});
  if(c.version>0&&!await verifyPassword(b.current_password,c))return NextResponse.json({error:"현재 비밀번호를 확인해주세요."},{status:400});
  const changed=await changePassword(c,b.new_password);
  const response=NextResponse.json({changed:true});response.cookies.set(COOKIE,session(changed.version),cookieOptions);return response;
 }catch{return NextResponse.json({error:"비밀번호 설정을 완료하지 못했습니다. 현재 상태를 다시 확인해주세요."},{status:503});}
}
