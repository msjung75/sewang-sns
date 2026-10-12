#!/usr/bin/env python3
"""One-shot Python fetcher — Instagram + YouTube + Naver → data/posts.json
Writes JSON compatible with the Next.js dashboard. Standalone (no node needed)."""
import json, os, re, sys, urllib.request, urllib.parse, xml.etree.ElementTree as ET
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor

ENV = {}
for ln in open(os.environ.get("ENV_FILE", ".env.local")).read().splitlines():
    if ln and not ln.startswith("#") and "=" in ln:
        k, v = ln.split("=", 1); ENV[k.strip()] = v.strip()

IG_TOKEN = ENV.get("IG_LONG_LIVED_TOKEN", "")
IG_USER_ID = ENV.get("IG_USER_ID", "")
YT_KEY = ENV.get("YOUTUBE_API_KEY", "")
YT_HANDLE = ENV.get("YOUTUBE_CHANNEL_HANDLE", "@sewangliquor").lstrip("@")
NB_ID = ENV.get("NAVER_BLOG_ID", "sewang88")

UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"

def get(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

RULES = [
    ("거래처케이스", "신규오픈", ["신규오픈","오픈","그랜드오픈","개업","창업","오픈기념"]),
    ("거래처케이스", "뜨는술집", ["뜨는","핫플","핫한","맛집","줄서는","웨이팅"]),
    ("거래처케이스", "잘되는업장", ["잘되는","성공사례","매출","번창","거래처","사장님노트","사장님 노트"]),
    ("신제품", None, ["신제품","신상","출시","론칭","런칭","new "]),
    ("시장트렌드", "국외", ["해외","글로벌","유럽","미국","일본","중국","수입","import","글로벌트렌드"]),
    ("시장트렌드", "국내", ["트렌드","시장","소비자","국내시장","통계","리포트","분석"]),
    ("세왕소식", None, ["세왕","세왕상사","공지","안내","휴무","채용","행사"]),
    ("주요뉴스", None, ["뉴스","속보","주류법","주세","규제","정책","국세청"]),
]

def categorize(text, tags):
    hay = (text + " " + " ".join(tags or [])).lower()
    for cat, sub, kws in RULES:
        if any(k.lower() in hay for k in kws):
            return cat, sub
    return "TBD", None

def strip_html(s): return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", s or "")).strip()

def fetch_naver():
    print("[naver] RSS...", end=" ", flush=True)
    try:
        xml = get(f"https://rss.blog.naver.com/{NB_ID}.xml").decode("utf-8", "replace")
    except Exception as e:
        print(f"RSS fail: {e}"); return []
    root = ET.fromstring(xml)
    items = root.findall(".//item")
    print(f"{len(items)}건")
    out = []
    for it in items:
        title = (it.findtext("title") or "").strip()
        link = (it.findtext("link") or "").strip()
        desc = it.findtext("description") or ""
        pub = it.findtext("pubDate") or ""
        tags = [t.strip() for t in (it.findtext("tag") or "").split(",") if t.strip()]
        m = re.search(rf"{NB_ID}/(\d+)", link) or re.search(r"logNo=(\d+)", link)
        if not m: continue
        log_no = m.group(1)
        likes = 0; comments = 0; views = 0
        try:
            q = urllib.parse.quote(f"BLOG[{NB_ID}_{log_no}]")
            d = json.loads(get(f"https://blog.like.naver.com/v1/search/contents?suppress_response_codes=true&q={q}&isDuplication=false&cssIds=BASIC_MOBILE&displayId=MBLOG", 10))
            for r in d.get("contents", [{}])[0].get("reactions", []):
                likes += int(r.get("count", 0) or 0)
        except Exception: pass
        try:
            h = get(f"https://blog.naver.com/CommentList.naver?blogId={NB_ID}&logNo={log_no}&categoryNo=0&parentCommentNo=&page=1", 10).decode("utf-8", "replace")
            mm = re.search(r"totalCount[\"']?\s*[:=]\s*[\"']?(\d+)", h) or re.search(r"전체[^0-9]{0,5}(\d+)", h)
            if mm: comments = int(mm.group(1))
        except Exception: pass
        try:
            h = get(f"https://m.blog.naver.com/{NB_ID}/{log_no}", 10).decode("utf-8", "replace")
            mm = re.search(r"조회수[^0-9]{0,10}(\d[\d,]*)", h) or re.search(r"visitorCount[\"']?\s*[:=]\s*[\"']?(\d+)", h)
            if mm: views = int(mm.group(1).replace(",", ""))
        except Exception: pass
        thumb_m = re.search(r'<img[^>]+src=["\']([^"\']+)', desc)
        try:
            from email.utils import parsedate_to_datetime
            date = parsedate_to_datetime(pub).strftime("%Y-%m-%d")
        except Exception: date = pub[:10]
        cat, sub = categorize(title + " " + strip_html(desc), tags)
        out.append({"platform":"naver","post_id":log_no,"url":link.split("?")[0],
                    "title_or_caption":title,"date":date,
                    "thumbnail":thumb_m.group(1) if thumb_m else None,
                    "metrics":{"views":views,"likes":likes,"comments":comments},
                    "category":cat,"sub_category":sub,"tags":tags,
                    "fetched_at":datetime.now(timezone.utc).isoformat()})
    return out

def fetch_youtube():
    if not YT_KEY: return []
    print("[youtube] uploads...", end=" ", flush=True)
    try:
        d = json.loads(get(f"https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=@{YT_HANDLE}&key={YT_KEY}"))
        if "error" in d: print("ERROR:", d["error"].get("message")); return []
        uploads = d["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
    except Exception as e: print(f"fail: {e}"); return []
    ids = []; page = ""
    while True:
        try:
            d = json.loads(get(f"https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId={uploads}&pageToken={page}&key={YT_KEY}"))
        except Exception as e: print(f"playlist fail: {e}"); break
        for it in d.get("items", []): ids.append(it["contentDetails"]["videoId"])
        page = d.get("nextPageToken", "")
        if not page: break
    print(f"{len(ids)}개 영상")
    out = []
    for i in range(0, len(ids), 50):
        chunk = ",".join(ids[i:i+50])
        try:
            d = json.loads(get(f"https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id={chunk}&key={YT_KEY}"))
        except Exception as e: print(f"videos fail: {e}"); continue
        for v in d.get("items", []):
            s = v["snippet"]; st = v.get("statistics", {})
            tags = s.get("tags", [])
            cat, sub = categorize(s["title"] + " " + s.get("description",""), tags)
            thumbs = s.get("thumbnails", {})
            thumb = (thumbs.get("high") or thumbs.get("default") or {}).get("url")
            out.append({"platform":"youtube","post_id":v["id"],
                        "url":f"https://www.youtube.com/watch?v={v['id']}",
                        "title_or_caption":s["title"],"date":s["publishedAt"][:10],
                        "thumbnail":thumb,
                        "metrics":{"views":int(st.get("viewCount",0)),
                                   "likes":int(st.get("likeCount",0)),
                                   "comments":int(st.get("commentCount",0))},
                        "category":cat,"sub_category":sub,"tags":tags,
                        "fetched_at":datetime.now(timezone.utc).isoformat()})
    return out

def fetch_instagram():
    if not IG_TOKEN or not IG_USER_ID:
        print("[instagram] token/user_id 미설정 → skip"); return []
    print("[instagram] media...", end=" ", flush=True)
    out = []
    # IGAA 토큰은 graph.instagram.com, EAA 토큰은 graph.facebook.com
    is_ig_login = IG_TOKEN.startswith("IGAA")
    base = "https://graph.instagram.com/v21.0" if is_ig_login else "https://graph.facebook.com/v20.0"
    user_path = "me" if is_ig_login else IG_USER_ID
    fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count"
    url = f"{base}/{user_path}/media?fields={fields}&limit=50&access_token={IG_TOKEN}"
    while url and len(out) < 100:
        try:
            d = json.loads(get(url))
        except Exception as e: print(f"fail: {e}"); break
        if "error" in d:
            print("ERROR:", d["error"].get("message")); break
        for m in d.get("data", []):
            caption = m.get("caption","") or ""
            tags = [t.lstrip("#") for t in re.findall(r"#\S+", caption)]
            cat, sub = categorize(caption, tags)
            views = 0
            if m.get("media_type") in ("VIDEO","REELS"):
                try:
                    ins = json.loads(get(f"{base}/{m['id']}/insights?metric=views&access_token={IG_TOKEN}", 10))
                    views = int(ins.get("data",[{}])[0].get("values",[{}])[0].get("value", 0) or 0)
                except Exception: pass
            out.append({"platform":"instagram","post_id":m["id"],"url":m.get("permalink",""),
                        "title_or_caption":caption[:200],"date":(m.get("timestamp") or "")[:10],
                        "thumbnail":m.get("thumbnail_url") or m.get("media_url"),
                        "metrics":{"views":views,"likes":m.get("like_count",0),"comments":m.get("comments_count",0)},
                        "category":cat,"sub_category":sub,"tags":tags,
                        "fetched_at":datetime.now(timezone.utc).isoformat()})
            if len(out) >= 100: break
        url = (d.get("paging") or {}).get("next")
    print(f"{len(out)}건")
    return out

def main():
    posts = []; summary = {}
    with ThreadPoolExecutor(max_workers=3) as ex:
        futs = {ex.submit(fetch_naver): "naver", ex.submit(fetch_youtube): "youtube", ex.submit(fetch_instagram): "instagram"}
        for fut in futs:
            name = futs[fut]
            try:
                r = fut.result(); posts.extend(r); summary[name] = len(r)
            except Exception as e:
                summary[name] = f"ERROR: {e}"
    out = {"fetched_at": datetime.now(timezone.utc).isoformat(), "summary": summary, "posts": posts}
    outp = os.environ.get("OUT_FILE", "data/posts.json")
    os.makedirs(os.path.dirname(outp) or ".", exist_ok=True)
    json.dump(out, open(outp, "w"), ensure_ascii=False, indent=2)
    print(f"\n✅ wrote {len(posts)} posts → {outp}")
    print(f"   summary: {summary}")

if __name__ == "__main__":
    main()
