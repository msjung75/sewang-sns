import { NextRequest,NextResponse } from "next/server";
import { authorized,sameOrigin } from "../../../../lib/approval-auth";
export const dynamic="force-dynamic";
const ORIGIN="https://sewang-ai-queue-staging.msjung75.workers.dev";
async function proxy(req:NextRequest,{params}:{params:{path?:string[]}}) {
  if (!authorized(req)) return NextResponse.json({error:"대표 로그인 후 사용할 수 있습니다."},{status:401});
  if (req.method!=="GET" && !sameOrigin(req)) return NextResponse.json({error:"허용되지 않은 요청"},{status:403});
  const parts=params.path || [];
  const route=parts.join("/");
  if (!(route==="" && req.method==="GET") && !(route==="reports" && req.method==="POST") && !(/^[A-Za-z0-9_-]{1,80}\/(decision|translations|schedule|receipt|cancel)$/.test(route) && req.method==="POST")) return NextResponse.json({error:"허용되지 않은 경로"},{status:404});
  // Credentials stay on the server; all upstream paths are fixed and allowlisted.
  const text=req.method==="GET" ? undefined : await req.text();
  if (text && Buffer.byteLength(text)>180000) return NextResponse.json({error:"입력 길이 초과"},{status:413});
  try {
    const response=await fetch(ORIGIN+"/v1/admin/editorial"+(route ? "/"+route : ""),{method:req.method,headers:{Authorization:"Bearer "+process.env.AI_CONTROL_TOKEN,"Content-Type":"application/json","User-Agent":"SewangAIWorker/0.1"},body:text,cache:"no-store",redirect:"error",signal:AbortSignal.timeout(12000)});
    const data=await response.json();return NextResponse.json(data,{status:response.status,headers:{"Cache-Control":"no-store"}});
  }catch {return NextResponse.json({error:"승인 서버 연결을 확인하세요. 요청 성공 여부를 재조회한 후 다시 처리하세요."},{status:502});}
}
export {proxy as GET,proxy as POST};
