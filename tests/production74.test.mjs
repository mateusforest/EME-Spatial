import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decode74,approved74} from '../src/portal/production74.ts';
import crypto from 'node:crypto';
const bytes=Buffer.from('test fixture');const item={id:'version-1',name:'Living',kind:'image',mime:'image/png',sha256:crypto.createHash('sha256').update(bytes).digest('hex'),data:bytes.toString('base64'),createdAt:'2026-10-07T12:00:00Z',origin:{projectId:'m-14',projectName:'Torre M',engine:'CYCLES',originType:'blender',approvedAt:'2026-10-07T12:00:00Z'}};
const pack=items=>JSON.stringify({schema:'eme-spatial-library/1',items});
test('incoming files always require portal review despite upstream approval',async()=>{const [row]=await decode74(pack([item]));assert.equal(row.approvedAt,null);assert.equal(row.blob.size,bytes.length);assert.throws(()=>approved74([row]));assert.equal(approved74([{...row,approvedAt:'2026-10-07T12:00:00Z'}]).length,1);});
test('changed bytes and duplicate version IDs rejected',async()=>{await assert.rejects(decode74(pack([{...item,data:Buffer.from('changed').toString('base64')}])));await assert.rejects(decode74(pack([item,item])));});
test('active content and wrong schema rejected',async()=>{await assert.rejects(decode74(pack([{...item,mime:'image/svg+xml'}])));await assert.rejects(decode74('{}'));await assert.rejects(decode74(pack([{...item,origin:{...item.origin,projectId:'../elsewhere'}}])));});
