import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
export const COOKIE = "sewang_editorial_session";
const ttl = 8 * 3600;
export function configured() { return Boolean(process.env.AI_APPROVAL_PASSWORD_HASH && process.env.AI_APPROVAL_SESSION_SECRET && process.env.AI_CONTROL_TOKEN); }
function equal(a: string, b: string) { return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b)); }
export function validPassword(password: unknown) {
  return typeof password === "string" && password.length <= 256 && Boolean(process.env.AI_APPROVAL_PASSWORD_HASH) && equal(createHash("sha256").update(password).digest("hex"), process.env.AI_APPROVAL_PASSWORD_HASH!);
}
export function session() {
  const payload = `${Math.floor(Date.now()/1000)+ttl}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${createHmac("sha256", process.env.AI_APPROVAL_SESSION_SECRET!).update(payload).digest("hex")}`;
}
export function authorized(req: NextRequest) {
  if (!configured()) return false;
  const token = req.cookies.get(COOKIE)?.value || "";
  const parts = token.split(".");
  if (parts.length !== 3 || !/^\d{10}$/.test(parts[0]) || !/^[a-f0-9]{32}$/.test(parts[1])) return false;
  const expiry = Number(parts[0]);
  return expiry > Date.now()/1000 && expiry <= Date.now()/1000+ttl && equal(parts[2],createHmac("sha256",process.env.AI_APPROVAL_SESSION_SECRET!).update(parts.slice(0,2).join(".")).digest("hex"));
}
export function sameOrigin(req: NextRequest) { const host=req.headers.get("host"); const origin=process.env.AI_APPROVAL_SITE_ORIGIN || (host && /^[A-Za-z0-9.:[\]-]+$/.test(host) ? req.nextUrl.protocol+"//"+host : req.nextUrl.origin); return req.headers.get("origin") === origin && req.headers.get("sec-fetch-site") !== "cross-site"; }
export const cookieOptions = { httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"strict" as const, path:"/api/ai-center", maxAge:ttl };
