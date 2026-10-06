import {loadMRooftopFacade47} from './mRooftopFacade47';
import {loadMBlenderRefinement48} from './mBlenderRefinement48';
import {loadMReferenceRefinement49} from './mReferenceRefinement49';
import {loadMRealism50} from './mRealism50';
import {loadMEditorial61} from './mEditorial61';
import {loadMStructure44} from './mStructureBlender44';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { mSurfaces } from './mSurfaces';
import { buildMRenderedArchitecture } from './mRenderedArchitecture';
import { buildMCampus } from './mCampus';
import { loadMArrivalBlender } from './mArrivalBlender';

/** Subtract a central entrance volume without deleting the lateral gallery triangles. */
export function openMEntrance(site:T.Object3D,own:<A extends {dispose:()=>void}>(a:A)=>A){
 const cut=new T.Box3(new T.Vector3(-5,.8,6.8),new T.Vector3(5,7.2,18.5));
 const report:{name:string;before:number;after:number;affected:number}[]=[];site.updateWorldMatrix(true,true);
 const meshes:T.Mesh[]=[];site.traverse(object=>{if(object instanceof T.Mesh&&!(object instanceof T.InstancedMesh)&&!Array.isArray(object.material)&&/limestone|oak|timber|wood|glazing|champagne|reveals|diffuser/i.test(object.material.name))meshes.push(object);});
 const planes:[number,number,number][]=[[0,1,5],[0,-1,5],[1,1,-.8],[1,-1,7.2],[2,1,-6.8],[2,-1,18.5]];
 type Vertex={point:T.Vector3;values:number[][]};
 const component=(attribute:T.BufferAttribute|T.InterleavedBufferAttribute,i:number,j:number)=>j===0?attribute.getX(i):j===1?attribute.getY(i):j===2?attribute.getZ(i):attribute.getW(i);
 for(const mesh of meshes){
  const g=mesh.geometry;g.computeBoundingBox();if(!g.boundingBox!.clone().applyMatrix4(mesh.matrixWorld).intersectsBox(cut))continue;
  const names=Object.keys(g.attributes),attributes=names.map(name=>g.getAttribute(name)),output=attributes.map(()=>[] as number[]),index=g.index,count=index?.count||g.getAttribute('position').count;
  const vertex=(i:number):Vertex=>({point:new T.Vector3().fromBufferAttribute(g.getAttribute('position'),i).applyMatrix4(mesh.matrixWorld),values:attributes.map(a=>Array.from({length:a.itemSize},(_,j)=>component(a,i,j)))});
  const interpolate=(a:Vertex,b:Vertex,t:number):Vertex=>({point:a.point.clone().lerp(b.point,t),values:a.values.map((v,k)=>v.map((n,j)=>n+(b.values[k][j]-n)*t))});
  const emit=(polygon:Vertex[])=>{for(let i=1;i<polygon.length-1;i++)for(const v of [polygon[0],polygon[i],polygon[i+1]])v.values.forEach((values,k)=>output[k].push(...values));};
  let affected=0;
  for(let i=0;i<count;i+=3){
   const triangle=[0,1,2].map(j=>vertex(index?index.getX(i+j):i+j));
   const bounds=new T.Box3().setFromPoints(triangle.map(v=>v.point));if(!bounds.intersectsBox(cut)){emit(triangle);continue;}
   let remaining=triangle;
   for(const [axis,sign,constant]of planes){
    if(!remaining.length)break;const inside:Vertex[]=[],outside:Vertex[]=[];
    for(let j=0;j<remaining.length;j++){
     const a=remaining[(j+remaining.length-1)%remaining.length],b=remaining[j],da=sign*a.point.getComponent(axis)+constant,db=sign*b.point.getComponent(axis)+constant;
     if((da>=0)!==(db>=0)){const intersection=interpolate(a,b,da/(da-db));inside.push(intersection);outside.push(intersection);}
     (db>=0?inside:outside).push(b);
    }
    emit(outside);remaining=inside;
   }
   if(remaining.length)affected++;
  }
  if(!affected)continue;
  const replacement=own(new T.BufferGeometry());attributes.forEach((attribute,i)=>replacement.setAttribute(names[i],new T.Float32BufferAttribute(output[i],attribute.itemSize)));
  replacement.computeBoundingBox();replacement.computeBoundingSphere();mesh.geometry=replacement;
  report.push({name:mesh.name,before:count/3,after:replacement.getAttribute('position').count/3,affected});
 }
 return report;
}

/** Retain the authored garden while the new park owns all planting beyond the plot. */
export function retainMLocalBotany(site:T.Object3D){
 const vegetation:T.InstancedMesh[]=[];site.updateWorldMatrix(true,true);
 site.traverse(object=>{if(!(object instanceof T.InstancedMesh))return;const materials=Array.isArray(object.material)?object.material:[object.material];if(materials.some(m=>/fern_02|shrub_02|island_tree_02|understory foliage/i.test(m.name)))vegetation.push(object);});
 const matrix=new T.Matrix4(),world=new T.Matrix4(),position=new T.Vector3(),color=new T.Color();
 const report:{name:string;before:number;retained:number;removed:number}[]=[];
 for(const mesh of vegetation){
  const before=mesh.count;let retained=0;
  for(let i=0;i<before;i++){
   mesh.getMatrixAt(i,matrix);world.multiplyMatrices(mesh.matrixWorld,matrix);position.setFromMatrixPosition(world);
   if(Math.abs(position.x)>49||Math.abs(position.z)>44)continue;
   if(i!==retained){mesh.setMatrixAt(retained,matrix);if(mesh.instanceColor){mesh.getColorAt(i,color);mesh.setColorAt(retained,color);}}
   retained++;
  }
  mesh.count=retained;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  mesh.boundingBox=null;mesh.boundingSphere=null;mesh.computeBoundingBox();mesh.computeBoundingSphere();
  if(!retained)mesh.visible=false;
  report.push({name:mesh.name,before,retained,removed:before-retained});
 }
 return report;
}

