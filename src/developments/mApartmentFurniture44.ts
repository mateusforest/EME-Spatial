import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Own} from './mSurfaces';
/** Exterior-visible furnishing fits the current envelope; legacy walk-through stays separate. */
export function furnishMApartments44(floors:T.Group[],own:Own){
 const colors=['#987454','#e4dccb','#345347','#c9bba2','#424942','#b78a60','#6c8052','#e4dccb','#c9bba2'];
 const mats=colors.map(color=>own(new T.MeshStandardMaterial({color,roughness:.85})));
 const cache=new Map<string,{geometry:T.BufferGeometry;material:T.Material}[]>();
 function layout(variant:number,upper:boolean,penthouseLower=false,refined=false){
  const key=variant+':'+upper+':'+penthouseLower+':'+refined;if(cache.has(key))return cache.get(key)!;
  const batches:T.BufferGeometry[][]=mats.map(()=>[]);const tableBatches:T.BufferGeometry[][]=mats.map(()=>[]);let table=false;
  const put=(g:T.BufferGeometry,m:number,x:number,y:number,z:number,a=0)=>{
   // Map each piece in local metric coordinates before rotating it: grain follows the joinery.
   if(refined){const pos=g.getAttribute('position'),normal=g.getAttribute('normal'),uv=g.getAttribute('uv');
    if(g instanceof T.CylinderGeometry){const radius=g.parameters.radiusTop,height=g.parameters.height;for(let j=0;j<uv.count;j++){const cap=Math.abs(normal.getY(j))>.7;uv.setXY(j,cap?pos.getX(j):uv.getX(j)*2*Math.PI*radius,cap?pos.getZ(j):uv.getY(j)*height);}}
    else{for(let j=0;j<pos.count;j++){const nx=Math.abs(normal.getX(j)),ny=Math.abs(normal.getY(j));uv.setXY(j,nx>.7?pos.getZ(j):pos.getX(j),ny>.7?pos.getZ(j):pos.getY(j));}}
   }
   g.rotateY(a);g.translate(x,y+.5,z);(table?tableBatches:batches)[m].push(g);};
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:number,soft=false,a=0)=>put(soft?new RoundedBoxGeometry(w,h,d,refined?2:1,Math.min(.08,h*.3)):new T.BoxGeometry(w,h,d),m,x,y,z,a);
  const cyl=(x:number,y:number,z:number,r:number,h:number,m:number)=>put(new T.CylinderGeometry(r,r,h,refined?32:12),m,x,y,z);
  function plant(x:number,z:number){cyl(x,.3,z,.27,.6,3);for(let j=0;j<5;j++){const a=j*2.4;put(new T.IcosahedronGeometry(.31,0),6,x+Math.cos(a)*.24,.8+j*.1,z+Math.sin(a)*.24);}}
  function chair(x:number,z:number,a=0,f=1){
   // Rotate all seat components around the same anchor.
   const piece=(dx:number,y:number,dz:number,w:number,h:number,d:number,m:number,soft=false)=>box(x+dx*Math.cos(a)+dz*Math.sin(a),y,z-dx*Math.sin(a)+dz*Math.cos(a),w,h,d,m,soft,a);
   for(const dx of [-.27,.27])for(const dz of [-.26,.26])piece(dx,.22,dz,.055,.44,.055,0);
   piece(0,.46,0,.68,.17,.65,f,true);piece(0,.78,-.29,.68,.62,.12,f,true);

  }
  function sofa(x:number,z:number,w:number,f:number){
   box(x,.21,z,w,.28,1.06,0,true);if(refined){for(const dx of [-1,0,1])box(x+dx*(w-.2)/3,.48,z,(w-.2)/3-.035,.27,1.04,f,true);}else box(x,.48,z,w-.12,.27,1.04,f,true);
   box(x,.85,z-.48,w,.8,.19,f,true);
   for(const dx of [-w/2,w/2])box(x+dx,.67,z,.17,.67,1.13,f,true);
   for(const dx of [-w*.3,w*.3])box(x+dx,.85,z-.27,.45,.39,.16,variant===1?5:1,true);
  }
  function bed(x:number,z:number){
   box(x,.26,z,2.25,.4,2.45,0,true);box(x,.57,z,2.15,.25,2.35,1,true);
   box(x,1,z-1.2,2.9,1.55,.18,refined?1:variant===2?5:3,true);
   for(const dx of [-.53,.53])box(x+dx,.78,z-.68,.82,.18,.52,1,true);
   box(x,.72,z+.67,2.17,.08,.82,2,true);
   for(const dx of [-1.65,1.65]){box(x+dx,.4,z-.7,.68,.7,.65,0);cyl(x+dx,.91,z-.7,.18,.26,3);}
  }
  // Rear suites visible from both side and rear glazing; core corridor remains clear.
  for(const side of [-1,1]){
   const x=side*7.6;box(x,.025,-8,6.1,.04,5.7,refined?8:3);bed(x,-8);
   box(side*4.1,1.4,-9,1.15,2.8,3.8,0);
   for(const z of [-10.1,-9,-7.9])box(side*4.72,1.4,z,.035,2.5,.045,4);
   // Partial room divider stops before the side window, preserving a passage.
   box(side*6.55,1.35,-5.6,6.4,2.7,.13,refined?7:1);
   box(side*6.55,1.35,-5.51,1.5,.85,.035,2);
   plant(side*10.7,-10.6);
  }
  if(!upper){
   const side=variant===1?1:-1,sx=side*6.7;
   box(sx,.025,1.15,7.3,.04,5.1,refined?8:3);
   sofa(sx,.0,3.65,variant===0?2:1);
   if(variant===2)sofa(sx+side*1.4,1.15,1.1,1);
   table=refined;cyl(sx,.36,1.95,.85,.3,3);cyl(sx+.22,.57,1.95,.12,.13,0);table=false;
   chair(sx-side*2.6,2.5,side*Math.PI/2,5);
   box(sx,1.3,-1.65,4.4,2.5,.15,0);box(sx,1.47,-1.55,2.05,1.12,.07,4);box(sx,.35,-1.34,4.4,.5,.5,0);
   plant(side*10.6,3.3);
   const dx=penthouseLower?9:-side*6.6;
   box(dx,.76,1.6,2.9,.13,1.15,0,true);
   for(const x of [-1,1])box(dx+x,.35,1.6,.12,.7,.72,4);
   for(const x of [-.95,0,.95]){chair(dx+x,.48,0);chair(dx+x,2.72,Math.PI);}
   cyl(dx,.93,1.6,.18,.22,3);
   // Kitchen behind dining, offset from the reserved central services core.
   box(dx,.47,-3.85,5.3,.94,1.05,0);box(dx,.99,-3.85,5.5,.10,1.15,3);
   box(dx,1.6,-4.38,5.4,1.15,.10,3);
   box(dx+side*2.1,1.42,-3.85,1.0,2.84,1.05,0);
   box(dx+side*2.1,1.42,-3.29,.85,2.4,.035,4);
   box(dx,.97,-1.6,3.4,.12,1.15,3);box(dx,.47,-1.6,3.2,.94,1,0);
   box(dx,1.055,-3.85,.95,.035,.65,4);
  }else{
   // The penthouse's front central void and connecting stair stay completely open.
   for(const side of [-1,1]){
    box(side*9.1,.75,-1.5,2.6,.12,1.1,0);for(const dx of [-1,1])box(side*9.1+dx,.35,-1.5,.1,.7,.8,4);
    chair(side*9.1,-.25,Math.PI,2);box(side*9.1,1.2,-1.75,.9,.55,.07,4);
    plant(side*10.7,-3.6);
   }
  }
  const parts:{geometry:T.BufferGeometry;material:T.Material}[]=[];
  [...batches,...tableBatches].forEach((gs,index)=>{const i=index%mats.length;if(!gs.length)return;const flat=gs.map(g=>{if(!refined)g.deleteAttribute('uv');const f=g.index?g.toNonIndexed():g;if(f!==g)g.dispose();return f;});const geo=mergeGeometries(flat,false);flat.forEach(g=>g.dispose());if(geo){geo.userData.finish70=['wood','fabric','green','stone','metal','accent','leaf','wall','rug'][i];if(index>=mats.length){geo.translate(-6.7,0,-1.95);geo.userData.table70=true;}parts.push({geometry:own(geo),material:mats[i]});}});
  cache.set(key,parts);return parts;
 }
 floors.forEach((floor,i)=>{
  const root=new T.Group();root.name='M apartment furnishing web44';root.userData={finishOnly:true,layout:i%3,upper:i===21};
  for(const p of layout(i%3,i===21,i===20,i===13)){const mesh=new T.Mesh(p.geometry,p.material);mesh.userData={finishOnly:true,...p.geometry.userData};if(mesh.userData.table70)mesh.position.set(6.7,0,1.95);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
  floor.add(root);
 });
}
