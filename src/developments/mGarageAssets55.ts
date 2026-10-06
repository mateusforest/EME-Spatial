import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {GARAGE55,garageCars55} from './mGarageLayout55';
import type {Own} from './mSurfaces';

/** CC-BY-4.0 Car Concept by Eric Chadwick / DGG; attribution in public/assets/m/garage55. */
export async function garageAssets55(scene:T.Scene,own:Own,isDisposed:()=>boolean){
 const garage=scene.getObjectByName('M basement garage web55');if(!garage)return;
 const gltf=await new GLTFLoader().loadAsync('/assets/m/garage55/car-concept-web.glb');
 const source=gltf.scene,geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();
 source.traverse(o=>{if(!(o instanceof T.Mesh))return;geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value instanceof T.Texture)textures.add(value);}});
 const clearSource=()=>{geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());};
 if(isDisposed()){clearSource();textures.forEach(t=>t.dispose());return;}
 textures.forEach(t=>{t.anisotropy=4;own(t);});source.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(source),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 // Adapt the exceptionally wide concept to a 2.08 x 4.62 m parked vehicle envelope.
 const normalize=new T.Matrix4().makeScale(2.08/size.x,1.40/size.y,4.62/size.z).multiply(new T.Matrix4().makeTranslation(-center.x,-bounds.min.y,-center.z));
 const groups=new Map<T.MeshStandardMaterial,T.BufferGeometry[]>();
 source.traverse(o=>{if(!(o instanceof T.Mesh)||Array.isArray(o.material))return;
  if(/Interior|Engine|HoodUnder|HoodInterior|License/i.test(o.name))return;
  const original=o.material as T.MeshStandardMaterial;
  const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(new T.Matrix4().multiplyMatrices(normalize,o.matrixWorld));
  for(const attr of Object.keys(g.attributes))if(!['position','normal','uv','uv1'].includes(attr))g.deleteAttribute(attr);
  if(!g.getAttribute('normal'))g.computeVertexNormals();if(!g.getAttribute('uv'))g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count*2),2));
  if(!g.getAttribute('uv1'))g.setAttribute('uv1',g.getAttribute('uv').clone());
  const list=groups.get(original)??[];list.push(g);groups.set(original,list);
 });
 const cars=garageCars55.filter(b=>b.row<2||b.id%2===0),root=new T.Group();root.name='Garage55 detailed vehicles';
 const palette=['#d8d4c7','#536369','#25332d','#888d8d','#49342d','#262c31'];
 for(const [original,parts]of groups){
  const merged=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());if(!merged)throw new Error('Garage vehicle material merge failed');own(merged);merged.computeBoundingSphere();
  const body=/Paint 1/.test(original.name),batches=body?palette.map((_,i)=>cars.filter(b=>b.id%palette.length===i)):[cars];
  batches.forEach((bays,variation)=>{if(!bays.length)return;
   const m=own(original.clone()) as T.MeshPhysicalMaterial;m.name='Garage55 asset '+original.name;m.userData.noNightFill=true;m.emissiveIntensity=0;
   if(body){m.color.set(palette[variation]);m.metalness=.45;m.roughness=.28;m.normalScale.set(.035,.035);m.clearcoat=1;m.clearcoatRoughness=.17;}
   if(/Paint 2/.test(original.name)){m.color.set('#202827');m.metalness=.6;m.roughness=.3;}
   if(/Glass/.test(original.name)){m.transmission=0;m.transparent=false;m.opacity=1;m.color.set('#172320');m.metalness=.3;m.roughness=.13;m.clearcoat=1;}
   const batch=own(new T.InstancedMesh(merged,m,bays.length));batch.name='Garage55 parked '+original.name;batch.castShadow=true;batch.receiveShadow=true;
   bays.forEach((bay,i)=>{const matrix=new T.Matrix4().compose(new T.Vector3(bay.x,GARAGE55.floor+.012,bay.z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),bay.row%2===0?Math.PI:0),new T.Vector3(1,1,1));batch.setMatrixAt(i,matrix);});
   batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();root.add(batch);
  });
 }
 clearSource();garage.add(root);
 cars.forEach(b=>{const fallback=garage.getObjectByName('Garage55 vehicle '+b.id);if(fallback)fallback.visible=false;});
 garage.userData.detailedVehicles=cars.length;garage.userData.vehicleEnvelope=[2.08,1.40,4.62];
 return cars.length;
}
