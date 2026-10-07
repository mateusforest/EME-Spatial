import assert from 'node:assert/strict';
import * as T from 'three';
import {buildMApartment69,apartment69Bounds,apartment69Areas,apartment69Obstacles} from '../src/developments/mApartment69.ts';
import {walkingPath63} from '../src/developments/mClickWalk63.ts';
import {canStand} from '../src/developments/mWalking.ts';
const space={bounds:apartment69Bounds,areas:apartment69Areas,obstacles:apartment69Obstacles};
const source=new T.Group();source.position.y=62.5;
source.add(new T.Mesh(new T.BoxGeometry(28,.66,24),new T.MeshStandardMaterial()));
const model=buildMApartment69(x=>x,{id:'m-14'},source);
assert.equal(source.position.y,62.5);assert.equal(model.group.children[0].position.y,0);
assert.equal(model.group.children[0].children[0].geometry,source.children[0].geometry,'Reuse the real floor geometry');
assert.equal(new T.Box3().setFromObject(model.group).getSize(new T.Vector3()).x,28);
for(const [name,view]of Object.entries(model.views))assert(canStand({x:view.eye[0],z:view.eye[2]},space.obstacles,space.bounds,space.areas),name+' camera inside obstruction');
for(const [a,b]of [
 [{x:3.6,z:3.65},{x:0,z:7}],
 [{x:0,z:7},{x:13,z:2}],
 [{x:13,z:2},{x:6,z:-12.1}],
 [{x:0,z:7},{x:-13,z:2}],
 [{x:3.6,z:3.65},{x:10.7,z:-8}],
 [{x:3.6,z:3.65},{x:-10.7,z:-8}],
])assert(walkingPath63(a,b,space).length,JSON.stringify({a,b}));
assert(!canStand({x:13.4,z:9.1},space.obstacles,space.bounds,space.areas),'Cannot step outside the rounded slab');
console.log('PASS actual envelope reuse, all view positions, rooms connected, continuous balcony, perimeter protection');
