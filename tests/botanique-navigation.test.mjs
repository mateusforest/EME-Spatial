import assert from 'node:assert/strict';
import test from 'node:test';
import {Vector3} from 'three';
import {createBotaniqueNavigator} from '../src/botaniqueNavigation.ts';

const rect=(minX,maxX,minZ,maxZ)=>({minX,maxX,minZ,maxZ});
const area=(r,y=0)=>({rect:r,y});
const camera=(x,z,y=0)=>new Vector3(x,y+1.6,z);
const point=(x,z,y=0)=>new Vector3(x,y,z);
const room=rect(0,10,0,10);
const make=(obstacles=[],areas=[area(room)],options={},exclusions=[])=>createBotaniqueNavigator({areas,obstacles,exclusions},{radius:.28,gridSize:.16,maxSearchMs:2000,...options});
function checkRoute(nav,start,goal,result){
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.ok(result.floorPoints.length>0);
 assert.ok(result.points.every(p=>p instanceof Vector3));
 assert.ok(result.floorPoints.at(-1).distanceTo(goal)<1e-6);
 let previous=new Vector3(start.x,start.y-nav.eyeHeight,start.z);
 for(let i=0;i<result.floorPoints.length;i++){
  const next=result.floorPoints[i];
  assert.ok(nav.canTraverse(previous,next),'every emitted segment must be collision safe');
  assert.ok(Math.abs(result.points[i].y-next.y-nav.eyeHeight)<1e-6);
  previous=next;
 }
}
function independentlyCheckClearance(start,result,obstacles,radius){
 let from=start;
 for(const to of result.points){
  for(let i=0;i<=400;i++){
   const x=from.x+(to.x-from.x)*i/400,z=from.z+(to.z-from.z)*i/400;
   for(const o of obstacles){const dx=Math.max(o.minX-x,0,x-o.maxX),dz=Math.max(o.minZ-z,0,z-o.maxZ);assert.ok(Math.hypot(dx,dz)>=radius-.0001,'animation polyline intersects the inflated collider');}
  }
  from=to;
 }
}

test('direct click returns eye-height Vector3 endpoint without changing its horizontal position',()=>{
 const nav=make(),start=camera(1,1),goal=point(8,8),route=nav.planRoute(start,goal);
 checkRoute(nav,start,goal,route);assert.equal(route.points.length,1);assert.equal(route.expandedNodes,0);
 assert.deepEqual(nav.planRoute(camera(-1,1),goal).reason,'invalid-start');
 assert.deepEqual(nav.planRoute(start,point(11,1)).reason,'invalid-target');
 assert.equal(nav.planRoute(start,point(8,8,4)).reason,'invalid-target','upper-story click must not snap to another floor');
});

test('routes around a bed and rejects a click or camera inside furniture',()=>{
 const bed=rect(4,6,3,7),nav=make([bed]),start=camera(1,5),goal=point(9,5),route=nav.planRoute(start,goal);
 checkRoute(nav,start,goal,route);assert.ok(route.points.length>1);assert.ok(route.distance>8);
 independentlyCheckClearance(start,route,[bed],.28);
 assert.equal(nav.planRoute(start,point(5,5)).reason,'invalid-target');
 assert.equal(nav.planRoute(camera(5,5),goal).reason,'invalid-start');
 for(const p of route.floorPoints)assert.ok(!(p.x>4&&p.x<6&&p.z>3&&p.z<7));
});

test('doorway clearance accepts an open .8 m door and refuses a narrower .5 m gap',()=>{
 const door=width=>[rect(4.9,5.1,0,5-width/2),rect(4.9,5.1,5+width/2,10)];
 const nav=make(door(.8)),start=camera(2,3),goal=point(8,7);
 const route=nav.planRoute(start,goal);checkRoute(nav,start,goal,route);independentlyCheckClearance(start,route,door(.8),.28);
 assert.equal(make(door(.5)).planRoute(start,goal).reason,'unreachable');
 const narrow=make(door(.5),undefined,{radius:.22,gridSize:.08});checkRoute(narrow,start,goal,narrow.planRoute(start,goal));
});

test('closed wall disconnects rooms; no direct fallback is returned',()=>{
 const nav=make([rect(4.98,5.02,0,10)]),route=nav.planRoute(camera(2,5),point(8,5));
 assert.equal(route.ok,false);assert.equal(route.reason,'unreachable');assert.deepEqual(route.points,[]);
});

test('swept footprint does not tunnel through thin walls or clip a diagonal corner',()=>{
 const nav=make([rect(4,6,4,6)]);
 assert.equal(nav.canTraverse(point(2,4),point(4,2)),true);
 assert.equal(nav.canTraverse(point(3.75,4.3),point(4.3,3.75)),false,'disc clips the obstacle corner even if the centerline avoids its box');
 assert.equal(make([rect(4.998,5.002,0,10)]).canTraverse(point(1,5),point(9,5)),false);
 assert.equal(nav.canStand(point(3.75,3.75)),true,'round footprint preserves diagonal clearance beyond the corner');
});

