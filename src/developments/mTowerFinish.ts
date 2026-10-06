import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Own} from './mSurfaces';
import {M_REFERENCE} from './mReferenceArchitecture';
import {addMGalleryFoliage} from './mGalleryFoliage';

/** Small facade layers belong to each floor so sectioning removes them together.
 * No slab, envelope, opening, duplex projection or apartment area is altered. */
export function finishMTower(floors:T.Group[],own:Own,finishStone:(m:T.MeshStandardMaterial)=>void){
 const frame=own(new T.MeshStandardMaterial({color:'#55584d',roughness:.4,metalness:.55}));frame.name='Facade bronze tracks';
 const joint=own(new T.MeshStandardMaterial({color:'#a19e91',roughness:1}));joint.name='Facade mineral joints';
 const fabric=own(new T.MeshStandardMaterial({color:'#d0c7b5',roughness:1}));fabric.name='Facade recessed linen';
 const soil=own(new T.MeshStandardMaterial({color:'#44493a',roughness:1}));soil.name='Facade planter soil';
 const paving=own(new T.MeshStandardMaterial({color:'#c5bfae',roughness:.9}));paving.name='Facade terrace limestone';finishStone(paving);
 floors.forEach((floor,index)=>{
  const group=new T.Group();group.name='M facade finish '+(index+1);group.userData.finishOnly=true;floor.add(group);
  const batches=new Map<T.Material,T.BufferGeometry[]>();
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material)=>{
   const g=new T.BoxGeometry(w,h,d);g.translate(x,y,z);const list=batches.get(m)||[];list.push(g);batches.set(m,list);
  };
  const duplex=M_REFERENCE.duplexes.find(d=>index+1===d.floor||index===d.floor);
  const upper=duplex&&index===duplex.floor,notch=floor.userData.envelope.notch;
  // Thin surface overlays keep the approved slab footprint and its duplex void intact.
  const tile=(x:number,z:number,w=1.2,d=1.2)=>{
   const g=new T.PlaneGeometry(w-.014,d-.014);g.rotateX(-Math.PI/2);g.translate(x,.505,z);
   const pos=g.attributes.position,uv=g.attributes.uv;
   for(let i=0;i<pos.count;i++)uv.setXY(i,pos.getX(i)/2.5,pos.getZ(i)/2.5);
   const list=batches.get(paving)||[];list.push(g);batches.set(paving,list);
  };
  for(let col=0;col<16;col++){
   const x=-9+col*1.2;if((notch===2)||(notch&&Math.sign(x)===notch))continue;
   for(const z of [5.3,6.5,7.7,8.9])tile(x,z);
  }
  // Bronze shoe beneath the front glass, inside the slab edge. No posts in the view.
  for(const side of [-1,1])if(notch!==2&&notch!==side&&!(duplex&&!upper&&duplex.side===side))box(side*6,.55,9.44,12,.07,.075,frame);
  // Reveal the stone panel module without outlining each slab in black.
  for(let x=-12;x<=12;x+=2.4)if(!(notch===2)&&!(notch&&Math.sign(x)===notch))box(x,.17,9.703,.012,.59,.012,joint);
  for(const side of [-1,1])for(let z=-11.3;z<=6.7;z+=3){
   if(notch===2||(notch===side&&z>4.3))continue;
   box(side*14.003,.17,z,.012,.59,.014,joint);
  }
  for(let k=0;k<10;k++){
   const x=-10.8+k*2.4,active=(index>=20&&Math.abs(x)<7.4)||(duplex&&(duplex.side<0?x<-1:x>1));
   if((upper||index===21)&&active)continue;
   const height=active?6.48:2.98;
   for(const y of [.57,.49+height])box(x,y,4.565,2.34,.065,.14,frame);
   // Folded side curtains add depth behind selected bays without inventing rooms.
   if((k+index)%3!==1){
    const direction=(k+index)%2===0?-1:1;
    for(let fold=0;fold<6;fold++)box(x+direction*(1.05-fold*.095),.56+height/2,4.08+(fold%2)*.065,.10,height-.10,.055,fabric);
   }
  }
  for(const side of [-1,1]){
   // Recessed rails fix the timber fins without interrupting their vertical rhythm.
   for(const y of [.64,3.25]){
    box(side*11.125,y,4.66,1.56,.065,.10,frame);
    box(side*12.01,y,-4.305,.10,.065,2.03,frame);
   }
   for(let k=0;k<4;k++)for(const y of [.57,3.45])box(side*(3.85+k*2.25),y,-11.66,2.19,.065,.14,frame);
   for(const z of [-11.58,3.45])for(const y of [.57,3.45])box(side*12.06,y,z,.14,.065,1.8,frame);
   // Existing planter top surfaces, not additional balcony projections.
   if(notch!==2&&notch!==side)box(side*11.2,1.126,8.75,3.1,.012,.78,soil);
   if(notch!==2)box(side*10.7,1.126,-13.25,3.3,.012,.76,soil);
  }
  if(duplex&&!upper){
   const side=duplex.side;
   for(const y of [.55,1.64]){
    box(side*10.35,y,9.55,15.7,.045,.06,frame);
    box(side*18.03,y,6.1,.06,.045,6.2,frame);
   }
   for(const y of [.57,6.95])box(side*14.3,y,3.12,4.6,.065,.12,frame);
   for(const x of [13.15,15.45])box(side*x,3.76,3.12,.055,6.48,.12,frame);
   // The projecting terrace has its own paving; the unbuilt upper void stays empty.
   for(const x of [14.6,15.8,17])for(const z of [4.1,5.3,6.5,7.7,8.9])tile(side*x,z);
  }
  for(const [material,geometries] of batches){
   const flat=geometries.map(g=>{const f=g.toNonIndexed();g.dispose();return f;});
   const merged=mergeGeometries(flat,false);flat.forEach(g=>g.dispose());if(!merged)continue;
   const mesh=new T.Mesh(own(merged),material);mesh.name=material.name;mesh.userData.finishOnly=true;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  }
  const plants:number[][]=[];
  for(const side of [-1,1])if(notch!==2&&notch!==side)for(const dx of [-1,0,1])plants.push([side*11.2+dx,1.135,8.7,1.2]);
  addMGalleryFoliage(group,own,plants);
 });
}



