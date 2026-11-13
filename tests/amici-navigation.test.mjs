import assert from 'node:assert/strict';
import {test} from 'node:test';
import {canStand,findWalkPath,floorHeight,hallDestination,walkStart,walkStep,zoneAt} from '../src/amici/navigation.ts';
test('the approach connects the sidewalk to the hall only through the doorway',()=>{
 assert(canStand(walkStart.x,walkStart.z));assert(canStand(hallDestination.x,hallDestination.z));
 assert(canStand(0,17.65));assert(!canStand(0,17.65,false));
 assert(!canStand(2,18));assert(!canStand(-5,13));assert(!canStand(0,6));
 assert.equal(zoneAt(16),'hall');assert.equal(zoneAt(20),'outside');
});
test('large or diagonal steps do not tunnel through walls, furniture or a closed door',()=>{
 const wall=walkStep(2,20,0,-12);assert(wall.z>=19.5);
 const door=walkStep(0,20,0,-8,false);assert(door.z>=17.96);
 const opened=walkStep(0,20,0,-8,true);assert(Math.abs(opened.z-12)<.01);
 const sofa=walkStep(-2,14,-6,0);assert(sofa.x>=-2.99);
 const back=walkStep(0,12,0,-20);assert(back.z>=6.85);
 const side=walkStep(0,12,10,-1);assert(canStand(side.x,side.z));
});
test('guided paths stay connected and avoid the furnished areas',()=>{
 for(const [start,goal] of [[walkStart,hallDestination],[hallDestination,walkStart],[{x:-11,z:27},hallDestination],[{x:-2,z:16},{x:2,z:7.3}]]){
  const route=findWalkPath(start,goal);assert(route.length>0);
  let last=start;
  for(const p of route){assert(canStand(p.x,p.z));const next=walkStep(last.x,last.z,p.x-last.x,p.z-last.z);assert(Math.hypot(next.x-p.x,next.z-p.z)<.01);last=p;}
  assert.deepEqual(route.at(-1),goal);
 }
 assert.deepEqual(findWalkPath(walkStart,{x:3,z:14}),[]);
 assert.deepEqual(findWalkPath(walkStart,{x:30,z:30}),[]);
});
test('eye level follows the street, sidewalk and lobby without vertical jumps',()=>{
 assert.equal(floorHeight(26),0);assert.equal(floorHeight(20),.12);assert.equal(floorHeight(14),.24);
 for(let z=16;z<27;z+=.01)assert(Math.abs(floorHeight(z+.01)-floorHeight(z))<.006);
});
