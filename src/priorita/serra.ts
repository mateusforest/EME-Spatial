import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {lots,serraMask,serraRelief,terrainHeight} from './model';
import {demoStatus} from './demo-stock';

/**
 * Priorità · Serra (v8): entorno ilustrativo dos Campos de Cima da Serra exportado do Blender
 * (Priorita-v8.blend · tools/build-priorita-v8.py). Relevo, capões de araucária, estrada,
 * portaria e casas ilustrativas. Não é levantamento: o terreno real não foi fornecido.
 */
const base='/assets/priorita/serra-v8/';

/**
 * Applies the Serra relief to a site mesh exported flat-ish from Blender. Triangles inside the relief
 * area are split until no edge exceeds maxEdge, so roads, kerbs and lawn follow the same small hills.
 */
export function reliefGeometry(source:T.BufferGeometry,smooth:boolean,maxEdge=2.6){
  const flat=source.index?source.toNonIndexed():source;
  const names=Object.keys(flat.attributes),attrs=names.map(n=>flat.attributes[n]),sizes=attrs.map(a=>a.itemSize);
  const stride=sizes.reduce((a,b)=>a+b,0);let px=0;for(let i=0;i<names.length&&names[i]!=='position';i++)px+=sizes[i];
  const vertex=(i:number)=>{const v=new Float32Array(stride);let o=0;attrs.forEach((a,k)=>{for(let c=0;c<sizes[k];c++)v[o++]=a.getComponent(i,c);});return v;};
  const mid=(a:Float32Array,b:Float32Array)=>{const v=new Float32Array(stride);for(let i=0;i<stride;i++)v[i]=(a[i]+b[i])/2;return v;};
  const inside=(v:Float32Array)=>serraMask(v[px],v[px+2])>0;
  const len=(a:Float32Array,b:Float32Array)=>Math.hypot(a[px]-b[px],a[px+2]-b[px+2]);
  const stack:Float32Array[][]=[],out:Float32Array[]=[];
  for(let i=0;i<flat.attributes.position.count;i+=3)stack.push([vertex(i),vertex(i+1),vertex(i+2)]);
  while(stack.length){
    const [a,b,c]=stack.pop()!;
    const ab=len(a,b),bc=len(b,c),ca=len(c,a),longest=Math.max(ab,bc,ca);
    if(longest<=maxEdge||!(inside(a)||inside(b)||inside(c))){out.push(a,b,c);continue;}
    if(longest===ab){const m=mid(a,b);stack.push([a,m,c],[m,b,c]);}
    else if(longest===bc){const m=mid(b,c);stack.push([a,b,m],[a,m,c]);}
    else{const m=mid(c,a);stack.push([a,b,m],[m,b,c]);}
  }
  let geometry=new T.BufferGeometry();let offset=0;
  names.forEach((name,k)=>{const data=new Float32Array(out.length*sizes[k]);out.forEach((v,i)=>{for(let c=0;c<sizes[k];c++)data[i*sizes[k]+c]=v[offset+c];});geometry.setAttribute(name,new T.BufferAttribute(data,sizes[k]));offset+=sizes[k];});
  geometry=mergeVertices(geometry,1e-4);
  const p=geometry.attributes.position;
  for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)+serraRelief(p.getX(i),p.getZ(i)));
  if(smooth)geometry.computeVertexNormals();
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  if(flat!==source)flat.dispose();
  return geometry;
}

/** Illustrative houses, 7.2 m wide, for the ~10 m lots shown as sold. depth = footprint along the lot; rear = deck beyond it. */
const houseTypes=[{name:'casa-a',depth:14,rear:0},{name:'casa-b',depth:13,rear:0},{name:'casa-c',depth:14,rear:2.2},{name:'casa-d',depth:12,rear:2}];
const wallTones=['#ffffff','#f3e7d3','#e2e6e4','#ead8c2','#d3dad2','#f6efe6'];
function housePlacements(){
  const byType:T.Matrix4[][]=houseTypes.map(()=>[]);let n=0;
  for(const lot of lots){
    if(demoStatus(lot.id)!=='unavailable')continue;
    const a=lot.front.a,b=lot.front.b,mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;
    const ex=b[0]-a[0],ez=b[1]-a[1],el=Math.hypot(ex,ez)||1;let nx=-ez/el,nz=ex/el;
    if(nx*(lot.center[0]-mx)+nz*(lot.center[1]-mz)<0){nx=-nx;nz=-nz;}
    const lotDepth=Math.abs(nx*((lot.back.a[0]+lot.back.b[0])/2-mx)+nz*((lot.back.a[1]+lot.back.b[1])/2-mz));
    const kind=(lot.number*7+lot.block.charCodeAt(0)*3+n++)%houseTypes.length,type=houseTypes[kind];
    const scale=Math.min(1,(lot.front.value-1.8)/8.2,(lotDepth-3.5-1.2-type.rear)/type.depth);
    if(scale<.72)continue;
    const half=type.depth*scale/2,cx=mx+nx*(3.5+half),cz=mz+nz*(3.5+half),tx=ex/el*3.7*scale,tz=ez/el*3.7*scale;
    let floor=-Infinity;
    for(const [u,v] of [[1,1],[1,-1],[-1,1],[-1,-1]])floor=Math.max(floor,terrainHeight(cx+tx*u+nx*half*v,cz+tz*u+nz*half*v));
    byType[kind].push(new T.Matrix4().compose(new T.Vector3(cx,floor+.12,cz),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.atan2(-nx,-nz)),new T.Vector3(scale,scale,scale)));
  }
  return byType;
}
const CELL=1500;
type Instance=[kind:number,x:number,y:number,z:number,rot:number,scale:number];
type Chunk={meshes:T.InstancedMesh[];center:T.Vector3};

export function createSerraContext(scene:T.Scene,draco:DRACOLoader,invalidate:()=>void,shadows:()=>void=invalidate){
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
    group.add(gltf.scene);shadows();
  });
  loader.load(base+'serra-houses.glb',gltf=>{
    if(disposed)return;
    const placements=housePlacements(),tone=new T.Color();
    houseTypes.forEach((type,k)=>{
      const matrices=placements[k];if(!matrices.length)return;
      gltf.scene.getObjectByName(type.name)?.traverse(o=>{
        if(!(o instanceof T.Mesh))return;
        const material=o.material as T.MeshStandardMaterial;material.envMapIntensity=material.name.includes('Vidro')?1.6:.6;
        const mesh=new T.InstancedMesh(o.geometry,material,matrices.length);
        matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);if(material.name.includes('Parede'))mesh.setColorAt(i,tone.set(wallTones[(i*3+k)%wallTones.length]));});
        mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();mesh.name='Serra · '+type.name;
        group.add(mesh);owned.push(o.geometry,material,mesh);
      });
    });
    shadows();
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
        mine.forEach((i,n)=>{dummy.position.set(i[1],i[2]+serraRelief(i[1],i[3]),i[3]);dummy.rotation.set(0,i[4],0);dummy.scale.setScalar(i[5]);dummy.updateMatrix();mesh.setMatrixAt(n,dummy.matrix);});
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
