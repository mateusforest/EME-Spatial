import * as T from 'three';
import type {Own} from './mSurfaces';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Interior finish stays inside the existing envelope; the balcony keeps its timber soffit. */
export function presentationApartment87(scene:T.Scene,floors:T.Group[],own:Own,request:()=>void){
 const materials=new Set<T.MeshStandardMaterial>();
 floors[13].traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof T.MeshStandardMaterial)materials.add(m);});
 const linen=own(new T.TextureLoader().load('/assets/m/materials/refinement49/linen-color.png',request));
 linen.colorSpace=T.SRGBColorSpace;linen.wrapS=linen.wrapT=T.RepeatWrapping;linen.repeat.setScalar(3);linen.anisotropy=4;
 for(const m of materials){
  if(m.name==='M14 wood'||m.name==='Reference timber screens'){m.normalScale.set(.045,.045);m.roughness=.74;}
  if(m.name==='M14 stone'){m.normalScale.set(.065,.065);m.roughness=.46;}
  if(['M14 fabric','M14 accent','M14 rug','M14 green'].includes(m.name)){m.map=linen;m.needsUpdate=true;}
 }
 const plaster=own(new T.MeshStandardMaterial({color:'#e9e5da',roughness:.95}));
 const ceiling=new T.Mesh(own(new T.BoxGeometry(23.6,.055,15.7)),plaster);
 ceiling.name='M14 interior plaster ceiling87';ceiling.position.set(0,-.36,-3.6);ceiling.castShadow=true;ceiling.receiveShadow=true;floors[14].add(ceiling);
 const trim=own(new T.MeshStandardMaterial({color:'#fff0d9',emissive:'#ffd8a0',emissiveIntensity:.2,roughness:.5}));
 const strip=new T.Mesh(own(new T.BoxGeometry(21.8,.018,.035)),trim);strip.name='M14 recessed warm cove87';strip.position.set(0,-.40,4.13);floors[14].add(strip);
 const lights=new T.InstancedMesh(own(new T.CylinderGeometry(.055,.055,.015,12)),trim,12);own(lights);
 const matrix=new T.Matrix4();let index=0;
 for(const x of [-9,-6,6,9])for(const z of [-8,-2,2]){matrix.makeTranslation(x,-.395,z);lights.setMatrixAt(index++,matrix);}
 lights.name='M14 recessed luminaires87';floors[14].add(lights);
 return {update(night:number,ambient:T.HemisphereLight){
  // Fixed fixtures: no camera-dependent switching or exposure jumps.
  trim.emissiveIntensity=T.MathUtils.lerp(.22,1.6,night);
  ambient.intensity=T.MathUtils.lerp(.19,.14,night);
  scene.environmentIntensity=T.MathUtils.lerp(.23,.16,night);
 }};
}

/** Batch sibling opaque meshes; floor visibility and transparent sorting stay independent. */
export function batchPresentation87(scene:T.Object3D,own:Own,protectedFloor?:T.Object3D){
 const parents:T.Object3D[]=[];scene.traverse(o=>{if(o.children.length>1)parents.push(o);});
 const protectedObjects=new Set<T.Object3D>();protectedFloor?.traverse(o=>protectedObjects.add(o));
 let removed=0;
 for(const parent of parents){
  const groups=new Map<string,T.Mesh[]>();
  for(const o of parent.children){
   if(!(o instanceof T.Mesh)||o instanceof T.SkinnedMesh||o.children.length||!o.visible||Array.isArray(o.material)||o.material.transparent||Object.keys(o.geometry.morphAttributes).length||o.geometry.drawRange.count!==Infinity)continue;
   if(o.userData.finish70&&(!protectedFloor||protectedObjects.has(o)))continue;
   if(o instanceof T.InstancedMesh&&(o.count!==1||o.instanceColor||o.morphTexture))continue;
   if(Object.values(o.geometry.attributes).some(a=>(a as T.InterleavedBufferAttribute).isInterleavedBufferAttribute))continue;
   o.updateMatrix();const transform=o.matrix.clone();if(o instanceof T.InstancedMesh){const instance=new T.Matrix4();o.getMatrixAt(0,instance);transform.multiply(instance);}if(transform.determinant()<=0)continue;
   const key=[o.material.uuid,o.castShadow,o.receiveShadow,o.renderOrder,o.layers.mask,!!o.geometry.index,Object.keys(o.geometry.attributes).sort().map(k=>k+':'+o.geometry.getAttribute(k).itemSize).join(',')].join('|');
   const list=groups.get(key)||[];list.push(o);groups.set(key,list);
  }
  for(const meshes of groups.values()){
   if(meshes.length<2)continue;
   const clones=meshes.map(o=>{const transform=o.matrix.clone();if(o instanceof T.InstancedMesh){const instance=new T.Matrix4();o.getMatrixAt(0,instance);transform.multiply(instance);}return o.geometry.clone().applyMatrix4(transform);});
   const geometry=mergeGeometries(clones,false);clones.forEach(g=>g.dispose());if(!geometry)continue;
   own(geometry);geometry.computeBoundingSphere();const first=meshes[0],batch=new T.Mesh(geometry,first.material);
   batch.name='Presentation · '+(first.material as T.Material).name;batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;batch.renderOrder=first.renderOrder;batch.layers.mask=first.layers.mask;
   parent.add(batch);meshes.forEach(o=>o.removeFromParent());removed+=meshes.length-1;
  }
 }
 return removed;
}

