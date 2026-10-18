import { createHash, createHmac, randomBytes, timingSafeEqual, scrypt } from "node:crypto";
import { NextRequest } from "next/server";
export const COOKIE="sewang_editorial_session";
const ttl=8*3600;
const ORIGIN="https://sewang-ai-queue-staging.msjung75.workers.dev";
export type AuthConfig={password_hash:string|null;password_salt:string|null;version:number};
export function configured(){return Boolean(process.env.AI_APPROVAL_PASSWORD_HASH&&process.env.AI_APPROVAL_SESSION_SECRET&&process.env.AI_CONTROL_TOKEN);}
function equal(a:string,b:string){return a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
export function validPassword(password:unknown){return typeof password==="string"&&password.length<=256&&Boolean(process.env.AI_APPROVAL_PASSWORD_HASH)&&equal(createHash("sha256").update(password).digest("hex"),process.env.AI_APPROVAL_PASSWORD_HASH!);}
export async function authConfig():Promise<AuthConfig>{
 const r=await fetch(ORIGIN+"/v1/admin/editorial/auth",{headers:{Authorization:"Bearer "+process.env.AI_CONTROL_TOKEN,"User-Agent":"SewangAIWorker/0.1"},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw new Error("auth_configuration_unavailable");
 const c=await r.json();
 if(!Number.isSafeInteger(c.version)||c.version<0||(c.version===0?(c.password_hash!==null||c.password_salt!==null):(!/^[a-f0-9]{64}$/.test(c.password_hash)||!/^[a-f0-9]{32}$/.test(c.password_salt))))throw new Error("invalid_auth_configuration");
 return c;
}
export async function passwordDigest(password:string,salt:string){return await new Promise<string>((resolve,reject)=>scrypt(password,salt,32,(error,key)=>error?reject(error):resolve(key.toString("hex"))));}
export async function verifyPassword(password:unknown,c:AuthConfig){
 if(typeof password!=="string"||password.length>256)return false;
 return c.version===0?validPassword(password):equal(await passwordDigest(password,c.password_salt!),c.password_hash!);
}
export function session(version=0){const payload=`${Math.floor(Date.now()/1000)+ttl}.${randomBytes(16).toString("hex")}.${version}`;return payload+"."+createHmac("sha256",process.env.AI_APPROVAL_SESSION_SECRET!).update(payload).digest("hex");}
export async function authorized(req:NextRequest,config?:AuthConfig){
 if(!configured())return false;
 const parts=(req.cookies.get(COOKIE)?.value||"").split(".");
 if(![3,4].includes(parts.length)||!/^\d{10}$/.test(parts[0])||!/^[a-f0-9]{32}$/.test(parts[1]))return false;
 const expiry=Number(parts[0]);if(expiry<=Date.now()/1000||expiry>Date.now()/1000+ttl)return false;
 const signed=parts.slice(0,-1).join(".");if(!equal(parts.at(-1)!,createHmac("sha256",process.env.AI_APPROVAL_SESSION_SECRET!).update(signed).digest("hex")))return false;
 const version=parts.length===3?0:Number(parts[2]);if(!Number.isSafeInteger(version)||version<0)return false;
 try{return version===(config||await authConfig()).version;}catch{return false;}
}
export async function changePassword(c:AuthConfig,password:string){
 const salt=randomBytes(16).toString("hex");
 const r=await fetch(ORIGIN+"/v1/admin/editorial/auth",{method:"POST",headers:{Authorization:"Bearer "+process.env.AI_CONTROL_TOKEN,"Content-Type":"application/json","User-Agent":"SewangAIWorker/0.1"},body:JSON.stringify({expected_version:c.version,password_hash:await passwordDigest(password,salt),password_salt:salt}),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw new Error(r.status===409?"password_version_conflict":"password_update_failed");
 return await r.json() as {version:number};
}
export function sameOrigin(req:NextRequest){const host=req.headers.get("host");const origin=process.env.AI_APPROVAL_SITE_ORIGIN||(host&&/^[A-Za-z0-9.:[\]-]+$/.test(host)?req.nextUrl.protocol+"//"+host:req.nextUrl.origin);return req.headers.get("origin")===origin&&req.headers.get("sec-fetch-site")!=="cross-site";}
export const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict" as const,path:"/api/ai-center",maxAge:ttl};
