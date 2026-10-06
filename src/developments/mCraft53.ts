import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Own} from './mSurfaces';
export function craft53(root:T.Group,own:Own){
 const batches=new Map<T.Material,T.BufferGeometry[]>();
 function add(g:T.BufferGeometry,m:T.Material){
  const p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));uv[i*2]=(nx>.6?p.getZ(i):p.getX(i))/2;uv[i*2+1]=(ny>.6?p.getZ(i):p.getY(i))/2;}
  g.setAttribute('uv',new T.BufferAttribute(uv,2));const list=batches.get(m)||[];list.push(g);batches.set(m,list);
 }
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,angle=0,bevel=.025){
  const g=bevel?new RoundedBoxGeometry(w,h,d,1,Math.min(bevel,w*.12,h*.12,d*.12)):new T.BoxGeometry(w,h,d);g.rotateY(angle);g.translate(x,y,z);add(g,m);
 }
 function pipe(a:T.Vector3,b:T.Vector3,r:number,m:T.Material){const g=new T.CylinderGeometry(r,r,a.distanceTo(b),10);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize()));g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);add(g,m);}
 function flush(){for(const [m,gs]of batches){const flat=gs.map(g=>{const f=g.index?g.toNonIndexed():g;if(f!==g)g.dispose();return f;});const g=mergeGeometries(flat,false);flat.forEach(g=>g.dispose());if(g){const mesh=new T.Mesh(own(g),m);mesh.castShadow=!m.transparent;mesh.receiveShadow=true;root.add(mesh);}}batches.clear();}
 return {box,pipe,add,flush};
}
export function sign53(root:T.Group,own:Own,text:string,x:number,y:number,z:number,width:number,rotation=0){
 const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d')!;ctx.fillStyle='#164333';ctx.fillRect(0,0,1024,256);ctx.strokeStyle='#b8a97f';ctx.lineWidth=8;ctx.strokeRect(12,12,1000,232);ctx.fillStyle='#f8f3df';ctx.font='600 76px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,132,940);
 const map=own(new T.CanvasTexture(c));map.colorSpace=T.SRGBColorSpace;const mat=own(new T.MeshStandardMaterial({map,roughness:.65,emissive:'#ffffff',emissiveMap:map,emissiveIntensity:.22}));mat.userData.alwaysLit=true;
 const mesh=new T.Mesh(own(new T.PlaneGeometry(width,width/4)),mat);mesh.position.set(x,y,z);mesh.rotation.y=rotation;root.add(mesh);return mesh;
}