export function buildMExterior(scene:T.Scene,renderer:T.WebGLRenderer,own:<A extends {dispose:()=>void}>(a:A)=>A){
 // Stable handles are available before the asynchronous GLB delivery finishes.
 const floors=Array.from({length:22},()=>new T.Group()),crown=new T.Group();
 floors.forEach(f=>scene.add(f));scene.add(crown);
 const surfaces=mSurfaces(own,Math.min(renderer.capabilities.getMaxAnisotropy(),8));
 scene.fog=null;
 let daylight:T.Texture|null=null;
 const abort=new AbortController();
 const loader=new GLTFLoader();let closed=false;
 // A local daylight capture supplies both the sky and coherent reflections.
 const lighting=(async()=>{
  const hdr=await new HDRLoader().loadAsync('/assets/m/materials/daylight-1k.hdr');
  if(closed){hdr.dispose();return;}
  hdr.mapping=T.EquirectangularReflectionMapping;own(hdr);
  const pm=new T.PMREMGenerator(renderer),environment=own(pm.fromEquirectangular(hdr));pm.dispose();
  daylight=environment.texture;scene.environment=daylight;scene.background=hdr;
  scene.backgroundRotation.y=.45;scene.environmentRotation.y=.45;scene.backgroundIntensity=.72;scene.backgroundBlurriness=.015;
 })();
 const ready=(async()=>{
  const response=await fetch('/assets/m/model/m-shrubs-v21.glb',{signal:abort.signal});if(!response.ok)throw new Error('Model unavailable');
  const model=await loader.parseAsync(await response.arrayBuffer(),'/assets/m/model/');
  const resources=new Set<{dispose:()=>void}>();
  const finished=new Set<T.Material>();
  model.scene.traverse(object=>{
   if(!(object instanceof T.Mesh))return;resources.add(object.geometry);if(object instanceof T.InstancedMesh)resources.add(object);
   const materials=Array.isArray(object.material)?object.material:[object.material];
   for(const material of materials){
    resources.add(material);
    if(!finished.has(material)&&material instanceof T.MeshStandardMaterial){
     if(/oak|timber|wood/i.test(material.name))surfaces.finishWood(material);
     if(/limestone|paving|plaster/i.test(material.name))surfaces.finishStone(material);
     if(/linen|cushions/i.test(material.name))surfaces.finishLinen(material);
     if(/glazing/i.test(material.name)){material.color.set('#dce4df');material.opacity=.19;material.roughness=.085;material.metalness=.12;material.depthWrite=false;}
     if(/water/i.test(material.name)){material.color.set('#6b9890');material.roughness=.12;material.metalness=.32;}
     if(/fern_02|shrub_02|island_tree_02_leaves/.test(material.name)){material.transparent=false;material.alphaTest=.35;material.depthWrite=true;}
     finished.add(material);
    }
    for(const value of Object.values(material))if(value instanceof T.Texture)resources.add(value);
   }
   // Transparent glazing must not produce the shadow of a solid wall.
   object.castShadow=!materials.every(m=>m.transparent);object.receiveShadow=true;
  });
  if(closed){resources.forEach(r=>r.dispose());return;}
  resources.forEach(r=>own(r));
  // A dedicated botanical asset replaces loading the archived whole-building GLB.
  // The original building asset remains preserved on disk; architecture is web-owned.
  const site=buildMCampus(scene,own,surfaces,{gallery:false});
  const tower=buildMRenderedArchitecture(scene,site,model.scene,own,surfaces);
  tower.floors.forEach((floor,i)=>{floor.removeFromParent();floors[i].name=floor.name;floors[i].position.copy(floor.position);floors[i].scale.copy(floor.scale);floors[i].userData={...floor.userData};for(const child of [...floor.children])floors[i].add(child);});
  tower.crown.removeFromParent();crown.name=tower.crown.name;crown.position.copy(tower.crown.position);for(const child of [...tower.crown.children])crown.add(child);
  await loadMArrivalBlender(site,own,surfaces,abort.signal);
  await loadMStructure44(floors,own,abort.signal);
  if(closed)return;
  await loadMRooftopFacade47(floors,crown,own,abort.signal);
  if(closed)return;
  await loadMBlenderRefinement48(scene,site,floors,crown,own,surfaces,abort.signal);
  if(closed)return;
  await loadMReferenceRefinement49(scene,site,crown,own,surfaces,abort.signal);
  if(closed)return;
  await loadMRealism50(scene,crown,own,surfaces,abort.signal);
  if(closed)return;
  await loadMEditorial61(scene,crown,own,surfaces,abort.signal);
  if(closed)return;
  scene.userData.structureBlender=47;
  scene.userData.arrivalBlender=site.userData.arrivalBlender;
  await Promise.all([lighting,surfaces.ready]);renderer.shadowMap.needsUpdate=true;
 })();
 return {floors,crown,ready,surfaces,environment:()=>daylight,dispose:()=>{closed=true;abort.abort();}};
}


