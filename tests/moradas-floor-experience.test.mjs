import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {floorStatus,moradasUnits} from '../src/developments/moradas-stock.ts';
import {facadeCalibration,floorOutline,floorColors} from '../src/developments/moradas-floor-geometry.ts';

test('floor summary keeps available, negotiating and closed floors distinct',()=>{
 assert.equal(floorStatus(4),'negotiation');
 assert.equal(floorStatus(5),'sold');
 for(const floor of [1,2,3,6,7,8])assert.equal(floorStatus(floor),'available');
 assert.equal(moradasUnits.find(u=>u.number===701).status,'negotiation');
 assert.equal(moradasUnits.find(u=>u.number===104).status,'reserved');
 assert.equal(new Set(Object.values(floorColors)).size,3);
});
test('adjacent floor bands share a boundary, without overlaps or gaps',()=>{
 for(const tower of ['a','b']){
  for(let f=1;f<facadeCalibration[tower].levels;f++){
   const current=floorOutline(tower,f).split(' ');
   const above=floorOutline(tower,f+1).split(' ');
   assert.deepEqual(current.slice(0,3),above.slice(3).reverse());
  }
 }
});
test('both Blender floorplans export selectable room geometry',()=>{
 for(const bedrooms of [2,3]){
  const buffer=readFileSync(new URL(`../public/assets/developments/moradas-da-serra/floorplans/moradas-plan-${bedrooms}bed.glb`,import.meta.url));
  assert.equal(buffer.subarray(0,4).toString(),'glTF');
  const json=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)).toString());
  const ids=new Set(json.nodes.map(n=>n.extras?.roomId).filter(Boolean));
  for(const id of ['living','kitchen','bedroom','single','bathroom'])assert.ok(ids.has(id),`${bedrooms} bedroom model is missing ${id}`);
  assert.ok(json.meshes.length<45,'keep mobile draw calls bounded');
 }
});
