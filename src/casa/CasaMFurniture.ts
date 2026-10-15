import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import type {FurnitureGroup} from './CasaMTypes';

export const furnitureOptions={
 sofa:[{id:'original',name:'Oliva · composição original',detail:'Cinco módulos sobre base de nogueira'},{id:'linen',name:'Linho · três lugares',detail:'Volumes contínuos, braços largos e tecido claro'},{id:'modular',name:'Lounge · modular',detail:'Três módulos com encostos baixos'}],
 dining:[{id:'original',name:'Nogueira · oval',detail:'Tampo oval com pedestal escultórico'},{id:'stone',name:'Travertino · oval',detail:'Pedra acetinada sobre dois apoios'},{id:'wood',name:'Nogueira · retangular',detail:'Cantos arredondados e base de madeira'}],
 chairs:[{id:'original',name:'Couro · conhaque',detail:'Cadeiras da composição original'},{id:'linen',name:'Linho · envolvente',detail:'Encosto curvo com estrutura de madeira'}],
} satisfies Record<FurnitureGroup,{id:string;name:string;detail:string}[]>;
export const furnitureLabels:Record<FurnitureGroup,string>={sofa:'Sofá do estar',dining:'Mesa de jantar',chairs:'Cadeiras do jantar'};

/** New options stay inside the original circulation envelope. Dimensions in metres. */
export function createCasaFurniture(group:FurnitureGroup,id:string,materials?:Map<string,T.MeshStandardMaterial>){
 const root=new T.Group();
 const material=(family:string,color:string,roughness=.7)=>{
  const source=materials?.get(family);const m=source?source.clone():new T.MeshStandardMaterial({color,roughness});
  if(source){m.userData={...source.userData};m.envMap=null;}
  if(!source)m.color.set(color);return m;
 };
 const wood=material('walnut','#5b3420',.4),linen=material('linen','#d5c8b3',.94),olive=material('velvet','#596047',.95),stone=material('travertine','#d7c7ac',.38);
 const cushion=id==='modular'?olive:linen;
 function box(size:Point,position:Point,m:T.Material,radius=.035){const mesh=new T.Mesh(new RoundedBoxGeometry(...size,3,Math.min(radius,...size.map(x=>x*.48))),m);mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;}
 type Point=[number,number,number];
 if(group==='sofa'){
  box([3.68,.20,.86],[0,.12,0],wood,.04);
  const count=3;
  for(let i=0;i<count;i++){
   const x=(i-1)*1.16;box([1.14,.25,.86],[x,.36,0],cushion,.10);box([1.14,.55,.23],[x,.70,.34],cushion,.09);
  }
  if(id==='linen')for(const x of [-1.73,1.73])box([.22,.49,.95],[x,.47,0],cushion,.10);
  for(const x of [-1.25,1.25]){const p=box([.43,.43,.15],[x,.66,.08],linen,.06);p.rotation.x=-.16;p.rotation.z=x>0?-.1:.1;}
 }else if(group==='dining'){
  if(id==='stone'){
   const g=new T.CylinderGeometry(1,1,.065,72);g.scale(1.45,1,.59);const top=new T.Mesh(g,stone);top.position.y=.75;top.castShadow=top.receiveShadow=true;root.add(top);
   for(const x of [-.73,.73])box([.36,.69,.60],[x,.35,0],stone,.06);
  }else{box([2.9,.07,1.18],[0,.75,0],wood,.12);for(const x of [-1.05,1.05])box([.16,.72,.84],[x,.36,0],wood,.035);}
 }else{
  for(const x of [-.90,0,.90])for(const z of [-.93,.93]){
   box([.52,.12,.52],[x,.46,z],linen,.06);
   box([.54,.45,.12],[x,.72,z+Math.sign(z)*.24],linen,.06);
   for(const dx of [-.19,.19])for(const dz of [-.18,.18])box([.035,.40,.035],[x+dx,.20,z+dz],wood,.008);
  }
 }
 root.traverse(o=>{o.userData.furnitureGroup=group;});return root;
}

export function disposeCasaObject(root:T.Object3D){
 const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();root.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m));}});
 gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());
}
