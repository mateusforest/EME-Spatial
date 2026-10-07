import * as T from 'three';
import type {Own,mSurfaces} from './mSurfaces';
export type Level72='light'|'balanced'|'high';
export const tier72=(level:Level72)=>level==='light'?'light':'detail';
export const lodDistance72={light:13,balanced:18,high:24};
export type Lods72=Record<string,{indices:number[];error:number;sourceTriangles:number;triangles:number}>;

/** Share the imported image sources with configurable finishes instead of loading them twice. */
export function materialBank72(root:T.Object3D){
 const maps=new Map<string,T.Texture>(),textures=new Set<T.Texture>();
 root.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])for(const v of Object.values(m))if(v instanceof T.Texture){textures.add(v);v.anisotropy=4;if(v.userData.file72&&!maps.has(v.userData.file72))maps.set(v.userData.file72,v);}});
 const get=(file:string)=>{const texture=maps.get(file);if(!texture)throw new Error('Missing apartment finish: '+file);return texture;};
 const surfaces:ReturnType<typeof mSurfaces>={
  mineral:get('realism50/stone-normal.webp'),ready:Promise.resolve([]),
  finishWood(m){m.color.set('#fff8ef');m.map=get('realism50/oak-color.webp');m.normalMap=get('realism50/oak-normal.webp');m.normalScale.set(.2,.2);m.roughnessMap=get('realism50/oak-rough.webp');m.roughness=.88;m.needsUpdate=true;},
  finishStone(m){m.color.set('#ffffff');m.map=get('realism50/stone-color.webp');m.normalMap=get('realism50/stone-normal.webp');m.normalScale.set(.17,.17);m.bumpMap=null;m.roughnessMap=get('realism50/stone-rough.webp');m.roughness=.88;m.needsUpdate=true;},
  finishLinen(m){m.normalMap=get('refinement49/linen-normal.png');m.normalScale.set(.22,.22);m.roughnessMap=get('refinement49/linen-rough.png');m.roughness=1;m.needsUpdate=true;},
 };
 return {surfaces,textures,stone:{color:get('refinement49/limestone-color.png'),normal:get('refinement49/limestone-normal.png'),rough:get('refinement49/limestone-rough.png')}};
}

export function apartmentQuality72(scene:T.Scene,textures:Set<T.Texture>,lods:Lods72,own:Own,initial:Level72,request:()=>void){
 let closed=false,sequence=0,wanted=tier72(initial),active=wanted,pending:AbortController|undefined;
 const geometries=new Map<string,{high:T.BufferGeometry;low:T.BufferGeometry}>(),registered=new WeakSet<T.Object3D>(),meshes:{mesh:T.Mesh;high:T.BufferGeometry;low:T.BufferGeometry;small:boolean}[]=[];
 const sphere=new T.Sphere();
 const sources=new Map<string,T.Texture>();for(const t of textures)sources.set(t.source.uuid,t);
 const register=(root:T.Object3D)=>{if(registered.has(root))return;registered.add(root);root.traverse(o=>{
  if(!(o instanceof T.Mesh)||!lods[o.geometry.uuid])return;
  let pair=geometries.get(o.geometry.uuid);if(!pair){const high=o.geometry,low=own(new T.BufferGeometry());for(const k of Object.keys(high.attributes))low.setAttribute(k,high.getAttribute(k));low.setIndex(lods[high.uuid].indices);low.computeBoundingSphere();high.computeBoundingSphere();pair={high,low};geometries.set(high.uuid,pair);}meshes.push({mesh:o,...pair,small:false});
 });};
 const changeTextures=async(tier:typeof active)=>{
  wanted=tier;const token=++sequence;pending?.abort();const controller=new AbortController();pending=controller;
  try{const images=await Promise.all([...sources.values()].map(async t=>{
   const response=await fetch(t.userData.profiles72[tier],{signal:controller.signal});if(!response.ok)throw new Error('Texture download failed');
   const url=URL.createObjectURL(await response.blob()),image=new Image();try{image.src=url;await image.decode();return image;}finally{URL.revokeObjectURL(url);}
  }));
   if(closed||token!==sequence)return;
   [...sources.values()].forEach((t,i)=>{t.source.data=images[i];t.needsUpdate=true;});
   scene.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])for(const t of Object.values(m))if(t instanceof T.Texture&&t.userData.profiles72)t.needsUpdate=true;});
   active=tier;scene.userData.textureTier72=tier;request();
  }catch{if(!closed&&token===sequence){scene.userData.textureTier72=active;/* Keep the complete previous textures on a network error. */}}
 };
 scene.userData.textureTier72=active;
 return {update(camera:T.Camera,level:Level72,root:T.Object3D){
  register(root);const tier=tier72(level);if(tier!==wanted)void changeTextures(tier);
  const threshold=lodDistance72[level];let changed=false,count=0;root.updateWorldMatrix(true,true);
  for(const item of meshes){if(!root.getObjectById(item.mesh.id))continue;
   sphere.copy(item.high.boundingSphere!).applyMatrix4(item.mesh.matrixWorld);const distance=Math.max(0,camera.position.distanceTo(sphere.center)-sphere.radius);
   const small=distance>(item.small?threshold-2:threshold+2);if(small!==item.small){item.small=small;item.mesh.geometry=small?item.low:item.high;changed=true;}if(small)count++;
  }
  scene.userData.lodCount72=count;if(changed)request();return changed;
 },dispose(){closed=true;sequence++;pending?.abort();meshes.length=0;geometries.clear();sources.clear();}};
}

