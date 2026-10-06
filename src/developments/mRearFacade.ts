import type { MUnit } from './mUnits';

/** Rear bathrooms have a high light strip and a private shower window.
 * The same openings are used outside and in the visited home; no floor area is added.
 */
export function mRearBays(unit:MUnit){
 const half=unit.width/2,wing=half-1.85;
 return [-1,1].flatMap(side=>{
  const count=side<0?(unit.suites>2?2:1):(unit.suites>3?2:1);
  return Array.from({length:count},(_,i)=>{
   const roomMin=side<0?-half+.17+i*wing/count:1.85+i*wing/count;
   const roomMax=roomMin+wing/count-.08;
   const min=roomMin+.16,max=roomMax-.16;
   return {min,max,windowMin:max-Math.min(1.4,(max-min)*.4)};
  });
 });
}

type Box=(x:number,y:number,z:number,w:number,h:number,d:number,glass:boolean)=>void;
export function mRearEnclosure(unit:MUnit,put:Box){
 const rear=4.5-unit.depth,half=unit.width/2;
 put(0,.65,rear,unit.width,.66,.26,false);
 put(0,3.325,rear,unit.width,.35,.26,false);
 let edge=-half;
 for(const {min,max,windowMin} of mRearBays(unit)){
  put((edge+min)/2,2.065,rear,min-edge,2.17,.26,false);
  put((min+windowMin)/2,1.715,rear,windowMin-min,1.47,.26,false);
  put((windowMin+max)/2,1.715,rear+.08,max-windowMin,1.47,.035,true);
  put((min+max)/2,2.8,rear+.08,max-min,.70,.035,true);
  edge=max;
 }
 put((edge+half)/2,2.065,rear,half-edge,2.17,.26,false);
}
