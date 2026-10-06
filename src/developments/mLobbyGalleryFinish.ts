import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mGalleryContour,M_PODIUM} from './mReferencePodium';
import {addMGalleryFoliage} from './mGalleryFoliage';
import type {Own} from './mSurfaces';

/** Finish layers use the approved podium contours and leave its entrance, upper
 * stair opening and asymmetric shell intact. No apartment interiors are changed. */
export function finishMLobbyGallery(site:T.Group,own:Own,finishes:{finishStone:(m:T.MeshStandardMaterial)=>void;finishWood:(m:T.MeshStandardMaterial)=>void}){
 const root=new T.Group();root.name='M lobby and gallery finishes web26';root.userData={finishOnly:true,revision:26,dynamicLights:0};site.add(root);
 const stone=own(new T.MeshStandardMaterial({color:'#d6cbb7',roughness:.86}));stone.name='Gallery warm honed stone';finishes.finishStone(stone);
 const wood=own(new T.MeshStandardMaterial());wood.name='Gallery oak joinery';finishes.finishWood(wood);wood.color.set('#e8d8bb');
 const green=own(new T.MeshStandardMaterial({color:'#32483f',roughness:.42}));green.name='Lobby green mineral reception';finishes.finishStone(green);green.roughness=.42;
 const metal=own(new T.MeshStandardMaterial({color:'#565348',metalness:.6,roughness:.38}));metal.name='Gallery bronze detailing';
 const linen=own(new T.MeshStandardMaterial({color:'#d5ccba',roughness:1}));linen.name='Gallery linen seating';
 const light=own(new T.MeshStandardMaterial({color:'#ffdfab',emissive:'#ffd39a',emissiveIntensity:1.5,roughness:.5}));light.name='Gallery warm diffusers';
 const seam=own(new T.MeshStandardMaterial({color:'#9b9486',roughness:1}));seam.name='Gallery mineral joints';
 const batches=new Map<T.Material,T.BufferGeometry[]>();
 function add(g:T.BufferGeometry,m:T.Material,verticalWood=false){
  const p=g.attributes.position,n=g.attributes.normal;
  const uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),across=Math.abs(n.getX(i))>.5?z:x;
   uv[i*2]=verticalWood?y/3.5:across/2.5;
   uv[i*2+1]=verticalWood?across/1.2:(Math.abs(n.getY(i))>.5?z:y)/2.5;
  }
  g.setAttribute('uv',new T.BufferAttribute(uv,2));const list=batches.get(m)||[];list.push(g);batches.set(m,list);
 }
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,angle=0){
  const g=new T.BoxGeometry(w,h,d);g.rotateY(angle);g.translate(x,y,z);add(g,m,m===wood);
 }
 function line(a:T.Vector2,b:T.Vector2,y:number,h:number,d:number,m:T.Material){
  box((a.x+b.x)/2,y,-(a.y+b.y)/2,a.distanceTo(b)+.002,h,d,m,Math.atan2(b.y-a.y,b.x-a.x));
 }
 function tube(points:T.Vector3[],radius:number,m:T.Material,closed=false){
  const curve=new T.CatmullRomCurve3(points,closed,'centripetal');add(new T.TubeGeometry(curve,closed?48:8,radius,6,closed),m);
 }
 // Clearer podium glass and warmer stone are local material copies, not changes to the tower.
 const podium=site.getObjectByName('M asymmetric reference podium'),materials=new Map<T.Material,T.Material>();
 podium?.traverse(o=>{
  if(!(o instanceof T.Mesh)||Array.isArray(o.material))return;
  const m=o.material as T.MeshStandardMaterial;
  if(!['Reference glazing','Reference mineral structure'].includes(m.name))return;
  if(!materials.has(m)){
   const local=own(m.clone());
   if(m.name==='Reference glazing'){local.opacity=.18;local.color.set('#d0d9d3');local.roughness=.12;}
   else local.color.set('#dcd4c4');
   materials.set(m,local);
  }
  o.material=materials.get(m)!;
 });
 for(const side of ['left','right'] as const){
  const roof=side==='left'?M_PODIUM.leftRoof:M_PODIUM.rightRoof;
  for(const upper of [false,true]){
   const bottom=upper?5.1:.825,top=upper?roof-1.02:4.28;
   const glass=mGalleryContour(side,upper,1).getSpacedPoints(92);
   const cove=mGalleryContour(side,upper,.68).getSpacedPoints(92);
   for(let i=0;i<glass.length-1;i++){
    const a=glass[i],b=glass[i+1],x=(a.x+b.x)/2,z=-(a.y+b.y)/2;
    if(Math.abs(x)<6.4&&z>-1&&z<7)continue;
    line(a,b,bottom+.04,.07,.10,metal);line(a,b,top-.035,.07,.10,metal);
    if(z>0&&Math.abs(x)>7.6)line(cove[i],cove[i+1],top+.007,.025,.045,light);
   }
   // Small recessed fixtures follow the curved frontage, including each upper setback.
   const fixtures=mGalleryContour(side,upper,1.45).getSpacedPoints(24);
   for(const p of fixtures){
    if(-p.y<1||Math.abs(p.x)<8)continue;
    const housing=new T.CylinderGeometry(.12,.12,.025,12);housing.translate(p.x,top+.005,-p.y);add(housing,metal);
    const lens=new T.CylinderGeometry(.075,.075,.008,12);lens.translate(p.x,top-.012,-p.y);add(lens,light);
   }
   // Cladding joints follow each authored curve, including the different setbacks.
   const edge=mGalleryContour(side,upper).getSpacedPoints(38);
   edge.slice(0,-1).forEach((p,i)=>{
    if(-p.y<0||Math.abs(p.x)<6) return;
    const next=edge[i+1];box(p.x,upper?roof-.44:4.75,-p.y,.014,upper?.83:.64,.017,seam,Math.atan2(next.y-p.y,next.x-p.x));
   });
  }
  // Oak backing gives the transparent gallery depth without closing its frontage.
  const x=side==='left'?-15.5:17,w=side==='left'?17:19;
  box(x,4.4,-7.69,w-.05,7.10,.035,wood);
  for(let offset=-w/2+.5;offset<w/2;offset+=1.2)box(x+offset,4.4,-7.663,.012,7.05,.015,metal);
 }
 // Pale stone panel remains behind the existing white M; the logo stays visible.
 for(let col=0;col<2;col++)for(let row=0;row<4;row++)box(-2.1+col*2.9,1.8225+row*1.985,1.934,2.884,1.971,.018,stone);
 for(const x of [-4.22,-3.96,-3.70,2.45,2.71,2.97,3.23])box(x,4.8,1.99,.13,7.91,.16,wood);
 box(-.65,1.40,3.967,3.81,1.11,.025,green);
 box(-.65,1.993,3.4,3.86,.06,1.16,stone);
 box(-.65,.903,3.994,3.62,.025,.012,light);
 // A restrained pair of vertical reveals emphasises the double-height entrance.
 for(const [x,z] of [[-4.68,9.96],[4.66,9.65]]){
  box(x,5.13,z,.048,8.38,.09,metal);box(x,5.13,z+.049,.025,8.23,.014,light);
 }
 // Timber lines the existing portal ceiling; no canopy is added to the approved massing.
 const ceiling=new T.BoxGeometry(10.6,.022,7);ceiling.translate(0,9.483,6.1);add(ceiling,wood);
 for(const x of [-4.45,4.45])box(x,9.464,5.6,.035,.016,7.6,light);
 // Three suspended elliptical loops recall the approved lobby reference.
 for(let ring=0;ring<3;ring++){
  const y=6.1+ring*.88,rx=1.5-ring*.16,rz=.75-ring*.07;
  const points=Array.from({length:32},(_,i)=>{const a=i/32*Math.PI*2;return new T.Vector3(-.65+Math.cos(a)*rx,y+Math.sin(a)*.16,5.45+Math.sin(a)*rz);});
  tube(points,.039,metal,true);
  tube(points.map(p=>p.clone().add(new T.Vector3(0,-.04,0))),.022,light,true);
  for(const a of [0,2.1,4.2])tube([new T.Vector3(-.65+Math.cos(a)*rx,y+Math.sin(a)*.16,5.45+Math.sin(a)*rz),new T.Vector3(-.65+Math.cos(a)*rx,9.46,5.45+Math.sin(a)*rz)],.006,metal);
 }
 // A tiled threshold and discreet tread inlays keep the route through the open doors clear.
 for(let col=0;col<6;col++)for(let row=0;row<3;row++)box(-3.75+col*1.5,.830,9.9+row*1.08,1.487,.008,1.067,stone);
 for(let i=0;i<5;i++)box(0,.3+(i+1)*.105+.003,15.20-i*.45,10.25,.006,.038,seam);
 // Oak tread inserts and continuous bronze handrails follow all 26 approved risers.
 const rise=(M_PODIUM.upper-M_PODIUM.ground)/M_PODIUM.risers;
 for(const upper of [false,true]){
  const x=upper?10.65:8.85;
  for(let i=0;i<13;i++){
   const z=upper?3.44+i*.28:6.8-i*.28,top=.825+(i+1+(upper?13:0))*rise;
   const tread=new T.BoxGeometry(1.44,.012,.262);tread.translate(x,top+.007,z);add(tread,wood);
  }
  for(const dx of [-.76,.76])tube([
   new T.Vector3(x+dx,.825+(1+(upper?13:0))*rise+1.03,upper?3.44:6.8),
   new T.Vector3(x+dx,.825+(13+(upper?13:0))*rise+1.03,upper?6.8:3.44)
  ],.026,metal);
 }
 const landingRailY=.825+13*rise+1.03;
 // Straight segments keep the landing return within its existing perimeter.
 for(const [a,b] of [[[8.09,3.44],[8.09,1.78]],[[8.09,1.78],[11.41,1.78]],[[11.41,1.78],[11.41,3.44]]] as const)
  tube([new T.Vector3(a[0],landingRailY,a[1]),new T.Vector3(b[0],landingRailY,b[1])],.026,metal);
 // Human-scale seating stays in the wings, away from the main entrance and the stair.
 function soft(x:number,y:number,z:number,w:number,h:number,d:number){const g=new RoundedBoxGeometry(w,h,d,2,.10);g.translate(x,y,z);add(g,linen);}
 function lounge(x:number,z:number){
  box(x, .87,z,6.2,.025,4.2,stone);
  for(const side of [-1,1]){
   const sx=x+side*2.15;
   box(sx,1.02,z,1.35,.30,2.85,wood);
   soft(sx,1.24,z,1.4,.24,2.9);soft(sx+side*.53,1.58,z,.27,.62,2.9);
   for(const dz of [-1.3,1.3])soft(sx,1.47,z+dz,1.38,.5,.27);
  }
  const top=new T.CylinderGeometry(.85,.85,.12,28);top.translate(x,1.20,z);add(top,stone);
  const stem=new T.CylinderGeometry(.34,.39,.30,20);stem.translate(x,.99,z);add(stem,wood);
 }
 lounge(-16.4,6.2);lounge(20.6,10.25);
 // Small planted pockets just inside the facade enrich the arrival without narrowing it.
 const planting:number[][]=[];
 for(const [x,z] of [[-22.5,8.4],[-9.3,6.7],[25.4,10.4],[14.8,9.5]]){
  const pot=new T.CylinderGeometry(.54,.43,.72,20);pot.translate(x,1.185,z);add(pot,stone);
  planting.push([x,1.55,z,1.8]);
 }
 // Taller pockets enrich the existing arrival beds while keeping the central approach clear.
 for(const [x,z] of [[-8.7,13.35],[-7.4,13.35],[7.7,16.45],[9.3,16.45]])planting.push([x,1.03,z,1.75]);
 for(const [material,geometries] of batches){
  const flat=geometries.map(g=>{if(!g.index)return g;const f=g.toNonIndexed();g.dispose();return f;});
  const g=mergeGeometries(flat,false);flat.forEach(g=>g.dispose());if(!g)continue;
  const mesh=new T.Mesh(own(g),material);mesh.name=material.name;mesh.userData.finishOnly=true;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
 }
 addMGalleryFoliage(root,own,planting);
 return root;
}
