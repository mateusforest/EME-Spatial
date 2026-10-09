import {Vector3} from 'three';

export type BotaniqueNavXZ={x:number;z:number};
export type BotaniqueNavPoint=BotaniqueNavXZ&{y:number};
export type BotaniqueNavRect={minX:number;maxX:number;minZ:number;maxZ:number};
/** Floor height is y + slope.x * (x-origin.x) + slope.z * (z-origin.z). */
export type BotaniqueNavArea={id?:string;y:number;rect?:BotaniqueNavRect;polygon?:BotaniqueNavXZ[];slope?:{x:number;z:number;origin?:BotaniqueNavXZ}};
export type BotaniqueNavObstacle=BotaniqueNavRect&{id?:string;minY?:number;maxY?:number};
export type BotaniqueNavExclusion={id?:string;polygon:BotaniqueNavXZ[];minY?:number;maxY?:number};
export type BotaniqueNavigationData={areas:BotaniqueNavArea[];obstacles:BotaniqueNavObstacle[];exclusions?:BotaniqueNavExclusion[];bounds?:BotaniqueNavRect};
export type BotaniqueNavigationOptions={radius?:number;eyeHeight?:number;bodyHeight?:number;gridSize?:number;maxStep?:number;maxSlopeDegrees?:number;maxExpandedNodes?:number;maxSearchMs?:number;maxStartFloorDistance?:number;maxClickFloorDistance?:number};
export type BotaniqueRouteFailure='invalid-data'|'invalid-start'|'invalid-target'|'unreachable'|'search-limit';
export type BotaniqueRoute={ok:true;points:Vector3[];floorPoints:Vector3[];distance:number;expandedNodes:number}|{ok:false;reason:BotaniqueRouteFailure;points:[];floorPoints:[];expandedNodes:number};
export type BotaniqueNavigator={planRoute:(cameraPosition:BotaniqueNavPoint,targetFloor:BotaniqueNavPoint)=>BotaniqueRoute;canStand:(floor:BotaniqueNavPoint)=>boolean;canTraverse:(fromFloor:BotaniqueNavPoint,toFloor:BotaniqueNavPoint)=>boolean;projectToFloor:(point:BotaniqueNavPoint,maxHeightDelta?:number)=>Vector3|null;eyeHeight:number;radius:number};

const EPS=1e-7;
const finite=(...values:number[])=>values.every(Number.isFinite);
const distance2=(a:BotaniqueNavXZ,b:BotaniqueNavXZ)=>(a.x-b.x)**2+(a.z-b.z)**2;
const cross=(a:BotaniqueNavXZ,b:BotaniqueNavXZ)=>a.x*b.z-a.z*b.x;
const sub=(a:BotaniqueNavXZ,b:BotaniqueNavXZ)=>({x:a.x-b.x,z:a.z-b.z});
const lerp=(a:BotaniqueNavXZ,b:BotaniqueNavXZ,t:number)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
type Edge={a:BotaniqueNavXZ;b:BotaniqueNavXZ};
type Floor={source:BotaniqueNavArea;polygon:BotaniqueNavXZ[];bounds:BotaniqueNavRect};
type Boundary=Edge&{left:Floor[];right:Floor[]};