test('pool exclusion has full radius clearance, including a narrow crossing',()=>{
 const pool={polygon:[{x:3,z:3},{x:7,z:3},{x:7,z:7},{x:3,z:7}]},nav=make([],undefined,{radius:.35,gridSize:.3},[pool]),start=camera(1,5),goal=point(9,5);
 checkRoute(nav,start,goal,nav.planRoute(start,goal));
 assert.equal(nav.canStand(point(2.8,5)),false);
 assert.equal(nav.planRoute(start,point(5,5)).reason,'invalid-target');
 assert.equal(nav.canTraverse(point(1,5),goal),false);
});

test('L-shaped floor union joins rooms without artificial seams or walking into its missing corner',()=>{
 const nav=make([],[area(rect(0,6,0,3)),area(rect(0,3,0,7))]),start=camera(5,1.5),goal=point(1.5,6);
 checkRoute(nav,start,goal,nav.planRoute(start,goal));
 assert.equal(nav.canStand(point(2.7,2.7)),true,'overlap is usable floor');
 assert.equal(nav.canStand(point(2.9,2.9)),false,'visitor radius cannot overhang the missing concave corner');
 assert.equal(nav.canStand(point(4,4)),false);assert.equal(nav.canTraverse(point(5,1.5),goal),false);
 const seam=make([],[area(rect(0,5,0,10)),area(rect(5,10,0,10))]);assert.equal(seam.canTraverse(point(1,5),point(9,5)),true);
});

test('tiny uncovered floor gaps remain impassable instead of falling between samples',()=>{
 const nav=make([],[area(rect(0,4.991,0,10)),area(rect(4.999,10,0,10))]);
 assert.equal(nav.canTraverse(point(2,5),point(8,5)),false);assert.equal(nav.planRoute(camera(2,5),point(8,5)).reason,'unreachable');
});

test('vertical clearance ignores floor slab and high ceiling but blocks low hanging furniture',()=>{
 const overhead={...rect(3,7,3,7),minY:2.3,maxY:2.6},slab={...room,minY:-.2,maxY:0};
 assert.equal(make([overhead,slab]).canTraverse(point(1,5),point(9,5)),true);
 assert.equal(make([{...overhead,minY:1.3}]).canStand(point(5,5)),false);
 assert.equal(make([{...overhead,minY:1.3}]).planRoute(camera(1,5),point(9,5)).ok,true);
});

test('elevation is maintained; large steps and disconnected stories cannot teleport',()=>{
 const nav=make([],[area(rect(0,5,0,10),0),area(rect(5,10,0,10),2)]);
 assert.equal(nav.planRoute(camera(2,5),point(8,5,2)).reason,'unreachable');
 const elevated=make([],[area(room,.32)],{radius:.35,gridSize:.3}),start=camera(1,1,.32),goal=point(8,8,.32);
 const route=elevated.planRoute(start,goal);checkRoute(elevated,start,goal,route);assert.ok(Math.abs(route.points[0].y-1.92)<1e-8);
 const stacked=make([],[area(room,0),area(room,3)]);assert.equal(stacked.planRoute(camera(1,1),point(8,8,3)).reason,'unreachable');
});

test('small step and a supported slope preserve height samples',()=>{
 const step=make([],[area(rect(0,5,0,10),0),area(rect(5,10,0,10),.12)]),start=camera(1,5),goal=point(9,5,.12);
 checkRoute(step,start,goal,step.planRoute(start,goal));
 const ramp=make([],[{rect:room,y:0,slope:{x:.1,z:0}}]),a=camera(1,5,.1),b=point(9,5,.9),route=ramp.planRoute(a,b);
 checkRoute(ramp,a,b,route);assert.ok(route.points.length>2);
 assert.equal(make([],[{rect:room,y:0,slope:{x:2,z:0}}]).planRoute(camera(1,1),point(8,8)).reason,'invalid-data');
});

test('bounded search returns an explicit limit and malformed data fails closed',()=>{
 const nav=make([rect(4,6,3,7)],undefined,{maxExpandedNodes:1});assert.equal(nav.planRoute(camera(1,5),point(9,5)).reason,'search-limit');
 const timed=make([rect(4,6,3,7)],undefined,{maxSearchMs:.000001});const limited=timed.planRoute(camera(1,5),point(9,5));assert.equal(limited.reason,'search-limit');assert.deepEqual(limited.points,[]);
 assert.equal(createBotaniqueNavigator({areas:[],obstacles:[]}).planRoute(camera(1,1),point(2,2)).reason,'invalid-data');
 assert.equal(make([rect(NaN,6,3,7)]).planRoute(camera(1,5),point(9,5)).reason,'invalid-data');
});
