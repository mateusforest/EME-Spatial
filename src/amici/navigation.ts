/** Navigation footprint in web coordinates (metres), matched to the walkable hall. */
export type WalkZone='outside'|'hall';
export type Point={x:number;z:number};
export const walkStart={x:0,z:26.5};
export const hallDestination={x:0,z:12.5};
export const obstacles=[
 {minX:-4.3,maxX:-3.2,minZ:12.7,maxZ:15.7},
 {minX:-4.3,maxX:-3.2,minZ:9.2,maxZ:12.0},
 {minX:1.45,maxX:4.2,minZ:13.0,maxZ:15.95},
 {minX:1.45,maxX:4.2,minZ:8.7,maxZ:11.65},
 {minX:3.15,maxX:4.6,minZ:6.7,maxZ:9.2},
 {minX:-4.4,maxX:-3.5,minZ:6.8,maxZ:7.9},
 {minX:3.6,maxX:4.4,minZ:15.9,maxZ:16.7},
] as const;
export function zoneAt(z:number):WalkZone{return z<17.15?'hall':'outside';}
export function floorHeight(z:number){
 if(z>22.4)return 0;
 if(z>22.1)return (22.4-z)/.3*.12;
 if(z>18.3)return .12;
 if(z>17.9)return .12+(18.3-z)/.4*.12;
 return .24;
}
export function canStand(x:number,z:number,doorOpen=true){
 const radius=.22;
 const street=x>=-12.4&&x<=12.4&&z>=19.5&&z<=32;
 const approach=Math.abs(x)<=.95&&z>=16.9&&z<=19.7;
 const hall=x>=-4.35&&x<=4.35&&z>=6.85&&z<=17.15;
 if(!(street||approach||hall))return false;
 if(!doorOpen&&z>17.35&&z<17.96)return false;
 return !obstacles.some(o=>x>o.minX-radius&&x<o.maxX+radius&&z>o.minZ-radius&&z<o.maxZ+radius);
}
/** Swept small steps prevent tunnelling through walls after a slow frame. */
export function walkStep(x:number,z:number,dx:number,dz:number,doorOpen=true):Point{
 const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.065));
 for(let i=0;i<count;i++){
  if(canStand(x+dx/count,z,doorOpen))x+=dx/count;
  if(canStand(x,z+dz/count,doorOpen))z+=dz/count;
 }
 return{x,z};
}
/** Grid path on the same collision footprint, used for ground clicks and hall entry. */
export function findWalkPath(from:Point,to:Point):Point[]{
 if(!canStand(from.x,from.z)||!canStand(to.x,to.z))return [];
 const step=.25,key=(x:number,z:number)=>`${x},${z}`;
 const start=[Math.round(from.x/step),Math.round(from.z/step)],goal=[Math.round(to.x/step),Math.round(to.z/step)];
 const startKey=key(start[0],start[1]),goalKey=key(goal[0],goal[1]);
 const queue=[start],parents=new Map<string,string|null>([[startKey,null]]);
 let found=false;
 for(let head=0;head<queue.length&&head<18000;head++){
  const [x,z]=queue[head];if(key(x,z)===goalKey){found=true;break;}
  for(const [dx,dz] of [[0,-1],[1,0],[-1,0],[0,1]]){
   const nx=x+dx,nz=z+dz,k=key(nx,nz);
   if(parents.has(k)||!canStand(nx*step,nz*step))continue;
   parents.set(k,key(x,z));queue.push([nx,nz]);
  }
 }
 if(!found)return [];
 const route:Point[]=[];let k:string|null=goalKey;
 while(k&&k!==startKey){const [x,z]=k.split(',').map(Number);route.push({x:x*step,z:z*step});k=parents.get(k)??null;}
 route.reverse();route.push(to);return route;
}