function closest(point:BotaniqueNavXZ,a:BotaniqueNavXZ,b:BotaniqueNavXZ){const length=distance2(a,b);return lerp(a,b,length?clamp(((point.x-a.x)*(b.x-a.x)+(point.z-a.z)*(b.z-a.z))/length):0);}
function inside(point:BotaniqueNavXZ,polygon:BotaniqueNavXZ[]){
 let found=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[j],b=polygon[i];if(distance2(point,closest(point,a,b))<EPS*EPS)return true;
  if((a.z>point.z)!==(b.z>point.z)&&point.x<(b.x-a.x)*(point.z-a.z)/(b.z-a.z)+a.x)found=!found;
 }
 return found;
}
function rectPoints(r:BotaniqueNavRect){return [{x:r.minX,z:r.minZ},{x:r.maxX,z:r.minZ},{x:r.maxX,z:r.maxZ},{x:r.minX,z:r.maxZ}];}
function boundsOf(points:BotaniqueNavXZ[]):BotaniqueNavRect{return {minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minZ:Math.min(...points.map(p=>p.z)),maxZ:Math.max(...points.map(p=>p.z))};}
function edges(polygon:BotaniqueNavXZ[]):Edge[]{return polygon.map((a,i)=>({a,b:polygon[(i+1)%polygon.length]}));}
function intersectsRect(p:BotaniqueNavXZ,r:BotaniqueNavRect,pad=0){return p.x>=r.minX-pad-EPS&&p.x<=r.maxX+pad+EPS&&p.z>=r.minZ-pad-EPS&&p.z<=r.maxZ+pad+EPS;}
function cuts(a:BotaniqueNavXZ,b:BotaniqueNavXZ,c:BotaniqueNavXZ,d:BotaniqueNavXZ):number[]{
 const r=sub(b,a),s=sub(d,c),det=cross(r,s),ca=sub(c,a);
 if(Math.abs(det)>EPS){const t=cross(ca,s)/det,u=cross(ca,r)/det;return t>=-EPS&&t<=1+EPS&&u>=-EPS&&u<=1+EPS?[clamp(t)]:[];}
 if(Math.abs(cross(ca,r))>EPS)return [];
 const length=distance2(a,b);if(length<EPS)return [];
 return [c,d].map(p=>((p.x-a.x)*r.x+(p.z-a.z)*r.z)/length).filter(t=>t>=-EPS&&t<=1+EPS).map(clamp);
}
/** Closest point on the second segment, also used at a floor boundary. */
function segmentDistance(a:BotaniqueNavXZ,b:BotaniqueNavXZ,c:BotaniqueNavXZ,d:BotaniqueNavXZ){
 const intersections=cuts(a,b,c,d);if(intersections.length){const point=lerp(a,b,intersections[0]);return {distance:0,point};}
 const ca=closest(a,c,d),cb=closest(b,c,d),ac=closest(c,a,b),ad=closest(d,a,b);
 return [{distance:distance2(a,ca),point:ca},{distance:distance2(b,cb),point:cb},{distance:distance2(c,ac),point:c},{distance:distance2(d,ad),point:d}].reduce((best,item)=>item.distance<best.distance?item:best);
}
function verticalInterval(a:BotaniqueNavPoint,b:BotaniqueNavPoint,minY:number,maxY:number,body:number):[number,number]|null{
 const lo=minY-body+.015,hi=maxY-.015,dy=b.y-a.y;
 if(hi<=lo)return null;
 if(Math.abs(dy)<EPS)return a.y>lo&&a.y<hi?[0,1]:null;
 const t0=(lo-a.y)/dy,t1=(hi-a.y)/dy,begin=Math.max(0,Math.min(t0,t1)),end=Math.min(1,Math.max(t0,t1));return begin<=end?[begin,end]:null;
}
class MinHeap {
 items:{key:string;score:number;cost:number}[]=[];
 push(item:{key:string;score:number;cost:number}){const a=this.items;a.push(item);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].score<=item.score)break;a[i]=a[p];i=p;}a[i]=item;}
 pop(){const a=this.items,head=a[0],last=a.pop();if(a.length&&last){let i=0;while(i*2+1<a.length){let child=i*2+1;if(child+1<a.length&&a[child+1].score<a[child].score)child++;if(a[child].score>=last.score)break;a[i]=a[child];i=child;}a[i]=last;}return head;}
}

/**
 * Pure navigation in Three coordinates (Y up). No meshes, DOM or scene mutations.
 * Clicks must be raycast onto a real floor first. Failed routes never move/snap.
 * Successful points exclude the starting position and are already at eye height.
 */
