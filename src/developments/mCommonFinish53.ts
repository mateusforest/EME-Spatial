import * as T from 'three';
import {craft53} from './mCraft53';
import {addMGalleryFoliage} from './mGalleryFoliage';
import type {mSurfaces,Own} from './mSurfaces';

/** Human-scale detail on the existing dry terraces; entrance and pool routes stay clear. */
export function commonFinish53(scene:T.Scene,own:Own,surfaces:ReturnType<typeof mSurfaces>,deckY:number){
 const root=new T.Group();root.name='M53 common spaces and lakeside furniture';scene.add(root);
 const mat=(name:string,color:string,roughness=.7,metalness=0)=>{const m=own(new T.MeshStandardMaterial({color,roughness,metalness}));m.name=name;return m;};
 const stone=mat('M53 honed limestone','#e7deca'),wood=mat('M53 natural oak','#d7b188'),linen=mat('M53 woven outdoor linen','#e3dcc9'),olive=mat('M53 olive upholstery','#637154'),bronze=mat('M53 brushed bronze','#726246',.38,.65),ceramic=mat('M53 glazed ceramics','#72837b',.3),soil=mat('M53 planter soil','#3c3427');
 surfaces.finishStone(stone);surfaces.finishWood(wood);wood.color.set('#dec3a0');surfaces.finishLinen(linen);surfaces.finishLinen(olive);
 const lamp=mat('M53 warm screened lanterns','#fff4d8');lamp.emissive.set('#ffd9a1');lamp.emissiveIntensity=2.4;
 const k=craft53(root,own),b=k.box,plants:number[][]=[];
 function cyl(x:number,y:number,z:number,r:number,h:number,m:T.Material,r2=r){const g=new T.CylinderGeometry(r,r2,h,24);g.translate(x,y,z);k.add(g,m);}
 function lantern(x:number,y:number,z:number){b(x,y+.16,z,.18,.3,.18,lamp);b(x,y+.34,z,.28,.045,.28,bronze);b(x,y-.01,z,.28,.035,.28,bronze);for(const dx of [-.105,.105])for(const dz of [-.105,.105])b(x+dx,y+.16,z+dz,.015,.32,.015,bronze);}
 function vessel(x:number,y:number,z:number,r:number,h:number){cyl(x,y+h/2,z,r,h,ceramic,r*.7);cyl(x,y+h+.003,z,r*.9,.014,soil);plants.push([x,y+h,z,r*2.2]);}
 // Books, stone trays, sculptural vases and floor lights decorate the existing lobby lounges.
 for(const [x,z]of[[-16.4,6.2],[20.6,10.25]]){
  b(x-.27,1.30,z,.47,.06,.31,olive,.16);b(x-.27,1.34,z,.45,.025,.30,linen,-.08);
  cyl(x+.29,1.30,z+.1,.20,.045,bronze);vessel(x+.12,1.29,z-.31,.13,.25);
  cyl(x+3.15,.87,z-1.45,.25,.07,bronze);cyl(x+3.15,1.75,z-1.45,.022,1.73,bronze);
  const shade=new T.CylinderGeometry(.22,.38,.42,24);shade.translate(x+3.15,2.63,z-1.45);k.add(shade,linen);cyl(x+3.15,2.41,z-1.45,.24,.025,lamp);
 }
 // Reception hardware and task lamp remain behind the counter.
 b(-1.3,2.19,3.05,.65,.34,.04,bronze,-.12);b(-1.3,2.02,3.0,.16,.15,.16,bronze);vessel(.55,2.03,3.4,.15,.28);
 // Light cabanas frame two existing sofa groups on the north dry deck.
 for(const [x,z]of[[40,-29],[56,-30]]){
  for(const dx of [-2.75,2.75])for(const dz of [-2.25,2.25]){b(x+dx,2.08,z+dz,.12,3.4,.12,wood);b(x+dx,.46,z+dz,.18,.16,.18,bronze);}
  for(const dz of [-2.25,2.25])b(x,3.78,z+dz,5.68,.20,.14,wood);
  for(let dx=-2.7;dx<=2.71;dx+=.30)b(x+dx,3.85,z,.095,.13,4.65,wood);
  for(const dx of [-2.5,2.5])b(x+dx,3.67,z,.025,.025,4.25,lamp);
  lantern(x+1.7,.4,z+1.15);
 }
 // Lane markers terminate under water; a continuous coping apron closes the old 1 m gap.
 const outer=[[32,-20],[62,-20],[62,-27],[72,-27],[72,31],[62,31],[62,22],[32,22]];
 const inner=[[32.55,-19.45],[62.55,-19.45],[62.55,-26.45],[71.45,-26.45],[71.45,30.45],[62.55,30.45],[62.55,21.45],[32.55,21.45]];
 const shape=new T.Shape(outer.map(([x,z])=>new T.Vector2(x,-z)));shape.holes.push(new T.Path(inner.map(([x,z])=>new T.Vector2(x,-z))));
 const apron=new T.ExtrudeGeometry(shape,{depth:.10,bevelEnabled:true,bevelSize:.015,bevelThickness:.015,bevelSegments:2,curveSegments:1});apron.rotateX(-Math.PI/2);apron.translate(0,.47,0);k.add(apron,stone);
 // Discreet linear underwater luminaires and an accessible edge shower on the dry north terrace.
 for(const z of [-14,-3,8,18]){b(32.20,-.14,z,.035,.11,.6,lamp);b(71.8,-.14,z,.035,.11,.6,lamp);}
 for(const x of [31.4,76.7]){cyl(x,.46,-25,.42,.055,stone);k.pipe(new T.Vector3(x,.5,-25),new T.Vector3(x,2.65,-25),.034,bronze);k.pipe(new T.Vector3(x,2.65,-25),new T.Vector3(x,2.65,-24.65),.026,bronze);cyl(x,2.63,-24.65,.14,.025,bronze);}
 for(const z of [-18,-4,10,24]){b(78.8,.57,z,1.25,.35,3.1,stone);b(78.8,.756,z,1.03,.025,2.87,soil);plants.push([78.8,.79,z,1.35]);}
 // New low armchairs face the lake, separated from the existing rear benches and access.
 for(const x of [58,66]){
  const z=-71.25,y=deckY+.12;
  for(const dx of [-.46,.46])for(const dz of [-.40,.40])b(x+dx,y+.22,z+dz,.055,.42,.055,wood);
  b(x,y+.45,z,1.03,.14,1.05,wood);b(x,y+.57,z,.94,.19,.93,linen,0,.07);b(x,y+.92,z+.43,1.03,.65,.14,olive,0,.055);
  for(const dx of [-.54,.54]){b(x+dx,y+.8,z,.065,.08,1.07,wood);for(let q=0;q<8;q++)b(x+dx,y+.6,z-.4+q*.115,.018,.36,.018,bronze);}
  cyl(x+(x<62?1.3:-1.3),y+.54,z,.39,.075,stone);cyl(x+(x<62?1.3:-1.3),y+.3,z,.10,.48,bronze);
 }
 for(const x of [56.3,67.7]){lantern(x,deckY+.13,-68.8);vessel(x,deckY+.12,-72.7,.3,.52);}
 // Water-facing guardrail closes the deck edge while preserving the landward approach.
 for(const x of [56.2,59.1,62,64.9,67.8])b(x,deckY+.69,-73.13,.045,1.14,.045,bronze);
 for(const y of [.34,.64,1.25])b(62,deckY+y,-73.13,11.6,.028,.028,bronze);
 k.flush();addMGalleryFoliage(root,own,plants);
 // A few area lights distribute warm light across large occupied spaces.
 for(const [x,y,z,w,h,intensity]of[[-16,4.15,6,10,5,2.8],[20,4.15,9,10,6,2.8],[51,4.4,-43,28,9,3.2],[62,2.8,-69.5,9,5,1.5]]){
  const light=new T.RectAreaLight('#ffdcaa',intensity,w,h);light.position.set(x,y,z);light.rotation.x=-Math.PI/2;light.userData.nightOnly=true;root.add(light);
 }
 const poolLight=new T.RectAreaLight('#9eced2',1.8,26,38);poolLight.position.set(49,.18,1);poolLight.rotation.x=-Math.PI/2;poolLight.userData.nightOnly=true;root.add(poolLight);
 // Upgrade pre-existing common-space surfaces without touching architectural transforms.
 const touched=new Set<T.Material>();scene.traverse(o=>{if(!(o instanceof T.Mesh))return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
  if(!(m instanceof T.MeshStandardMaterial))continue;
  if(['Campus oak','Campus limestone','Campus paths'].includes(m.name)){
   o.updateMatrix();const g=own(o.geometry.clone()),p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=new Float32Array(p.count*2),v=new T.Vector3();
   for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrix);uv[i*2]=(Math.abs(n.getX(i))>.5?v.z:v.x)/2.5;uv[i*2+1]=(Math.abs(n.getY(i))>.5?v.z:v.y)/2.5;}
   g.setAttribute('uv',new T.BufferAttribute(uv,2));o.geometry=g;
  }
  if(touched.has(m))continue;touched.add(m);
  if(['Campus oak','Gallery oak joinery'].includes(m.name))surfaces.finishWood(m);
  if(['Campus limestone','Campus paths'].includes(m.name))surfaces.finishStone(m);
  if(m.name==='Gallery linen seating')surfaces.finishLinen(m);
  if(m.name==='Lobby green mineral reception'){surfaces.finishStone(m);m.color.set('#224838');m.roughness=.38;}
 }});
 root.userData.revision=53;return root;
}
