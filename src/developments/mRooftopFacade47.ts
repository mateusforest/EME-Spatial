import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {Own} from './mSurfaces';
/** Additive Blender refinement, authored against current web geometry in a new file. */
export async function loadMRooftopFacade47(floors:T.Group[],crown:T.Group,own:Own,signal?:AbortSignal){
 const response=await fetch('/assets/m/model/m-rooftop-facade-v49.glb',{signal});if(!response.ok)throw new Error('Missing M47 architectural refinement');
 const gltf=await new GLTFLoader().parseAsync(await response.arrayBuffer(),'/assets/m/model/');
 const resources=new Set<{dispose:()=>void}>(),meshes:T.Mesh[]=[];
 gltf.scene.traverse(o=>{if(o instanceof T.Mesh){resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){resources.add(m);for(const t of Object.values(m))if(t instanceof T.Texture)resources.add(t);}meshes.push(o);}});
 if(signal?.aborted){resources.forEach(r=>r.dispose());return;}
 resources.forEach(r=>own(r));const floorSet=new Set<number>();let roofParts=0;
 for(const mesh of meshes){
  const n=Number(mesh.name.match(/M47_Floor_(\d+)/)?.[1]),isRoof=mesh.name.startsWith('M47_Crown');
  const target=isRoof?crown:floors[n-1];if(!target)throw new Error('Unexpected M47 export node');
  mesh.removeFromParent();mesh.position.set(0,0,0);mesh.rotation.set(0,0,0);mesh.scale.set(1,1,1);
  mesh.userData={finishOnly:true,blenderRevision:47};mesh.castShadow=!(isRoof&&!Array.isArray(mesh.material)&&mesh.material.name==='M47 Stone');mesh.receiveShadow=true;
  target.add(mesh);if(isRoof)roofParts++;else floorSet.add(n);
 }
 if(floorSet.size!==22||roofParts!==3)throw new Error('Incomplete M47 architectural export');
 crown.userData.blenderRefinement=47;return {floors:floorSet.size,roofParts};
}

