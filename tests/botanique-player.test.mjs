import assert from 'node:assert/strict';
import test from 'node:test';
import {Vector3} from 'three';
import {createBotaniqueNavigator} from '../src/botaniqueNavigation.ts';
import {stepBotaniquePlayer} from '../src/botaniquePlayer.ts';
const nav=createBotaniqueNavigator({areas:[{rect:{minX:0,maxX:8,minZ:0,maxZ:8},y:0}],obstacles:[{id:'wall',minX:4,maxX:4.12,minZ:0,maxZ:5,minY:0,maxY:3}]},{radius:.22,eyeHeight:1.6});
test('thumb stick follows camera yaw, preserves eye height and normalizes diagonal speed',()=>{
 const eye=new Vector3(2,1.6,2),forward=stepBotaniquePlayer(nav,eye,0,{x:0,y:-1},.05),turned=stepBotaniquePlayer(nav,eye,Math.PI/2,{x:0,y:-1},.05);
 assert.ok(forward.z<eye.z);assert.ok(turned.x<eye.x);assert.equal(turned.y,1.6);
 const diagonal=stepBotaniquePlayer(nav,eye,0,{x:1,y:-1},.05);
 assert.ok(Math.abs(diagonal.distanceTo(eye)-forward.distanceTo(eye))<1e-9);
 assert.deepEqual(eye.toArray(),[2,1.6,2]);
});
test('holding movement cannot cross a wall or floor boundary; diagonal motion slides safely',()=>{
 let eye=new Vector3(3,1.6,2);
 for(let i=0;i<200;i++)eye=stepBotaniquePlayer(nav,eye,0,{x:1,y:0},.05);
 assert.ok(eye.x<3.781&&eye.x>3.7);
 const start=eye.clone();for(let i=0;i<15;i++)eye=stepBotaniquePlayer(nav,eye,0,{x:1,y:1},.05);
 assert.ok(eye.z>start.z+.3);assert.ok(eye.x<3.781);
 for(let i=0;i<300;i++)eye=stepBotaniquePlayer(nav,eye,0,{x:0,y:-1},.05);
 assert.ok(eye.z>=.22);assert.ok(nav.canStand({x:eye.x,y:0,z:eye.z}));
});
test('release, invalid input and resume time do not teleport the player',()=>{
 const eye=new Vector3(2,1.6,2);
 for(const input of [{x:0,y:0},{x:NaN,y:1}])assert.deepEqual(stepBotaniquePlayer(nav,eye,0,input,1).toArray(),eye.toArray());
 assert.ok(stepBotaniquePlayer(nav,eye,0,{x:0,y:-1},100).distanceTo(eye)<=.056);
});
