import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Own} from './mSurfaces';
import {M_STRUCTURE as S} from './mStructureSchedule';
import {buildMPodiumStructure} from './mPodiumStructure';

type Finishes={finishWood:(m:T.MeshStandardMaterial)=>void;finishStone:(m:T.MeshStandardMaterial)=>void};

/** Two gallery wings frame the existing double-height lobby. Plan radii are independent
 * of slab thickness, unlike rounded boxes. No change to the residential levels above.
 */
export function buildMGallery(parent:T.Group,own:Own,finishes?:Finishes){
 const gallery=new T.Group();gallery.name='M two storey gallery';parent.add(gallery);
 const material=(name:string,color:string,roughness=.8,metalness=0)=>{const m=own(new T.MeshStandardMaterial({color,roughness,metalness}));m.name=name;return m;};
 const stone=material('Gallery honed limestone','#ded8cc'),wood=material('Gallery oak soffits','#b29877'),bronze=material('Gallery bronze frames','#534e43',.36,.55),soil=material('Gallery planting soil','#3e4933');
 finishes?.finishStone(stone);finishes?.finishWood(wood);
 const glass=own(new T.MeshPhysicalMaterial({color:'#becdc9',transparent:true,opacity:.22,depthWrite:false,roughness:.12,metalness:.12,side:T.DoubleSide}));glass.forceSinglePass=true;
 const glow=material('Gallery concealed warm light','#eadbc0');glow.emissive.set('#f6dcaa');glow.emissiveIntensity=.6;
 const geom=new Map<string,T.BufferGeometry>();
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material)=>{
  const key=[w,h,d].join(':');let g=geom.get(key);if(!g){g=own(new T.BoxGeometry(w,h,d));const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))/2.5,(Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i))/2.5);geom.set(key,g);}
  const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=!m.transparent;o.receiveShadow=true;gallery.add(o);return o;
 };
 function outline(w:number,d:number,r:number){
  const x=-w/2,z=-d/2,s=new T.Shape();s.moveTo(x+r,z);s.lineTo(x+w-r,z);s.quadraticCurveTo(x+w,z,x+w,z+r);s.lineTo(x+w,z+d-r);s.quadraticCurveTo(x+w,z+d,x+w-r,z+d);s.lineTo(x+r,z+d);s.quadraticCurveTo(x,z+d,x,z+d-r);s.lineTo(x,z+r);s.quadraticCurveTo(x,z,x+r,z);return s;
 }
 function slab(x:number,y:number,z:number,w:number,d:number,h:number,r:number,m:T.Material,stairVoid=false){
  const s=outline(w,d,r);
  if(stairVoid){const v=S.stair;s.holes.push(new T.Path([
   new T.Vector2(v.minX-x,z-v.minZ),new T.Vector2(v.maxX-x,z-v.minZ),
   new T.Vector2(v.maxX-x,z-v.maxZ),new T.Vector2(v.minX-x,z-v.maxZ)
  ]));}
  const g=own(new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:10}));g.rotateX(-Math.PI/2);
  const o=new T.Mesh(g,m);o.position.set(x,y-h/2,z);o.castShadow=!m.transparent;o.receiveShadow=true;gallery.add(o);return o;
 }
 const plants:{x:number;y:number;z:number;scale:number}[]=[];
 // Infill behind the portal joins the rounded wings without closing the central void.
 for(const side of [-1,1]){
  for(const [y,h] of S.gallery.slabs)box(side*5.8,y,-.5,2,h,25,stone);
  for(const [base,height] of [[.66,2.94],[4.375,2.78]]){
   box(side*5.6,base+height/2,10.8,1.6,height,.035,glass);
   box(side*5.05,base+height/2,10.84,.07,height,.07,bronze);
  }
 }
 for(const center of [-15,15]){
  for(const [y,h] of S.gallery.slabs){
   slab(center,y,-.5,20.4,27,h,3.1,stone,center>0&&y===4.05);
   if(y>1){slab(center,y-h/2-.055,-.5,19.7,26.3,.09,2.8,wood,center>0&&y===4.05);}
  }
  // Glazing sits behind the projecting stone edge; curved corners follow the same outline.
  const perimeter=outline(17.4,24,2.25).getSpacedPoints(64);
  for(const [base,height] of [[.66,2.94],[4.375,2.78]]){
   for(let i=0;i<perimeter.length-1;i++){
    const a=perimeter[i],b=perimeter[i+1],distance=a.distanceTo(b),pieces=Math.max(1,Math.ceil(distance/2.3));
    for(let k=0;k<pieces;k++){
     const p=a.clone().lerp(b,k/pieces),q=a.clone().lerp(b,(k+1)/pieces),mid=p.clone().add(q).multiplyScalar(.5);
     const worldZ=-.5-mid.y,inner=Math.abs(center+mid.x)<6.4;
     const passage=inner&&(base<1?worldZ>4.7&&worldZ<7.8:worldZ>.1&&worldZ<2.9);
     const paneHeight=passage?height-2.4:height,paneBase=passage?base+2.4:base;
     const o=box(center+mid.x,paneBase+paneHeight/2,worldZ,p.distanceTo(q),paneHeight,.035,glass);o.rotation.y=Math.atan2(q.y-p.y,q.x-p.x);
     if(!passage)box(center+p.x,base+height/2,-.5-p.y,.07,height,.07,bronze);
    }
   }
   // Wall at the shared tower edge gives depth behind the transparent frontage.
   box(center,base+height/2,-5.7,15,height,.18,stone);
   for(const dx of [-7.6,7.6])box(center+dx,base+height/2,8.3,.3,height,.4,wood);
   box(center,base+height-.12,9.65,14,.035,.055,glow);
  }
  // Recessed vertical wood screens at each side of the central portal.
  const inner=center-Math.sign(center)*8.1;
  for(let i=0;i<6;i++)box(inner+Math.sign(center)*i*.22,4.08,10.65,.10,6.8,.22,wood);
  for(const y of [4.48,8.01]){
   // Front planters leave gaps for views and avoid the residential footprint.
   for(const dx of [-4.7,4.7]){
    slab(center+dx,y,11.4,6.4,1.5,.52,.65,stone);
    slab(center+dx,y+.275,11.4,6.05,1.18,.06,.48,soil);
    for(let j=0;j<7;j++)plants.push({x:center+dx-2.65+j*.86,y:y+.33,z:11.4+(j%2?.23:-.23),scale:.65+(j%3)*.18});
   }
   const outer=center+Math.sign(center)*9.05;
   slab(outer,y,-1,1.55,19,.52,.65,stone);slab(outer,y+.275,-1,1.18,18.5,.06,.5,soil);
   for(let j=0;j<17;j++)plants.push({x:outer,y:y+.33,z:-9+j,scale:.75+(j%3)*.15});
  }
 }
 // Architectural garden beds at arrival, outside the clear center approach.
 for(const x of [-7.1,7.1]){
  slab(x,.7,16.8,4.2,3.6,.65,1,stone);slab(x,1.05,16.8,3.85,3.25,.08,.9,soil);
  for(let j=0;j<12;j++)plants.push({x:x+Math.sin(j*2.4)*1.25,y:1.1,z:16.8+Math.cos(j*2.4)*1.05,scale:.85+(j%3)*.22});
 }
 // Static leaf instances: a few shared triangles per leaf, without texture downloads.
 const leaf=own(new T.BufferGeometry());leaf.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-.17,.28,.26,0,.49,.82,0,0,0,0,.49,.82,.17,.28,.26],3));leaf.computeVertexNormals();
 const green=material('Gallery layered foliage','#536f43');green.side=T.DoubleSide;
 const foliage=own(new T.InstancedMesh(leaf,green,plants.length*24));foliage.name='M gallery planted edges';const dummy=new T.Object3D();
 plants.forEach((plant,i)=>{for(let j=0;j<24;j++){const angle=j*2.39996,s=plant.scale*(.8+(j%5)*.12);dummy.position.set(plant.x+Math.sin(angle)*.14,plant.y+(j%4)*.12,plant.z+Math.cos(angle)*.14);dummy.rotation.set((j%3)*.14,angle,0);dummy.scale.set(s,s,s);dummy.updateMatrix();const n=i*24+j;foliage.setMatrixAt(n,dummy.matrix);foliage.setColorAt(n,new T.Color().setRGB(.85+(j%3)*.07,.9+(j%4)*.025,.8+(j%5)*.035));}});
 foliage.castShadow=true;foliage.receiveShadow=true;
 // Group opaque finishes to keep the facade inexpensive; vegetation remains instanced.
 const batches=new Map<T.Material,T.Mesh[]>();for(const o of gallery.children)if(o instanceof T.Mesh){const m=o.material as T.Material;const list=batches.get(m)||[];list.push(o);batches.set(m,list);}
 for(const [m,meshes] of batches){const parts=meshes.map(o=>{o.updateMatrix();let g=o.geometry.clone().applyMatrix4(o.matrix);if(g.index){const flat=g.toNonIndexed();g.dispose();g=flat;}if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));return g;});const merged=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());if(merged){const o=new T.Mesh(own(merged),m);o.castShadow=!m.transparent;o.receiveShadow=true;gallery.add(o);meshes.forEach(o=>gallery.remove(o));}}
 gallery.add(foliage);gallery.userData.planRadius=3.1;gallery.userData.clearEntranceWidth=9;
 buildMPodiumStructure(parent,own,{stone,bronze,glass});
 return gallery;
}


