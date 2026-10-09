import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Object3D} from 'three';
import {applyFurnitureVariant,isLightTemperature} from '../src/botaniqueFurniture.ts';

const raw=readFileSync(new URL('../public/assets/botanique/apartamento.glb',import.meta.url));
const gltf=JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12)).toString());
test('exported furniture contains both complete variants and keeps architecture independent',()=>{
 const objects=gltf.nodes.filter(n=>n.mesh!==undefined).map(n=>{const o=new Object3D();o.name=n.name;o.userData=n.extras||{};return o;});
 for(const group of ['sofa','chairs']){
  for(const variant of ['contemporaneo','organico']){
   const members=objects.filter(o=>o.userData.variantGroup===group&&o.userData.variantId===variant);
   assert.ok(members.length>=2,`${group}/${variant} must preserve multiple material batches`);
   assert.equal(applyFurnitureVariant(objects,group,variant),true);
   assert.ok(members.every(o=>o.visible));
   assert.ok(objects.filter(o=>o.userData.variantGroup===group&&o.userData.variantId!==variant).every(o=>!o.visible));
   assert.ok(objects.filter(o=>!o.userData.variantGroup).every(o=>o.visible),'walls and structural meshes must remain visible');
  }
 }
});
test('an unavailable model cannot hide the complete current furnishing',()=>{
 const o=new Object3D();o.userData={variantGroup:'sofa',variantId:'contemporaneo'};
 assert.equal(applyFurnitureVariant([o],'sofa','organico'),false);assert.equal(o.visible,true);
});
test('temperature preferences accept only the three offered temperatures',()=>{
 for(const value of [3000,4000,6000])assert.equal(isLightTemperature(value),true);
 for(const value of [0,3500,'3000',null,NaN])assert.equal(isLightTemperature(value),false);
});
