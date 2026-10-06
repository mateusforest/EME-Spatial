import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {buildVacaria} from './vacariaModel';

/** Reuses the project's CC0 shrub library, re-exported in Blender; grass tufts are new Blender meshes. */
export async function loadVacariaPlanting(model:ReturnType<typeof buildVacaria>,redraw:()=>void,closed:()=>boolean){
 const asset=await new GLTFLoader().loadAsync('/assets/vacaria/arbustos-biblioteca-v7.glb');
 const loaded=new Set<{dispose:()=>void}>(),shrubs:T.Mesh[]=[];let tuft:T.Mesh|undefined;
 asset.scene.updateMatrixWorld(true);
 asset.scene.traverse(o=>{if(!(o instanceof T.Mesh))return;loaded.add(o.geometry);for(const mat of Array.isArray(o.material)?o.material:[o.material]){loaded.add(mat);for(const v of Object.values(mat))if(v instanceof T.Texture)loaded.add(v);mat.side=T.DoubleSide;mat.transparent=false;mat.alphaTest=.35;mat.depthWrite=true;}
  const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);loaded.add(geo);geo.computeBoundingBox();const b=geo.boundingBox!,center=b.getCenter(new T.Vector3());geo.translate(-center.x,-b.min.y,-center.z);const mesh=new T.Mesh(geo,o.material);
  if(o.name.startsWith('Grama_'))tuft=mesh;else shrubs.push(mesh);
 });
 if(closed()){loaded.forEach(r=>r.dispose());return;}loaded.forEach(r=>model.resources.add(r));
 let seed=907;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const dummy=new T.Object3D();
 function instances(parent:T.Object3D,source:T.Mesh,positions:number[][],name:string){if(!positions.length)return;const m=new T.InstancedMesh(source.geometry,source.material,positions.length);model.resources.add(m);m.name=name;positions.forEach(([x,y,z,s],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,random()*Math.PI*2,0);dummy.scale.setScalar(s);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);});m.castShadow=m.receiveShadow=true;m.computeBoundingSphere();parent.add(m);}
 const homes=[model.house,...model.homes];model.single.getObjectByName('Vizinhas — contexto externo')?.children.forEach(h=>{if(h.name==='Casa vizinha não navegável')homes.push(h as T.Group);});
 for(const h of homes){const group=new T.Group();group.name='Jardim com arbustos da biblioteca';h.add(group);
  const sites=[[-2.55,-.6,.44],[-.22,-.6,.55],[.62,-.6,.52],[2.78,-.65,.26],[2.78,-2.5,.24]];
  shrubs.forEach((s,i)=>instances(group,s,sites.filter((_,j)=>j%shrubs.length===i).map(([x,z,k])=>[x,-.02,z,k]),'Arbustos Poly Haven reutilizados'));
  if(tuft){const positions:number[][]=[];for(let i=0;i<230;i++){const x=-2.7+random()*5.4,z=-.45-random()*4.5;
    if((x>-2.34&&x<-1.66)||(x>-.84&&x<-.16)||(x>1.5&&x<2.68)||z>-.95)continue;
    positions.push([x,-.048,z,.65+random()*.5]);}
    instances(group,tuft,positions,'Grama baixa preparada no Blender');}
 }
 // Groundcover in shared gardens, outside the routes and private parking bays.
 const common=new T.Group();common.name='Vegetação biblioteca V07';model.district.add(common);
 shrubs.forEach((s,i)=>instances(common,s,[[7.2,48],[8,49],[7,60],[8,61],[21,66],[22,66],[34,55],[35,54],[31,46],[32,46]].filter((_,j)=>j%shrubs.length===i).map(([x,z])=>[x,-.06,z,.6]),'Arbustos do lazer'));
 model.district.userData.plantingSource='Poly Haven shrub_02 CC0 — biblioteca existente do projeto, preparado no Blender';redraw();
}
