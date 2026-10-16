import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBotaniqueNavigator} from '../src/botaniqueNavigation.ts';

const manifest=JSON.parse(readFileSync('public/assets/casa-m/manifest.json','utf8'));
const nav=createBotaniqueNavigator(manifest.navigation,{radius:.18,eyeHeight:1.65,bodyHeight:1.78,gridSize:.15,maxStep:.19,maxSlopeDegrees:38,maxExpandedNodes:40000,maxSearchMs:3000});
const point=([x,y,z])=>({x,y,z});

test('every advertised room opens on a valid, collision-free surface',()=>{
 for(const view of manifest.views.filter(v=>v.walk)){
  const [x,y,z]=view.position;assert.ok(nav.canStand({x,y:y-1.65,z}),view.id);
 }
 assert.equal(manifest.views.filter(v=>['ground-suite','front-suite','back-suite','master'].includes(v.id)).length,4);
});

test('the U stair connects both storeys in both directions without crossing its void',()=>{
 const waypoints=[[9.48,0,-4.65],[9.48,0,-5],[9.48,2.01,-8.08],[9.48,2.01,-8.55],[10.82,2.01,-8.55],[10.82,2.01,-8.08],[10.82,4.02,-5],[10.82,4.02,-4.65]].map(point);
 for(let i=1;i<waypoints.length;i++){
  assert.ok(nav.canTraverse(waypoints[i-1],waypoints[i]),'ascending segment '+i);
  assert.ok(nav.canTraverse(waypoints[i],waypoints[i-1]),'descending segment '+i);
 }
 assert.equal(nav.canStand(point([9.5,4.02,-6.5])),false,'no invisible upper floor over the void');
});

test('water, closed exterior glazing and furniture remain barriers',()=>{
 assert.equal(nav.canStand(point([10,0,-14.8])),false,'pool');
 assert.equal(nav.canStand(point([15.9,0,-3.15])),false,'sofa');
 assert.equal(nav.canTraverse(point([14,0,-2.5]),point([14,0,-1.5])),false,'front glazing');
 assert.equal(nav.canStand(point([25,4.02,-15])),false,'no imaginary floor above the gourmet');
});

test('Casa M stays unlisted and ships the native rooms, PBR finishes and replaceable furniture',()=>{
 const registry=JSON.parse(readFileSync('config/deliveries.json','utf8'));
 assert.equal(registry.projects.find(p=>p.slug==='casa-m').status,'unlisted');
 const buffer=readFileSync('public'+manifest.model);
 assert.equal(buffer.toString('ascii',0,4),'glTF');
 const gltf=JSON.parse(buffer.toString('utf8',20,20+buffer.readUInt32LE(12)));
 for(const group of ['sofa','dining','chairs'])assert.ok(gltf.nodes.some(n=>n.extras?.furnitureGroup===group),group);
 for(const finish of ['stone','walnut','marble','travertine','velvet'])assert.ok(gltf.materials.some(m=>m.extras?.finish===finish&&m.pbrMetallicRoughness.baseColorTexture),finish);
 assert.ok(buffer.length<80*1024*1024,'compressed delivery must remain below 80 MB');
 assert.match(manifest.note,/fachada oeste estimada/);
 assert.ok(gltf.nodes.some(n=>n.extras?.vehicle==='BMW X5 (G05)'));
 assert.ok(!gltf.materials.some(m=>/V13 pintura automovel/.test(m.name)),'generic sports cars removed');
});
