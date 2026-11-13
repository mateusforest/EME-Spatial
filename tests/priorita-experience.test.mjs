import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {validFavorites,toggleComparison,advanceDay} from '../src/priorita/experience-state.ts';

test('saved shortlist rejects invalid or removed parcels and duplicate IDs',()=>{
  const ids=new Set(['B-01','B-02']);
  assert.deepEqual(validFavorites(['B-01','missing',null,42,'B-01','B-02'],ids),['B-01','B-02']);
  for(const invalid of [null,{},'B-01',true])assert.deepEqual(validFavorites(invalid,ids),[]);
});

test('comparison contains at most two distinct parcels and supports removal',()=>{
  let selected=[];
  for(const id of ['A-01','B-01','B-02'])selected=toggleComparison(selected,id);
  assert.deepEqual(selected,['B-01','B-02']);
  assert.deepEqual(toggleComparison(selected,'B-01'),['B-02']);
});

test('automatic daylight respects speed, end time and resumed-frame limits',()=>{
  assert.equal(advanceDay(8,.2,1),8.05);
  assert.equal(advanceDay(8,.2,4),8.2);
  assert.equal(advanceDay(21.99,.5,4),22);
  assert.equal(advanceDay(6,60,1),6.125);
  assert.equal(advanceDay(8,-1,1),8);
});

test('web landscape has a bounded payload and both levels for all six v7 elements',()=>{
  const glb=readFileSync(new URL('../public/assets/priorita/production-v7/landscape.glb',import.meta.url));
  assert.equal(glb.readUInt32LE(0),0x46546c67);
  assert.ok(glb.byteLength<750_000,'landscape must stay below 750 KB');
  const json=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());
  assert.ok(json.images.length<=6,'texture maps must be shared');
  const names=json.nodes.map(n=>n.name);
  for(const kind of ['tree','shade','shrub0','shrub1','bench','lamp'])
    for(const level of ['near','far'])assert.ok(names.some(n=>n?.startsWith(`${kind}_${level}`)),`${kind} ${level}`);
});
