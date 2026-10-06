import {buildMGarage55} from './mGarage55';
import {furnishMApartments44} from './mApartmentFurniture44';
import {finishMPatio40} from './mPatio40';
import {finishMCommunity39} from './mCommunity39';
import * as T from 'three';
import {buildMReferenceArchitecture,M_REFERENCE} from './mReferenceArchitecture';
import type {Own} from './mSurfaces';
import {unitForFloor} from './mUnits';
import {addMGalleryFoliage} from './mGalleryFoliage';
import {finishMArrival} from './mArrivalFinish';
import {mGalleryPlantingLocations} from './mGalleryPlantingLayout';
import {finishMTower} from './mTowerFinish';
import {finishMLobbyGallery} from './mLobbyGalleryFinish';
import {finishMGarage} from './mGarageFinish';
import {finishMLeisure} from './mLeisureFinish';
import {finishMCrown33} from './mCrown33';
import {finishMPlanting} from './mPlantingFinish';
import {furnishMBalconies} from './mBalconyFurniture';

/** The approved geometry is shared verbatim with the neutral review. Only finishes and
 * planting are added here; old apartment layouts remain a separately identified study. */
export function buildMRenderedArchitecture(scene:T.Scene,site:T.Group,source:T.Object3D,own:Own,
 finishes:{finishWood:(m:T.MeshStandardMaterial)=>void;finishStone:(m:T.MeshStandardMaterial)=>void}){
 const model=buildMReferenceArchitecture(scene,site,own),done=new Set<T.Material>();
 const roots=[...model.floors,model.crown,site.getObjectByName('M asymmetric reference podium')!,site.getObjectByName('M community level architecture')!];
 for(const root of roots)root.traverse(o=>{
  if(!(o instanceof T.Mesh)||Array.isArray(o.material))return;
  const m=o.material as T.MeshStandardMaterial;
  if(!done.has(m)){
   if(m.name==='Reference mineral structure'){m.color.set('#d7d3c8');finishes.finishStone(m);}
   if(m.name==='Reference timber screens'){finishes.finishWood(m);m.color.set('#eee6d7');}
   if(m.name==='Reference bronze frames'){m.color.set('#4c514a');m.roughness=.34;m.metalness=.55;}
   if(m.name==='Reference glazing'){m.color.set('#bfcac5');m.opacity=.31;m.roughness=.14;m.metalness=.12;m.envMapIntensity=1.1;m.forceSinglePass=true;}
   if(m.name==='Reference rooftop water'){m.color.set('#608e89');m.roughness=.14;m.metalness=.30;}
   if(m.name==='M monogram'){m.color.set('#fcfcf8');m.emissive.set('#dfdfd7');m.emissiveIntensity=.12;m.roughness=.3;}
   done.add(m);
  }
  // Metric UVs after the builder's mesh batching; shared cube geometry is never mutated.
  if(m.map){const g=own(o.geometry.clone()),p=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(p.count*2);
   for(let i=0;i<p.count;i++){
    const x=p.getX(i)*o.scale.x,y=p.getY(i)*o.scale.y,z=p.getZ(i)*o.scale.z;
    const verticalWood=m.name==='Reference timber screens'&&Math.abs(n.getY(i))<.5;
    uv[i*2]=verticalWood?y/3.5+root.position.y*.07:(Math.abs(n.getX(i))>.5?z:x)/2.5;
    uv[i*2+1]=verticalWood?(Math.abs(n.getX(i))>.5?z:x)/1.2:(Math.abs(n.getY(i))>.5?z:y)/2.5;
   }g.setAttribute('uv',new T.BufferAttribute(uv,2));o.geometry=g;
  }
  o.castShadow=!m.transparent;o.receiveShadow=true;
 });
 model.floors.forEach((f,i)=>{f.userData.unit=unitForFloor(i+1).id;});
 // Existing local botanical templates are reused, with placements owned by each floor.
 const parts:{geometry:T.BufferGeometry;material:T.Material}[]=[];
 source.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)&&/shrub_02/.test(o.material.name)&&!parts.some(p=>p.geometry===o.geometry))parts.push({geometry:o.geometry,material:o.material});});
 const dummy=new T.Object3D();
 function shrubs(parent:T.Object3D,positions:number[][]){
  for(const [variant,part] of parts.entries()){const locations=positions.filter((_,i)=>i%parts.length===variant);if(!locations.length)continue;const mesh=own(new T.InstancedMesh(part.geometry,part.material,locations.length));mesh.name='M approved facade planting';
   locations.forEach(([x,y,z],i)=>{dummy.position.set(x,y,z);dummy.scale.setScalar(.65+(i%3)*.04);dummy.rotation.set(0,i*2.399,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
   mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();parent.add(mesh);
  }
 }
 model.floors.forEach(f=>{if(f.userData.envelope.penthouseUpper)return;const positions:number[][]=[];for(const side of [-1,1])for(const dx of [-1.2,-.4,.4,1.2]){
  if(f.userData.envelope.notch!==2&&f.userData.envelope.notch!==side)positions.push([side*11.2+dx,1.1,8.75]);
  positions.push([side*10.7+dx,1.1,-13.25]);
 }shrubs(f,positions);});
 const planting=new T.Group();planting.name='M approved gallery planting';site.add(planting);
 const galleryLocations=mGalleryPlantingLocations();
 shrubs(planting,galleryLocations.filter((v,i)=>i%16===0&&v[2]>10&&Math.abs(v[0])>15));
 addMGalleryFoliage(planting,own,galleryLocations);
 addMGalleryFoliage(planting,own,[-9.3,-8.5,-7.7,-6.9].map(x=>[x,1.03,13.4]).concat([7.1,7.9,8.7,9.5,10.3].map(x=>[x,1.03,16.5])));
 model.crown.userData.architectureRevision=M_REFERENCE.revision;
 finishMArrival(site,own,finishes.finishStone);
 finishMTower(model.floors,own,finishes.finishStone);
 finishMLobbyGallery(site,own,finishes);
 finishMGarage(site,own,finishes);
 buildMGarage55(site,own,finishes);
 finishMLeisure(site,own,finishes);
 finishMCrown33(model.crown,own,finishes);
 finishMPlanting(site,model.floors,own,finishes.finishStone);
 furnishMBalconies(model.floors,own,finishes);
 furnishMApartments44(model.floors,own);
 finishMCommunity39(site,own);finishMPatio40(site,own);return model;
}






