import type {MUnit} from './mUnits';

/** One side envelope for both the tower and the visited apartment. No area added. */
export function mSideBays(unit:MUnit){
 const rear=4.5-unit.depth;
 return [{min:rear+2.4,max:-3.2,bottom:1.16,top:2.88},{min:.1,max:4.5,bottom:.42,top:3.42}];
}
export function mSideEnclosure(unit:MUnit,put:(x:number,y:number,z:number,w:number,h:number,d:number,glass:boolean)=>void){
 const rear=4.5-unit.depth;
 for(const side of [-1,1]){
  const x=side*(unit.width/2-.12);let edge=rear;
  for(const bay of mSideBays(unit)){
   if(bay.min>edge)put(x,1.96,(edge+bay.min)/2,.24,3.08,bay.min-edge,false);
   if(bay.bottom>.42)put(x,(.42+bay.bottom)/2,(bay.min+bay.max)/2,.24,bay.bottom-.42,bay.max-bay.min,false);
   if(bay.top<3.5)put(x,(bay.top+3.5)/2,(bay.min+bay.max)/2,.24,3.5-bay.top,bay.max-bay.min,false);
   put(side*(unit.width/2-.035),(bay.bottom+bay.top)/2,(bay.min+bay.max)/2,.035,bay.top-bay.bottom,bay.max-bay.min,true);edge=bay.max;
  }
 }
}
