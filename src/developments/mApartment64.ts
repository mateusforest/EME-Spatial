import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import type {Own} from './mSurfaces';
import type {MUnit} from './mUnits';
import type {buildMInterior,InteriorLevel,RoomView} from './mInterior';
import type {Obstacle} from './mWalking';
import {balcony67,balcony67Obstacles} from './mBalcony67';
import {mSurfaces} from './mSurfaces';

export const apartment64Bounds:Obstacle={minX:.76,maxX:11.30,minZ:-4.20,maxZ:9.16};
// Measured furniture envelopes from the Blender social room, in glTF metres.
export const apartment64Obstacles:Obstacle[]=[
 ...balcony67Obstacles,
 {minX:1.76,maxX:5.54,minZ:-1.14,maxZ:.14},
 {minX:4.23,maxX:5.37,minZ:.1,maxZ:1.31},
 {minX:2.38,maxX:4.02,minZ:.73,maxZ:2.37},
 {minX:1.50,maxX:2.59,minZ:1.98,maxZ:2.92},
 {minX:7.40,maxX:8.60,minZ:-1.43,maxZ:1.43},
 ...[7.03,8.97].flatMap(x=>[-.85,.55].map(y=>({minX:x-.29,maxX:x+.29,minZ:-y-.30,maxZ:-y+.30}))),
 ...[-1.92,1.61].map(y=>({minX:7.70,maxX:8.30,minZ:-y-.32,maxZ:-y+.32})),
 {minX:5.69,maxX:10.26,minZ:-4.20,maxZ:-3.55},
 {minX:1.0,maxX:1.6,minZ:-.55,maxZ:.05},
 {minX:.85,maxX:1.72,minZ:3.08,maxZ:4.08},
 {minX:9.86,maxX:10.84,minZ:2.96,maxZ:4.08},
];
export function buildMApartment64(own:Own,unit:MUnit,disposed:()=>boolean,sharedSurfaces?:ReturnType<typeof mSurfaces>):ReturnType<typeof buildMInterior>{
 const group=new T.Group(),ceiling=new T.Group();group.name='Apartamento 14 · Interior Blender 63';group.add(ceiling);
 const surfaces=sharedSurfaces??mSurfaces(own);balcony67(group,ceiling,own,surfaces);
 const views:Record<string,RoomView>={
  Living:{eye:[10.65,1.97,2.65],look:[4.5,1.2,-1.05]},
  Sacada:{eye:[6,1.97,7.7],look:[6,1.55,20]},
  'Cozinha e jantar':{eye:[6.05,1.97,2.9],look:[8,1.3,-2.8]},
  'Detalhes e materiais':{eye:[5.95,1.97,2.35],look:[3.15,.95,-.1]},
 };
 const level:InteriorLevel={index:0,elevation:0,obstacles:apartment64Obstacles,bounds:apartment64Bounds};
 const draco=new DRACOLoader().setDecoderPath('/assets/draco/');draco.setWorkerLimit(1);
 const loader=new GLTFLoader().setDRACOLoader(draco);
 const ready=loader.loadAsync('/assets/m/apartment64/apartment14.glb').then(gltf=>{
  const resources=new Set<{dispose:()=>void}>();
  gltf.scene.traverse(o=>{if(o instanceof T.Mesh){resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){resources.add(m);for(const v of Object.values(m))if(v instanceof T.Texture){v.anisotropy=4;resources.add(v);}}o.castShadow=o.receiveShadow=true;}});
  if(disposed()){resources.forEach(r=>r.dispose());return;}
  resources.forEach(r=>own(r));group.add(gltf.scene);group.updateMatrixWorld(true);const inverse=group.matrixWorld.clone().invert();
  // A separate ceiling preserves the existing top-down plan control.
  const meshes:T.Mesh[]=[];gltf.scene.traverse(o=>{if(o instanceof T.Mesh&&o.name.includes('Cycles63_surface'))meshes.push(o);});
  for(const mesh of meshes){const localMatrix=new T.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);const geo=mesh.geometry,index=geo.index,pos=geo.getAttribute('position'),a:number[]=[],b:number[]=[];const p=new T.Vector3();
   for(let i=0;i<(index?.count??pos.count);i+=3){const tri=[0,1,2].map(j=>index?index.getX(i+j):i+j);const roof=tri.every(j=>p.fromBufferAttribute(pos,j).applyMatrix4(localMatrix).y>3.13);(roof?b:a).push(...tri);}
   if(b.length){const roofGeo=own(geo.clone());roofGeo.setIndex(b);const roof=new T.Mesh(roofGeo,mesh.material);roof.applyMatrix4(localMatrix);ceiling.add(roof);geo.setIndex(a);}
  }
  // Close the unmodeled side of this social-room study, without inventing other rooms.
  const wall=own(new T.MeshStandardMaterial({color:'#cfc1a6',roughness:.85}));
  const side=new T.Mesh(own(new T.BoxGeometry(.10,2.95,8.55)),wall);side.position.set(11.4,1.80,0);side.receiveShadow=true;group.add(side);
  // Open sliding bay connects the living room to the walkable balcony.
  const metal=own(new T.MeshStandardMaterial({color:'#393c34',metalness:.75,roughness:.3}));
  for(const x of [.72,11.32]){const frame=new T.Mesh(own(new T.BoxGeometry(.055,2.95,.07)),metal);frame.position.set(x,1.80,4.34);group.add(frame);}
  RectAreaLightUniformsLib.init();
  for(const [x,y,z,intensity,w,h] of [[6,2.3,4.25,2.4,8,2],[5,2.9,-3.7,1.4,6,.35],[8,2.4,.15,1.2,2,1]]){
   const light=new T.RectAreaLight('#fff0d9',intensity,w,h);light.position.set(x,y,z);light.lookAt(x,1,z>0?0:2);group.add(light);
  }
  group.userData.apartment64Ready=true;
 }).finally(()=>draco.dispose());
 return {group,ceiling,obstacles:level.obstacles,ready:Promise.all([ready,surfaces.ready.then(()=>{})]),views,bounds:level.bounds,levels:[level],stairs:[],doorways:[{x:6,z:4.34,level:0}],floorHeight:3.5,unit};
}

