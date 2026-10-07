import assert from 'node:assert/strict';
import {production73} from '../src/developments/mProduction73.ts';
const design={wood:2,fabric:1,accent:1,stone:1,table:'oval'},saved={version:70,unit:'m-14',approvedAt:'2026-10-07T00:00:00Z',design};
const storage={getItem:()=>JSON.stringify(saved)};
const draft={...design,wood:0};const record=production73(storage);
assert.equal(record.design.wood,2);assert.notEqual(record.design.wood,draft.wood);assert.equal(record.approval,'saved');assert.equal(record.finishes.wood[0],'Madeira clara');
assert.equal(production73({getItem:()=>null}).approval,'original');
for(const bad of ['{}','null','{broken',JSON.stringify({...saved,unit:'m-13'}),JSON.stringify({...saved,approvedAt:'bad'}),JSON.stringify({...saved,design:{...design,wood:7}})])assert.throws(()=>production73({getItem:()=>bad}));
console.log('PASS approved-only production export, explicit original fallback and corrupt approval rejection');
