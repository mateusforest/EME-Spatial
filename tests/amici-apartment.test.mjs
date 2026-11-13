import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rooms,start,canStand,pathTo,move,roomAt} from '../src/amici/apartment-layout.ts';
test('the one apartment has reachable destinations in every room',()=>{
 assert(canStand(start.x,start.z));
 for(const r of rooms){assert(canStand(r.x,r.z),r.name+' destination');const path=pathTo(start,r);assert(path.length,r.name+' reachable');assert(path.every(p=>canStand(p.x,p.z)));assert.equal(roomAt(r.x,r.z),r.id);}
});
test('every room connects back to the entrance without crossing partitions',()=>{for(const a of rooms)for(const b of rooms){if(a===b)continue;assert(pathTo(a,b).length,a.name+' to '+b.name);}});
test('swept movement cannot cross outer walls, beds or the kitchen counter',()=>{
 assert(!canStand(1.15,1.4));assert(!canStand(8.15,1.6));assert(!canStand(10,4));
 const a=move(6.8,3.8,-12,0);assert(a.x>.17);
 const b=move(8.95,3.8,12,0);assert(b.x<9.2);
 const c=move(start.x,start.z,0,20);assert(c.z<6);
});
