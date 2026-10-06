import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {Own} from './mSurfaces';

/** Reference-driven Blender details; all placements inherit the current site/crown handles. */
export async function loadMReferenceRefinement49(scene:T.Scene,site:T.Group,crown:T.Group,own:Own,
 finishes:{finishWood:(m:T.MeshStandardMaterial)=>void;finishStone:(m:T.MeshStandardMaterial)=>void;finishLinen:(m:T.MeshStandardMaterial)=>void},signal?:AbortSignal){
 const response=await fetch('/assets/m/model/m-reference-refinement-v49.glb',{signal});
 if(!response.ok)throw new Error('Blender49 reference details unavailable');
 const gltf=await new GLTFLoader().parseAsync(await response.arrayBuffer(),'/assets/m/model/');
 const resources=new Set<{dispose:()=>void}>(),meshes:T.Mesh[]=[];
 gltf.scene.updateMatrixWorld(true);
 gltf.scene.traverse(o=>{if(!(o instanceof T.Mesh))return;meshes.push(o);resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){resources.add(m);for(const t of Object.values(m))if(t instanceof T.Texture)resources.add(t);}});
 if(signal?.aborted){resources.forEach(r=>r.dispose());return;}
 const surface=meshes.filter(m=>m.name.startsWith('M49_Crown_Surface'));
 const waterfall=meshes.filter(m=>m.name.startsWith('M49_Crown_Overflow'));
 const trees=meshes.filter(m=>m.name.startsWith('M49_TreePrototype'));
 const palms=meshes.filter(m=>m.name.startsWith('M49_PalmPrototype'));
 if(surface.length!==1||waterfall.length!==1||trees.length!==3||palms.length!==3){resources.forEach(r=>r.dispose());throw new Error('Incomplete reference finishing asset');}
 resources.forEach(r=>own(r));
 for(const mesh of meshes){
  mesh.geometry=own(mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));mesh.position.set(0,0,0);mesh.quaternion.identity();mesh.scale.set(1,1,1);
  mesh.userData={finishOnly:true,blenderRevision:49};mesh.castShadow=true;mesh.receiveShadow=true;
  for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
   if(m instanceof T.MeshStandardMaterial&&/leaf/i.test(m.name)){m.side=T.DoubleSide;m.roughness=.86;}
   for(const t of Object.values(m))if(t instanceof T.Texture)t.anisotropy=8;
  }
 }
 // The water top remains exactly at crown + 5.78 m. Only its separate surface/skirt are replaced.
 for(const mesh of [...surface,...waterfall]){
  const original=mesh.material as T.MeshPhysicalMaterial,m=own(original.clone());mesh.material=m;
  m.map=null;m.color.set('#80bec4');m.metalness=0;m.roughness=.17;m.envMapIntensity=1.15;
  m.transmission=.12;m.thickness=.12;m.ior=1.333;m.transparent=true;m.opacity=.88;m.depthWrite=false;
  m.normalScale.set(.22,.22);mesh.castShadow=false;mesh.renderOrder=2;
  // Continuous metric UVs make ripples independent of the ring triangulation.
  const g=mesh.geometry,p=g.attributes.position,uv=new Float32Array(p.count*2),isSurface=surface.includes(mesh);
  for(let i=0;i<p.count;i++){uv[2*i]=isSurface?p.getX(i)/7:(Math.abs(p.getX(i))>12?p.getZ(i):p.getX(i))/2;uv[2*i+1]=isSurface?p.getZ(i)/7:p.getY(i)*2;}
  g.setAttribute('uv',new T.BufferAttribute(uv,2));
 }
 surface[0].name='M49 continuous perimeter water';waterfall[0].name='M49 overflow film';
 const roof=new T.Group();roof.name='M reference rooftop details 49';roof.userData={finishOnly:true,blenderRevision:49};
 for(const mesh of meshes.filter(m=>m.name.startsWith('M49_Crown_')||surface.includes(m)||waterfall.includes(m)))roof.add(mesh);
 const priorWater=crown.getObjectByName('Crown33 Reference rooftop water');
 if(!priorWater)throw new Error('Expected web47 pool geometry not found');
 priorWater.visible=false;crown.add(roof);
 const pots=[[-9.5,6.52,3.1,.75],[9.5,6.52,3.1,.75],[-9.4,6.52,-8,.75],[9.4,6.52,-8,.75],[-5,6.376,-9,.6],[5,6.376,-9,.6],[-15.6,1.436,9.8,1],[15.6,1.436,9.8,1],[-15.6,1.436,-14,1],[15.6,1.436,-14,1]];
 const dummy=new T.Object3D();
 function instances(parent:T.Group,parts:T.Mesh[],places:number[][],name:string){
  for(const proto of parts){const mesh=own(new T.InstancedMesh(proto.geometry,proto.material,places.length));mesh.name=name;mesh.userData={finishOnly:true,blenderRevision:49};
   places.forEach(([x,y,z,s,a=0],i)=>{dummy.position.set(x,y,z);dummy.scale.setScalar(s);dummy.rotation.set(0,a,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();parent.add(mesh);}
 }
 crown.getObjectByName('M crown furniture web33')?.getObjectByName('M gallery broadleaf understory')?.removeFromParent();
 instances(roof,trees,pots,'M49 rooftop trees');
 // Reuse the established campus palm positions and heights; no planting is moved into paths.
 const campus=site.getObjectByName('M campus planting'),palmPlaces:number[][]=[];
 if(campus){
  const oldLeaves=campus.children.find(o=>o instanceof T.InstancedMesh&&!Array.isArray(o.material)&&o.material.name==='Palm fronds') as T.InstancedMesh|undefined;
  const oldTrunks=campus.children.find(o=>o instanceof T.InstancedMesh&&o!==oldLeaves&&o.geometry.type==='CylinderGeometry') as T.InstancedMesh|undefined;
  if(oldTrunks&&oldLeaves){const matrix=new T.Matrix4(),pos=new T.Vector3(),q=new T.Quaternion(),scale=new T.Vector3();
   for(let i=0;i<oldTrunks.count;i++){oldTrunks.getMatrixAt(i,matrix);matrix.decompose(pos,q,scale);palmPlaces.push([pos.x,pos.y-scale.y/2,pos.z,scale.y/6,i*2.399]);}
   const group=new T.Group();group.name='M49 crafted campus palms';group.userData.finishOnly=true;campus.add(group);instances(group,palms,palmPlaces,'M49 palms');oldTrunks.visible=false;oldLeaves.visible=false;
  }
 }
 const done=new Set<T.Material>(),mapped=new Set<T.BufferGeometry>();
 scene.traverse(o=>{
  if(!(o instanceof T.Mesh)||Array.isArray(o.material)||!(o.material instanceof T.MeshStandardMaterial))return;
  const m=o.material,name=m.name;
  // The garage owns calibrated cabin glazing and authored UVs for signs and parking numbers.
  if(name.startsWith('Garage55 '))return;
  if(!done.has(m)){
   if(/glazing|glazed|glass/i.test(name)){
    m.color.set('#e5ece8');m.roughness=.10;m.metalness=.035;m.opacity=.23;m.transparent=true;m.depthWrite=false;m.envMapIntensity=.9;
   }else if(/stone|limestone|mineral structure|paving/i.test(name)&&!name.includes('marble')){
    finishes.finishStone(m);if(/paving|terrace/i.test(name))m.roughness=.68;
   }else if(/oak|timber|teak|wood/i.test(name))finishes.finishWood(m);
   else if(/linen|upholstery|cushion/i.test(name))finishes.finishLinen(m);
   done.add(m);
  }
  // Geometry coordinates stay untouched. Only the UV layer is cloned and normalized.
  if(m.map&&!/marble|water|leaf/i.test(name)&&!o.userData.blenderRevision&&!mapped.has(o.geometry)){
   const g=own(o.geometry.clone()),p=g.attributes.position,n=g.attributes.normal;
   if(!n)return;const uv=new Float32Array(p.count*2),wood=/oak|timber|wood|teak/i.test(name),vertical=wood&&/screens/i.test(name);
   const offset=(Math.abs(o.parent?.position.y||0)*.173)%1;
   for(let i=0;i<p.count;i++){
    const x=p.getX(i)*o.scale.x,y=p.getY(i)*o.scale.y,z=p.getZ(i)*o.scale.z;
    const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));
    uv[2*i]=(vertical&&ay<.5?y:ax>ay&&ax>az?z:x)/(wood?3:2.5)+offset;
    uv[2*i+1]=(vertical&&ay<.5?(ax>az?z:x):ay>ax&&ay>az?z:y)/(wood?1.2:2.5)+offset*.47;
   }
   g.setAttribute('uv',new T.BufferAttribute(uv,2));o.geometry=g;mapped.add(g);
  }
 });
 scene.userData.referenceFinish={revision:49,palms:palmPlaces.length,rooftopTrees:pots.length,poolHeight:99.78};
 return scene.userData.referenceFinish;
}

