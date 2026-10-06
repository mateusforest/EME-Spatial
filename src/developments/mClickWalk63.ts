import {canStand,type Obstacle,type WalkPoint} from './mWalking.ts';
export type WalkSpace63={obstacles:Obstacle[];bounds:Obstacle;areas?:Obstacle[];exclusions?:WalkPoint[][]};
export function walkingPath63(start:WalkPoint,end:WalkPoint,space:WalkSpace63):WalkPoint[]{
 const valid=(p:WalkPoint)=>canStand(p,space.obstacles,space.bounds,space.areas,space.exclusions);
 const clear=(a:WalkPoint,b:WalkPoint)=>{const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.07);for(let i=0;i<=n;i++){const t=n?i/n:0;if(!valid({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t}))return false;}return true;};
 if(!valid(start)||!valid(end)||Math.hypot(end.x-start.x,end.z-start.z)>40)return [];
 if(clear(start,end))return [end];
 const step=.25,b=space.bounds,minX=Math.max(b.minX,Math.min(start.x,end.x)-7),minZ=Math.max(b.minZ,Math.min(start.z,end.z)-7),maxX=Math.min(b.maxX,Math.max(start.x,end.x)+7),maxZ=Math.min(b.maxZ,Math.max(start.z,end.z)+7);
 const nx=Math.ceil((maxX-minX)/step)+1,nz=Math.ceil((maxZ-minZ)/step)+1;
 const point=(id:number)=>({x:minX+(id%nx)*step,z:minZ+Math.floor(id/nx)*step});
 const idFor=(p:WalkPoint)=>Math.round((p.z-minZ)/step)*nx+Math.round((p.x-minX)/step);
 const seed=idFor(start),goal=idFor(end),open=new Set([seed]),cost=new Map([[seed,0]]),parent=new Map<number,number>(),closed=new Set<number>();
 if(!clear(start,point(seed)))return [];
 let reached=-1;
 for(let count=0;open.size&&count<24000;count++){
  let current=-1,best=Infinity;
  for(const id of open){const p=point(id),score=cost.get(id)!+Math.hypot(end.x-p.x,end.z-p.z);if(score<best){best=score;current=id;}}
  const p=point(current);open.delete(current);closed.add(current);
  if((current===goal||Math.hypot(p.x-end.x,p.z-end.z)<.4)&&clear(p,end)){reached=current;break;}
  const x=current%nx,z=Math.floor(current/nx);
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
   if((!dx&&!dz)||x+dx<0||x+dx>=nx||z+dz<0||z+dz>=nz)continue;
   const next=(z+dz)*nx+x+dx;if(closed.has(next)||!clear(p,point(next)))continue;
   const nextCost=cost.get(current)!+Math.hypot(dx,dz)*step;
   if(nextCost<(cost.get(next)??Infinity)){cost.set(next,nextCost);parent.set(next,current);open.add(next);}
  }
 }
 if(reached<0)return [];
 const raw:WalkPoint[]=[end];for(let id=reached;id!==seed;id=parent.get(id)!){raw.push(point(id));}raw.push(point(seed));raw.reverse();
 const path:WalkPoint[]=[];let previous=start,index=0;
 while(index<raw.length){let next=index;for(let j=index+1;j<raw.length&&clear(previous,raw[j]);j++)next=j;path.push(raw[next]);previous=raw[next];index=next+1;}
 return path;
}