/** A presentation budget preserves architecture and cuts distant botanical detail. */
export function presentationBudget87(scene:T.Scene,own:Own,protectedFloor:T.Group){
 // Transmission renders the entire campus a second time, including materials on distant floors.
 // Preserve water color, normals and environment reflection with a single transparent surface.
 scene.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){
  if(m instanceof T.MeshPhysicalMaterial&&m.transmission>0){
   m.transmission=0;m.transparent=true;m.opacity=.76;m.depthWrite=false;m.forceSinglePass=true;
   if(/water|lake|overflow/i.test(m.name+' '+o.name)){m.color.set('#408c8b');m.opacity=.7;m.roughness=.16;m.metalness=.12;m.normalScale.set(.3,.3);m.envMapIntensity=1.1;}
   m.needsUpdate=true;
  }
 }});
 scene.userData.presentationBatches87=batchPresentation87(scene,own,protectedFloor);
 const originals:T.PointLight[]=[],foliage:{mesh:T.Mesh;full:T.BufferGeometry;low:T.BufferGeometry}[]=[];
 const reduced=new Map<T.BufferGeometry,T.BufferGeometry>();
 scene.updateMatrixWorld(true);
 scene.traverse(o=>{
  if(o instanceof T.PointLight)originals.push(o);
  if(!(o instanceof T.Mesh)||Array.isArray(o.material))return;
  if(o.material.name==='M51 layered botanical canopy'){
   const full:T.BufferGeometry=o.geometry;let low=reduced.get(full);
   if(!low){low=own(full.clone());const ix=full.index!,indices:number[]=[];
    // Each authored leaf is four triangles. Keep entire leaves, never broken triangles.
    for(let i=0;i<ix.count;i+=36)for(let j=0;j<12&&i+j<ix.count;j++)indices.push(ix.getX(i+j));
    low.setIndex(indices);reduced.set(full,low);
   }
   foliage.push({mesh:o,full,low});
  }
 });
 // The original light controllers keep updating their sources, outside the render tree.
 originals.forEach(l=>{l.getWorldPosition(l.position);l.removeFromParent();});
 const pool=Array.from({length:4},()=>{const l=new T.PointLight(0xffffff,0,1,2);scene.add(l);return l;});
 const focus=new T.Vector3();
 return {update(camera:T.Camera,quality:string){
  camera.getWorldPosition(focus);
  const candidates=originals.filter(l=>l.intensity>0).sort((a,b)=>b.intensity/(1+b.position.distanceToSquared(focus))-a.intensity/(1+a.position.distanceToSquared(focus)));
  pool.forEach((l,i)=>{const source=candidates[i];l.intensity=source?.intensity??0;if(source){l.position.copy(source.position);l.color.copy(source.color);l.distance=source.distance;l.decay=source.decay;}});
  let changed=false;
  for(const item of foliage){const geometry=quality==='high'?item.full:item.low;if(item.mesh.geometry!==geometry){item.mesh.geometry=geometry;changed=true;}}
  return changed;
 },dispose(){pool.forEach(l=>l.removeFromParent());}};
}
