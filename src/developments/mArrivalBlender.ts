import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {addMGalleryFoliage} from './mGalleryFoliage';
import type {Own} from './mSurfaces';

/** Additive detail kit authored in a NEW Blender file against Web27 context.
 * The export contains five material batches, no tower or replacement podium. */
export async function loadMArrivalBlender(site:T.Group,own:Own,
 finishes:{finishStone:(m:T.MeshStandardMaterial)=>void;finishWood:(m:T.MeshStandardMaterial)=>void},signal?:AbortSignal){
 const response=await fetch('/assets/m/model/m-arrival-details-v28.glb',{signal});
 if(!response.ok)throw new Error('Arrival detail kit unavailable');
 const gltf=await new GLTFLoader().parseAsync(await response.arrayBuffer(),'/assets/m/model/');
 const resources=new Set<{dispose:()=>void}>(),materials=new Set<T.MeshStandardMaterial>();
 gltf.scene.traverse(o=>{
  if(!(o instanceof T.Mesh))return;resources.add(o.geometry);
  for(const m of Array.isArray(o.material)?o.material:[o.material]){
   resources.add(m);for(const value of Object.values(m))if(value instanceof T.Texture)resources.add(value);
   if(m instanceof T.MeshStandardMaterial)materials.add(m);
  }
  o.castShadow=true;o.receiveShadow=true;o.userData.finishOnly=true;
 });
 if(signal?.aborted){resources.forEach(r=>r.dispose());return;}
 resources.forEach(r=>own(r));
 for(const m of materials){
  if(m.name==='EME28 Stone'){finishes.finishStone(m);m.color.set('#d4cbb7');}
  if(m.name==='EME28 Oak'){finishes.finishWood(m);m.color.set('#eee2c9');}
  if(m.name==='EME28 Green mineral'){finishes.finishStone(m);m.color.set('#354c40');m.roughness=.43;}
  if(m.name==='EME28 Bronze'){m.color.set('#555b50');m.metalness=.5;m.roughness=.4;}
 }
 const group=gltf.scene;group.name='M Blender arrival details web28';group.userData={finishOnly:true,revision:28,source:'Blender detail kit against Web27',dynamicLights:0};
 addMGalleryFoliage(group,own,[[-19.93,.9,14.6,1.85],[-15.07,.9,14.6,1.85],[17.57,.9,21.4,1.85],[22.43,.9,21.4,1.85]]);
 site.add(group);site.userData.arrivalBlender=28;
 return group;
}
