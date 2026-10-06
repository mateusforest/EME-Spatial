import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {Own} from './mSurfaces';
import {M_REFERENCE} from './mReferenceArchitecture';

/** Blender-authored furniture prototypes use the existing web47 floor handles and layouts.
 * Architecture, apartment clipping and the original asset kits remain unchanged. */
export async function loadMBlenderRefinement48(
 scene:T.Scene,site:T.Group,floors:T.Group[],crown:T.Group,own:Own,
 finishes:{finishWood:(m:T.MeshStandardMaterial)=>void;finishStone:(m:T.MeshStandardMaterial)=>void;finishLinen:(m:T.MeshStandardMaterial)=>void},
 signal?:AbortSignal,
){
 const response=await fetch('/assets/m/model/m-crafted-details-v48.glb',{signal});
 if(!response.ok)throw new Error('Blender48 finishing kit unavailable');
 const gltf=await new GLTFLoader().parseAsync(await response.arrayBuffer(),'/assets/m/model/');
 const resources=new Set<{dispose:()=>void}>(),meshes:T.Mesh[]=[];
 gltf.scene.updateMatrixWorld(true);
 gltf.scene.traverse(o=>{
  if(!(o instanceof T.Mesh))return;meshes.push(o);resources.add(o.geometry);
  for(const m of Array.isArray(o.material)?o.material:[o.material]){
   resources.add(m);for(const v of Object.values(m))if(v instanceof T.Texture)resources.add(v);
  }
 });
 if(signal?.aborted){resources.forEach(r=>r.dispose());return;}
 const templates=new Map<string,T.Mesh[]>();let leaf:T.Mesh|undefined,pot:T.Mesh|undefined;
 const planting:T.Mesh[]=[];
 for(const mesh of meshes){
  const key=mesh.name.match(/^M48_Balcony_(\d)_([LR])_/);
  if(key){const id=key[1]+'_'+key[2],parts=templates.get(id)||[];parts.push(mesh);templates.set(id,parts);}
  else if(mesh.name.startsWith('M48_LeafPrototype'))leaf=mesh;
  else if(mesh.name.startsWith('M48_PotPrototype'))pot=mesh;
  else if(mesh.name.startsWith('M48_ArrivalPlanting'))planting.push(mesh);
 }
 if(templates.size!==10||!leaf||!pot||planting.length!==2){resources.forEach(r=>r.dispose());throw new Error('Incomplete Blender48 finishing kit');}
 resources.forEach(r=>own(r));
 // Bake only glTF coordinate transforms into the prototype, never floor transforms.
 for(const mesh of meshes){
  mesh.geometry=own(mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));
  mesh.position.set(0,0,0);mesh.quaternion.identity();mesh.scale.set(1,1,1);
  mesh.userData={finishOnly:true,blenderRevision:48};mesh.castShadow=true;mesh.receiveShadow=true;
  for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
   if(m instanceof T.MeshStandardMaterial){m.envMapIntensity=.75;if(/botanical|foliage/.test(m.name))m.side=T.DoubleSide;}
   for(const value of Object.values(m))if(value instanceof T.Texture)value.anisotropy=8;
  }
 }
 const variants=[[0,2],[1,3],[3,0],[2,3]];
 let furnishedFloors=0;
 floors.forEach((floor,i)=>{
  const group=new T.Group();group.name='M Blender crafted balcony furniture 48';group.userData={finishOnly:true,blenderRevision:48};
  const notch=floor.userData.envelope.notch;
  for(const side of [-1,1]){
   const kinds:number[]=[];
   if(notch!==2&&notch!==side)kinds.push(variants[i%4][side<0?0:1]);
   if(M_REFERENCE.duplexes.some(d=>d.floor===i+1&&d.side===side))kinds.push(4);
   for(const kind of kinds)for(const proto of templates.get(kind+'_'+(side<0?'L':'R'))!){const mesh=proto.clone();mesh.userData={...proto.userData};group.add(mesh);}
  }
  // Commit the replacement only after the entire asset was parsed and checked.
  floor.getObjectByName('M balcony furniture web32')?.removeFromParent();
  floor.add(group);if(group.children.length)furnishedFloors++;
 });
 let foliageGroups=0,potGroups=0;
 scene.traverse(o=>{
  if(!(o instanceof T.InstancedMesh))return;
  if(o.name==='M planting crowns'){
   o.geometry=leaf!.geometry;foliageGroups++;o.userData.blenderRevision=48;
  }else if(o.name==='M planting containers'){
   o.geometry=pot!.geometry;o.material=pot!.material;potGroups++;o.userData.blenderRevision=48;
  }else return;
  o.boundingBox=null;o.boundingSphere=null;o.computeBoundingBox();o.computeBoundingSphere();
 });
 const garden=new T.Group();garden.name='M Blender layered arrival planting 48';garden.userData={finishOnly:true,blenderRevision:48};
 for(const proto of planting)garden.add(proto.clone());site.add(garden);
 // Give existing Blender47 facade details the same physically based stone/wood finish.
 const done=new Set<T.Material>();
 scene.traverse(o=>{
  if(!(o instanceof T.Mesh))return;
  for(const mat of Array.isArray(o.material)?o.material:[o.material]){
   if(!(mat instanceof T.MeshStandardMaterial)||done.has(mat))continue;done.add(mat);
   if(mat.name==='M47 Stone')finishes.finishStone(mat);
   if(mat.name==='M47 Oak')finishes.finishWood(mat);
  }
 });
 // Preserve the complete rooftop layout, refining only the existing upholstery finish.
 const crownFurniture=crown.getObjectByName('M crown furniture web33');
 crownFurniture?.traverse(o=>{
  if(!(o instanceof T.Mesh)||Array.isArray(o.material)||!(o.material instanceof T.MeshStandardMaterial))return;
  const m=o.material;
  if(m.color.getHexString()==='e2dac9'||m.color.getHexString()==='405e48')finishes.finishLinen(m);
 });
 const report={revision:48,furnishedFloors,foliageGroups,potGroups,plantingBatches:planting.length};
 scene.userData.blenderFinish=report;return report;
}
