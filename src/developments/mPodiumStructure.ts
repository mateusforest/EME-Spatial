import * as T from 'three';
import type {Own} from './mSurfaces';
import {M_STRUCTURE as S} from './mStructureSchedule';

/** Circulation and podium volumes; no claim of structural load-bearing design. */
export function buildMPodiumStructure(parent:T.Group,own:Own,m:{stone:T.Material;bronze:T.Material;glass:T.Material}){
 const group=new T.Group();group.name='M podium circulation web17';parent.add(group);
 const cube=own(new T.BoxGeometry(1,1,1));
 const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,material=m.stone)=>{
  const mesh=new T.Mesh(cube,material);mesh.name=name;mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=!material.transparent;mesh.receiveShadow=true;group.add(mesh);return mesh;
 };
 // Central floor and upper rear landing join both gallery wings; the front lobby remains double-height.
 box('Podium central ground',0,.43,-2.5,9.6,.46,20);
 box('Podium upper rear connection',0,4.05,-4.35,9.6,.65,15.3);
 box('Podium central roof',0,7.61,-2.5,9.6,.78,20);
 for(const x of [-4.45,4.45])for(const z of [-9.7,.4,6.9])box('Podium pier',x,4.03,z,.42,6.74,.55);
 // Infill at rear leaves a central glazed entrance and circulation between the wings.
 for(const x of [-3.55,3.55])box('Podium rear infill',x,4.03,-12.38,2.5,6.74,.24);
 box('Podium rear upper glazing',0,5.66,-12.4,4.45,3.05,.04,m.glass);
 for(const x of [-2.27,2.27])box('Rear portal jamb',x,2.18,-12.37,.12,3.04,.22,m.bronze);
 box('Rear portal lintel',0,3.76,-12.37,4.65,.16,.22,m.bronze);
 // U stair inside the right wing. Its hole is cut through both the upper slab and soffit in mGallery.
 const stair=new T.Group();stair.name='M gallery stair 22 risers';group.add(stair);
 const s=S.stair,rise=(S.gallery.upper-S.gallery.ground)/s.risers,half=s.risers/2;
 const addStep=(name:string,x:number,top:number,z:number,w:number,d:number)=>{
  const o=box(name,x,top-.08,z,w,.16,d);group.remove(o);stair.add(o);
 };
 for(let i=0;i<half;i++){
  addStep('Gallery lower flight',8.95,S.gallery.ground+(i+1)*rise,8.35-i*s.tread,s.flightWidth,s.tread+.01);
  addStep('Gallery upper flight',10.75,S.gallery.ground+(half+i+1)*rise,5.55+i*s.tread,s.flightWidth,s.tread+.01);
 }
 addStep('Gallery intermediate landing',9.85,S.gallery.ground+half*rise,4.65,3.3,1.52);
 // Guards follow each flight and the landing. The arrival at the upper floor stays open.
 function rail(name:string,a:T.Vector3,b:T.Vector3){const d=b.clone().sub(a);const o=box(name,...a.clone().add(b).multiplyScalar(.5).toArray() as [number,number,number],.055,d.length(),.055,m.bronze);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());}
 for(const x of [8.18,9.72,9.98,11.52]){
  const upper=x>9.8;
  for(let i=0;i<=10;i+=2){const y=S.gallery.ground+(upper?half+i+1:i+1)*rise,z=upper?5.55+i*s.tread:8.35-i*s.tread;box('Stair baluster',x,y+.5,z,.035,1,.035,m.bronze);}
  rail('Stair handrail',new T.Vector3(x,S.gallery.ground+(upper?half+1:1)*rise+1,upper?5.55:8.35),new T.Vector3(x,S.gallery.ground+(upper?22:11)*rise+1,upper?8.35:5.55));
 }
 for(const x of [8.1,11.7]){box('Upper stair void guard',x,S.gallery.upper+.55,6.05,.045,1.1,4.5,m.glass);box('Upper stair void rail',x,S.gallery.upper+1.12,6.05,.055,.045,4.5,m.bronze);}
 box('Upper landing guard',9.9,S.gallery.upper+.55,3.8,3.6,1.1,.045,m.glass);
 box('Intermediate landing guard',9.85,S.gallery.ground+11*rise+.55,3.92,3.3,1.1,.045,m.glass);
 group.userData.structureRevision=S.revision;
 stair.userData={risers:s.risers,rise,tread:s.tread,ground:S.gallery.ground,upper:S.gallery.upper};
 return group;
}
