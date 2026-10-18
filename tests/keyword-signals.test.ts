import test from 'node:test';import assert from 'node:assert/strict';import {observedTopics} from '../lib/keyword-signals';
test('observed expressions count unique source URLs and do not claim search growth or a market launch',()=>{
 const rows=[{id:'one',title:'하이볼 신제품',summary:'한 곳의 소개',url:'https://example.com/a',collected_at:'2026-10-18'}, {id:'copy',title:'하이볼 신제품',summary:'재수집',url:'https://example.com/a#top',collected_at:'2026-10-18'}];
 const found=observedTopics(rows);assert.equal(found.find(t=>t.keyword==='하이볼')?.count,1);assert.equal(found.find(t=>t.keyword==='외식·주류 창업')?.count,0);assert.match(found[0].label,/인기도 순위 아님/);
});
