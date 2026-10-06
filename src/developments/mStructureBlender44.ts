import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {Own} from './mSurfaces';
/** Blender adds local window reveals to existing floor handles; it never replaces the tower. */
export async function loadMStructure44(floors:T.Group[],own:Own,signal?:AbortSignal){
 const response=await fetch('/assets/m/model/m-structure-details-v49.glb',{signal});if(!response.ok)throw new Error('Missing M structural details');
 const gltf=await new GLTFLoader().parseAsync(await response.arrayBuffer(),'/assets/m/model/');
 const resources=new Set<{dispose:()=>void}>(),meshes:T.Mesh[]=[];
 gltf.scene.traverse(o=>{if(o instanceof T.Mesh){resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){resources.add(m);for(const t of Object.values(m))if(t instanceof T.Texture)resources.add(t);}meshes.push(o);}});
 if(signal?.aborted){resources.forEach(r=>r.dispose());return;}
 resources.forEach(r=>own(r));let count=0;
 for(const mesh of meshes){
  const n=Number(mesh.name.match(/M44_Floor_(\d+)/)?.[1]);if(!n||!floors[n-1])continue;
  mesh.removeFromParent();mesh.position.set(0,0,0);mesh.rotation.set(0,0,0);mesh.scale.set(1,1,1);
  mesh.name='M Blender window reveals '+n;mesh.userData={finishOnly:true,blenderRevision:44};mesh.castShadow=true;mesh.receiveShadow=true;
  floors[n-1].add(mesh);count++;
 }
 if(count!==22)throw new Error('Incorrect M structural detail floor count');
 return count;
}

