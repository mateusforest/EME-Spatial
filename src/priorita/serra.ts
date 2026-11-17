import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';

/**
 * Priorità · Serra (v8): entorno ilustrativo dos Campos de Cima da Serra exportado do Blender
 * (Priorita-v8.blend · tools/build-priorita-v8.py). Relevo, capões de araucária, estrada,
 * portaria e casas ilustrativas. Não é levantamento: o terreno real não foi fornecido.
 */
const base='/assets/priorita/serra-v8/';
const CELL=1500;
type Instance=[kind:number,x:number,y:number,z:number,rot:number,scale:number];
type Chunk={meshes:T.InstancedMesh[];center:T.Vector3};

export function createSerraContext(scene:T.Scene,draco:DRACOLoader,invalidate:()=>void){
  const group=new T.Group();group.name='Serra · entorno v8';scene.add(group);
  const chunks:Chunk[]=[];let disposed=false,light=false;
  const loader=new GLTFLoader().setDRACOLoader(draco);
  const owned:{dispose():void}[]=[];

  loader.load(base+'serra-terrain.glb',gltf=>{
    if(disposed)return;
    gltf.scene.traverse(o=>{if(o instanceof T.Mesh){
      const m=o.material as T.MeshStandardMaterial;m.vertexColors=true;m.roughness=1;m.metalness=0;m.envMapIntensity=.55;
      o.receiveShadow=false;o.castShadow=false;owned.push(o.geometry,m);
    }});
    group.add(gltf.scene);invalidate();
  });
  loader.load(base+'serra-extras.glb',gltf=>{
    if(disposed)return;
    gltf.scene.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;owned.push(o.geometry);}});
    group.add(gltf.scene);invalidate();
  });

  Promise.all([
    loader.loadAsync(base+'serra-vegetation.glb'),
    fetch(base+'serra-instances.json').then(r=>r.json() as Promise<Instance[]>)
  ]).then(([gltf,instances])=>{
    if(disposed)return;
    gltf.scene.updateMatrixWorld(true);
    const parts:{kind:number;geometry:T.BufferGeometry;material:T.Material}[]=[];
    gltf.scene.traverse(o=>{
      if(!(o instanceof T.Mesh))return;
      const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);
      const material=o.material as T.MeshStandardMaterial;material.envMapIntensity=.5;
      parts.push({kind:o.name.startsWith('mata')||o.parent?.name.startsWith('mata')?1:0,geometry,material});
      owned.push(geometry,material);
    });
    const cells=new Map<string,Instance[]>();
    for(const i of instances){const key=`${Math.floor(i[1]/CELL)},${Math.floor(i[3]/CELL)}`;(cells.get(key)||cells.set(key,[]).get(key)!).push(i);}
    const dummy=new T.Object3D();
    for(const list of cells.values()){
      const meshes:T.InstancedMesh[]=[];const center=new T.Vector3();
      list.forEach(i=>center.add(new T.Vector3(i[1],i[2],i[3])));center.divideScalar(list.length);
      for(const part of parts){
        const mine=list.filter(i=>i[0]===part.kind);if(!mine.length)continue;
        const mesh=new T.InstancedMesh(part.geometry,part.material,mine.length);
        mine.forEach((i,n)=>{dummy.position.set(i[1],i[2],i[3]);dummy.rotation.set(0,i[4],0);dummy.scale.setScalar(i[5]);dummy.updateMatrix();mesh.setMatrixAt(n,dummy.matrix);});
        mesh.computeBoundingSphere();mesh.castShadow=false;mesh.receiveShadow=false;mesh.name='Serra · capão';
        meshes.push(mesh);group.add(mesh);
      }
      chunks.push({meshes,center});
    }
    update(new T.Vector3());invalidate();
  }).catch(()=>{});

  function update(camera:T.Vector3){
    const reach=light?2600:Infinity;
    for(const c of chunks){const on=c.center.distanceTo(camera)<reach+CELL;for(const m of c.meshes)m.visible=on;}
  }
  return {
    setQuality(value:boolean){light=value;},
    update,
    dispose(){disposed=true;scene.remove(group);for(const c of chunks)for(const m of c.meshes)m.dispose();owned.forEach(o=>o.dispose());}
  };
}
