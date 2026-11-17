import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import source from './plan-source.json';
import {eastEdge,westEdge,ROAD,NORTH0,NORTH1,NORTH_LOTS,SOUTH,AVENUE} from './serra-plan';
import type {StreetLamp} from './street-lighting';

/**
 * Émera · acabamento das vias novas (Ruas 05, 06, 07 e Av. Émera): calçadas de 2,5 m fora da pista,
 * meio-fio, ligação das ruas transversais da prancha com o anel viário, árvores e postes.
 * Segue a mesma lógica da implantação original: a pista ocupa o polígono da via e a calçada fica fora dele.
 */
const WALK=2.5;
type Height=(x:number,z:number)=>number;
type Line={at:(t:number)=>[number,number];out:[number,number];t0:number;t1:number};

/** Ruas transversais originais que terminavam no limite leste/oeste: faixa z e a linha do fim. */
const cross=source.roads.filter(r=>/Rua 0[234]/.test(r.name)).map(r=>{
  const zs=r.polygon.map(p=>p[1]),z0=Math.min(...zs),z1=Math.max(...zs);
  const at=(z:number,pick:(a:number,b:number)=>number)=>r.polygon.filter(p=>Math.abs(p[1]-z)<.01).map(p=>p[0]).reduce(pick);
  const e0=at(z0,Math.max),e1=at(z1,Math.max),w0=at(z0,Math.min),w1=at(z1,Math.min);
  return {z0,z1,east:(z:number)=>e0+(e1-e0)*(z-z0)/(z1-z0),west:(z:number)=>w0+(w1-w0)*(z-z0)/(z1-z0)};
});

/** Triângulos da calçada/meio-fio que fechavam o fim das transversais: removidos para abrir a ligação. */
export function blocksMouth(x:number,z:number){
  return cross.some(c=>z>c.z0+.4&&z<c.z1-.4&&(x>c.east(z)-.4||x<c.west(z)+.4));
}

/** Intervalos (em z) em que a calçada interna das Ruas 05/06 é interrompida pelas transversais. */
const mouths=cross.map(c=>[c.z0,c.z1] as [number,number]);
function minus(t0:number,t1:number,holes:[number,number][]){
  let parts:[number,number][]=[[t0,t1]];
  for(const [h0,h1] of holes)parts=parts.flatMap(([a,b])=>h1<=a||h0>=b?[[a,b] as [number,number]]:[...(h0>a?[[a,h0] as [number,number]]:[]),...(h1<b?[[h1,b] as [number,number]]:[])]);
  return parts.filter(([a,b])=>b-a>.5);
}

