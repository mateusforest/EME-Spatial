import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {M_SITE} from './mSiteLayout';
import type {Own} from './mSurfaces';

export function enrichMNeighborhood(parent:T.Group,own:Own,height:(x:number,z:number)=>number){
 const root=new T.Group();root.name='M neighborhood details web37';parent.add(root);
 const material=(color:string)=>own(new T.MeshStandardMaterial({color,roughness:.87}));
 const stone=material('#c6c2b7'),wood=material('#928066'),metal=material('#4e5a53'),white=material('#e2dfce'),green=material('#74876c'),body=material('#899c96'),skin=material('#b69d85');
 const batches=new Map<T.Material,T.BufferGeometry[]>();
 const add=(g:T.BufferGeometry,m:T.Material)=>{const a=batches.get(m)||[];a.push(g);batches.set(m,a);};
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material){const g=new T.BoxGeometry(w,h,d);g.translate(x,y,z);add(g,m);}
 function cyl(x:number,y:number,z:number,r:number,h:number,m:T.Material){const g=new T.CylinderGeometry(r,r,h,10);g.translate(x,y,z);add(g,m);}
 function bench(x:number,y:number,z:number){for(let k=0;k<4;k++)box(x,y+.49,z-.24+k*.16,2.2,.065,.13,wood);box(x,y+.8,z-.33,2.2,.52,.08,wood);for(const dx of [-.8,.8])box(x+dx,y+.25,z,.06,.5,.55,metal);}
 function person(x:number,y:number,z:number,shirt=body){cyl(x,y+1.10,z,.19,.62,shirt);cyl(x,y+1.6,z,.13,.25,skin);for(const dx of [-.10,.10])cyl(x+dx,y+.44,z,.065,.82,metal);for(const dx of [-.25,.25])cyl(x+dx,y+1,z,.055,.54,shirt);}
 // Broad public sidewalk on both sides, with an unobstructed garage crossing.
 box(38,.26,66,320,.22,5.5,stone);
 for(const [x,w] of [[-80,72],[-16,24],[62,116]])box(x,.27,47, w,.22,3.5,stone);
 box(0,.26,47,8,.20,3.5,stone);box(-32,.225,47,8,.09,3.5,stone);
 for(let x=-118;x<195;x+=8)box(x,.224,56,3,.018,.13,white);
 for(const z of [49.4,62.6])box(38,.224,z,318,.018,.12,white);
 for(let z=50;z<63;z+=1.25)box(0,.23,z,5,.02,.65,white);
 for(let x=-112;x<190;x+=4){box(x,.376,66,.022,.008,5.4,wood);}
 for(const x of [-18,24,65,108]){
  box(x,.40,47,3.4,.25,1.8,stone);box(x,.54,47,3.12,.035,1.52,green);
  cyl(x,2.9,64.5,.055,5.45,metal);box(x,5.63,64.05,1.1,.1,.45,metal);
  bench(x+5,.37,66.5);cyl(x+7,.78,66.5,.22,.8,metal);
 }
 // A few parked/moving-in-place cars convey scale, without an animation loop.
 for(const [x,z] of [[-52,59.5],[49,52.4],[89,59.5]]){
  box(x,.76,z,4.1,.8,1.8,body);box(x-.15,1.35,z,2.15,.53,1.65,metal);
  for(const dx of [-1.28,1.28])for(const dz of [-.85,.85]){const g=new T.CylinderGeometry(.34,.34,.16,12);g.rotateX(Math.PI/2);g.translate(x+dx,.51,z+dz);add(g,metal);}
 }
 for(const [x,z] of [[7,66],[9,66.8],[56,66],[94,46]])person(x,.38,z);
 // Lake lookout pergola sits on the existing deck, with clear central circulation.
 const [dx,dz]=M_SITE.lake.deck,dy=height(dx,dz)+.36;
 for(const x of [dx-5.5,dx+5.5])for(const z of [dz-2.6,dz+2.6])box(x,dy+1.5,z,.16,3,.16,wood);
 for(let x=dx-5.8;x<dx+5.9;x+=.55)box(x,dy+3.05,dz,.14,.16,6.2,wood);
 person(dx-1,dy,dz+.4);person(dx+.5,dy,dz+.8,white);
 // Golf tees and rest points beside existing paths, not across the playing lanes.
 M_SITE.golf.forEach((hole,i)=>{
  const [x,z]=hole.tee,y=height(x,z);
  for(const offset of [-1,1])cyl(x+offset,y+.13,z,.13,.22,white);
  const sx=x+(i===2?12:-12),sy=height(sx,z);bench(sx,sy,z);person(sx+1.7,sy,z+1.3);
 });
 // Signage with simple pictograms integrates landmarks into the landscape.
 function sign(x:number,z:number,title:string,icon:'golf'|'lake'|'arrival'){
  const y=height(x,z);box(x,y+.8,z,.08,1.6,.08,metal);
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const c=canvas.getContext('2d')!;
  c.fillStyle='#304b40';c.fillRect(0,0,256,128);c.strokeStyle='#e4ddc8';c.lineWidth=4;c.beginPath();
  if(icon==='golf'){c.moveTo(124,65);c.lineTo(124,15);c.lineTo(151,25);c.lineTo(124,34);}
  else if(icon==='lake'){for(let j=0;j<3;j++){c.moveTo(95,23+j*13);c.bezierCurveTo(110,10+j*13,125,36+j*13,155,23+j*13);}}
  else{c.moveTo(101,61);c.lineTo(101,20);c.lineTo(128,45);c.lineTo(151,20);c.lineTo(151,61);}c.stroke();
  c.fillStyle='#e4ddc8';c.textAlign='center';c.font='18px sans-serif';c.fillText(title,128,104);
  const map=own(new T.CanvasTexture(canvas));map.colorSpace=T.SRGBColorSpace;const mat=own(new T.MeshStandardMaterial({map,roughness:1,side:T.DoubleSide}));
  const mesh=new T.Mesh(own(new T.PlaneGeometry(2.7,1.35)),mat);mesh.position.set(x,y+1.75,z);root.add(mesh);
 }
 sign(9,46,'EME · ACESSO','arrival');sign(68,-60,'LAGO · MIRANTE','lake');sign(-57,19,'GOLFE','golf');
 for(const [m,parts] of batches){const flat=parts.map(g=>{if(!g.index)return g;const n=g.toNonIndexed();g.dispose();return n;});const g=mergeGeometries(flat,false);flat.forEach(g=>g.dispose());if(g){const mesh=new T.Mesh(own(g),m);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}}
 return root;
}
