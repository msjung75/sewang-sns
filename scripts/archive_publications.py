#!/usr/bin/env python3
"""Preserve observed public SNS metadata without touching posts.json or drafts."""
import argparse
import json
from pathlib import Path
from urllib.parse import urlsplit

FIELDS = ('platform', 'post_id', 'url', 'title_or_caption', 'date', 'category', 'tags', 'body', 'content_scope')


def merge_archive(previous, current):
    rows = {}
    for post in previous.get('posts', []):
        if isinstance(post, dict):
            rows[(post.get('platform'), post.get('post_id'))] = post
    for post in current.get('posts', []):
        if not isinstance(post, dict) or post.get('platform') not in ('instagram', 'youtube', 'naver'):
            continue
        parsed = urlsplit(post.get('url', ''))
        if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
            continue
        key = (post['platform'], str(post.get('post_id', '')))
        if not key[1]:
            continue
        old = rows.get(key, {})
        clean = {k:post[k] for k in FIELDS if k in post}
        clean['first_seen_at'] = old.get('first_seen_at') or post.get('fetched_at') or current.get('fetched_at', '')
        clean['last_seen_at'] = post.get('fetched_at') or current.get('fetched_at', '')
        clean['content_scope'] = clean.get('content_scope') or ('RSS 제목·요약 · 전체 본문 미수집' if post['platform']=='naver' and clean.get('body') else '수집된 제목·캡션 · 전체 본문/영상 미검증')
        rows[key] = clean
    if len(rows) > 20000:
        raise ValueError('publication_archive_capacity_exceeded')
    return {'fetched_at':current.get('fetched_at', previous.get('fetched_at', '')), 'posts':sorted(rows.values(), key=lambda x:(x.get('date',''),x.get('post_id','')), reverse=True)}


def main():
    parser = argparse.ArgumentParser();parser.add_argument('--data-dir',type=Path,default=Path('data'));args=parser.parse_args()
    source = args.data_dir/'posts.json';target = args.data_dir/'publication-archive.json'
    previous = json.loads(target.read_text()) if target.exists() else {}
    current = json.loads(source.read_text())
    merged = merge_archive(previous,current)
    if previous != merged:
        pending = target.with_suffix('.tmp');pending.write_text(json.dumps(merged,ensure_ascii=False,indent=2)+'\n');pending.replace(target)
    print(json.dumps({'publication_archive_count':len(merged['posts'])}))


if __name__=='__main__':main()
