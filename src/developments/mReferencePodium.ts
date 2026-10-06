import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Own} from './mSurfaces';

/** Front reference takes precedence: left wing is higher/recessed, right wing wider/forward.
 * World +Z is arrival. These are image-led working dimensions, not surveyed dimensions. */
export const M_PODIUM={revision:19,ground:.825,upper:5.1,leftRoof:9.6,rightRoof:8.9,centralRoof:10,risers:26};
export function mGalleryContour(side:'left'|'right',upper=false,inset=0){
  const s=new T.Shape();const move=(x:number,z:number)=>s.moveTo(x,-z),line=(x:number,z:number)=>s.lineTo(x,-z),curve=(ax:number,az:number,bx:number,bz:number,x:number,z:number)=>s.bezierCurveTo(ax,-az,bx,-bz,x,-z);
  if(side==='left'){
   move(-5.0,-13.8);line(-21.9,-13.8);curve(-25.9,-13.8,-26.0,-12,-26,-9.8);line(-26,7.9);
   curve(-26,10.9,-24.2,12.3,-21.6,12.3);line(-14.1,12.3);
   curve(-9.9,12.3,-10.2,10.2,-7.4,10.2);curve(-5.7,10.2,-5.0,9.8,-5.0,8.8);line(-5,-13.8);
  }else{
   move(5.0,-13.8);line(24.1,-13.8);curve(27.6,-13.8,28.4,-12.4,28.4,-9.2);line(28.4,11.8);
   curve(28.4,15.6,27.1,16.8,23.8,16.8);line(14.0,16.8);
   curve(9.7,16.8,9.7,13.3,7.1,12.8);curve(5.2,12.4,5.0,10.8,5.0,9.2);line(5,-13.8);
  }
  s.closePath();const center=side==='left'?-15.5:16.7;
  // Upper wing is independently recessed: broad terrace on the right, narrow return on the left.
  const sx=upper?(side==='left'?.965:.96):1,sz=upper?(side==='left'?.965:.93):1,back=upper?(side==='left'?.55:1.15):0;
  return new T.Shape(s.getPoints(16).map(p=>new T.Vector2(center+(p.x-center)*(sx-inset/12),(p.y+back)*(sz-inset/17))));
 }

