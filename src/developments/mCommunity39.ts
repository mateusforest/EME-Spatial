import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {mGalleryContour} from './mReferencePodium';
import {addMGalleryFoliage} from './mGalleryFoliage';
import type {Own} from './mSurfaces';
type Palette={solid:T.Material;timber:T.Material;bronze:T.Material;glass:T.Material};
export function communityKit(root:T.Group,own:Own,finish=false){
 const batches=new Map<T.Material,T.BufferGeometry[]>();
 const put=(g:T.BufferGeometry,m:T.Material)=>{const a=batches.get(m)||[];a.push(g);batches.set(m,a);};
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,a=0)=>{const g=new T.BoxGeometry(w,h,d);g.rotateY(a);g.translate(x,y,z);put(g,m);};
 const slab=(s:T.Shape,y:number,h:number,m:T.Material)=>{const g=new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:8});g.rotateX(-Math.PI/2);g.translate(0,y,0);put(g,m);};
 const flush=()=>{for(const [m,gs]of batches){const flat=gs.map(g=>{g.deleteAttribute('uv');if(!g.index)return g;const f=g.toNonIndexed();g.dispose();return f;});const g=mergeGeometries(flat);flat.forEach(g=>g.dispose());if(g){const o=new T.Mesh(own(g),m);o.userData.finishOnly=finish;o.castShadow=!m.transparent;o.receiveShadow=true;root.add(o);}}};
 return {box,slab,flush};
}
/** Shared structural level: residential floor one starts above this common pavilion. */
export function buildMCommunity39(site:T.Group,own:Own,m:Palette){
 const root=new T.Group();root.name='M community level architecture';site.add(root);
 const {box,slab,flush}=communityKit(root,own);
 for(const side of ['left','right'] as const){
  const roof=side==='left'?9.6:8.9;slab(mGalleryContour(side,true),roof,10.25-roof,m.solid);
  const pts=mGalleryContour(side,true,.2).getSpacedPoints(100);
  for(let i=0;i<pts.length-1;i++){
   const a=pts[i],b=pts[i+1],x=(a.x+b.x)/2,z=-(a.y+b.y)/2;
   if(Math.abs(x)<13.5&&z<5)continue;
   const angle=Math.atan2(b.y-a.y,b.x-a.x),len=a.distanceTo(b);
   box(x,10.82,z,len,1.12,.035,m.glass,angle);
   box(x,11.4,z,len,.09,.13,m.timber,angle);
   if(i%2===0)box(a.x,10.82,-a.y,.055,1.12,.055,m.bronze);
  }
 }
 box(0,10.125,-2.3,25,.25,24,m.solid);
 // Pavilion set back from terrace edges; front doors and side openings remain clear.
 for(const z of [-11.7,4.3])for(let i=0;i<10;i++){
  const x=-10.8+i*2.4;if(z>0&&Math.abs(x)<2)continue;
  box(x,13.53,z,2.32,6.56,.04,m.glass);box(x-1.2,13.53,z,.07,6.56,.1,m.bronze);
 }
 for(const x of [-12,12])for(const z of [-10,-7,-4,3]){
  box(x,13.53,z,.04,6.56,2.9,m.glass);box(x,13.53,z-1.5,.1,6.56,.07,m.bronze);
 }
 box(0,10.95,-6,4.4,11.7,4,m.solid);
 box(0,10.82,9.5,10,1.12,.035,m.glass);box(0,11.4,9.5,10,.09,.13,m.timber);
 // Shared lift/core reservation continues to the new level.
 for(const side of [-1,1]){
  const x=side*18.5;
  for(const dx of [-3.7,3.7])for(const z of [-5.7,1.7])box(x+dx,11.75,z,.18,3,.18,m.timber);
  for(const z of [-5.7,1.7])box(x,13.22,z,7.8,.24,.22,m.timber);
  for(let dx=-3.7;dx<=3.8;dx+=.38)box(x+dx,13.38,-2,.10,.22,7.8,m.timber);
 }
 flush();return root;
}
export function finishMCommunity39(site:T.Group,own:Own){
 const root=new T.Group();root.name='M community gym cafe finishes';root.userData.finishOnly=true;site.add(root);
 const mat=(color:string)=>own(new T.MeshStandardMaterial({color,roughness:.8}));
 const wood=mat('#9b7955'),linen=mat('#e3d9c6'),green=mat('#174c38'),metal=mat('#394540'),rubber=mat('#303532'),stone=mat('#d7cfbc');
 const {box,flush}=communityKit(root,own,true);
 const seat=(x:number,y:number,z:number,w=1.1)=>{box(x,y+.28,z,w,.35,.86,wood);box(x,y+.5,z,w-.12,.2,.8,linen);box(x,y+.85,z-.4,w, .7,.16,linen);};
 const table=(x:number,y:number,z:number,w=1.3,d=.8)=>{box(x,y+.68,z,w,.1,d,wood);for(const dx of [-w*.36,w*.36])box(x+dx,y+.34,z,.08,.68,.5,metal);};
 for(const side of [-1,1]){
  const x=side*18.5,y=10.25;
  seat(x,y,-4,3);seat(x-2.2,y,-1);seat(x+2.2,y,-1);table(x,y,-1.8,1.8,1);
  table(x,y,6,2.6,1.1);for(const dx of [-.85,.85]){seat(x+dx,y,5);seat(x+dx,y,7.2);}
 }
 box(0,11.35,-3.97,1.7,2.2,.035,metal);box(0,11.35,-3.94,.025,2.2,.02,green);
 // Central common room lounge; leave the doors/core circulation open.
 seat(-7,10.25,-7,3);seat(7,10.25,-7,3);table(-7,10.25,-5);table(7,10.25,-5);
 // MGym in upper right gallery, clear of the stair void at x8..12,z2..7.
 for(const x of [16,19,22]){
  box(x,5.18,10,1.6,.12,2.8,rubber);box(x,5.4,10,1.05,.22,2,metal);
  for(const dx of [-.5,.5])box(x+dx,5.97,9.2,.055,1.25,.055,metal);
  box(x,6.58,9.2,1.1,.12,.4,metal);box(x,6.72,9.24,.45,.25,.03,green);
 }
 for(const x of [17,21]){
  box(x,5.27,4.5,2.2,.25,2.8,rubber);box(x,5.7,4.5,.65,.28,1.5,linen);
  for(const dx of [-.9,.9])box(x+dx,6.3,3.8,.1,2.3,.1,metal);
  box(x,7.4,3.8,2,.1,.1,metal);
  for(const dx of [-.7,.7])box(x+dx,6.75,3.8,.23,.48,.48,rubber);
 }
 // Cafe tables and counter in the ground floor, separate from the entry/stair route.
 box(20,1.45,4,5,1.2,1,green);box(20,2.1,4,5.2,.12,1.15,stone);
 for(const x of [16,20,24]){table(x,.825,11,1,1);seat(x-.85,.825,11);seat(x+.85,.825,11);}
 // Approach: dry waiting seats and planted threshold outside the clear central route.
 for(const x of [-7.5,7.5]){box(x,.9,18,3.1,.35,1.3,stone);seat(x,1.08,18,2.6);}
 for(const x of [-5.4,5.4]){box(x,1.25,16.7,.75,1.8,.75,stone);box(x,2.18,16.7,.82,.12,.82,green);}
 flush();
 const foliage:number[][]=[];
 for(const side of ['left','right'] as const)for(const p of mGalleryContour(side,true,.7).getSpacedPoints(60)){
  if(Math.abs(p.x)>14||-p.y>10)foliage.push([p.x,10.3,-p.y,1.3]);
 }
 addMGalleryFoliage(root,own,foliage);
 const sign=(text:string,x:number,y:number,z:number,w:number)=>{
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d')!;
  ctx.fillStyle='#174c38';ctx.font='500 82px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,66);
  const map=own(new T.CanvasTexture(c));map.colorSpace=T.SRGBColorSpace;
  const material=own(new T.MeshStandardMaterial({map,transparent:true,alphaTest:.1,roughness:.55,depthWrite:false}));
  const o=new T.Mesh(own(new T.PlaneGeometry(w,w/4)),material);o.position.set(x,y,z);root.add(o);
 };
 sign('MGym',20,8.47,14.59,3.3);sign('MCoffe',20,4.73,16.87,3.5);
 root.traverse(o=>{if(o instanceof T.Mesh){o.userData.finishOnly=true;o.castShadow=!((o.material as T.Material).transparent);o.receiveShadow=true;}});
}
