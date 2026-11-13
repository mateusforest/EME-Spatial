type Point=[number,number];
type Node={point:Point;neighbors:number[]};

/** A small, cached road-only graph. Nothing is added to the rendered scene. */
export function createRoadNavigator(polygons:number[][][],inside:(x:number,z:number)=>boolean){
  const step=3,points=polygons.flat(),minX=Math.floor(Math.min(...points.map(p=>p[0]))/step)*step,minZ=Math.floor(Math.min(...points.map(p=>p[1]))/step)*step;
  const maxX=Math.ceil(Math.max(...points.map(p=>p[0]))/step)*step,maxZ=Math.ceil(Math.max(...points.map(p=>p[1]))/step)*step;
  let nodes:Node[]|undefined;
  const distance=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  function clear(a:Point,b:Point){
    if(!inside(...a)||!inside(...b))return false;
    // Split at every road boundary, then test each interval of the union.
    // Sampling alone can miss short cuts across a corner of a parcel.
    const dx=b[0]-a[0],dz=b[1]-a[1],cuts=[0,1];
    for(const polygon of polygons)for(let i=0;i<polygon.length;i++){
      const p=polygon[i],q=polygon[(i+1)%polygon.length],ex=q[0]-p[0],ez=q[1]-p[1],den=dx*ez-dz*ex;
      if(Math.abs(den)<1e-10)continue;
      const px=p[0]-a[0],pz=p[1]-a[1],t=(px*ez-pz*ex)/den,u=(px*dz-pz*dx)/den;
      if(t>0&&t<1&&u>=0&&u<=1)cuts.push(t);
    }
    cuts.sort((x,y)=>x-y);
    for(let i=1;i<cuts.length;i++){const t=(cuts[i-1]+cuts[i])/2;if(!inside(a[0]+dx*t,a[1]+dz*t))return false;}
    return true;
  }
  function build(){
    if(nodes)return nodes;
    nodes=[];const grid=new Map<string,number>();
    for(let x=minX;x<=maxX;x+=step)for(let z=minZ;z<=maxZ;z+=step){
      if(!inside(x,z))continue;grid.set(`${x},${z}`,nodes.length);nodes.push({point:[x,z],neighbors:[]});
    }
    nodes.forEach((node,i)=>{for(const [dx,dz] of [[step,0],[-step,0],[0,step],[0,-step],[step,step],[-step,step],[step,-step],[-step,-step]]){
      const j=grid.get(`${node.point[0]+dx},${node.point[1]+dz}`);
      if(j!==undefined&&clear(node.point,nodes![j].point))nodes![i].neighbors.push(j);
    }});
    return nodes;
  }
  function route(from:Point,to:Point):Point[]{
    if(!inside(...from)||!inside(...to))return [];
    if(clear(from,to))return [to];
    const graph=build(),nearest=(p:Point)=>graph.map((n,i)=>({i,d:distance(p,n.point)})).filter(n=>n.d<step*3).sort((a,b)=>a.d-b.d).find(n=>clear(p,graph[n.i].point))?.i;
    const start=nearest(from),end=nearest(to);if(start===undefined||end===undefined)return [];
    const open=new Set([start]),closed=new Set<number>(),cost=new Map([[start,0]]),previous=new Map<number,number>();
    while(open.size){
      let current=-1,best=Infinity;
      for(const i of open){const score=cost.get(i)!+distance(graph[i].point,graph[end].point);if(score<best){best=score;current=i;}}
      if(current===end){
        const path:Point[]=[to];let at=end;path.unshift(graph[at].point);
        while(previous.has(at)){at=previous.get(at)!;path.unshift(graph[at].point);}path.unshift(from);
        const smooth:Point[]=[];let i=0;
        while(i<path.length-1){let j=path.length-1;while(j>i+1&&!clear(path[i],path[j]))j--;smooth.push(path[j]);i=j;}
        return smooth;
      }
      open.delete(current);closed.add(current);
      for(const next of graph[current].neighbors){if(closed.has(next))continue;const value=cost.get(current)!+distance(graph[current].point,graph[next].point);if(value<(cost.get(next)??Infinity)){cost.set(next,value);previous.set(next,current);open.add(next);}}
    }
    return [];
  }
  return {route,clear};
}