type Palette={solid:T.Material;timber:T.Material;bronze:T.Material;glass:T.Material};
export function buildMReferencePodium(site:T.Group,own:Own,m:Palette,logo:(p:T.Group,x:number,y:number,z:number,s:number)=>void){
 const root=new T.Group();root.name='M asymmetric reference podium';root.userData.revision=19;site.add(root);
 const cube=own(new T.BoxGeometry(1,1,1));
 const group=(name:string)=>{const g=new T.Group();g.name=name;root.add(g);return g;};
 const box=(p:T.Group,name:string,x:number,y:number,z:number,w:number,h:number,d:number,mat=m.solid)=>{const o=new T.Mesh(cube,mat);o.name=name;o.position.set(x,y,z);o.scale.set(w,h,d);p.add(o);return o;};
 // Different authored contours; neither wing is a mirror or a scaled duplicate of the other.
 const contour=mGalleryContour;
 function hole(s:T.Shape){s.holes.push(new T.Path([new T.Vector2(7.9,-1.65),new T.Vector2(11.6,-1.65),new T.Vector2(11.6,-7.05),new T.Vector2(7.9,-7.05)]));}
 function slab(p:T.Group,name:string,s:T.Shape,y:number,h:number,mat=m.solid){const geo=own(new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:8}));geo.rotateX(-Math.PI/2);const mesh=new T.Mesh(geo,mat);mesh.name=name;mesh.position.y=y;p.add(mesh);return mesh;}
 function band(p:T.Group,name:string,side:'left'|'right',upper:boolean,y:number,h:number,width:number){const outer=contour(side,upper),inner=contour(side,upper,width);outer.holes.push(new T.Path(inner.getPoints().reverse()));return slab(p,name,outer,y,h);}
 function linePanel(p:T.Group,name:string,a:T.Vector2,b:T.Vector2,y:number,h:number,mat:T.Material,d=.035){const mid=a.clone().add(b).multiplyScalar(.5),o=box(p,name,mid.x,y+h/2,-mid.y,a.distanceTo(b),h,d,mat);o.rotation.y=Math.atan2(b.y-a.y,b.x-a.x);return o;}
 function glazing(p:T.Group,side:'left'|'right',upper:boolean,bottom:number,top:number){
  const points=contour(side,upper,1.0).getSpacedPoints(92);
  for(let i=0;i<points.length-1;i++){
   const a=points[i],b=points[i+1],mid=a.clone().add(b).multiplyScalar(.5);
   // Connection to the central circulation stays open behind the entrance cheeks.
   if(Math.abs(mid.x)<6.4&&-mid.y>-1&&-mid.y<7)continue;
   linePanel(p,'Recessed curved glazing',a,b,bottom,top-bottom,m.glass);
   box(p,'Gallery vertical mullion',a.x,(bottom+top)/2,-a.y,.065,top-bottom,.09,m.bronze);
  }
 }
 for(const side of ['left','right'] as const){
  const wing=group('M reference '+side+' gallery'),roof=side==='left'?M_PODIUM.leftRoof:M_PODIUM.rightRoof;
  wing.userData={side,roof,front:side==='left'?12.3:16.8};
  slab(wing,'Gallery ground slab',contour(side),.545,.28);
  const mezz=contour(side);if(side==='right')hole(mezz);slab(wing,'Gallery mezzanine with stair void',mezz,4.4,.7);
  const soffit=contour(side,false,.12);if(side==='right')hole(soffit);slab(wing,'Gallery recessed mezzanine soffit',soffit,4.30,.08,m.timber);
  slab(wing,'Independent curved roof',contour(side,true),roof-.9,.9);
  slab(wing,'Gallery roof soffit',contour(side,true,.12),roof-.99,.075,m.timber);
  band(wing,'Continuous terrace planter lip',side,false,5.1,.36,.52);
  band(wing,'Roof garden edge',side,true,roof,.30,.50);
  glazing(wing,side,false,.825,4.28);glazing(wing,side,true,5.1,roof-1.02);
  const xs=side==='left'?[-23,-15,-7.3]:[7.1,16,25.5];
  for(const x of xs)for(const z of [-10,7.1])box(wing,'Gallery pier',x,(roof+.825)/2,z,.28,roof-.825,.40);
  // Solid backing only at the rear service strip, leaving curved corners and frontage transparent.
  box(wing,'Rear service wall',side==='left'?-15.5:17,4.4,-7.8,side==='left'?17:19,7.15,.18);
 }
 const hall=group('M reference double-height lobby');hall.userData.clearWidth=9.3;
 box(hall,'Central ground continuity',0,.685,-.4,10.1,.28,26.8);
 box(hall,'Rear mezzanine connection',0,4.75,-6.1,10.1,.7,15.4);
 box(hall,'Lobby ceiling under first tower slab',0,9.65,-2.3,11.0,.30,24.0);
 for(const [x,z,w,d] of [[-5.1,9.0,.8,2.2],[5.0,8.8,.65,2.0]]){
  box(hall,'Integrated portal pier',x,5.15,z,w,8.65,d);
  for(let k=0;k<6;k++)box(hall,'Portal recessed vertical screen',x+(x<0?.53:-.48),5.0,z-.8+k*.22,.10,8.3,.09,m.timber);
 }
 // Portal glazing is recessed under the first balcony instead of projecting as an isolated canopy.
 for(const [x,w] of [[-3.3,2.9],[3.25,2.8]])box(hall,'Lobby fixed glass',x,5.13,8.9,w,8.55,.035,m.glass);
 box(hall,'Lobby upper glass',0,6.85,8.9,3.4,5.1,.035,m.glass);
 for(const x of [-4.7,-1.75,1.75,4.65])box(hall,'Continuous portal mullion',x,5.13,8.96,.07,8.55,.14,m.bronze);
 box(hall,'Door transom',0,4.24,8.96,3.5,.08,.14,m.bronze);
 for(const x of [-1.3,1.3]){const door=box(hall,'Open entrance door',x,2.5,9.42,1.25,3.35,.04,m.glass);door.rotation.y=x<0?-.7:.7;}
 for(let i=0;i<5;i++)box(hall,'Arrival step',0,.3+(i+1)*.105/2,15.03-i*.45,10.6,(i+1)*.105,.47);
 box(hall,'Reception feature wall',-.65,4.8,1.8,5.8,7.95,.25);box(hall,'Reception desk',-.65,1.4,3.4,3.8,1.15,1.1,m.bronze);logo(hall,-.65,2.6,1.95,.20);
 // Wing-specific low approach beds underline the stagger instead of mirrored oval objects.
 for(const [x,z,w,d] of [[-8.1,13.4,4.4,2.0],[8.7,16.5,5.2,1.7]])box(hall,'Approach planting bed',x,.77,z,w,.5,d);
 const stair=group('M gallery stair 26 risers'),rise=(5.1-.825)/26;
 for(let i=0;i<13;i++)for(const upper of [false,true]){
  const x=upper?10.65:8.85,z=upper?3.44+i*.28:6.8-i*.28,top=.825+(i+1+(upper?13:0))*rise;
  box(stair,upper?'Gallery upper flight':'Gallery lower flight',x,top-.075,z,1.5,.15,.287);
  if(i%2===0)for(const dx of [-.76,.76])box(stair,'Stair baluster',x+dx,top+.51,z,.035,1.02,.035,m.bronze);
 }
 box(stair,'Stair half landing',9.75,.825+13*rise-.075,2.525,3.35,.15,1.55);
 box(stair,'Stair upper arrival',10.65,5.025,7.45,1.5,.15,1.05);
 for(const x of [7.9,11.6])box(stair,'Upper void guard',x,5.65,4.35,.04,1.1,5.4,m.glass);
 box(stair,'Upper void rear guard',9.75,5.65,1.65,3.7,1.1,.04,m.glass);
 stair.userData={risers:26,rise,ground:.825,upper:5.1};
 // Keep steps named for the lightweight Blender audit; batch the other architectural components.
 for(const g of root.children){if(g===stair)continue;const batches=new Map<T.Material,T.Mesh[]>();for(const o of g.children)if(o instanceof T.Mesh&&!Array.isArray(o.material)){const list=batches.get(o.material)||[];list.push(o);batches.set(o.material,list);}
  for(const [mat,list] of batches){const copies=list.map(o=>{o.updateMatrix();let geo=o.geometry.clone().applyMatrix4(o.matrix);if(geo.index){const flat=geo.toNonIndexed();geo.dispose();geo=flat;}if(!geo.attributes.uv)geo.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));return geo;});const merged=mergeGeometries(copies,false);copies.forEach(g=>g.dispose());if(merged){const o=new T.Mesh(own(merged),mat);o.name=g.name+' '+mat.name;g.add(o);list.forEach(o=>g.remove(o));}}
 }
 return hall;
}
