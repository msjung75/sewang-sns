import { NextRequest, NextResponse } from "next/server";
import { authorized, configured, COOKIE, cookieOptions, sameOrigin, session, validPassword } from "../../../../lib/approval-auth";
export const dynamic="force-dynamic";
const attempts = new Map<string, { count:number; until:number }>();
export async function GET(req:NextRequest) { return NextResponse.json({authenticated:authorized(req),configured:configured()},{headers:{"Cache-Control":"no-store"}}); }
export async function POST(req:NextRequest) {
  if (!configured()) return NextResponse.json({error:"승인 서버 설정이 필요합니다."},{status:503});
  if (!sameOrigin(req)) return NextResponse.json({error:"허용되지 않은 요청"},{status:403});
  const ip=req.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const now=Date.now(); const prior=attempts.get(ip); const entry=prior && prior.until>now ? prior : {count:0,until:now+60000};
  if (attempts.size>1000) attempts.clear();
  if (entry.count>=5) return NextResponse.json({error:"1분 후 다시 시도하세요."},{status:429});
  entry.count++;attempts.set(ip,entry);
  const text=await req.text(); if (text.length>1000) return NextResponse.json({error:"입력 길이 초과"},{status:413});
  let body;try {body=JSON.parse(text);}catch {return NextResponse.json({error:"입력 오류"},{status:400});}
  if (!validPassword(body.password)) return NextResponse.json({error:"로그인 정보를 확인하세요."},{status:401});
  attempts.delete(ip);const response=NextResponse.json({authenticated:true});response.cookies.set(COOKIE,session(),cookieOptions);return response;
}
export async function DELETE(req:NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({error:"허용되지 않은 요청"},{status:403});
  const response=NextResponse.json({authenticated:false});response.cookies.set(COOKIE,"",{...cookieOptions,maxAge:0});return response;
}
