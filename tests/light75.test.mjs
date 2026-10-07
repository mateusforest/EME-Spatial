import assert from 'node:assert/strict';
import * as T from 'three';
import {solar75,shadowFocus75} from '../src/developments/mSun75.ts';
const samples=Array.from({length:101},(_,n)=>solar75(n));
assert(samples[0].elevation>20&&samples[0].elevation<45,'Morning sun must reach below the balcony overhang');
assert.equal(samples.at(-1).power,0,'No sunlight from below the horizon');
assert.equal(samples.at(-1).night,1);
for(let i=0;i<samples.length;i++){
 const s=samples[i];assert(Math.abs(s.direction.length()-1)<1e-10);assert(s.power>=0&&s.power<=4.1);
 if(s.elevation<=0)assert.equal(s.power,0);
 if(i){assert(s.night>=samples[i-1].night);assert(s.direction.distanceTo(samples[i-1].direction)<.06,'No solar jump on the time slider');}
}
const sun=new T.DirectionalLight(),renderer={shadowMap:{needsUpdate:false}},camera=new T.PerspectiveCamera(),focus=shadowFocus75(sun,renderer);
sun.position.copy(samples[0].direction).multiplyScalar(280);camera.position.set(34,118,42);
focus(camera,new T.Vector3(0,102,-2),false,false,62.5);
const width=sun.shadow.camera.right;assert(width<=40,'Concentrate the existing map at the roof');
assert(sun.shadow.camera.near>0&&sun.shadow.camera.far>sun.shadow.camera.near);
renderer.shadowMap.needsUpdate=false;focus(camera,new T.Vector3(0,102,-2),false,false,62.5);assert.equal(renderer.shadowMap.needsUpdate,false,'Stable camera must reuse its shadow map');
focus(camera,new T.Vector3(0,64,0),true,true,62.5);assert.equal(sun.shadow.camera.right,24);
assert.equal(sun.target.position.y,64.1,'Shadow belongs to the actual fourteenth floor');
console.log('PASS continuous solar path, horizon extinction, local shadow precision and idle reuse');
