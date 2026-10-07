import * as T from 'three';
import type {Own} from './mSurfaces';
import {decodeScene71} from './mSceneAsset71';
import {materialBank72,apartmentQuality72,tier72,type Level72} from './mApartmentQuality72';
import {apartmentContacts72} from './mApartmentLight72';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

/** Source snapshot a77ba09: full floor, not the retired cropped interior. */
export function buildApartmentScene71(scene:T.Scene,_renderer:T.WebGLRenderer,own:Own,quality:Level72,request:()=>void){
 const floors=Array.from({length:22},()=>new T.Group()),crown=new T.Group(),abort=new AbortController();
 floors[13].position.y=62.5;floors[14].position.y=66;scene.add(floors[13],floors[14]);
 let bank:ReturnType<typeof materialBank72>|undefined,optimization:ReturnType<typeof apartmentQuality72>|undefined,closed=false;
 const ready=(async()=>{
  const response=await fetch('/assets/m/apartment72/floor14.json.gz',{signal:abort.signal});
  const json=await decodeScene71(response);
  if(closed)return;
  for(const image of json.images){const texture=json.textures.find((t:{image:string})=>t.image===image.uuid);image.url=texture.userData.profiles72[tier72(quality)];}
  const root=await new T.ObjectLoader().parseAsync(json);
  const resources=new Set<{dispose:()=>void}>();
  root.traverse(o=>{if(!(o instanceof T.Mesh))return;resources.add(o.geometry);if(o instanceof T.InstancedMesh)resources.add(o);for(const m of Array.isArray(o.material)?o.material:[o.material]){resources.add(m);for(const v of Object.values(m))if(v instanceof T.Texture)resources.add(v);}});
  if(closed){resources.forEach(r=>r.dispose());return;}resources.forEach(r=>own(r));
  bank=materialBank72(root);optimization=apartmentQuality72(scene,bank.textures,json.lods72,own,quality,request);
  // Production foliage and seams are batched once, never replicated to other floors.
  try{
  const detailResponse=await fetch('/assets/m/apartment75/detail.glb',{signal:abort.signal});
  if(!detailResponse.ok)throw new Error('Não foi possível carregar o acabamento do apartamento.');
  const detail=await new GLTFLoader().parseAsync(await detailResponse.arrayBuffer(),'/assets/m/apartment75/');
  const detailResources=new Set<{dispose:()=>void}>();
  detail.scene.traverse(o=>{if(o instanceof T.Mesh){detailResources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){detailResources.add(m);if(m.name.includes('Folha'))m.side=T.DoubleSide;}o.castShadow=true;o.receiveShadow=true;}});
  if(closed){detailResources.forEach(r=>r.dispose());return;}detailResources.forEach(r=>own(r));
  root.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)&&o.material.name==='M14 leaf')o.visible=false;});
  detail.scene.name='M14 reviewed botanical and fabric details75';root.add(detail.scene);
  }catch(error){if(closed)return;console.warn('Mantendo o paisagismo original: acabamento indisponível.',error);}
  apartmentContacts72(root,own);
  root.position.set(0,0,0);floors[13].add(root);floors[13].userData={...root.userData};
  // The next normal floor has exactly this slab/soffit footprint. Keep only its ceiling surfaces.
  for(const name of ['Reference mineral structure','Reference timber screens']){
   const source=root.getObjectByName(name);if(!(source instanceof T.Mesh))continue;
   const g=source.geometry,p=g.getAttribute('position'),ix=g.index,kept:number[]=[];
   for(let i=0;i<(ix?.count??p.count);i+=3){const tri=[0,1,2].map(k=>ix?ix.getX(i+k):i+k);if(tri.every(j=>p.getY(j)<.501)&&tri.some(j=>p.getY(j)<-.05))kept.push(...tri);}
   if(!kept.length)continue;const geometry=own(g.clone());geometry.setIndex(kept);const ceiling=new T.Mesh(geometry,source.material);ceiling.name='M14 preserved ceiling '+name;ceiling.castShadow=true;ceiling.receiveShadow=true;floors[14].add(ceiling);
  }
  await bank.surfaces.ready;
 })();
 return {floors,crown,get surfaces(){return bank!.surfaces;},ready,designStone:()=>bank?.stone,updateQuality:(camera:T.Camera,level:Level72,root:T.Object3D)=>optimization?.update(camera,level,root)??false,environment:():T.Texture|null=>null,dispose(){closed=true;abort.abort();optimization?.dispose();}};
}

/** Distant authored surroundings, captured at floor height; no city meshes or exterior lights. */
export function apartmentView71(scene:T.Scene,renderer:T.WebGLRenderer,own:Own,request:()=>void){
 let closed=false,reflection:T.Texture|null=null;const texture=own(new T.CubeTextureLoader().load(Array.from({length:6},(_,i)=>'/assets/m/apartment71/view-'+i+'.webp'),()=>{if(!closed){const probe=new T.Scene();probe.background=texture;const pm=new T.PMREMGenerator(renderer);reflection=own(pm.fromScene(probe,0,.1,100,{size:128})).texture;pm.dispose();request();}}));
 texture.colorSpace=T.LinearSRGBColorSpace;
 const material=own(new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{view:{value:texture},tint:{value:new T.Color(1,1,1)}},vertexShader:'varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform samplerCube view;uniform vec3 tint;varying vec3 direction;void main(){gl_FragColor=vec4(textureCube(view,normalize(direction)).rgb*tint,1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));
 const sky=new T.Mesh(own(new T.BoxGeometry(1600,1600,1600)),material);sky.position.y=65;sky.name='M14 distant panorama';sky.renderOrder=-10;scene.add(sky);
 return {reflection:()=>reflection,update(night:number){material.uniforms.tint.value.setRGB(1-.982*night,1-.974*night,1-.945*night);},dispose(){closed=true;}};
}

export function apartmentLights71(scene:T.Scene){
 const emissions=new Set<T.MeshStandardMaterial>();
 const refresh=()=>scene.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof T.MeshStandardMaterial&&m.emissive.getHex()!==0)emissions.add(m);});
 refresh();return {refresh,update(amount:number){for(const m of emissions)m.emissiveIntensity=3.5*amount;}};
}
