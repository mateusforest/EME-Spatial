import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canStand,walkStep,walkLocations} from '../src/apogeu/navigation.ts';
import {studyLevels,parseLevel} from '../src/apogeu/data.ts';
import {aerialCrop,calibration} from '../src/apogeu/aerial.ts';
import {PerspectiveCamera,Matrix4,Vector3} from 'three';
const base=new URL('../public/assets/apogeu/model-photo-v1/',import.meta.url);
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

test('photo and 3D share a valid crop on desktop, portrait and zoomed views',()=>{
 for(const [w,h] of [[1366,792],[390,720],[1920,1080],[844,336]])for(const zoom of [1,1.4,2.2]){
  const c=aerialCrop(w,h,zoom);
  assert.ok(c.x>=0&&c.y>=0);
  assert.ok(c.x+c.width<=1920.00001&&c.y+c.height<=1080.00001);
  assert.ok(Math.abs(c.width/c.height-w/h)<1e-9);
  const anchor=[calibration.focus[0]*1920,calibration.focus[1]*1080];
  assert.ok(anchor[0]>=c.x&&anchor[0]<=c.x+c.width);
  assert.ok(anchor[1]>=c.y&&anchor[1]<=c.y+c.height);
 }
});

test('the photographic camera is above the ground and registers the parcel controls',()=>{
 const camera=new PerspectiveCamera(calibration.fov,1920/1080,.08,500),r=calibration.rotation;
 camera.position.fromArray(calibration.position);assert.ok(camera.position.y>10);
 camera.quaternion.setFromRotationMatrix(new Matrix4().set(r[0][0],r[0][1],r[0][2],0,r[1][0],r[1][1],r[1][2],0,r[2][0],r[2][1],r[2][2],0,0,0,0,1));
 camera.updateMatrixWorld();
 calibration.controlWorld.forEach((point,i)=>{
  const p=new Vector3().fromArray(point).project(camera),target=calibration.controlPixels[i];
  assert.ok(Math.hypot((p.x+1)*960-target[0],(1-p.y)*540-target[1])<15);
 });
 const sections=new Set(gltf.nodes.map(n=>n.extras?.section));
 assert.ok(!sections.has('context'),'no neighborhood geometry is shipped in the photographic model');
 assert.match(calibration.source,/aporteconstrutora/);
});
