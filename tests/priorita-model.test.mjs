import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {stripTypeScriptTypes} from 'node:module';

// Compile the pure domain model independently of browser and renderer APIs.
const source=readFileSync(new URL('../src/priorita/model.ts',import.meta.url),'utf8')
  .replace("import source from './plan-source.json';",'const source='+readFileSync(new URL('../src/priorita/plan-source.json',import.meta.url),'utf8')+';');
const js=stripTypeScriptTypes(source);
const m=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));

test('urban plan has 96 distinct parcels in the supplied eight blocks',()=>{
  assert.equal(m.lots.length,96);assert.equal(m.lotById.size,96);
  assert.deepEqual(Object.fromEntries('ABCDEFGH'.split('').map(b=>[b,m.lots.filter(l=>l.block===b).length])),{A:6,B:11,C:16,D:15,E:14,F:16,G:10,H:8});
  assert.equal(Math.round(m.lots.reduce((s,l)=>s+l.area,0)*100),2428478);
  assert.ok(m.lots.every(l=>m.containsPoint(l.center,l.polygon)));
});
test('irregular lot retains its unequal front and rear dimensions',()=>{
  const l=m.lotById.get('D-14');assert.equal(l.area,205.25);assert.equal(l.front.value,8.48);assert.equal(l.back.value,7.29);
  assert.equal(l.front.source,'printed');assert.equal(l.back.source,'printed');
});
test('walking connects the four streets without entering neighbouring parcels',()=>{
  for(const z of [-115,-23,34,92,128])assert.ok(m.canWalk(1.3,z));
  for(const z of [-23,34,92])for(const x of [-50,0,50])assert.ok(m.canWalk(x,z));
  assert.ok(m.lots.every(l=>!m.canWalk(...l.center)));
  assert.equal(m.canWalk(300,300),false);
});
test('illustrative terrain is continuous and has visible, finite relief',()=>{
  assert.ok(Math.abs(m.terrainHeight(0,125)-m.terrainHeight(0,-125))>7);
  for(const l of m.lots){assert.ok(m.lotRelief(l)>0);assert.ok(m.lotRelief(l)<5);}
  assert.ok(Math.abs(m.terrainHeight(1.3,33.999)-m.terrainHeight(1.3,34.001))<.002);
});
test('solar position follows time and season in southern Brazil',()=>{
  const morning=m.solarPosition(8,'2026-11-12'),afternoon=m.solarPosition(17,'2026-11-12');
  assert.ok(morning.azimuth<180);assert.ok(afternoon.azimuth>180);
  assert.ok(m.solarPosition(12,'2026-12-21').elevation>m.solarPosition(12,'2026-06-21').elevation+30);
  assert.ok(m.solarPosition(0,'2026-11-12').elevation<0);
  assert.ok(Math.abs(Math.hypot(...morning.direction)-1)<.002);
  assert.equal(m.timeLabel(18.25),'18:15');
});
