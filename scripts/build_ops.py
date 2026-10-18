#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""운영보드 데이터 생성기  (sewang-sns/data/ops.json)

인스타 폴더의 실제 상태를 읽어서 분업 파이프라인 / 중복주제 / 경고를 산출한다.
손으로 관리하는 할일목록이 아니라, 파일 상태에서 역산한 진행상황이다.

사용법:  python3 build_ops.py <인스타폴더> <sewang-sns폴더>
"""
import json, os, re, sys, glob, datetime, unicodedata

RE_ROUND = re.compile(r"^(\d{4}-\d{2}-\d{2})_([^_]+)_(.+)$")
RE_CARD  = re.compile(r"^\d\d_.*\.(png|jpg|jpeg)$", re.I)
TODAY    = datetime.date.today()

def nfc(s): return unicodedata.normalize("NFC", s)

def jaccard3(a, b):
    """슬러그 3-gram 자카드 유사도"""
    g = lambda s: {s[i:i+3] for i in range(max(1, len(s) - 2))}
    A, B = g(a), g(b)
    return len(A & B) / len(A | B) if (A | B) else 0.0

def scan_rounds(ig):
    """회차 폴더를 모두 찾아 단계별 완료 상태를 읽는다."""
    roots = [ig] + [d for d in glob.glob(os.path.join(ig, "_*")) if os.path.isdir(d)]
    out, seen = [], set()
    for root in roots:
        for p in sorted(glob.glob(os.path.join(root, "*"))):
            if not os.path.isdir(p):
                continue
            name = nfc(os.path.basename(p))
            m = RE_ROUND.match(name)
            if not m or name in seen:
                continue
            seen.add(name)
            date, cat, slug = m.group(1), m.group(2), m.group(3)
            try:
                files = [nfc(f) for f in os.listdir(p)]
            except OSError:
                files = []
            cards   = [f for f in files if RE_CARD.match(f) and not f.startswith("_")]
            video   = [f for f in files if f.lower().endswith((".mp4", ".mov"))]
            caption = next((f for f in files if "캡션" in f and f.endswith(".txt")), None)
            done    = any("게시완료" in f for f in files)
            verify  = next((f for f in files if "검증" in f and f.endswith(".md")), None)
            out.append({
                "folder": name, "date": date, "category": cat, "slug": slug,
                "location": nfc(os.path.basename(root)) if root != ig else "루트",
                "steps": {
                    "주제": True,                       # 폴더가 있으면 주제는 정해진 것
                    "디자인": bool(cards or video),
                    "글": bool(caption),
                    "게시": done,
                },
                "n_cards": len(cards), "has_video": bool(video),
                "has_verify": bool(verify),
                "published": done,
            })
    return out

def main():
    ig, sns = sys.argv[1], sys.argv[2]
    rounds = scan_rounds(ig)

    # ---- 예약큐 ----
    q = {}
    qp = next(iter(glob.glob(os.path.join(ig, "*", "예약큐.json"))), None)
    if qp:
        try:
            q = json.load(open(qp, encoding="utf-8"))
        except Exception:
            q = {}

    # ---- 원본사진(거래처 재료) ----
    raw = []
    for d in glob.glob(os.path.join(ig, "_원본사진")):
        raw = [nfc(f) for f in os.listdir(d)
               if f.lower().endswith((".jpg", ".jpeg", ".png", ".heic", ".mp4", ".mov"))]
    raw += [nfc(os.path.basename(f)) for f in glob.glob(os.path.join(ig, "IMG_*"))]

    # ---- 게시된 포스트 반응 ----
    reactions = {}
    pp = os.path.join(sns, "data", "posts.json")
    if os.path.exists(pp):
        try:
            for po in json.load(open(pp, encoding="utf-8")).get("posts", []):
                if po.get("platform") == "instagram":
                    reactions[po["date"]] = reactions.get(po["date"], 0) + \
                        po["metrics"].get("likes", 0) + po["metrics"].get("comments", 0) * 3
        except Exception:
            pass

    # ---- 파이프라인(오늘 이후 + 최근 7일) ----
    by_folder = {r["folder"]: r for r in rounds}
    lo = (TODAY - datetime.timedelta(days=7)).isoformat()
    future = [(TODAY + datetime.timedelta(days=k)).isoformat() for k in range(0, 14)]
    dates = sorted(set(list(q.keys()) + [r["date"] for r in rounds] + future))
    pipeline = []
    for d in dates:
        if d < lo:
            continue
        folder = q.get(d) or next((r["folder"] for r in rounds if r["date"] == d), None)
        r = by_folder.get(nfc(folder)) if folder else None
        warn = []
        if d in q and not r:
            warn.append("예약은 있는데 폴더가 없음")
        if r and not r["folder"].startswith(d):
            warn.append(f"폴더 날짜 불일치({r['date']})")
        if r and not r["steps"]["글"]:
            warn.append("캡션 없음")
        if r and not r["steps"]["디자인"]:
            warn.append("카드/영상 없음")
        if d not in q and d >= TODAY.isoformat():
            warn.append("예약큐 미등록")
        if d >= TODAY.isoformat() and not folder:
            warn.append("올릴 것 없음")
        pipeline.append({
            "date": d, "folder": folder,
            "category": r["category"] if r else None,
            "slug": r["slug"] if r else None,
            "steps": r["steps"] if r else {"주제": bool(folder), "디자인": False, "글": False, "게시": False},
            "owner": "제작·게시" if (r and r["steps"]["글"]) else "수집·판단",
            "reaction": reactions.get(d, 0),
            "warnings": warn,
        })

    # ---- 중복 주제 ----
    dups = []
    for i, a in enumerate(rounds):
        for b in rounds[i + 1:]:
            s = jaccard3(a["slug"], b["slug"])
            if s >= 0.25 or (a["slug"] == b["slug"]):
                dups.append({
                    "a": a["folder"], "b": b["folder"], "similarity": round(s, 2),
                    "same_category": a["category"] == b["category"],
                    "gap_days": abs((datetime.date.fromisoformat(a["date"])
                                     - datetime.date.fromisoformat(b["date"])).days),
                })
    dups.sort(key=lambda x: -x["similarity"])

    cat_counts, cat_last = {}, {}
    for r in rounds:
        cat_counts[r["category"]] = cat_counts.get(r["category"], 0) + 1
        if r["date"] > cat_last.get(r["category"], ""):
            cat_last[r["category"]] = r["date"]

    # ---- 경고 ----
    alerts = []
    empty = [d for d in (TODAY + datetime.timedelta(days=k) for k in range(0, 14))
             if d.isoformat() not in q]
    if empty:
        alerts.append({
            "level": "high" if len(empty) >= 7 else "mid",
            "msg": f"향후 14일 중 {len(empty)}일이 예약 미등록 ({empty[0]} 부터)",
            "action": "수집·판단: 주제 선정 후 예약큐에 등록",
        })
    if not raw:
        alerts.append({
            "level": "mid",
            "msg": "_원본사진 폴더에 거래처 사진이 0장",
            "action": "대표님: 거래처 방문 사진을 _원본사진 폴더에 넣으면 그 회차가 최우선으로 올라감",
        })
    else:
        alerts.append({
            "level": "high",
            "msg": f"거래처 원본사진 {len(raw)}장 대기 — 거래처 우선 원칙 발동",
            "action": "제작·게시: 거래처 회차를 먼저 만들고 예약분은 저녁/다음날로 이동",
        })
    tok = os.path.join(ig, "_자동업로드프로그램", "ig_config.json")
    if os.path.exists(tok):
        try:
            c = json.load(open(tok, encoding="utf-8"))
            ref = datetime.date.fromisoformat(c.get("token_refreshed_at", "2000-01-01"))
            left = (ref + datetime.timedelta(days=60) - TODAY).days
            if left <= 14:
                alerts.append({"level": "high", "msg": f"인스타 토큰 만료 {left}일 전",
                               "action": "python3 instagram_auto_upload.py --refresh-token"})
            else:
                alerts.append({"level": "ok", "msg": f"인스타 토큰 정상 (만료 {left}일 남음)", "action": ""})
        except Exception:
            pass
    hi = [d for d in dups if d["similarity"] >= 0.45 and d["gap_days"] <= 60]
    if hi:
        alerts.append({"level": "mid", "msg": f"최근 60일 내 유사 주제 {len(hi)}건",
                       "action": "수집·판단: 새 주제 선정 시 중복표 확인"})

    roles = [
        {"id": "collect", "name": "수집·판단", "owner": "Claude",
         "scope": ["트렌드 키워드 추적", "선점 여부 확인", "중복 주제 체크", "예약큐 2주치 채우기", "거래처 재료 확인"],
         "output": "trends.json · 예약큐.json · 회차 폴더 생성"},
        {"id": "produce", "name": "제작·게시", "owner": "Claude",
         "scope": ["카드 디자인", "캡션·해시태그", "검증 출처 기록", "07:45 미리보기 발송", "승인 후 게시"],
         "output": "회차 폴더 카드 + 캡션_해시태그.txt + 게시"},
        {"id": "approve", "name": "승인", "owner": "대표님",
         "scope": ["텔레그램 미리보기 확인", "'승인' 회신", "거래처 사진 공급"],
         "output": "게시 확정"},
        {"id": "blog", "name": "네이버 블로그 발행", "owner": "ChatGPT",
         "scope": ["스마트에디터 발행"],
         "output": "blog.naver.com/sewang88 게시 — 원고·사진은 Claude가 네이버블로그 폴더에 준비"},
    ]

    json.dump({
        "generated_at": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
        "roles": roles, "pipeline": pipeline, "alerts": alerts,
        "duplicates": dups[:40], "category_counts": cat_counts, "category_last_used": cat_last,
        "material": {"raw_count": len(raw), "raw_files": raw[:20]},
        "stats": {"total_rounds": len(rounds),
                  "published": sum(1 for r in rounds if r["published"]),
                  "queue_days": len(q)},
    }, open(os.path.join(sns, "data", "ops.json"), "w", encoding="utf-8"),
        ensure_ascii=False, indent=1)
    print(f"ops.json 생성: 회차 {len(rounds)} · 파이프라인 {len(pipeline)} · 중복후보 {len(dups)} · 경고 {len(alerts)}")

if __name__ == "__main__":
    main()
