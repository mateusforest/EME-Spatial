export type Obstacle={min:number[];max:number[]};
export type WalkZone='apartment'|'hall'|'garden'|'terrace';
export const walkLocations={
 apartment:{label:'Apartamento tipo',floor:3.85,position:[-2.2,5.5,5.4],target:[-1.3,5.5,-1],bounds:[-5.35,-9.25,5.35,7.45]},
 hall:{label:'Hall de entrada',floor:.33,position:[1.5,1.98,7.8],target:[-2,1.98,7.2],bounds:[-4.2,6.45,4.2,8.65]},
 garden:{label:'Garden e bosque',floor:.24,position:[1.2,1.89,-23],target:[0,1.89,-36],bounds:[-6.7,-45.3,6.7,-22]},
 terrace:{label:'Terraço duplex',floor:23.15,position:[4.8,24.8,5],target:[2.2,24.8,0],bounds:[4.14,-8.7,5.4,7.7]},
} as const;
export function canStand(x:number,z:number,zone:WalkZone,obstacles:Obstacle[],radius=.2){
 const loc=walkLocations[zone],b=loc.bounds;
 if(x<b[0]+radius||z<b[1]+radius||x>b[2]-radius||z>b[3]-radius)return false;
 return !obstacles.some(o=>o.max[1]>loc.floor+.08&&o.min[1]<loc.floor+1.7&&x>o.min[0]-radius&&x<o.max[0]+radius&&z>o.min[2]-radius&&z<o.max[2]+radius);
}
/** Small swept steps prevent crossing thin partitions when a frame is delayed. */
export function walkStep(x:number,z:number,dx:number,dz:number,zone:WalkZone,obstacles:Obstacle[]){
 const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.07));
 for(let i=0;i<count;i++){if(canStand(x+dx/count,z,zone,obstacles))x+=dx/count;if(canStand(x,z+dz/count,zone,obstacles))z+=dz/count;}
 return {x,z};
}
