import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {buildVacaria} from './vacariaModel';
/** Blender-authored replacements exported in world metres; attach to single, not mirrored house. */
export async function loadVacariaInterior(model:ReturnType<typeof buildVacaria>,draw:()=>void,disposed:()=>boolean){
 const gltf=await new GLTFLoader().loadAsync('/assets/vacaria/interior-blender-v4.glb');const resources=new Set<{dispose:()=>void}>();
 gltf.scene.traverse(o=>{if(!(o instanceof T.Mesh))return;resources.add(o.geometry);o.castShadow=o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material]){resources.add(m);for(const value of Object.values(m))if(value instanceof T.Texture){value.anisotropy=4;resources.add(value);}}});
 if(disposed()){resources.forEach(r=>r.dispose());return;}
 resources.forEach(r=>model.resources.add(r));
 // Clear the entry door's turning space, matching the V07 furniture collision envelope.
 gltf.scene.traverse(o=>{if(/sofá|almofada/i.test(o.name))o.position.z+=.55;});
 const replaced=/^(Sofá|Encosto sofá|Almofada sofá|Colchão|Travesseiro|Manta|Roupa de cama dobrada|Cabeceira|Prega de cortina|Cadeira|Encosto cadeira|Pé cadeira|Cuba|Cooktop|Tampo cozinha|Bancada cozinha)/;
 model.house.traverse(o=>{if(replaced.test(o.name))o.visible=false;});gltf.scene.name='Interior Blender V04';model.single.add(gltf.scene);draw();
}
