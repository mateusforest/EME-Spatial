import * as T from 'three';

/** Physical finishes share the GLB's measured UVs and textures. No extra maps,
 * lights or geometry are allocated. Restore mesh bindings before releasing our
 * materials: the loader remains the owner of every borrowed texture. */
export function createInteriorSurfaces(root:T.Object3D){
 const replacements=new Map<T.MeshStandardMaterial,T.MeshPhysicalMaterial>();
 const bindings:{mesh:T.Mesh;material:T.Material|T.Material[]}[]=[];
 let disposed=false;
 function replace(material:T.Material){
  if(!(material instanceof T.MeshStandardMaterial))return material;
  const name=material.name;
  if(!/^B_(WOOD(?:_dark)?|STONE(?:_dark)?|CERAMIC|PORCELAIN_warm|FLOOR|ACCENT_green)$/.test(name))return material;
  const existing=replacements.get(material);if(existing)return existing;
  const next=new T.MeshPhysicalMaterial();
  // MeshPhysicalMaterial.copy expects physical-only fields. Copy the standard
  // portion explicitly when upgrading a glTF material without extensions.
  if(material instanceof T.MeshPhysicalMaterial)next.copy(material);
  else T.MeshStandardMaterial.prototype.copy.call(next,material);
  next.defines={STANDARD:'',PHYSICAL:''};next.ior=1.46;
  next.name=name;next.onBeforeCompile=material.onBeforeCompile;next.customProgramCacheKey=material.customProgramCacheKey;
  if(name.startsWith('B_WOOD')){
   next.clearcoat=.18;next.clearcoatRoughness=.42;next.specularIntensity=.65;
   const previous=next.onBeforeCompile,key=next.customProgramCacheKey();
   next.onBeforeCompile=(shader,renderer)=>{
    previous.call(next,shader,renderer);
    // Compress bright veneer streaks in linear space, preserving its true grain
    // direction and the independent user-selected tint. No painted highlights.
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
     #ifdef USE_MAP
      vec3 oakMean=${name==='B_WOOD_dark'?'vec3(.15,.10,.06)':'vec3(.42,.28,.15)'};
      diffuseColor.rgb=mix(diffuseColor.rgb,diffuse*oakMean,.55);
     #endif`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
     roughnessFactor=mix(roughness,roughnessFactor,.35);`);
   };
   next.customProgramCacheKey=()=>key+'|botanique-oak-v10-'+name;
  }else if(name==='B_ACCENT_green'){
   next.clearcoat=.16;next.clearcoatRoughness=.36;next.specularIntensity=.7;
  }else if(name==='B_CERAMIC'){
   next.clearcoat=.4;next.clearcoatRoughness=.16;next.ior=1.5;
  }else{
   next.clearcoat=name==='B_FLOOR'?.06:.12;next.clearcoatRoughness=.32;
   next.specularIntensity=.75;
  }
  replacements.set(material,next);return next;
 }
 root.traverse(o=>{if(!(o instanceof T.Mesh))return;const original=o.material;
  const next=Array.isArray(original)?original.map(replace):replace(original);
  const changed=Array.isArray(original)?original.some((m,i)=>m!==(next as T.Material[])[i]):original!==next;
  if(changed){bindings.push({mesh:o,material:original});o.material=next;}
 });
 return {count:replacements.size,dispose(){if(disposed)return;disposed=true;
  for(const binding of bindings)binding.mesh.material=binding.material;
  for(const material of replacements.values())material.dispose();
  bindings.length=0;replacements.clear();
 }};
}