export function createSerraRoads(materials:{asphalt:T.Material;sidewalk:T.Material;curb:T.Material},surface:(polygon:number[][],offset:number)=>T.BufferGeometry,height:Height){
  const asphalt:T.BufferGeometry[]=[],walk:T.BufferGeometry[]=[],curb:T.BufferGeometry[]=[];
  const lamps:StreetLamp[]=[],trees:number[][]=[];
  // ------------------------------------------------------------ pista
  const lines=(edge:(z:number)=>number)=>(z:number):[number,number]=>[edge(z),z];
  const quad=(pts:number[][])=>{let s=0;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];s+=a[0]*b[1]-b[0]*a[1];}return s>0?[...pts].reverse():pts;};
  asphalt.push(surface(quad([[eastEdge(SOUTH),SOUTH],[eastEdge(SOUTH)+ROAD,SOUTH],[eastEdge(NORTH1)+ROAD,NORTH1],[eastEdge(NORTH1),NORTH1]]),.03));
  asphalt.push(surface(quad([[westEdge(SOUTH)-ROAD,SOUTH],[westEdge(SOUTH),SOUTH],[westEdge(NORTH1),NORTH1],[westEdge(NORTH1)-ROAD,NORTH1]]),.03));
  asphalt.push(surface(quad([[westEdge(NORTH0),NORTH0],[eastEdge(NORTH0),NORTH0],[eastEdge(NORTH1),NORTH1],[westEdge(NORTH1),NORTH1]]),.03));
  asphalt.push(surface(quad([[AVENUE[0],NORTH1],[AVENUE[1],NORTH1],[AVENUE[1],NORTH_LOTS],[AVENUE[0],NORTH_LOTS]]),.03));
  // ligação de cada transversal com o anel (o vão entre o fim da prancha e a via nova)
  for(const c of cross){
    asphalt.push(surface(quad([[c.east(c.z0)-.6,c.z0],[eastEdge(c.z0)+.3,c.z0],[eastEdge(c.z1)+.3,c.z1],[c.east(c.z1)-.6,c.z1]]),.031));
    asphalt.push(surface(quad([[westEdge(c.z0)-.3,c.z0],[c.west(c.z0)+.6,c.z0],[c.west(c.z1)+.6,c.z1],[westEdge(c.z1)-.3,c.z1]]),.031));
  }
  // ------------------------------------------------------------ calçadas e meio-fio
  const strip=(line:Line,lamp=true,tree=true)=>{
    const {at,out,t0,t1}=line,len=t1-t0;if(len<.5)return;
    const steps=Math.max(1,Math.ceil(len/2));
    const top:number[]=[],face:number[]=[],kerb:number[]=[],uvTop:number[]=[];
    const P=(t:number,o:number,y:number)=>{const [x,z]=at(t);const px=x+out[0]*o,pz=z+out[1]*o;return [px,height(px,pz)+y,pz];};
    // quadrilátero com a face virada para `facing` (normal desejada)
    const quadTo=(list:number[],v:number[][],facing:number[],uv?:number[])=>{
      const e1=[v[1][0]-v[0][0],v[1][1]-v[0][1],v[1][2]-v[0][2]],e2=[v[2][0]-v[0][0],v[2][1]-v[0][1],v[2][2]-v[0][2]];
      const n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]];
      const ok=n[0]*facing[0]+n[1]*facing[1]+n[2]*facing[2]>0;
      for(const p of ok?[v[0],v[1],v[2],v[0],v[2],v[3]]:[v[0],v[2],v[1],v[0],v[3],v[2]]){list.push(...p);uv?.push(p[0]/2.4,p[2]/2.4);}
    };
    for(let i=0;i<steps;i++){
      const a=t0+len*i/steps,b=t0+len*(i+1)/steps;
      quadTo(top,[P(a,.15,.14),P(b,.15,.14),P(b,WALK,.14),P(a,WALK,.14)],[0,1,0],uvTop);
      quadTo(kerb,[P(a,0,.16),P(b,0,.16),P(b,.15,.16),P(a,.15,.16)],[0,1,0]);
      // face vertical do meio-fio voltada para a pista e borda externa da calçada até o gramado
      quadTo(kerb,[P(a,0,.02),P(b,0,.02),P(b,0,.16),P(a,0,.16)],[-out[0],0,-out[1]]);
      quadTo(face,[P(a,WALK,-.05),P(b,WALK,-.05),P(b,WALK,.14),P(a,WALK,.14)],[out[0],0,out[1]]);
    }
    const geo=(pos:number[],uv?:number[])=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));if(uv)g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));else g.setAttribute('uv',new T.Float32BufferAttribute(new Array(pos.length/3*2).fill(0),2));g.computeVertexNormals();return g;};
    walk.push(geo(top,uvTop));walk.push(geo(face));curb.push(geo(kerb));
    // árvores de rua a cada 16 m e postes a cada 26 m, alternando com as árvores
    for(let t=t0+6;t<t1-4;t+=16){const [x,z]=at(t);if(tree)trees.push([x+out[0]*1.2,z+out[1]*1.2,6.6+((t*37)%17)/17*1.6,(t*.7)%6.28]);}
    for(let t=t0+14;t<t1-4;t+=26){const [x,z]=at(t);if(!lamp)continue;const lx=x+out[0]*.55,lz=z+out[1]*.55;lamps.push({x:lx,z:lz,rotation:Math.atan2(out[1],-out[0])});}
  };
  // Rua 05 (leste) e Rua 06 (oeste): calçada interna interrompida nas transversais, externa contínua
  const e=lines(eastEdge),w=lines(westEdge);
  for(const [a,b] of minus(SOUTH,NORTH0,mouths))strip({at:e,out:[-1,0],t0:a,t1:b});
  strip({at:z=>[eastEdge(z)+ROAD,z],out:[1,0],t0:SOUTH-WALK,t1:NORTH1+WALK});
  for(const [a,b] of minus(SOUTH,NORTH0,mouths))strip({at:w,out:[1,0],t0:a,t1:b});
  strip({at:z=>[westEdge(z)-ROAD,z],out:[-1,0],t0:SOUTH-WALK,t1:NORTH1+WALK});
  // fim sul das Ruas 05 e 06
  strip({at:x=>[x,SOUTH],out:[0,-1],t0:eastEdge(SOUTH),t1:eastEdge(SOUTH)+ROAD},false,false);
  strip({at:x=>[x,SOUTH],out:[0,-1],t0:westEdge(SOUTH)-ROAD,t1:westEdge(SOUTH)},false,false);
  // Rua 07 (norte): calçada sul aberta na avenida original, calçada norte aberta na Av. Émera
  for(const [a,b] of minus(westEdge(NORTH0),eastEdge(NORTH0),[[-6.2,8.8]]))strip({at:x=>[x,NORTH0],out:[0,-1],t0:a,t1:b});
  for(const [a,b] of minus(westEdge(NORTH1)-ROAD-WALK,eastEdge(NORTH1)+ROAD+WALK,[[AVENUE[0],AVENUE[1]]]))strip({at:x=>[x,NORTH1],out:[0,1],t0:a,t1:b});
  // Av. Émera: calçadas laterais e o fim
  strip({at:z=>[AVENUE[0],z],out:[-1,0],t0:NORTH1,t1:NORTH_LOTS+WALK},true,true);
  strip({at:z=>[AVENUE[1],z],out:[1,0],t0:NORTH1,t1:NORTH_LOTS+WALK},true,true);
  strip({at:x=>[x,NORTH_LOTS],out:[0,1],t0:AVENUE[0],t1:AVENUE[1]},false,false);

  const group=new T.Group();group.name='Émera · vias novas';
  for(const [list,material,shadow] of [[asphalt,materials.asphalt,false],[walk,materials.sidewalk,false],[curb,materials.curb,true]] as [T.BufferGeometry[],T.Material,boolean][]){
    const geometry=mergeGeometries(list.map(g=>{for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);return g;}));
    list.forEach(g=>g.dispose());if(!geometry)continue;geometry.computeBoundingSphere();
    const mesh=new T.Mesh(geometry,material);mesh.receiveShadow=true;mesh.castShadow=shadow;mesh.name='Émera · vias novas';group.add(mesh);
  }
  return {group,lamps,trees};
}
