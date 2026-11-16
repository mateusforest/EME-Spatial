import * as T from 'three';
import type {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

/** Shared tree geometry and grouped static streets keep the neighborhood inexpensive. */
export async function loadUrbanContext(loader:GLTFLoader,textures:Set<T.Texture>){
 const [architecture,tree,landscape]=await Promise.all([
  loader.loadAsync('/assets/eme-circular/context-v2.glb'),
  loader.loadAsync('/assets/priorita/production-v18/tree.glb'),
  fetch('/assets/eme-circular/landscape-v2.json').then(r=>{if(!r.ok)throw Error('Contexto indisponível');return r.json() as Promise<{trees:number[][]}>;})
 ]);
 const root=new T.Group();root.name='Bairro ilustrativo';root.add(architecture.scene);
 const tl=new T.TextureLoader();
 const load=async(name:string)=>{const tex=await tl.loadAsync(`/assets/eme-circular/materials/${name}.webp`);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=4;textures.add(tex);return tex;};
 const [asphalt,paving,grass]=await Promise.all([load('asphalt'),load('paving'),load('grass')]);
 architecture.scene.traverse(o=>{if(!(o instanceof T.Mesh))return;o.castShadow=true;o.receiveShadow=true;
  for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!(m instanceof T.MeshStandardMaterial))continue;
   if(m.name==='Cidade_Asfalto'){m.map=asphalt;m.color.set('#aeb6bd');m.roughness=.92;m.bumpMap=asphalt;m.bumpScale=.018;}
   if(m.name==='Cidade_Calcada'){m.map=paving;m.color.set('#e8dfca');m.roughness=.85;m.bumpMap=paving;m.bumpScale=.025;}
   if(m.name==='Cidade_Jardim'){m.map=grass;m.color.set('#b0bf8b');}
  }
 });
 tree.scene.updateMatrixWorld(true);
 const matrix=new T.Matrix4(),placement=new T.Object3D();
 tree.scene.traverse(o=>{if(!(o instanceof T.Mesh))return;
  const mats=Array.isArray(o.material)?o.material:[o.material];
  for(const m of mats){if(m instanceof T.MeshStandardMaterial){m.roughness=.86;m.side=T.DoubleSide;m.alphaTest=.4;}
   for(const value of Object.values(m))if(value instanceof T.Texture)textures.add(value);
  }
  const inst=new T.InstancedMesh(o.geometry,o.material,landscape.trees.length);inst.castShadow=true;inst.receiveShadow=true;
  landscape.trees.forEach(([x,y,height,angle],i)=>{placement.position.set(x,0,-y);placement.scale.setScalar(height);placement.rotation.set(0,angle,0);placement.updateMatrix();matrix.multiplyMatrices(placement.matrix,o.matrixWorld);inst.setMatrixAt(i,matrix);inst.setColorAt(i,new T.Color().setHSL(.23+(i%4)*.006,.08,.88+(i%3)*.035));});
  inst.computeBoundingSphere();root.add(inst);
 });
 return {root,grass};
}
