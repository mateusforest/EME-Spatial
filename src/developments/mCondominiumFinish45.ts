import * as T from 'three';
import {communityKit} from './mCommunity39';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import type {Own} from './mSurfaces';
/** Local finish pass; all additions stay within the existing plots and arrival reservation. */
export function refineMCondominium45(root:T.Group,own:Own){
 const mat=(color:string)=>own(new T.MeshStandardMaterial({color,roughness:.82}));
 const stone=mat('#b7ad95'),oak=mat('#85623e'),dark=mat('#33483e'),linen=mat('#e7dfce'),leaf=mat('#4c744c');
 const glow=own(new T.MeshStandardMaterial({color:'#ffebc7',emissive:'#ffd599',emissiveIntensity:.7}));
 // Shared rounded foliage and furniture geometries, batched once per house.
 function softKit(parent:T.Group){
  const parts=new Map<T.Material,T.BufferGeometry[]>();
  function add(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number){g.translate(x,y,z);g.deleteAttribute('uv');const arr=parts.get(m)||[];arr.push(g);parts.set(m,arr);}
  const soft=(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material)=>add(new RoundedBoxGeometry(w,h,d,1,.07),m,x,y,z);
  function planter(x:number,y:number,z:number){
   add(new T.CylinderGeometry(.4,.3,.7,12),stone,x,y+.35,z);
   for(let i=0;i<7;i++){const a=i*2.4;const g=new T.IcosahedronGeometry(.34,1);g.scale(1,.65,1);add(g,leaf,x+Math.cos(a)*.22,y+.82+i*.055,z+Math.sin(a)*.22);}
  }
  function flush(){for(const [m,gs]of parts){const flat=gs.map(g=>{const f=g.index?g.toNonIndexed():g;if(f!==g)g.dispose();return f;});const g=mergeGeometries(flat,false);flat.forEach(g=>g.dispose());if(g){const mesh=new T.Mesh(own(g),m);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);}}}
  return {soft,planter,flush};
 }
 for(const house of root.children.filter(o=>o.name.startsWith('Pátio house'))){
  const detail=new T.Group();detail.name='House refined facade web45';house.add(detail);
  const {box:b,flush}=communityKit(detail,own),soft=softKit(detail),v=house.userData.variant;
  // Deep entrance surround and slatted soffit, with a sheltered seat off the access path.
  for(const x of [-.38,1.38])b(x,1.93,4.84,.12,2.9,.4,stone);
  b(.5,3.4,4.84,1.9,.12,.4,stone);
  for(let x=-.4;x<1.5;x+=.18)b(x,3.04,5.8,.07,.06,2.55,oak);
  b(2.3,.7,7.8,1.7,.2,.62,oak);for(const x of [1.65,2.95])b(x,.47,7.8,.1,.46,.5,dark);
  soft.planter(4, .34,8.1);
  // Window reveals add shadow depth without covering existing glazing openings.
  for(const x of [-6.95,6.95])for(const y of [2,5.28])for(const z of [-2,3.25]){
   for(const dy of [-1.13,1.13])b(x,y+dy,z,.22,.10,2.9,stone);
   for(const dz of [-1.45,1.45])b(x,y,z+dz,.22,2.35,.09,dark);
  }
  for(const y of [3.46,6.68])b(0,y,4.76,13.1,.075,.23,dark);
  for(const x of [-6.55,6.55])b(x,5.23,4.76,.12,2.85,.25,stone);
  // Facade joints and a timber feature vary by house family.
  const sx=v===1?-5.7:5.7;
  for(let y=.9;y<6.7;y+=.6)b(sx,y,-6.94,2.15,.025,.024,dark);
  for(let z=-4.8;z<-3.9;z+=.18)b(v===2?-7:7,5.28,z,.15,2.95,.09,oak);
  for(const x of [-6.5,1.7]){b(x,2.6,5.77,.17,.46,.12,dark);b(x,2.59,5.84,.10,.29,.03,glow);}
  for(const x of [-5,0,5])b(x,6.69,5.3,.22,.025,.22,glow);
  // Lightly furnished living and upper bedroom are visible through the front panes.
  soft.soft(4.1,.9,2.2,2.8,.48,1.0,linen);soft.soft(4.1,1.35,1.78,2.8,.75,.18,linen);
  soft.soft(4.1,.62,3.5,1.3,.32,.65,stone);
  b(4.1,1.7,.3,2.6,2.2,.12,oak);b(4.1,1.8,.38,1.65,.87,.05,dark);
  b(-1.6,4.1,1.4,2.2,.4,2.4,oak);soft.soft(-1.6,4.43,1.4,2.12,.24,2.3,linen);
  soft.soft(-1.6,4.9,.23,2.7,1.45,.15,stone);
  for(const x of [-2.15,-1.05])soft.soft(x,4.65,.7,.83,.18,.52,linen);
  soft.planter(v===1?-6.5:6.5,3.82,6.5);
  // Fine mineral paving grid on the driveway; pedestrian stepping stones stay separate.
  for(let z=6.5;z<14;z+=1.25)b(-3.5,.407,z,6.1,.012,.022,stone);
  for(const x of [-5,-3.5,-2])b(x,.407,10,.022,.012,8,stone);
  flush();soft.flush();
 }
 const arrival=new T.Group();arrival.name='Patio arrival facade web45';root.add(arrival);
 const {box:b,flush}=communityKit(arrival,own),soft=softKit(arrival);
 for(let x=-12.4;x<=12.4;x+=.32)b(x,3.78,80,.09,.08,9.4,oak);
 for(const x of [-5.7,5.7])b(x,3.71,80,.07,.035,8.6,glow);
 for(const x of [-12.4,11.9])for(const z of [71,86.8])soft.planter(x,.2,z);
 for(const x of [-6.4,6.4])for(const z of [70.5,88]){b(x,.66,z,.15,.8,.15,dark);b(x,1.09,z,.17,.10,.17,glow);}
 b(-10.2,1.6,81.25,1.2,.12,.06,dark);

 for(const z of [70,72,74,76,78,80,82,84,86])b(8.8,.349,z,2.25,.012,.025,stone);
 // Slatted lateral return beside the pedestrian route, outside the carriageways.
 for(let z=77;z<84;z+=.28)b(10.8,1.55,z,.10,2.6,.10,oak);
 flush();soft.flush();
}