export function createBotaniqueNavigator(data:BotaniqueNavigationData,options:BotaniqueNavigationOptions={}):BotaniqueNavigator{
 const radius=options.radius??.28,eyeHeight=options.eyeHeight??1.6,body=options.bodyHeight??1.75,grid=options.gridSize??.16,maxStep=options.maxStep??.18,maxSlope=Math.tan((options.maxSlopeDegrees??20)*Math.PI/180),maxNodes=options.maxExpandedNodes??30000,maxSearchMs=options.maxSearchMs??200;
 const failure=(reason:BotaniqueRouteFailure,expandedNodes=0):BotaniqueRoute=>({ok:false,reason,points:[],floorPoints:[],expandedNodes});
 let valid=finite(radius,eyeHeight,body,grid,maxStep,maxSlope,maxNodes,maxSearchMs)&&radius>0&&grid>0&&eyeHeight>0&&body>=eyeHeight&&maxStep>=0&&maxSlope>=0&&maxNodes>0&&maxSearchMs>0;
 const floors:Floor[]=[];
 for(const area of data.areas||[]){
  const polygon=area.rect?rectPoints(area.rect):area.polygon?.map(p=>({...p}));
  if(!polygon||polygon.length<3||!finite(area.y,...polygon.flatMap(p=>[p.x,p.z]))||area.slope&&(!finite(area.slope.x,area.slope.z,area.slope.origin?.x??0,area.slope.origin?.z??0)||Math.hypot(area.slope.x,area.slope.z)>maxSlope+EPS)){valid=false;continue;}
  const bounds=boundsOf(polygon);if(bounds.minX>=bounds.maxX||bounds.minZ>=bounds.maxZ){valid=false;continue;}
  floors.push({source:area,polygon,bounds});
 }
 valid=valid&&floors.length>0;
 const obstacles=data.obstacles||[],exclusions=data.exclusions||[];
 for(const o of obstacles)if(!finite(o.minX,o.maxX,o.minZ,o.maxZ)||(o.minY!==undefined&&!Number.isFinite(o.minY))||(o.maxY!==undefined&&!Number.isFinite(o.maxY))||o.minX>o.maxX||o.minZ>o.maxZ||(o.minY??-Infinity)>=(o.maxY??Infinity))valid=false;
 for(const e of exclusions)if(e.polygon.length<3||!finite(...e.polygon.flatMap(p=>[p.x,p.z]))||(e.minY!==undefined&&!Number.isFinite(e.minY))||(e.maxY!==undefined&&!Number.isFinite(e.maxY))||(e.minY??-Infinity)>=(e.maxY??Infinity))valid=false;
 const bounds=data.bounds||(floors.length?boundsOf(floors.flatMap(f=>f.polygon)):{minX:0,maxX:0,minZ:0,maxZ:0});
 if(!finite(bounds.minX,bounds.maxX,bounds.minZ,bounds.maxZ)||bounds.minX>=bounds.maxX||bounds.minZ>=bounds.maxZ)valid=false;
 const height=(f:Floor,p:BotaniqueNavXZ)=>f.source.y+(f.source.slope?.x??0)*(p.x-(f.source.slope?.origin?.x??0))+(f.source.slope?.z??0)*(p.z-(f.source.slope?.origin?.z??0));
 const heightsAt=(p:BotaniqueNavXZ)=>{const values:number[]=[];for(const f of floors){if(!intersectsRect(p,f.bounds)||!inside(p,f.polygon))continue;const y=height(f,p);if(!values.some(h=>Math.abs(h-y)<.0001))values.push(y);}return values;};
 const floorAt=(p:BotaniqueNavXZ,y:number,tolerance:number)=>heightsAt(p).filter(h=>Math.abs(h-y)<=tolerance+EPS).sort((a,b)=>Math.abs(a-y)-Math.abs(b-y))[0];
 // Split polygon edges where floor areas meet. Internal seams remain traversable;
 // exposed boundaries protect the complete visitor disc rather than sample rays.
 const original=floors.flatMap(f=>edges(f.polygon)),boundaries:Boundary[]=[],boundaryKeys=new Set<string>();
 const planeKey=(f:Floor)=>{const s=f.source.slope,dx=s?.x??0,dz=s?.z??0;return [dx,dz,f.source.y-dx*(s?.origin?.x??0)-dz*(s?.origin?.z??0)].map(n=>n.toFixed(7)).join(',');};
 if(valid)for(let i=0;i<original.length;i++){
  const edge=original[i],parameters=[0,1];for(let j=0;j<original.length;j++)if(i!==j)parameters.push(...cuts(edge.a,edge.b,original[j].a,original[j].b));
  const unique=[...new Set(parameters.map(t=>Math.round(t*1e9)/1e9))].sort((a,b)=>a-b);
  for(let j=1;j<unique.length;j++)if(unique[j]-unique[j-1]>EPS){
   const a=lerp(edge.a,edge.b,unique[j-1]),b=lerp(edge.a,edge.b,unique[j]),length=Math.sqrt(distance2(a,b));if(length<EPS)continue;
   const key=[a,b].map(p=>p.x.toFixed(7)+','+p.z.toFixed(7)).sort().join('|');if(boundaryKeys.has(key))continue;boundaryKeys.add(key);
   const middle=lerp(a,b,.5),dx=-(b.z-a.z)/length*.0001,dz=(b.x-a.x)/length*.0001;
   const side=(sign:number)=>{const p={x:middle.x+dx*sign,z:middle.z+dz*sign};return floors.filter(f=>intersectsRect(p,f.bounds)&&inside(p,f.polygon));};
   const left=side(1),right=side(-1),signature=(side:Floor[])=>[...new Set(side.map(planeKey))].sort().join('|');
   if(left.length&&right.length&&signature(left)===signature(right))continue;
   boundaries.push({a,b,left,right});
  }
 }
 const boundaryOpen=(edge:Boundary,p:BotaniqueNavXZ,y:number)=>edge.left.some(f=>Math.abs(height(f,p)-y)<=maxStep+.001)&&edge.right.some(f=>Math.abs(height(f,p)-y)<=maxStep+.001);
 const uniformFlatFloor=floors.length>0&&floors.every(f=>Math.abs(f.source.y-floors[0].source.y)<EPS&&!f.source.slope?.x&&!f.source.slope?.z);
 type Barrier={bounds:BotaniqueNavRect;rect?:BotaniqueNavRect;polygon:BotaniqueNavXZ[];edges:Edge[];minY:number;maxY:number};
 const barriers:Barrier[]=[...obstacles.map(o=>({bounds:o,rect:o,polygon:rectPoints(o),edges:edges(rectPoints(o)),minY:o.minY??-Infinity,maxY:o.maxY??Infinity})),...exclusions.map(e=>({bounds:boundsOf(e.polygon),polygon:e.polygon,edges:edges(e.polygon),minY:e.minY??-Infinity,maxY:e.maxY??Infinity}))];
 const cellSize=Math.max(1,grid*4),index=new Map<string,Barrier[]>(),large:Barrier[]=[];
 if(valid)for(const barrier of barriers){
  const b=barrier.bounds,x0=Math.floor(b.minX/cellSize),x1=Math.floor(b.maxX/cellSize),z0=Math.floor(b.minZ/cellSize),z1=Math.floor(b.maxZ/cellSize);
  if((x1-x0+1)*(z1-z0+1)>2048){large.push(barrier);continue;}
  for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const key=x+','+z,bucket=index.get(key);if(bucket)bucket.push(barrier);else index.set(key,[barrier]);}
 }
 const nearby=(a:BotaniqueNavXZ,b:BotaniqueNavXZ)=>{
  const x0=Math.floor((Math.min(a.x,b.x)-radius)/cellSize),x1=Math.floor((Math.max(a.x,b.x)+radius)/cellSize),z0=Math.floor((Math.min(a.z,b.z)-radius)/cellSize),z1=Math.floor((Math.max(a.z,b.z)+radius)/cellSize);
  if((x1-x0+1)*(z1-z0+1)>Math.max(16,barriers.length*2))return barriers;
  const candidates=new Set(large);for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++)for(const item of index.get(x+','+z)||[])candidates.add(item);return candidates;
 };
 const bodyClear=(a:BotaniqueNavPoint,b:BotaniqueNavPoint)=>{
  const radius2=(radius-.00001)**2;
  for(const barrier of nearby(a,b)){
   const o=barrier.bounds,interval=verticalInterval(a,b,barrier.minY,barrier.maxY,body);if(!interval)continue;
   const p=lerp(a,b,interval[0]),q=lerp(a,b,interval[1]);
   if(Math.max(p.x,q.x)+radius<o.minX||Math.min(p.x,q.x)-radius>o.maxX||Math.max(p.z,q.z)+radius<o.minZ||Math.min(p.z,q.z)-radius>o.maxZ)continue;
   if(barrier.rect&&distance2(p,q)<EPS*EPS){const dx=Math.max(o.minX-p.x,0,p.x-o.maxX),dz=Math.max(o.minZ-p.z,0,p.z-o.maxZ);if(dx*dx+dz*dz<radius2)return false;continue;}
   if((barrier.rect?(intersectsRect(p,o)||intersectsRect(q,o)):(inside(p,barrier.polygon)||inside(q,barrier.polygon)))||barrier.edges.some(e=>segmentDistance(p,q,e.a,e.b).distance<radius2))return false;
  }
  return true;
 };
 const floorClear=(a:BotaniqueNavPoint,b:BotaniqueNavPoint)=>{
  for(const edge of boundaries){
   if(Math.max(a.x,b.x)+radius<Math.min(edge.a.x,edge.b.x)||Math.min(a.x,b.x)-radius>Math.max(edge.a.x,edge.b.x)||Math.max(a.z,b.z)+radius<Math.min(edge.a.z,edge.b.z)||Math.min(a.z,b.z)-radius>Math.max(edge.a.z,edge.b.z))continue;
   const pair=segmentDistance(a,b,edge.a,edge.b);if(pair.distance>=(radius-.00001)**2)continue;
   const length=distance2(a,b),t=length?clamp(((pair.point.x-a.x)*(b.x-a.x)+(pair.point.z-a.z)*(b.z-a.z))/length):0;
   if(!boundaryOpen(edge,pair.point,a.y+(b.y-a.y)*t))return false;
  }
  return true;
 };
 const canStand=(p:BotaniqueNavPoint)=>valid&&finite(p.x,p.y,p.z)&&intersectsRect(p,bounds,-radius)&&floorAt(p,p.y,.025)!==undefined&&bodyClear(p,p)&&floorClear(p,p);
 const projectToFloor=(p:BotaniqueNavPoint,maxHeightDelta=options.maxClickFloorDistance??.25)=>{
  if(!valid||!finite(p.x,p.y,p.z,maxHeightDelta)||maxHeightDelta<0)return null;
  const y=floorAt(p,p.y,maxHeightDelta);if(y===undefined)return null;const point=new Vector3(p.x,y,p.z);return canStand(point)?point:null;
 };
 const trace=(a:BotaniqueNavPoint,b:BotaniqueNavPoint):Vector3[]|null=>{
  if(!canStand(a)||!canStand(b)||!bodyClear(a,b)||!floorClear(a,b))return null;
  const distance=Math.sqrt(distance2(a,b));if(distance<EPS)return Math.abs(a.y-b.y)<.025?[new Vector3(b.x,b.y,b.z)]:null;
  // Exact swept disc tests above are sufficient on a single continuous floor plane.
  // This avoids sampling an entire terrain for every A* edge.
  if(uniformFlatFloor)return [new Vector3(b.x,b.y,b.z)];
  const sampleStep=Math.min(.08,radius/3,grid/2),n=Math.max(1,Math.ceil(distance/sampleStep));
  const ts=[0,1];for(let i=1;i<n;i++)ts.push(i/n);
  for(const edge of boundaries)ts.push(...cuts(a,b,edge.a,edge.b));
  const sorted=[...new Set(ts.map(t=>Math.round(t*1e9)/1e9))].sort((x,y)=>x-y),points:Vector3[]=[];let previous=new Vector3(a.x,a.y,a.z);
  for(const t of sorted){
   if(t===0)continue;const p=lerp(a,b,t),horizontal=Math.sqrt(distance2(previous,p)),expected=a.y+(b.y-a.y)*t;
   const choices=heightsAt(p).filter(y=>Math.abs(y-previous.y)<=maxStep+maxSlope*horizontal+EPS).sort((y,z)=>Math.abs(y-expected)-Math.abs(z-expected));
   if(!choices.length)return null;const next=new Vector3(p.x,choices[0],p.z);
   if(!canStand(next)||!bodyClear(previous,next))return null;
   points.push(next);previous=next;
  }
  return Math.abs(previous.y-b.y)<.025?points:null;
 };
 const canTraverse=(a:BotaniqueNavPoint,b:BotaniqueNavPoint)=>trace(a,b)!==null;
 const success=(start:Vector3,waypoints:Vector3[],expandedNodes:number):BotaniqueRoute=>{
  const sampled:Vector3[]=[];let previous=start;
  for(const to of waypoints){const part=trace(previous,to);if(!part)return failure('unreachable',expandedNodes);sampled.push(...part);previous=to;}
  // Retain every height change. Flat collinear runs need only their final point.
  const floorPoints:Vector3[]=[];let anchor=start;
  for(let i=0;i<sampled.length;i++){
   const p=sampled[i],next=sampled[i+1],ab=p.clone().sub(anchor),bc=next?.clone().sub(p);
   if(next&&bc&&Math.abs(p.y-anchor.y)<.0001&&Math.abs(next.y-p.y)<.0001&&Math.abs(ab.x*bc.z-ab.z*bc.x)<1e-6)continue;
   if(p.distanceTo(anchor)>EPS){floorPoints.push(p);anchor=p;}
  }
  let distance=0;previous=start;for(const p of floorPoints){distance+=p.distanceTo(previous);previous=p;}
  return {ok:true,floorPoints,points:floorPoints.map(p=>new Vector3(p.x,p.y+eyeHeight,p.z)),distance,expandedNodes};
 };
 function planRoute(cameraPosition:BotaniqueNavPoint,targetFloor:BotaniqueNavPoint):BotaniqueRoute{
  const deadline=performance.now()+maxSearchMs,expired=()=>performance.now()>deadline;
  if(!valid)return failure('invalid-data');
  const start=projectToFloor({x:cameraPosition.x,y:cameraPosition.y-eyeHeight,z:cameraPosition.z},options.maxStartFloorDistance??.4);if(!start)return failure('invalid-start');
  const goal=projectToFloor(targetFloor,options.maxClickFloorDistance??.25);if(!goal)return failure('invalid-target');
  if(canTraverse(start,goal))return success(start,[goal],0);
  if(expired())return failure('search-limit');
  // Add narrow passage midlines so a valid door is not lost between grid rows.
  // These are search nodes, never a snap of the camera or clicked destination.
  const axis=(min:number,max:number,limits:number[])=>{
   const values=Array.from({length:Math.floor((max-min)/grid)+1},(_,i)=>min+i*grid),sorted=[...new Set(limits)].filter(x=>x>=min&&x<=max).sort((a,b)=>a-b);
   for(let i=1;i<sorted.length;i++){const gap=sorted[i]-sorted[i-1];if(gap>radius*2&&gap<radius*2+grid*2)values.push((sorted[i]+sorted[i-1])/2);}
   return [...new Set(values.map(x=>Math.round(x*1e8)/1e8))].sort((a,b)=>a-b);
  };
  const xs=axis(bounds.minX,bounds.maxX,obstacles.flatMap(o=>[o.minX,o.maxX])),zs=axis(bounds.minZ,bounds.maxZ,obstacles.flatMap(o=>[o.minZ,o.maxZ])),nx=xs.length,nz=zs.length;
  const heap=new MinHeap(),nodes=new Map<string,{point:Vector3;x:number;z:number;cost:number;parent?:string}>(),closed=new Set<string>(),cache=new Map<number,Vector3[]>();
  const gridPoints=(x:number,z:number)=>{
   if(x<0||z<0||x>=nx||z>=nz)return [];
   const id=z*nx+x,known=cache.get(id);if(known)return known;
   const p={x:xs[x],z:zs[z]},points=heightsAt(p).map(y=>new Vector3(p.x,y,p.z)).filter(canStand);cache.set(id,points);return points;
  };
  const enqueue=(point:Vector3,x:number,z:number,cost:number,parent?:string)=>{
   const key=x+','+z+','+point.y.toFixed(4),old=nodes.get(key);if(old&&old.cost<=cost)return;
   nodes.set(key,{point,x,z,cost,parent});heap.push({key,cost,score:cost+point.distanceTo(goal)});
  };
  const nearest=(values:number[],value:number)=>{let low=0,high=values.length-1;while(low<high){const mid=(low+high)>>1;if(values[mid]<value)low=mid+1;else high=mid;}return low>0&&value-values[low-1]<values[low]-value?low-1:low;};
  const sx=nearest(xs,start.x),sz=nearest(zs,start.z);
  // Several connected seeds avoid false failures when the nearest grid node is a wall.
  for(let z=sz-2;z<=sz+2;z++)for(let x=sx-2;x<=sx+2;x++)for(const point of gridPoints(x,z))if(canTraverse(start,point))enqueue(point,x,z,start.distanceTo(point));
  let expandedNodes=0,reached:string|undefined;
  while(heap.items.length&&expandedNodes<maxNodes&&!expired()){
   const entry=heap.pop(),node=nodes.get(entry.key)!;if(closed.has(entry.key)||entry.cost!==node.cost)continue;closed.add(entry.key);expandedNodes++;
   if(node.point.distanceTo(goal)<=grid*2.9&&canTraverse(node.point,goal)){reached=entry.key;break;}
   for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dz)continue;
    for(const point of gridPoints(node.x+dx,node.z+dz)){
     if(Math.abs(point.y-node.point.y)>maxStep+maxSlope*grid*Math.hypot(dx,dz)+EPS||!canTraverse(node.point,point))continue;
     enqueue(point,node.x+dx,node.z+dz,node.cost+node.point.distanceTo(point),entry.key);
    }
   }
  }
  if(!reached)return failure(heap.items.length||expired()?'search-limit':'unreachable',expandedNodes);
  const raw=[goal];for(let key:string|undefined=reached;key;key=nodes.get(key)?.parent)raw.push(nodes.get(key)!.point);raw.reverse();
  const smoothed:Vector3[]=[];let anchor=start,index=0;
  while(index<raw.length){if(expired())return failure('search-limit',expandedNodes);let far=index;for(let next=index+1;next<raw.length;next++){if(expired())return failure('search-limit',expandedNodes);if(canTraverse(anchor,raw[next]))far=next;}smoothed.push(raw[far]);anchor=raw[far];index=far+1;}
  return success(start,smoothed,expandedNodes);
 }
 return {planRoute,canStand,canTraverse,projectToFloor,eyeHeight,radius};
}
