import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {buildVacaria} from './vacariaModel';

/** Licensed vehicle prepared in Blender; uniform proportions and shared geometry. */
export function districtCars(source:T.Group,model:ReturnType<typeof buildVacaria>){
 const own=<A extends {dispose:()=>void}>(r:A)=>{model.resources.add(r);return r};
 source.updateMatrixWorld(true);model.district.updateMatrixWorld(true);
 const groups=new Map<T.Material,T.BufferGeometry[]>();
 source.traverse(o=>{if(!(o instanceof T.Mesh)||Array.isArray(o.material)||/Interior|Engine|HoodUnder|HoodInterior|License/i.test(o.name))return;
  const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);
  for(const attr of Object.keys(g.attributes))if(!['position','normal','uv'].includes(attr))g.deleteAttribute(attr);
  if(!g.getAttribute('normal'))g.computeVertexNormals();if(!g.getAttribute('uv'))g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count*2),2));
  const parts=groups.get(o.material)??[];parts.push(g);groups.set(o.material,parts);
 });
 const root=new T.Group();root.name='Veículos do condomínio V06';model.district.add(root);
 // A few empty bays make the common space easier to read.
 const homes=model.homes.filter((h,i)=>i%5!==3||h.userData.carPosition),palette=['#aab0ac','#d7d3c9','#718188','#777673'];
 for(const [material,parts]of groups){const merged=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());if(!merged)continue;own(merged);const body=/Paint 1/.test(material.name);const mesh=own(new T.InstancedMesh(merged,material,homes.length));mesh.name='Veículos · '+material.name;mesh.castShadow=mesh.receiveShadow=true;
  homes.forEach((home,i)=>{const position=home.userData.carPosition?new T.Vector3(...home.userData.carPosition as [number,number,number]):home.localToWorld(new T.Vector3(-1.25,.025,-2.5));mesh.setMatrixAt(i,new T.Matrix4().compose(position,new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),home.rotation.y),new T.Vector3(1,1,1)));if(body)mesh.setColorAt(i,new T.Color(palette[i%palette.length]));});mesh.computeBoundingSphere();root.add(mesh);
 }
 if(root.children.length)model.homes.forEach(home=>{const basic=home.getObjectByName('Vaga 2.50 x 5 m — veículo de escala');if(basic)basic.visible=false;});
}
