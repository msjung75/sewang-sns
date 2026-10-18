import test from 'node:test';
import assert from 'node:assert/strict';
import {appendPassage,replacePassage} from '../lib/partial-draft';
test('partial revision preserves every character outside the exact selected passage',()=>{
 const original='제목\n\n앞 문단.\n고칠 문장.\n뒤 문단과 출처 https://example.com/1\n';
 assert.equal(replacePassage(original,'고칠 문장.','고친 문장.'),'제목\n\n앞 문단.\n고친 문장.\n뒤 문단과 출처 https://example.com/1\n');
 assert.equal(replacePassage(original,'고칠 문장.',''),original.replace('고칠 문장.',''));
 assert.throws(()=>replacePassage('같은 문장.\n같은 문장.','같은 문장.','새 문장.'),/여러 곳/);
 assert.throws(()=>replacePassage(original,'현재 없는 문장','수정'),/찾지 못/);
});
test('addition preserves original whitespace and enforces the saved body limit',()=>{
 assert.equal(appendPassage('기존 내용.\n','추가 내용.'),'기존 내용.\n\n추가 내용.');
 assert.equal(appendPassage('기존 내용.\n\n','추가 내용.'),'기존 내용.\n\n추가 내용.');
 assert.throws(()=>appendPassage('a'.repeat(30000),'추가'),/30,000/);
 assert.throws(()=>replacePassage('a'.repeat(30000),'a'.repeat(30000),'b'.repeat(30001)),/30,000/);
});
