import {buildMCommunity39} from './mCommunity39';
import {buildMCrown33} from './mCrown33';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Own} from './mSurfaces';
import {buildMReferencePodium} from './mReferencePodium';

/** Exterior reconstruction from the approved images. Separate from the earlier apartment
 * schedule: its areas and room plans must not be misrepresented as matching this envelope. */
export const M_REFERENCE={revision:39,width:28,depth:24,base:17,step:3.5,levels:22,rear:-14.3,front:9.7,projection:4.2,
 duplexes:[{floor:5,side:-1},{floor:11,side:1},{floor:17,side:-1}],galleryScaleY:1.25};

export function buildMReferenceArchitecture(scene:T.Scene,site:T.Group,own:Own){
 const R=M_REFERENCE;
 const solid=own(new T.MeshStandardMaterial({color:'#d9d5cd',roughness:1}));solid.name='Reference mineral structure';
 const timber=own(new T.MeshStandardMaterial({color:'#888075',roughness:1}));timber.name='Reference timber screens';
 const bronze=own(new T.MeshStandardMaterial({color:'#465052',roughness:1}));bronze.name='Reference bronze frames';
 const glass=own(new T.MeshStandardMaterial({color:'#8eacb3',transparent:true,opacity:.3,depthWrite:false,side:T.DoubleSide}));glass.name='Reference glazing';
 const water=own(new T.MeshStandardMaterial({color:'#879fa2',roughness:1}));water.name='Reference rooftop water';
 const white=own(new T.MeshStandardMaterial({color:'#faf9f3',roughness:1}));white.name='M monogram';
 const cube=own(new T.BoxGeometry(1,1,1));
 const box=(p:T.Group,name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material=solid)=>{
  const mesh=new T.Mesh(cube,m);mesh.name=name;mesh.position.set(x,y,z);mesh.scale.set(w,h,d);p.add(mesh);return mesh;
 };
 function shape(w:number,d:number,r:number){
  const a=w/2,b=d/2,s=new T.Shape();s.moveTo(-a+r,-b);s.lineTo(a-r,-b);s.quadraticCurveTo(a,-b,a,-b+r);s.lineTo(a,b-r);s.quadraticCurveTo(a,b,a-r,b);s.lineTo(-a+r,b);s.quadraticCurveTo(-a,b,-a,b-r);s.lineTo(-a,-b+r);s.quadraticCurveTo(-a,-b,-a+r,-b);return s;
 }
 const geometryCache=new Map<string,T.BufferGeometry>();
 function plate(p:T.Group,name:string,x:number,y:number,z:number,w:number,d:number,h:number,r=1.6,m:T.Material=solid,notch=0){
  const key=[w,d,h,r,notch].join(',');let geo=geometryCache.get(key);
  if(!geo){let s=shape(w,d,r);
   if(notch===2){
    // Upper penthouse slab ends at the glazing, with no exterior balcony on any side.
    s=new T.Shape();s.moveTo(-12,9.3);s.lineTo(12,9.3);s.lineTo(12,-6.6);s.lineTo(7.4,-6.6);s.lineTo(7.4,-2.8);s.lineTo(-7.4,-2.8);s.lineTo(-7.4,-6.6);s.lineTo(-12,-6.6);s.closePath();
   }else if(notch){
    // Keep the ordinary balcony on one side; only the duplex bay has a double-height void.
    const a=w/2,b=d/2,edge=1,frontCut=-4.3+z;
    s=new T.Shape();s.moveTo(-a+r,b);s.lineTo(a-r,b);s.quadraticCurveTo(a,b,a,b-r);s.lineTo(a,-b+r);s.quadraticCurveTo(a,-b,a-r,-b);s.lineTo(-edge,-b);s.lineTo(-edge,frontCut);s.lineTo(-a,frontCut);s.lineTo(-a,b-r);s.quadraticCurveTo(-a,b,-a+r,b);
    if(notch>0)s=new T.Shape(s.getPoints(10).map(v=>new T.Vector2(-v.x,v.y)).reverse());
   }
   geo=own(new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:10}));geo.rotateX(-Math.PI/2);geometryCache.set(key,geo);
  }
  const mesh=new T.Mesh(geo,m);mesh.name=name;mesh.position.set(x,y,z);p.add(mesh);return mesh;
 }
 function panel(p:T.Group,name:string,ax:number,az:number,bx:number,bz:number,y:number,height:number,m:T.Material=glass,thickness=.035){
  const o=box(p,name,(ax+bx)/2,y+height/2,(az+bz)/2,Math.hypot(bx-ax,bz-az),height,thickness,m);o.rotation.y=-Math.atan2(bz-az,bx-ax);return o;
 }
 function perimeterRail(p:T.Group,notch=0){
  const pts=shape(27.5,23.5,1.75).getPoints(10);
  for(let i=0;i<pts.length-1;i++){
   const a=pts[i],b=pts[i+1],az=-a.y-2.3,bz=-b.y-2.3;
   if(notch!==2&&notch&&((notch<0&&Math.min(a.x,b.x)<-1)||(notch>0&&Math.max(a.x,b.x)>1))&&Math.max(az,bz)>4.3)continue;
   if(notch===2&&Math.max(az,bz)>4.3)continue;
   // Rear central spine interrupts the rail instead of passing through it.
   if(az<-13.5&&bz<-13.5&&Math.min(a.x,b.x)<2.5&&Math.max(a.x,b.x)>-2.5){
    panel(p,'Rear guard left',-12,-14.05,-2.6,-14.05,.51,1.12);panel(p,'Rear guard right',2.6,-14.05,12,-14.05,.51,1.12);continue;
   }
   panel(p,'Balcony guard',a.x,az,b.x,bz,.51,1.12);panel(p,'Balcony rail',a.x,az,b.x,bz,1.62,.04,bronze,.045);
  }
 }
 function batch(p:T.Group){
  const groups=new Map<T.Material,T.Mesh[]>();
  for(const c of p.children)if(c instanceof T.Mesh&&!Array.isArray(c.material)){const list=groups.get(c.material)||[];list.push(c);groups.set(c.material,list);}
  for(const [m,list] of groups){if(list.length<2)continue;const copies=list.map(o=>{o.updateMatrix();let g=o.geometry.clone().applyMatrix4(o.matrix);if(g.index){const flat=g.toNonIndexed();g.dispose();g=flat;}return g;});const g=mergeGeometries(copies,false);copies.forEach(g=>g.dispose());if(g){const mesh=new T.Mesh(own(g),m);mesh.name=m.name;p.add(mesh);list.forEach(o=>p.remove(o));}}
 }
 const floors=Array.from({length:R.levels},(_,i)=>{
  const p=new T.Group();p.name=`M_Floor_${String(i+1).padStart(2,'0')}`;p.position.y=R.base+i*R.step;p.userData.floor=i+1;scene.add(p);return p;
 });
 floors.forEach((p,i)=>{
  const level=i+1,duplex=R.duplexes.find(d=>level===d.floor||level===d.floor+1),upper=duplex&&level===duplex.floor+1,notch=level===22?2:upper?duplex.side:0;
  const width=level===19?30:level===20?32:level>=21?34:28;p.scale.x=width/28;
  p.userData.envelope={width,depth:R.depth,duplex:!!duplex||level>=21,penthouseUpper:level===22,notch,revision:R.revision};
  box(p,'Interior core reservation',0,1.75,-5,4.5,3.5,6,solid);
  plate(p,'Continuous curved floor band',0,-.16,-2.3,28,24,.66,1.85,solid,notch);
  plate(p,'Recessed soffit',0,-.23,-2.3,27.75,23.75,.075,1.75,timber,notch);
  // Broad glazing belongs to the exterior study, not the old bathrooms/room arrangement.
  for(let k=0;k<10;k++){
   const x=-10.8+k*2.4,active=(level>=21&&Math.abs(x)<7.4)||(duplex&&(duplex.side<0?x<-1:x>1));
   if((upper||level===22)&&active)continue;
   const h=active?6.48:2.98;
   box(p,'Front glazing',x,.52+h/2,4.5,2.34,h,.035,glass);box(p,'Front mullion',x-1.2,.52+h/2,4.54,.07,h,.14,bronze);
  }
  for(const side of [-1,1]){
   for(let k=0;k<7;k++){
    const z=-10.45+k*2.3;box(p,'Side glazing',side*12,.52+1.49,z,.035,2.98,2.24,glass);box(p,'Side mullion',side*12.05,2.01,z-1.15,.12,2.98,.07,bronze);
   }
   for(let k=0;k<4;k++){
    const x=side*(3.85+k*2.25);box(p,'Rear panoramic bay',x,2.01,-11.6,2.19,2.98,.035,glass);box(p,'Rear mullion',x-side*1.125,2.01,-11.64,.07,2.98,.14,bronze);
   }
   for(let k=0;k<6;k++)box(p,'Front continuous timber pier',side*(10.45+k*.27),1.75,4.9,.13,3.5,.55,timber);
   for(let k=0;k<8;k++)box(p,'Side vertical screen',side*12.13,1.75,-5.25+k*.27,.43,3.5,.12,timber);
   box(p,'Rear corner pier',side*12.1,1.75,-11.6,.35,3.5,.45,solid);
  }
  box(p,'Rear vertical core',0,1.75,-12.9,4.7,3.5,3,bronze);
  for(let k=0;k<17;k++)box(p,'Rear continuous fins',-2.35+k*.293,1.75,-14.53,.13,3.5,.43,timber);
  if(level!==22)perimeterRail(p,notch);
  // Architectural planters are volumes only; no vegetation is added to this structural review.
  for(const side of [-1,1]){
   if(notch!==2&&!(notch===side))plate(p,'Front corner planter',side*11.2,.50,8.75,3.8,1.25,.62,.5);
   if(level!==22)plate(p,'Rear corner planter',side*10.7,.50,-13.25,4,1.2,.62,.5);
  }
  if(duplex&&level===duplex.floor){
   const s=duplex.side,g=new T.Group();g.name=`M duplex pavilion ${level}-${level+1}`;p.add(g);
   // The projection grows out of a two-storey pavilion, with paired lower and roof slabs.
   const x=s*10.35;
   plate(g,'Duplex projected terrace',x,-.16,6.3,15.7,6.8,.66,.8);
   plate(g,'Duplex canopy',x,6.84,6.3,15.7,6.8,.66,.8);
   plate(g,'Duplex canopy soffit',x,6.76,6.3,15.4,6.6,.08,.7,timber);
   box(g,'Duplex outer pier',s*16.9,3.5,3.05,.4,6.68,.7,timber);
   for(let k=0;k<9;k++)box(g,'Duplex full-height inner screen',s*(1.25+k*.21),3.5,4.96,.10,7,.48,timber);
   panel(g,'Projected terrace front guard',s*2.5,9.55,s*18.2,9.55,.5,1.12);
   panel(g,'Projected terrace outer guard',s*18.03,3.0,s*18.03,9.2,.5,1.12);
   // A recessed side glass return closes the room beneath the projecting canopy.
   panel(g,'Duplex lateral double glazing',s*12.0,3.08,s*16.6,3.08,.52,6.48);
   g.userData={start:level,end:level+1,side:s,projection:4.2,canopyHeight:7};batch(g);
  }
  if(level===21){for(let step=0;step<20;step++)box(p,'Penthouse connecting stair',5.8,.5+(step+1)*.175-.075,4.5-step*.22,1.4,.15,.23,timber);}
  if(level===22)panel(p,'Penthouse mezzanine guard',-7.4,.48,7.4,.48,.5,1.1);
  batch(p);
 });
 const crown=new T.Group();crown.name='M_Crown';crown.position.y=R.base+R.levels*R.step;scene.add(crown);
 function logo(parent:T.Group,x:number,y:number,z:number,scale:number){
  const curve=new T.CatmullRomCurve3([new T.Vector3(-3.6,0,0),new T.Vector3(-3.6,4.3,0),new T.Vector3(-2.8,4.7,.05),new T.Vector3(0,1.2,.4),new T.Vector3(2.7,4.4,.08),new T.Vector3(3.6,4.6,0),new T.Vector3(3.6,0,0)],false,'centripetal');
  const pos:number[]=[],idx:number[]=[];
  for(let i=0;i<=100;i++){const t=i/100,p=curve.getPoint(t),v=curve.getTangent(t),n=new T.Vector3(-v.y,v.x,0).normalize();for(const d of [-.14,.14])for(const side of [-1,1]){const q=p.clone().addScaledVector(n,.47*side);pos.push(q.x,q.y,q.z+d);}if(i<100){const a=i*4,b=a+4;idx.push(a,b,a+1,a+1,b,b+1,a+2,a+3,b+2,a+3,b+3,b+2,a,a+2,b,a+2,b+2,b,a+1,b+1,a+3,a+3,b+1,b+3);}}
  const geo=own(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();const mesh=new T.Mesh(geo,white);mesh.name='M monogram';mesh.position.set(x,y,z);mesh.scale.setScalar(scale);parent.add(mesh);
 }
 buildMCrown33(crown,own,{solid,timber,bronze,glass,water},logo);
 const hall=buildMReferencePodium(site,own,{solid,timber,bronze,glass},logo);
 buildMCommunity39(site,own,{solid,timber,bronze,glass});return {floors,crown,hall};
}





