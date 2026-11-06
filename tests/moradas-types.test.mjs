import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {moradasUnits} from '../src/developments/moradas-stock.ts';
import {moradasPlanForType} from '../src/developments/moradas-plans.ts';

test('each apartment final uses its separately supplied plan, including all two-bedroom types',()=>{
 for(const [number,type] of [[101,1],[201,1],[802,2],[302,2],[203,3],[703,3],[104,4],[604,4]]){
  const unit=moradasUnits.find(u=>u.number===number);
  const plan=moradasPlanForType(unit.type);
  assert.equal(plan.type,type);
  assert.equal(plan.imageFile,`floorplans/moradas-type-${type}.png`);
 }
 assert.equal(new Set([1,3,4].map(t=>moradasPlanForType(t).modelFile)).size,3);
 assert.equal(moradasPlanForType(2).bathrooms,2);
 assert.throws(()=>moradasPlanForType(5));
});

test('all four Blender models retain their type, room geometry and the original source image',()=>{
 const hashes=new Set();
 const report=JSON.parse(readFileSync(new URL('../public/assets/developments/moradas-da-serra/floorplans/types-build-report.json',import.meta.url)));
 for(const type of [1,2,3,4]){
  const plan=moradasPlanForType(type);
  const buffer=readFileSync(new URL('../public/assets/developments/moradas-da-serra/'+plan.modelFile,import.meta.url));
  assert.equal(buffer.subarray(0,4).toString(),'glTF');
  hashes.add(createHash('sha256').update(buffer).digest('hex'));
  const json=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)).toString());
  const ids=new Set(json.nodes.map(n=>n.extras?.roomId).filter(Boolean));
  for(const room of plan.rooms)assert.ok(ids.has(room.id),`type ${type} missing ${room.id}`);
  assert.equal(ids.has('suite-bath'),type===2,'only type 2 has the second bathroom');
  assert.ok(json.nodes.every(n=>n.extras?.planType===type));
  assert.ok(json.meshes.length<65,'bounded mobile draw calls');
  const original=readFileSync(new URL('../public/assets/developments/moradas-da-serra/'+plan.imageFile,import.meta.url));
  assert.equal(report.models.find(m=>m.type===type).sourceSha256,createHash('sha256').update(original).digest('hex'));
  assert.equal(original.readUInt32BE(16),plan.width);
  assert.equal(original.readUInt32BE(20),plan.height);
 }
 assert.equal(hashes.size,4,'never reuse one generic model for different types');
});
