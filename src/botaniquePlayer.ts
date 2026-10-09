import {Vector3} from 'three';
import type {createBotaniqueNavigator} from './botaniqueNavigation';
type Navigator=ReturnType<typeof createBotaniqueNavigator>;
/** Continuous thumb-stick movement uses the same swept body clearance as floor clicks. */
export function stepBotaniquePlayer(nav:Navigator,eye:Vector3,yaw:number,input:{x:number;y:number},seconds:number,speed=1.1){
 if(![yaw,input.x,input.y,seconds,speed].every(Number.isFinite)||seconds<=0)return eye.clone();
 const magnitude=Math.hypot(input.x,input.y);if(magnitude<.08)return eye.clone();
 const amount=Math.min(.05,seconds)*Math.max(0,speed)/Math.max(1,magnitude),x=input.x*amount,y=input.y*amount;
 const dx=Math.cos(yaw)*x+Math.sin(yaw)*y,dz=-Math.sin(yaw)*x+Math.cos(yaw)*y;
 const start=nav.projectToFloor({x:eye.x,y:eye.y-nav.eyeHeight,z:eye.z},.25);if(!start)return eye.clone();
 // Slide along a wall only if that entire swept segment is clear.
 for(const [sx,sz] of [[dx,dz],[dx,0],[0,dz]]){
  const target=nav.projectToFloor({x:start.x+sx,y:start.y,z:start.z+sz},.18);
  if(target&&nav.canTraverse(start,target))return target.add(new Vector3(0,nav.eyeHeight,0));
 }
 return eye.clone();
}
