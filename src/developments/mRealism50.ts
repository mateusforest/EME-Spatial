import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {Own} from './mSurfaces';

/** Native Blender50 details, batched by material, attached to the existing roof handle. */
export async function loadMRealism50(scene:T.Scene,crown:T.Group,own:Own,
 finishes:{finishWood:(m:T.MeshStandardMaterial)=>void;finishStone:(m:T.MeshStandardMaterial)=>void;finishLinen:(m:T.MeshStandardMaterial)=>void},signal?:AbortSignal){
 const [asset,manifest]=await Promise.all([
  fetch('/assets/m/model/m-realism-v50.glb',{signal}),fetch('/assets/m/model/m-realism-v50.json',{signal})
 ]);
 if(!asset.ok||!manifest.ok)throw new Error('Blender50 details unavailable');
 const info=await manifest.json() as {revision:number;treePlaces:{position:number[];scale:number[];angle:number}[];poolLevel:number;poolDepth:number};
 const gltf=await new GLTFLoader().parseAsync(await asset.arrayBuffer(),'/assets/m/model/');
 const meshes:T.Mesh[]=[],resources=new Set<{dispose:()=>void}>();
 gltf.scene.updateMatrixWorld(true);
 gltf.scene.traverse(o=>{if(!(o instanceof T.Mesh))return;meshes.push(o);resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){resources.add(m);for(const v of Object.values(m))if(v instanceof T.Texture)resources.add(v);}});
 if(signal?.aborted){resources.forEach(r=>r.dispose());return;}
 const parts=(name:string)=>meshes.filter(m=>m.name.startsWith(name)||m.parent?.name===name);
 const trees=parts('M50_TreePrototype'),basin=parts('M50_Basin'),furniture=parts('M50_Furniture'),details=parts('M50_Details'),floor=parts('M50_PoolFloor'),logo=parts('M50_Monogram');
 const oldBasin=crown.getObjectByName('Crown33 Reference mineral structure'),oldFurniture=crown.getObjectByName('M crown furniture web33');
 const oldLogo=crown.getObjectByName('M green marble monogram') as T.Mesh|undefined;
 const water=crown.getObjectByName('M49 continuous perimeter water') as T.Mesh|undefined;
 if(info.revision!==50||info.treePlaces.length!==10||[trees,basin,furniture,details,floor,logo].some(a=>!a.length)||!oldBasin||!oldFurniture||!water||!oldLogo){resources.forEach(r=>r.dispose());throw new Error('Incomplete Blender50 geometry or roof handles');}
 resources.forEach(r=>own(r));
 const group=new T.Group();group.name='M Blender realism 50';group.userData={finishOnly:true,blenderRevision:50};
 for(const mesh of meshes){
  mesh.geometry=own(mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));mesh.position.set(0,0,0);mesh.quaternion.identity();mesh.scale.set(1,1,1);
  mesh.userData={finishOnly:true,blenderRevision:50};mesh.castShadow=true;mesh.receiveShadow=true;
  for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
   if(!(m instanceof T.MeshStandardMaterial))continue;
   const name=m.name;
   if(/oak|wood/i.test(name))finishes.finishWood(m);
   else if(/travertine|limestone/i.test(name))finishes.finishStone(m);
   else if(/linen|cushion/i.test(name))finishes.finishLinen(m);
   else if(/leaf/i.test(name)){m.side=T.DoubleSide;m.roughness=.67;}
   else if(/glass/i.test(name)){m.color.set('#dcebe3');m.transparent=true;m.opacity=.25;m.depthWrite=false;mesh.castShadow=false;}
   else if(/ceramic/i.test(name)){m.color.set('#c4bda9');m.roughness=.66;}
   m.envMapIntensity=.85;
  }
  if(!trees.includes(mesh))group.add(mesh);
 }
 // Reuse the established green marble texture on the bevelled native monogram.
 for(const mesh of logo){const m=own((oldLogo.material as T.MeshStandardMaterial).clone());m.roughness=.22;m.envMapIntensity=1;mesh.material=m;}
 // A submerged mineral floor replaces the former solid cap immediately under water.
 for(const mesh of floor){const m=own(new T.MeshStandardMaterial({color:'#77aaa0',roughness:.47}));mesh.material=m;mesh.castShadow=false;}
 const dummy=new T.Object3D();
 for(const proto of trees){
  const inst=own(new T.InstancedMesh(proto.geometry,proto.material,info.treePlaces.length));inst.name='M50 rooftop olive trees';inst.userData={finishOnly:true,blenderRevision:50};
  info.treePlaces.forEach((p,i)=>{dummy.position.fromArray(p.position);dummy.scale.set(p.scale[0],p.scale[2],p.scale[1]);dummy.rotation.set(0,p.angle,0);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);});
  inst.castShadow=true;inst.receiveShadow=true;inst.computeBoundingSphere();group.add(inst);
 }
 const waterMat=own(new T.MeshPhysicalMaterial({color:'#c4e6e0',roughness:.10,metalness:0,transmission:.68,thickness:info.poolDepth,ior:1.333,attenuationColor:'#66aeb0',attenuationDistance:3,envMapIntensity:1.1}));
 const previous=water.material as T.MeshStandardMaterial;waterMat.normalMap=previous.normalMap;waterMat.normalScale.set(.16,.16);
 water.material=waterMat;water.renderOrder=0;water.castShadow=false;
 const overflow=crown.getObjectByName('M49 overflow film') as T.Mesh|undefined;
 if(overflow){const m=own((overflow.material as T.MeshPhysicalMaterial).clone());m.color.set('#b4dcdb');m.opacity=.58;m.roughness=.13;m.normalScale.set(.18,.3);overflow.material=m;}
 // Commit only after the complete replacement and its required handles are valid.
 oldBasin.visible=false;oldFurniture.visible=false;oldLogo.visible=true;for(const mesh of logo)mesh.visible=false;
 crown.traverse(o=>{if(o.name==='M49 rooftop trees')o.visible=false;});crown.add(group);
 scene.userData.realismFinish={revision:50,rooftopTrees:10,barStools:7,planters:10,chaises:4,poolLevel:info.poolLevel,poolDepth:info.poolDepth,batches:group.children.length};
 return scene.userData.realismFinish;
}
