import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {Own} from './mSurfaces';

/** Selected Cycles scene details, without render-only terrain, cameras or lights. */
export async function loadMEditorial61(scene:T.Scene,crown:T.Group,own:Own,
 finishes:{finishStone:(m:T.MeshStandardMaterial)=>void;finishLinen:(m:T.MeshStandardMaterial)=>void},signal?:AbortSignal){
 const response=await fetch('/assets/m/model/m-editorial-v61.glb',{signal});
 if(!response.ok)throw new Error('Editorial61 asset unavailable');
 const asset=await new GLTFLoader().parseAsync(await response.arrayBuffer(),'/assets/m/model/');
 const meshes:T.Mesh[]=[],resources=new Set<{dispose:()=>void}>();
 asset.scene.updateMatrixWorld(true);
 asset.scene.traverse(o=>{if(!(o instanceof T.Mesh))return;meshes.push(o);resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){resources.add(m);for(const t of Object.values(m))if(t instanceof T.Texture)resources.add(t);}});
 if(signal?.aborted){resources.forEach(r=>r.dispose());return;}
 const part=(key:string)=>meshes.find(m=>m.name.startsWith(key)||m.parent?.name===key);
 const water=part('M61_Water'),overflow=part('M61_Overflow');
 const priorWater=crown.getObjectByName('M49 continuous perimeter water') as T.Mesh;
 const priorOverflow=crown.getObjectByName('M49 overflow film') as T.Mesh;
 if(!water||!overflow||!priorWater||!priorOverflow){resources.forEach(r=>r.dispose());throw new Error('Editorial61 missing pool handles');}
 resources.forEach(r=>own(r));
 const group=new T.Group();group.name='M editorial 61';group.userData={finishOnly:true,blenderRevision:61};
 for(const mesh of meshes){
  mesh.geometry=own(mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));mesh.position.set(0,0,0);mesh.quaternion.identity();mesh.scale.set(1,1,1);
  mesh.userData={finishOnly:true,blenderRevision:61};mesh.castShadow=true;mesh.receiveShadow=true;
  if(mesh===water||mesh===overflow)continue;
  for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
   if(!(m instanceof T.MeshStandardMaterial))continue;
   if(/linen/i.test(m.name)){m.color.set('#eee6d6');finishes.finishLinen(m);m.roughness=.9;}
   if(/ceramic/i.test(m.name))finishes.finishStone(m);
   if(/leaf/i.test(m.name)){m.side=T.DoubleSide;m.roughness=.68;}
   if(/bottle/i.test(m.name)){m.roughness=.15;m.metalness=.08;}
   m.envMapIntensity=.9;
  }
  group.add(mesh);
 }
 // Keep existing water handles used by atmosphere/animation and swap geometry only.
 for(const [source,target] of [[water,priorWater],[overflow,priorOverflow]]){
  target.geometry=source.geometry;
  const m=target.material as T.MeshPhysicalMaterial;m.ior=1.333;m.metalness=0;m.roughness=.055;
  m.normalScale.set(.075,.075);m.envMapIntensity=1.15;
  const p=target.geometry.attributes.position,uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){uv[i*2]=p.getX(i)/7;uv[i*2+1]=source===water?p.getZ(i)/7:p.getY(i)*2;}
  target.geometry.setAttribute('uv',new T.BufferAttribute(uv,2));
 }
 const glassMaterials=new Set<T.MeshStandardMaterial>();
 crown.traverse(o=>{if(!(o instanceof T.Mesh))return;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof T.MeshStandardMaterial&&/glass|glazing/i.test(m.name))glassMaterials.add(m);});
 for(const m of glassMaterials){m.color.set('#eaf2ef');m.roughness=.045;m.metalness=0;m.depthWrite=false;}
 crown.add(group);scene.userData.editorial61={revision:61,palms:4,towels:4,bottles:25,continuousInfinity:true,batches:group.children.length};
}
