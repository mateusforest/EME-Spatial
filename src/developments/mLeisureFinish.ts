import {porcelain41} from './mPoolSurfaces41';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {addMGalleryFoliage} from './mGalleryFoliage';
import type {Own} from './mSurfaces';

/** Finish the existing pool/club/courts without relocating the approved water or pitches. */
export function finishMLeisure(site:T.Group,own:Own,finish:{finishStone:(m:T.MeshStandardMaterial)=>void;finishWood:(m:T.MeshStandardMaterial)=>void}){
 const root=new T.Group();root.name='M leisure finishes web29';root.userData={finishOnly:true};site.add(root);
 const stone=own(new T.MeshStandardMaterial({color:'#d1c9b7',roughness:.85}));finish.finishStone(stone);
 const wood=own(new T.MeshStandardMaterial());finish.finishWood(wood);wood.color.set('#e4d3b8');
 const linen=own(new T.MeshStandardMaterial({color:'#ded5c2',roughness:1}));
 const metal=own(new T.MeshStandardMaterial({color:'#455348',roughness:.5,metalness:.45}));
 const green=own(new T.MeshStandardMaterial({color:'#586e53',roughness:1}));
 const porcelain=porcelain41(own);
 const grout=own(new T.MeshStandardMaterial({color:'#77796c',roughness:1}));
 const white=own(new T.MeshStandardMaterial({color:'#e5e1d4',roughness:.8}));
 const batches=new Map<T.Material,T.BufferGeometry[]>();
 function add(g:T.BufferGeometry,m:T.Material){const p=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){uv[i*2]=(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))/2.5;uv[i*2+1]=(Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i))/2.5;}g.setAttribute('uv',new T.BufferAttribute(uv,2));const a=batches.get(m)||[];a.push(g);batches.set(m,a);}
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,angle=0,soft=false){const g=soft?new RoundedBoxGeometry(w,h,d,2,Math.min(.09,h/3)):new T.BoxGeometry(w,h,d);g.rotateX(angle);g.translate(x,y,z);add(g,m);}
 function cylinder(x:number,y:number,z:number,r:number,h:number,m:T.Material){const g=new T.CylinderGeometry(r,r,h,20);g.translate(x,y,z);add(g,m);}
 // Rounded loungers with raised backs, cushions, side tables and folded towels.
 for(const x of [29,74.3])for(const z of [-12,0,12,24]){
  for(const dx of [-.43,.43])for(const dz of [-1,1])box(x+dx,.56,z+dz,.085,.37,.085,metal);
  box(x,.73,z,1.15,.17,2.7,wood,0,true);
  box(x,.87,z+.43,1.04,.15,1.65,linen,0,true);
  box(x,1.11,z-.77,1.04,.15,1.06,linen,.48,true);
  box(x,1.36,z-1.03,.88,.15,.27,linen,.48,true);
  box(x,.977,z+.90,1.055,.035,.36,green,0,true);
  const tx=x+(x<50?1.1:-1.1);cylinder(tx,.63,z+.68,.35,.07,stone);cylinder(tx,.49,z+.68,.085,.24,metal);
 }
 // Pool edge coping follows the existing L-shaped basin. Keep water untouched.
 const contour=[[32,-20],[62,-20],[62,-27],[72,-27],[72,31],[62,31],[62,22],[32,22]];
 for(let i=0;i<contour.length;i++){
  const [ax,az]=contour[i],[bx,bz]=contour[(i+1)%contour.length];
  box((ax+bx)/2,.475,(az+bz)/2,Math.abs(bx-ax)||.30,.065,Math.abs(bz-az)||.30,stone);
 }
 // Thin curved pool handrails at two access points; basin depth remains a later study.
 for(const z of [-10,10])for(const x of [33.1,33.65]){
  const path=new T.CatmullRomCurve3([new T.Vector3(x,.47,z-.48),new T.Vector3(x,1.17,z-.3),new T.Vector3(x,1.22,z+.17),new T.Vector3(x,.1,z+.45)]);
  add(new T.TubeGeometry(path,16,.026,6,false),metal);
 }
 // Tile joints on the broad dry terrace behind the pool; no tiles over water.
 for(const [x,z,w,d] of [[29.2,2,5.2,72],[75.5,2,7,72],[47,-28,29.5,15.5],[47,28,29.5,11.5],[53,-34.7,43,2.3]])box(x,.39,z,w,.024,d,porcelain);
 // Coping joints, drainage slots and shallow entry treads give the basin a readable edge.
 for(let z=-18;z<30;z+=1.2){box(72.6,.42,z,.14,.025,.65,grout);box(32.45,.513,z,.33,.012,.012,grout);}
 for(let x=33;x<62;x+=1.2)box(x,.513,22,.012,.012,.31,grout);
 const shallow=own(new T.MeshStandardMaterial({color:'#82bdb5',roughness:.27,metalness:.12}));
 for(let i=0;i<3;i++)box(36,-.65+i*.40,-17+i*.55,5,.25,.5,shallow);
 // Existing clubhouse becomes a furnished pool kiosk, within its original roof and slab.
 box(44,1.16,-41.8,10,1.10,1.15,wood,0,true);box(44,1.76,-41.8,10.18,.10,1.35,stone,0,true);
 box(44,2.45,-48.32,10.2,3.4,.10,wood);
 for(const y of [1.9,2.8,3.6])box(44,y,-48.12,9.8,.07,.38,metal);
 for(const x of [40.5,43.5,46.5]){
  cylinder(x,2.10,-48.02,.12,.32,stone);
  box(x,4.04,-41.8,.025,.97,.025,metal);
  const shade=new T.ConeGeometry(.44,.24,20);shade.translate(x,3.46,-41.8);add(shade,linen);
 }
 for(let x=40;x<=48;x+=2){cylinder(x,1.15,-40.3,.31,.12,linen);for(const dx of [-.19,.19])box(x+dx,.83,-40.3,.04,.57,.35,metal);}
 for(const x of [57.4,64]){
  cylinder(x,1.35,-41.8,1.04,.10,stone);cylinder(x,.99,-41.8,.16,.64,metal);
  for(const dz of [-1.55,1.55]){box(x,.98,-41.8+dz,1.35,.14,.80,linen,0,true);box(x,1.39,-41.8+dz+Math.sign(dz)*.34,1.35,.70,.12,wood,0,true);for(const dx of [-.51,.51])box(x+dx,.76,-41.8+dz,.06,.40,.6,metal);}
  cylinder(x,1.49,-41.8,.20,.18,stone);
 }
 // Slatted kiosk soffit, preserving the roof outline and clear pool-facing opening.
 for(let x=35;x<68;x+=.6)box(x,4.55,-43,.09,.07,11.9,wood);
 // Restrained planting and benches on dry perimeter areas; clear of court runoffs.
 const plants:number[][]=[[57.4,1.59,-41.8,.40],[64,1.59,-41.8,.40]];
 for(const [x,z] of [[29,-28],[74,-30],[55,32],[60,32],[36,-35],[66,-35]]){
  cylinder(x,.68,z,.64,.60,stone);plants.push([x,.99,z,1.8]);
 }
 for(const z of [-10,10,29]){box(82.95,.69,z,.85,.14,3.6,wood,0,true);for(const dz of [-1.3,1.3])box(82.95,.48,z+dz,.66,.35,.12,metal);}
 // Alternating turf bands sit below the existing painted markings.
 for(let i=0;i<7;i++)box(99,.39,-31+i*6,26.8,.008,3,green);
 // Goal frames and open net lines behind the original goal mouths.
 const lines:number[]=[];
 const line=(a:number[],b:number[])=>lines.push(...a,...b);
 for(const sign of [-1,1]){
  const z=-10+sign*21,back=z+sign*1.4;
  for(const x of [96,102]){box(x,1.43,back,.07,2.10,.07,white);box(x,.43,(z+back)/2,.07,.07,1.4,white);}
  box(99,2.47,back,6,.07,.07,white);
  for(let x=96;x<=102.01;x+=.30)line([x,.43,back],[x,2.44,back]);
  for(let y=.43;y<=2.44;y+=.25){line([96,y,back],[102,y,back]);for(const x of [96,102])line([x,y,z],[x,y,back]);}
  for(let x=96;x<=102.01;x+=.30)line([x,2.44,z],[x,2.44,back]);
 }
 // Fine protective mesh on the football end fences, clear of lateral access.
 for(const z of [-34,14]){for(let x=85;x<=113;x+=.7)line([x,.4,z],[x,4.7,z]);for(let y=.6;y<=4.7;y+=.55)line([85,y,z],[113,y,z]);}
 // Raised perimeter of the sand bed stays outside the marked beach-tennis court.
 for(const x of [87.4,110.6])box(x,.45,31,.18,.12,27,stone);
 for(const z of [17.6,44.4])box(99,.45,z,23.2,.12,.18,stone);
 box(99,2.43,31,10,.065,.035,white);
 for(const x of [94,104])cylinder(x,.48,31,.24,.10,metal);
 // Pool lounge and decorated kiosk terrace; all pieces remain on dry paving.
 for(const [x,z] of [[40,-29],[56,-30]]){
  box(x,.66,z,4.2,.28,1.5,wood,0,true);box(x,.9,z,4,.23,1.4,linen,0,true);
  box(x,1.3,z-.65,4.2,.75,.18,linen,0,true);
  for(const dx of [-1.3,1.3])box(x+dx,1.27,z-.35,.6,.58,.20,green,.1,true);
  box(x,.63,z+2.1,2.5,.16,1.3,stone,0,true);
  for(const dx of [-.9,.9])box(x+dx,.45,z+2.1,.10,.36,.9,metal);
  cylinder(x,.80,z+2.1,.24,.22,wood);plants.push([x,.94,z+2.1,.5]);
 }
 // Porcelain continuation inside the quiosque, detailed counter front and service area.
 box(51,.625,-43,32,.03,11.8,porcelain);
 for(let x=39.1;x<49;x+=.22)box(x,1.15,-41.19,.065,1.05,.075,wood);
 box(49,2.06,-47.1,1.2,.72,.65,metal);box(49,2.45,-47.1,1.3,.07,.7,stone);
 for(const x of [41,43,45]){
  cylinder(x,1.86,-41.6,.18,.08,metal);
  cylinder(x+.30,1.94,-41.6,.065,.24,white);
 }
 for(const x of [37,67]){
  box(x,2.65,-43,.16,3.85,.16,wood);
  cylinder(x,.99,-37.1,.7,.65,stone);plants.push([x,1.32,-37.1,2.1]);
 }
 // Warm timber returns articulate the kiosk corners while the central opening stays clear.
 for(const x of [35,67])for(let z=-47.8;z<-39;z+=.38)box(x,2.75,z,.14,3.55,.11,wood);
 for(const x of [39,44,49,54,59,64]){
  box(x,5.24,-48.2,3,.28,.9,stone);plants.push([x,5.39,-48.2,1.25]);
 }
 // Umbrella ribs, tailored edge trim and small ivory M branding.
 const logoCanvas=document.createElement('canvas');logoCanvas.width=logoCanvas.height=128;
 const ctx=logoCanvas.getContext('2d')!;ctx.fillStyle='#f1e7cd';ctx.font='bold 90px Georgia';ctx.textAlign='center';ctx.fillText('M',64,100);
 const logoMap=own(new T.CanvasTexture(logoCanvas));logoMap.colorSpace=T.SRGBColorSpace;
 const logoMat=own(new T.MeshStandardMaterial({map:logoMap,transparent:true,alphaTest:.1,side:T.DoubleSide,depthWrite:false}));
 for(const z of [-10,8,25])for(const x of [29,74.3]){
  const trim=new T.TorusGeometry(2.05,.025,5,24);trim.rotateX(Math.PI/2);trim.translate(x,3.025,z);add(trim,linen);
  cylinder(x,.48,z,.48,.12,stone);
  for(let i=0;i<12;i++){
   const a=i*Math.PI/6,end=new T.Vector3(x+Math.cos(a)*2.05,3.02,z+Math.sin(a)*2.05);
   const curve=new T.LineCurve3(new T.Vector3(x,3.64,z),end);
   add(new T.TubeGeometry(curve,1,.014,4,false),wood);
  }
  const badge=new T.Mesh(own(new T.PlaneGeometry(.36,.36)),logoMat);badge.position.set(x,3.22,z+1.48);badge.rotation.x=-1.26;badge.userData.finishOnly=true;root.add(badge);
 }
 for(const [material,geometries] of batches){const flat=geometries.map(g=>{if(!g.index)return g;const f=g.toNonIndexed();g.dispose();return f;});const g=mergeGeometries(flat,false);flat.forEach(g=>g.dispose());if(!g)continue;const mesh=new T.Mesh(own(g),material);mesh.name='Leisure '+material.uuid;mesh.userData.finishOnly=true;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
 const net=new T.BufferGeometry();net.setAttribute('position',new T.Float32BufferAttribute(lines,3));const lineMesh=new T.LineSegments(own(net),own(new T.LineBasicMaterial({color:'#718077',transparent:true,opacity:.42})));lineMesh.userData.finishOnly=true;root.add(lineMesh);
 addMGalleryFoliage(root,own,plants);return root;
}
