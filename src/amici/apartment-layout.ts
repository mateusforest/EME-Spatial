/** Final 03: traced from the published typical-floor image. Dimensions inferred,
 * furnishings interpreted; the published 58.56 m² is not a measured mesh area. */
export type Rect={x:number;z:number;w:number;d:number};
export type ApartmentRoom='living'|'kitchen'|'suite'|'bedroom'|'bath'|'ensuite';
export const width=10,depth=6.15,height=2.72;
export const start={x:6.25,z:5.45};
export const rooms:{id:ApartmentRoom;name:string;x:number;z:number;lookX:number;lookZ:number}[]=[
 {id:'living',name:'Sala',x:6.7,z:3.85,lookX:6.5,lookZ:1.6},
 {id:'kitchen',name:'Cozinha',x:8.9,z:3.9,lookX:9.6,lookZ:2.2},
 {id:'suite',name:'Suíte',x:2.15,z:3.55,lookX:1.2,lookZ:1.6},
 {id:'bedroom',name:'Dormitório',x:4.25,z:2.85,lookX:4.25,lookZ:.7},
 {id:'bath',name:'Banheiro social',x:5.08,z:5.05,lookX:3.5,lookZ:5.7},
 {id:'ensuite',name:'Banheiro da suíte',x:2.15,z:5.05,lookX:.7,lookZ:5.7},
];
// Full-height partitions, excluding real door openings. Used for geometry and collision.
export const walls:Rect[]=[
 {x:0,z:3.075,w:.14,d:6.15},{x:10,z:3.075,w:.14,d:6.15},
 {x:5,z:6.15,w:10,d:.14},
 {x:2.75,z:1.82,w:.12,d:3.64},
 {x:5.6,z:1.82,w:.12,d:3.64},
 {x:3.58,z:3.64,w:1.66,d:.12},
 {x:5.48,z:3.64,w:.24,d:.12},
 {x:.91,z:4.65,w:1.82,d:.12},
 {x:2.75,z:5.4,w:.12,d:1.5},
 {x:4.175,z:4.65,w:2.85,d:.12},
 {x:5.6,z:5.85,w:.12,d:.6},
];
export const furniture:Rect[]=[
 {x:1.15,z:1.4,w:2.10,d:1.62}, // double bed, headboard on the west wall
 {x:.28,z:3.25,w:.5,d:1.85},{x:1.15,z:4.31,w:1.8,d:.5},
 {x:3.38,z:1.2,w:.96,d:2.05},{x:5.02,z:1.2,w:.96,d:2.05},
 {x:3.14,z:3.04,w:.65,d:.9},
 {x:1.15,z:3.15,w:.50,d:.50},{x:4.2,z:.45,w:.43,d:.38},
 {x:5.99,z:1.69,w:.78,d:2.75}, // sofa
 {x:6.24,z:3.33,w:.66,d:.54}, // nesting tables
 {x:8.15,z:1.65,w:.56,d:3.15}, // peninsula/TV divider
 {x:9.66,z:3.1,w:.68,d:5.95}, // kitchen
 {x:7.7,z:5.12,w:.92,d:1.55}, // dining table
 {x:6.97,z:4.73,w:.44,d:.46},{x:6.97,z:5.5,w:.44,d:.46},
 {x:8.43,z:4.73,w:.44,d:.46},{x:8.43,z:5.5,w:.44,d:.46},
 {x:7.55,z:2.75,w:.42,d:.42},{x:7.55,z:3.35,w:.42,d:.42},
 // Bathroom fixtures. Shower openings remain reachable.
 {x:1.37,z:5.78,w:.46,d:.62},{x:2.19,z:5.88,w:.72,d:.43},
 {x:4.12,z:5.78,w:.46,d:.62},{x:4.92,z:5.88,w:.72,d:.43},
 {x:1.04,z:5.72,w:.04,d:.72},{x:3.79,z:5.72,w:.04,d:.72},
];
export const obstacles=[...walls,...furniture];
export function canStand(x:number,z:number){
 const r=.17;
 return x>r+.07&&x<width-r-.07&&z>r+.07&&z<depth-r-.07
  &&!obstacles.some(o=>Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r);
}
export function move(x:number,z:number,dx:number,dz:number){
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.045));
 for(let i=0;i<steps;i++){if(canStand(x+dx/steps,z))x+=dx/steps;if(canStand(x,z+dz/steps))z+=dz/steps;}
 return{x,z};
}
export function pathTo(from:{x:number;z:number},to:{x:number;z:number}){
 if(!canStand(from.x,from.z)||!canStand(to.x,to.z))return [];
 const step=.10,key=(x:number,z:number)=>`${x},${z}`;
 const start=[Math.round(from.x/step),Math.round(from.z/step)],goal=[Math.round(to.x/step),Math.round(to.z/step)];
 const first=key(...start as [number,number]),last=key(...goal as [number,number]);
 const q=[start],parent=new Map<string,string|null>([[first,null]]);
 for(let head=0;head<q.length;head++){
  const [x,z]=q[head];if(key(x,z)===last)break;
  for(const [dx,dz] of [[0,-1],[1,0],[0,1],[-1,0]]){
   const nx=x+dx,nz=z+dz,k=key(nx,nz);
   if(parent.has(k)||!canStand(nx*step,nz*step))continue;
   parent.set(k,key(x,z));q.push([nx,nz]);
  }
 }
 if(!parent.has(last))return [];
 const route:{x:number;z:number}[]=[];let k:string|null=last;
 while(k&&k!==first){const [x,z]=k.split(',').map(Number);route.push({x:x*step,z:z*step});k=parent.get(k)??null;}
 route.reverse();route.push(to);return route;
}
export function roomAt(x:number,z:number):ApartmentRoom{
 if(x<2.75)return z>4.65?'ensuite':'suite';
 if(x<5.6&&z>4.65)return'bath';
 if(x<5.6&&z<3.64)return'bedroom';
 return x>8.45?'kitchen':'living';
}
