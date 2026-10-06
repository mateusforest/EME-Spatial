import {refinePatio53} from './mPatioRefinement53';
import {addMGalleryFoliage} from './mGalleryFoliage';
import {landscapeMPatio46} from './mCondominiumLandscape46';
import {grassSurface51} from './mGround51';
import * as T from 'three';
import {refineMCondominium45} from './mCondominiumFinish45';
import {communityKit} from './mCommunity39';
import type {Own,mSurfaces} from './mSurfaces';
export const PATIO_PLOTS=Array.from({length:24},(_,i)=>({
 id:i+1,x:[-121,-97,-73,-49,-25,25,49,73,97,121,145,169][i%12],
 z:i<12?92:183,built:[0,2,5,8,10,13,15,18,20,23].includes(i),width:22,depth:30,
}));
/** Single conceptual layout across the public street. Images guide character, not surveyed dimensions. */
export function buildMCondominium42(parent:T.Group,own:Own,surfaces:ReturnType<typeof mSurfaces>){
 const root=new T.Group();root.name='M Patio housing condominium web43';root.userData={plots:24,houses:10,available:14};parent.add(root);
 const mat=(color:string)=>own(new T.MeshStandardMaterial({color,roughness:.82}));
 const stone=mat('#d6cfbe'),wood=mat('#98714c'),green=mat('#315e3c'),grass=grassSurface51(own),asphalt=mat('#636664'),paving=mat('#c2bcae'),metal=mat('#3b4b43'),water=mat('#479eaa');
 const streetGlow=own(new T.MeshStandardMaterial({color:'#fff1d3',emissive:'#ffdcad',emissiveIntensity:2.5}));
 const fabric=mat('#e4ddcb'),accent=mat('#a59a80'),leaves=mat('#527849');
 stone.name='Pátio honed limestone';wood.name='Pátio natural oak';paving.name='Pátio stone paving';fabric.name='Pátio linen';
 const glass=own(new T.MeshStandardMaterial({color:'#8faeaf',transparent:true,opacity:.48,roughness:.24,metalness:.15,depthWrite:false}));
 const {box,flush}=communityKit(root,own);
 box(25,.04,139,366,.15,132,grass);
 // Continuous loop road with sidewalks. A separate central arrival crosses the north row gap.
 for(const z of [115,160]){box(25,.16,z,330,.14,13,paving);box(25,.24,z,330,.04,8,asphalt);}
 for(const x of [-140,190]){box(x,.16,137.5,13,.14,58,paving);box(x,.24,137.5,8,.04,53,asphalt);}
 box(0,.16,92,17,.14,46,paving);box(0,.24,92,10,.04,46,asphalt);
 for(const z of [73,205])for(const [x,w]of (z===73?[[-83,150],[109.5,197]]:[[25,366]])){
  box(x,1.35,z,w,2.5,.3,stone);box(x,2.65,z,w,.16,.48,green);
 }
 for(const x of [-158,208]){box(x,1.35,139,.3,2.5,132,stone);box(x,2.65,139,.48,.16,132,green);}
 // Entrance pavilion beside the drive, leaving both lanes clear.
 // Wider entry canopy, with a dedicated pedestrian passage east of both lanes.
 box(-10.2,.36,80,6,.4,8,stone);box(-10.2,2.0,80,5.6,3.1,6,glass);
 box(-12.95,2.0,80,.22,3.1,6,wood);box(-10.2,2.0,82.95,5.6,3.1,.22,stone);
 box(-10.2,1.2,81.6,4,1.1,.65,wood);
 box(0,4.1,80,26,.4,10,stone);box(0,3.86,80,25.5,.10,9.6,wood);
 for(const x of [-6.1,6.1])box(x,2.04,80,.35,3.7,.45,wood);
 box(8.8,.26,77.5,2.4,.16,18,paving);
 for(const z of [73.8,84.2])box(8.8,3.5,z,3.1,.2,.4,wood);
 for(const x of [7.3,10.3])for(const z of [73.8,84.2])box(x,1.93,z,.18,3.2,.18,wood);
 // Curved mineral eastern pier is provided by the landscape pass.
 // Barrier arms are shown raised; there is no obstruction across the open access.
 for(const x of [-5.4,5.4]){box(x,.8,81,.35,1.1,.4,metal);box(x,2.5,81,.10,3,.12,stone);}
 // Lot lawns, low markers and pedestrian/vehicle approaches.
 for(const p of PATIO_PLOTS){
  box(p.x,.15,p.z,p.width,.16,p.depth,paving);box(p.x,.255,p.z,p.width-.35,.03,p.depth-.35,grass);
  for(const dx of [-10.8,10.8])box(p.x+dx,.42,p.z,.15,.34,30,stone);
  const front=p.z+(p.id<=12?14:-14);
  box(p.x-8,.82,front,.55,1.2,.55,stone);
  if(p.built)box(p.x,.28,front,7,.08,7,paving);
  else{box(p.x,.95,front,2.5,.8,.07,green);box(p.x,.51,front,.08,.75,.08,wood);}
 }
 // Shared leisure island between streets, with clear setbacks to both carriageways.
 box(18,.29,137.5,93,.35,31,paving);
 box(30,.51,138,34,.3,19,stone);box(30,.675,138,32.5,.025,17.5,water);
 box(-9,.54,136,27,.35,20,stone);box(-9,4.1,136,29,.36,21,stone);
 box(-9,4.34,136,24,.10,16,green);box(-9,2.35,128,25,3.45,.20,wood);
 for(const x of [-21,3])for(const z of [128,144])box(x,2.3,z,.22,3.5,.22,metal);
 box(-9,1.3,130,14,1.2,1.1,wood);
 for(const x of [16,24,32,40]){
  box(x,.64,150,1.3,.3,2.3,wood);box(x,.85,150,1.2,.16,2.2,stone);
  box(x,2.15,150,.06,2.9,.06,metal);box(x,3.55,150,3.2,.15,3.2,green);
 }
 // A small play garden and a shaded family table at the other end of the common island.
 box(91,.25,137,24,.22,23,paving);box(85,.47,137,9,.16,13,wood);
 for(const x of [82,87])box(x,1.85,137,.15,2.8,.15,wood);box(84.5,3.25,137,5.5,.15,.16,wood);
 for(const x of [83.3,85.7]){box(x,1.9,137,.035,2.4,.035,metal);box(x,.72,137,.8,.15,.5,green);}
 for(const x of [96,104])for(const z of [132,142])box(x,1.9,z,.2,3.3,.2,wood);
 for(let z=132;z<=142;z+=.5)box(100,3.7,z,8.5,.17,.10,wood);
 box(100,1,137,4,.18,1.7,wood);for(const z of [135.5,138.5])box(100,.6,z,4,.18,.65,stone);
 // Club seating, dining and circulation links to the shared facilities.
 for(const x of [-17,-7]){
  box(x,.98,137,4,.55,1.5,wood);box(x,1.3,137,3.8,.16,1.35,fabric);box(x,1.6,136.35,4,.75,.16,fabric);
  box(x,.9,140,2.6,.18,1.2,wood);for(const dx of [-.95,.95])box(x+dx,.64,140,.12,.55,.7,metal);
 }
 for(const x of [-17,-12,-7,-2]){box(x,1,132,.65,.15,.65,wood);box(x,.7,132,.12,.6,.12,metal);}
 for(const x of [55,65]){
  box(x,.34,137,2.4,.2,29,paving);
  box(x,1.1,137,2.1,.18,2.1,stone);
  for(const dx of [-1.5,1.5]){box(x+dx,.75,137,.75,.25,.75,wood);box(x+dx,1.1,137.35,.75,.65,.12,fabric);}
 }
 box(122,.25,137,3,.15,29,paving);
 for(const z of [124,151])for(const x of [-112,-82,-52,125,150,175]){
  box(x,.62,z,3.2,.22,.8,wood);for(const dx of [-1.2,1.2])box(x+dx,.4,z,.12,.45,.65,metal);
  box(x,.89,z+.32,3.2,.55,.10,wood);
 }
 for(let x=-128;x<186;x+=24)for(const z of [108,167]){
  box(x,2.55,z,.12,4.6,.12,metal);box(x,4.85,z,.7,.16,.7,streetGlow);
  box(x,.44,z+ (z===108?-1.8:1.8),3.5,.6,1.2,stone);
  box(x,.86,z+(z===108?-1.8:1.8),3.2,.3,1,leaves);
 }
 // Dashed center lines and crossing markings remain below wheel height.
 for(const z of [115,160])for(let x=-126;x<181;x+=10){if(Math.abs(x)<9)continue;box(x,.268,z,3,.01,.1,stone);}
 for(const x of [57,122])for(const z of [115,160])for(let dz=-3;dz<=3;dz+=1)box(x,.271,z+dz,2.4,.01,.45,stone);
 // Low planting borders leave the pool deck, club entrances and roads open.
 for(const x of [-27,68]){box(x,.7,138,1,.55,20,stone);box(x,1.1,138,.85,.35,19.7,leaves);}
 flush();
 for(const p of PATIO_PLOTS.filter(p=>p.built)){
  const h=new T.Group();h.name='Pátio house '+p.id;h.position.set(p.x,0,p.z);if(p.id>12)h.rotation.y=Math.PI;root.add(h);
  const k=communityKit(h,own),b=k.box,variant=p.id%3,upper=variant===0?accent:stone;
  h.userData.variant=variant;
  // Ground floor with an integrated double garage, recessed entrance and living room.
  b(0,.48,0,15,.4,15,stone);b(0,3.65,0,15.8,.32,16.2,stone);
  b(0,6.9,-.8,15.8,.32,14.9,upper);
  for(const y of [2,5.28]){
   // Side and rear windows occupy real openings between masonry piers.
   for(const x of [-6.8,6.8]){
    for(const z of [-5,1,5.5])b(x,y,z,.24,3,z===1?2:2.5,upper);
    for(const z of [-2,3.25]){b(x,y,z,.04,2.15,2.8,glass);b(x,y-1.32,z,.24,.36,2.8,upper);b(x,y+1.32,z,.24,.36,2.8,upper);b(x,y,z,.09,2.2,.07,metal);}
   }
   for(const x of [-5.7,0,5.7])b(x,y,-6.8,2.2,3,.24,upper);
   for(const x of [-3,3]){b(x,y,-6.8,3.4,2.4,.04,glass);b(x,y-1.38,-6.8,3.4,.24,.24,upper);b(x,y+1.38,-6.8,3.4,.24,.24,upper);b(x,y,-6.83,.07,2.45,.1,metal);}
  }
  // Garage door is separate from pedestrian access; driveway reaches the lot frontage.
  b(-3.5,1.86,5.6,5.7,2.65,.18,metal);
  for(let y=.65;y<3.1;y+=.19)b(-3.5,y,5.72,5.6,.10,.07,wood);
  b(-3.5,.32,10,6.2,.16,8.4,paving);
  b(.5,1.84,4.65,1.5,2.65,.16,wood);b(1.05,1.85,4.78,.055,.65,.07,metal);
  b(.5,3.15,5.8,2.1,.18,2.8,wood);
  for(let z=6;z<14;z+=1.15)b(.5,.36,z,1.5,.16,.95,stone);
  b(4.25,1.95,5.4,4.1,2.65,.04,glass);
  for(const x of [2.2,4.25,6.3])b(x,1.95,5.45,.07,2.7,.10,metal);
  // Upper bedroom glazing and continuous protected terrace, with return guards.
  b(0,5.23,4.7,12.8,2.7,.04,glass);
  for(const x of [-6.4,-3.2,0,3.2,6.4])b(x,5.23,4.75,.07,2.8,.10,metal);
  const screenX=variant===1?4.8:-4.8;
  for(let dx=-1.4;dx<1.5;dx+=.25)b(screenX+dx,5.25,4.95,.12,2.9,.23,wood);
  b(0,4.3,7.65,15,1.1,.035,glass);b(0,4.88,7.65,15,.07,.08,metal);
  for(const x of [-7.5,7.5]){b(x,4.3,6.2,.035,1.1,2.9,glass);b(x,4.88,6.2,.08,.07,2.9,metal);}
  if(variant!==1){for(let x=-7;x<=7;x+=.55)b(x,6.78,6.25,.12,.16,3.2,wood);}
  // Roof parapets enclose a shallow green roof rather than an exposed slab.
  for(const x of [-7.65,7.65])b(x,7.22,-.8,.16,.45,14.9,upper);
  for(const z of [-8.15,6.55])b(0,7.22,z,15.3,.45,.16,upper);
  b(0,7.1,-1.4,11,.08,9,green);
  // Outdoor living furniture and planted beds stay within each plot.
  for(const x of [-4,3.5]){b(x,4.03,6.1,2,.35,.85,wood);b(x,4.25,6.1,1.9,.15,.78,fabric);b(x,4.55,5.75,2,.65,.12,fabric);}
  b(0,4.09,6.3,1.2,.35,.75,wood);
  for(const x of [-8.8,8.8]){
   b(x,.52,5.8,1.2,.65,9,stone);b(x,.855,5.8,1,.018,8.6,green);
  }
  for(const x of [-5.8,5.8])b(x,3.97,6.6,1.2,.35,.9,stone);
  b(0,.31,-10.8,14,.15,6.5,wood);
  if(p.id%2){b(1,.47,-11.2,8,.28,4,stone);b(1,.625,-11.2,7.4,.025,3.4,water);}
  else{b(0,.88,-11,2.8,.14,1.4,stone);for(const z of [-9.7,-12.3])b(0,.6,z,2.8,.25,.55,wood);}
  for(const x of [-6,6])for(const z of [-8.5,-13.5])b(x,1.98,z,.16,3.2,.16,wood);
  for(let x=-6;x<=6;x+=.6)b(x,3.66,-11,.11,.17,5.5,wood);
  k.flush();
  addMGalleryFoliage(h,own,[...[-8.8,8.8].flatMap(x=>[2,3.7,5.4,7.1,8.8,9.8].map(z=>[x,.86,z,1.9])),...[-5.8,5.8].map(x=>[x,4.16,6.6,1.35])]);
 }
 const label=(text:string,x:number,y:number,z:number,w:number,reverse=false,color='#f5edda')=>{
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d')!;
  ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='48px Georgia';ctx.fillText(text,256,64);
  const map=own(new T.CanvasTexture(c));map.colorSpace=T.SRGBColorSpace;
  const m=own(new T.MeshStandardMaterial({map,transparent:true,alphaTest:.1,depthWrite:false}));
  const o=new T.Mesh(own(new T.PlaneGeometry(w,w/4)),m);o.position.set(x,y,z);if(reverse)o.rotation.y=Math.PI;root.add(o);
 };
 label('PÁTIO',0,4.13,74.79,6,true,'#254c38');

 for(const p of PATIO_PLOTS.filter(p=>!p.built))label('DISPONÍVEL',p.x,.97,p.z+(p.id<=12?14.04:-14.04),2.3,p.id>12);
 refineMCondominium45(root,own);
 landscapeMPatio46(root,own);
 refinePatio53(root,own,surfaces);return root;
}
