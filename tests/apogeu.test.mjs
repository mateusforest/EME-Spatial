import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canStand,walkStep,walkLocations} from '../src/apogeu/navigation.ts';
import {studyLevels,parseLevel} from '../src/apogeu/data.ts';
const base=new URL('../public/assets/apogeu/model-v2/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',base),'utf8'));
const bytes=readFileSync(new URL('apogeu.glb',base));
const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8'));
test('the Blender export contains all six independently selectable floors and the modeled interior',()=>{
 assert.equal(bytes.subarray(0,4).toString(),'glTF');
 const sections=new Set(gltf.nodes.map(n=>n.extras?.section).filter(Boolean));
 for(let i=1;i<=6;i++)assert.ok(sections.has('floor_'+String(i).padStart(2,'0')));
 for(const name of ['interior','base','roof','leisure','landscape','site'])assert.ok(sections.has(name));
 assert.equal(manifest.source,'apogeu_estudo.blend');
 assert.equal(manifest.sourceSha256.length,64);
 assert.ok(bytes.length<5*1024*1024);
 assert.ok(gltf.meshes.length<=150);
});
test('view selection uses the exact elevations exported from Blender',()=>{
 assert.equal(studyLevels.length,manifest.levels);
 studyLevels.forEach((l,i)=>assert.ok(Math.abs(l.height-(manifest.base+i*manifest.floorHeight))<1e-8));
 assert.equal(parseLevel('6'),6);for(const input of ['0','7','-1','1.5','bad',null])assert.equal(parseLevel(input),null);
});
test('all visit entry points are on a valid floor and outside solid obstacles',()=>{
 for(const [id,loc] of Object.entries(walkLocations)){
  assert.ok(canStand(loc.position[0],loc.position[2],id,manifest.zoneObstacles[id]||[]),id);
  assert.ok(Math.abs(loc.position[1]-loc.floor-1.65)<.001,id+' eye level');
 }
});
test('a long movement cannot tunnel through a thin apartment partition',()=>{
 const wall={min:[0,3.85,-4],max:[.12,6.6,4]};
 const moved=walkStep(-1,0,3,0,'apartment',[wall]);assert.ok(moved.x<-.19);
 const sliding=walkStep(-.25,0,1,1,'apartment',[wall]);assert.ok(sliding.x<-.19);assert.ok(sliding.z>.9);
});
test('walk zones keep visitors on the intended floor and inside terrace edges',()=>{
 for(const [id,loc] of Object.entries(walkLocations)){
  const moved=walkStep(loc.position[0],loc.position[2],100,100,id,[]);
  assert.ok(canStand(moved.x,moved.z,id,[]),id);
 }
 const raisedWall={min:[-4,10,-5],max:[4,13,5]};
 assert.ok(canStand(0,0,'apartment',[raisedWall]));
});
test('the site has the documented lateral extension instead of a generic rectangular lawn',()=>{
 assert.equal(manifest.siteReference,'planta-002.jpg');
 assert.ok(manifest.siteOutline.some(([x])=>x>25));
 assert.ok(manifest.siteOutline.some(([,z])=>z<-45));
 assert.match(manifest.siteAccuracy,/sem cotas/);
});
