import * as T from 'three';
import {communityKit} from './mCommunity39';
import {addMGalleryFoliage} from './mGalleryFoliage';
import type {Own} from './mSurfaces';
/** Local, static amenity layout. Clear circulation separates pets, play and family seating. */
export function finishMPatio40(site:T.Group,own:Own){
 const root=new T.Group();root.name='M Patio family and arrival web40';site.add(root);
 const mat=(color:string)=>own(new T.MeshStandardMaterial({color,roughness:.83}));
 const wood=mat('#9e7c55'),green=mat('#28583f'),sage=mat('#8a9c79'),sand=mat('#d7c6a3'),clay=mat('#b77858'),metal=mat('#454b41'),cream=mat('#e3d9c4');
 const glow=own(new T.MeshStandardMaterial({color:'#ffe0a3',emissive:'#ffd494',emissiveIntensity:1.7}));
 const {box,flush}=communityKit(root,own,true);
 const mesh=(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number)=>{const o=new T.Mesh(own(g),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;root.add(o);return o;};
 const bench=(x:number,z:number,w=3)=>{box(x,.6,z,w,.2,.85,wood);box(x,.95,z-.4,w,.65,.12,wood);for(const dx of [-w*.38,w*.38])box(x+dx,.35,z,.12,.5,.6,metal);};
 const pergola=(x:number,z:number,w:number,d:number,y=3.4)=>{
  for(const dx of [-w/2,w/2])for(const dz of [-d/2,d/2])box(x+dx,y/2+.2,z+dz,.18,y,.18,wood);
  for(const dx of [-w/2,w/2])box(x+dx,y+.22,z,.2,.26,d+.4,wood);
  for(let dz=-d/2;dz<=d/2;dz+=.38)box(x,y+.36,z+dz,w+.6,.2,.10,wood);
 };
 // Rear garden: play court on the east, pets isolated toward the garage-side corner.
 box(0,.24,-32,22,.2,19,sand);box(0,.355,-32,20,.03,17,sage);
 box(0,.38,-31,9,.025,12,clay);
 for(const x of [-10.5,10.5])for(let z=-41;z<=-24;z+=1.4){box(x,.8,z,.08,1.1,.08,wood);}
 for(const x of [-10.5,10.5])box(x,1.25,-32.5,.1,.1,18,wood);
 // Low play tower, ladder, slide and a two-seat swing.
 box(-2,1.45,-29,2.8,.18,2.8,wood);
 for(const x of [-3.2,-.8])for(const z of [-30.2,-27.8])box(x,1.6,z,.13,2.8,.13,wood);
 box(-2,3.1,-29,3.3,.16,3.3,green);
 for(const x of [-3.1,-.9])box(x,2,-29,.08,.95,2.6,wood);
 for(let i=0;i<5;i++)box(-2,.4+i*.23,-30.7,1.4,.09,.13,wood);
 const slide=mesh(new T.BoxGeometry(1.2,.10,3.4),clay,-2,.87,-26.5);slide.rotation.x=.36;
 for(const x of [-2.65,-1.35]){const rail=mesh(new T.BoxGeometry(.08,.22,3.4),wood,x,1.02,-26.5);rail.rotation.x=.36;}
 for(const x of [2.6,7.4])for(const z of [-35.6,-33.6])box(x,1.6,z,.13,2.9,.13,wood);
 box(5,3.05,-34.6,5.2,.16,.18,wood);
 for(const x of [3.8,6.2]){for(const dx of [-.33,.33])box(x+dx,1.92,-34.6,.025,2.16,.025,metal);box(x,.8,-34.6,.9,.12,.45,green);}
 for(let i=0;i<5;i++)mesh(new T.CylinderGeometry(.38,.42,.24,12),wood,-6,.48,-35+i*1.4);
 // Shaded family lounge, with visual contact to the play space and an open route behind.
 box(18,.24,-27,11,.18,10,sand);pergola(18,-27,8,7);
 bench(16,-29,3);bench(20,-29,3);box(18,.85,-25,3,.15,1.6,wood);
 for(const x of [16.8,19.2])box(x,.5,-25,.12,.7,1.2,metal);
 bench(18,-23.5,3);box(12.2,.22,-44,35,.14,2.5,sand);
 box(0,.22,-45,2.5,.14,6,sand);
 // Pet enclosure: explicit opening with short offset gate, drinking bowl and agility play.
 box(-24,.23,-35,15,.18,15,sand);box(-24,.34,-35,13.8,.04,13.8,sage);
 for(const x of [-31,-17]){box(x,1.6,-35,.09,.08,14,metal);box(x,.45,-35,.09,.08,14,metal);for(let z=-42;z<=-28;z+=.65)box(x,.93,z,.04,1.45,.04,wood);}
 for(const z of [-42,-28]){
  for(let x=-31;x<=-17;x+=.65){if(z===-42&&x>-26&&x<-23)continue;box(x,.93,z,.04,1.45,.04,wood);}
  for(const x of [-28.7,-20])box(x,1.6,z,4.6,.08,.08,wood);
 }
 box(-24.5,.92,-43,3,1.4,.08,metal);box(-27,.92,-42.5,.08,1.4,1.2,metal);
 box(-24,.22,-45,2.5,.14,5,sand);
 bench(-28,-30,3);
 mesh(new T.TorusGeometry(.85,.08,7,24),clay,-23,1.3,-34);
 for(const x of [-23.8,-22.2])box(x,.67,-34,.07,1.1,.07,metal);
 for(let i=0;i<5;i++)box(-26,.85,-39+i*1.4,.07,1.2,.07,wood);
 mesh(new T.CylinderGeometry(.42,.42,.15,20),metal,-29,.44,-39);
 mesh(new T.CylinderGeometry(.35,.35,.02,20),sage,-29,.52,-39);
 // Entry portal: projected timber canopy, fluted cheeks and planted threshold.
 pergola(0,12.8,9.4,5.4,4.8);
 for(const x of [-4.7,4.7])for(let dz=0;dz<1.6;dz+=.20)box(x,2.8,9.2+dz,.12,4.6,.09,wood);
 box(0,4.93,15.66,9.9,.5,.15,wood);
 for(const x of [-4.7,4.7]){box(x,.72,15.5,1,.7,1,cream);box(x,4.68,12.7,.04,.035,4.5,glow);}
 for(const x of [-4,4])for(const z of [22,29,36,43]){
  box(x,.24,z,.95,.25,.95,green);box(x,.43,z-.55,.22,.18,.22,metal);box(x,.53,z-.55,.15,.04,.15,glow);
  box(x* .84,.68,z+.8,.11,.95,.11,metal);box(x*.84,1.13,z+.8,.16,.12,.16,glow);
 }
 flush();
 addMGalleryFoliage(root,own,[[-4.7,1.1,15.5,1.5],[4.7,1.1,15.5,1.5],[-12,.25,-32,1.5],[-13,.25,-35,1.5],[-14,.25,-38,1.5]]);
 const label=(text:string,x:number,y:number,z:number,w:number,reverse=false)=>{
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d')!;
  c.fillStyle='#eee4ca';c.font='48px Georgia';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,64);
  const map=own(new T.CanvasTexture(canvas));map.colorSpace=T.SRGBColorSpace;
  const m=own(new T.MeshStandardMaterial({map,transparent:true,alphaTest:.1,depthWrite:false,roughness:.8}));
  const o=mesh(new T.PlaneGeometry(w,w/4),m,x,y,z);if(reverse)o.rotation.y=Math.PI;
 };
 label('P Á T I O',0,4.94,15.75,3.1);
 for(const [x,z,text]of [[0,-42,'Pátio Kids'],[-24,-44,'Pátio Pet']] as const){
  // Sign boards are added separately after batching.
  const board=mesh(new T.BoxGeometry(2.5,.7,.1),green,x,1.7,z);
  mesh(new T.BoxGeometry(.09,1.3,.09),wood,x,.8,z);
  label(text,x,1.7,z-.06,2.3,true);void board;
 }

 root.traverse(o=>{if(o instanceof T.Mesh){o.userData.finishOnly=true;o.castShadow=!(o.material as T.Material).transparent;}});
 return root;
}
