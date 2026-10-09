import * as T from 'three';

export type BotaniqueVisualRefinementOptions={apartment:boolean;maxAnisotropy?:number};
export type BotaniqueVisualRefinement={stats:{revision:number;materials:number;lawns:number;roads:number;stone:number;glass:number};dispose:()=>void};
const installed=new WeakMap<T.Object3D,BotaniqueVisualRefinement>();

// World-space, non-periodic variation. The GLB's former 3 m bitmap tile and
// normal map amplified a grid/wave pattern; adding more texture repeats only
// made that defect more visible from a third-floor viewpoint.
const lawnNoise=`
varying vec3 vBotaniqueSurface;
float botaniqueHash(vec2 p){
 vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));
 q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);
}
float botaniqueNoise(vec2 p){
 vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
 return mix(mix(botaniqueHash(i),botaniqueHash(i+vec2(1,0)),u.x),
  mix(botaniqueHash(i+vec2(0,1)),botaniqueHash(i+vec2(1,1)),u.x),u.y);
}
`;

function lawnShader(material:T.MeshStandardMaterial){
 const before=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=(shader,renderer)=>{
  before.call(material,shader,renderer);
  shader.vertexShader='varying vec3 vBotaniqueSurface;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',
   '#include <project_vertex>\nvBotaniqueSurface=(modelMatrix*vec4(transformed,1.0)).xyz;');
  shader.fragmentShader=lawnNoise+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 lawnPosition=vBotaniqueSurface.xz;
   vec2 lawnWarp=vec2(botaniqueNoise(lawnPosition*.17+vec2(7.1,21.3)),
    botaniqueNoise(lawnPosition*.17+vec2(31.7,9.2)))-.5;
   vec2 lawnOrganic=mat2(.8,-.6,.6,.8)*lawnPosition+lawnWarp*3.6;
   float lawnPatch=botaniqueNoise(lawnOrganic*.065);
   float softPatch=botaniqueNoise(lawnOrganic*.31+vec2(14.3,7.1));
   float lawnClump=botaniqueNoise(lawnOrganic*1.8+vec2(19.1,5.3));
   float grain=botaniqueNoise(lawnPosition*27.0);
   float grainVisibility=1.0-smoothstep(.035,.16,length(fwidth(lawnPosition)));
   diffuseColor.rgb*=.72+.30*lawnPatch+.24*softPatch+.12*lawnClump+.10*(grain-.5)*grainVisibility;
   diffuseColor.rgb*=mix(vec3(.92,1.015,.96),vec3(1.045,.995,.93),softPatch);`);
 };
 material.customProgramCacheKey=()=>key+'|botanique-lawn-world-v7-organic2';
}

/** Refine loaded materials in place before Viewer snapshots palette colours.
 * No geometry, visibility, variant identifiers, colliders or camera is changed.
 * Textures remain borrowed from GLTFLoader; dispose restores them, never frees
 * them. Viewer continues owning the asset/material/texture disposal lifecycle.
 */
export function createBotaniqueVisualRefinement(root:T.Object3D,options:BotaniqueVisualRefinementOptions):BotaniqueVisualRefinement{
 const existing=installed.get(root);if(existing)return existing;
 const stats={revision:7,materials:0,lawns:0,roads:0,stone:0,glass:0};
 const originals=new Map<T.MeshStandardMaterial,{copy:T.MeshStandardMaterial;compile:T.Material['onBeforeCompile'];key:T.Material['customProgramCacheKey']}>();
 const textures=new Map<T.Texture,number>();let disposed=false;
 const materials=new Set<T.MeshStandardMaterial>();
 root.traverse(object=>{if(object instanceof T.Mesh){const list=Array.isArray(object.material)?object.material:[object.material];for(const material of list)if(material instanceof T.MeshStandardMaterial)materials.add(material);}});
 for(const material of materials){
  const name=material.name;
  const lawn=/^B_(?:CONTEXT6_GRASS(?:_SHADE)?|GROUND_grass)$/.test(name);
  const road=/^B_(?:CONTEXT6_ROAD|ROAD_asphalt)$/.test(name);
  const paving=/^B_(?:CONTEXT6_(?:PATH|CURB)|FLOOR_(?:sidewalk|concrete|stone)|STONE_entry)$/.test(name);
  const stone=/^B_(?:STONE(?:_dark)?|POOL_stone_counter|PORCELAIN_warm|FLOOR|CERAMIC)$/.test(name);
  const glass=/^B_(?:GLASS(?:_smoked|_railing)?|POOL_clear_glass)$/.test(name);
  const metal=/^B_(?:MIRROR|STEEL_brushed|METAL(?:_brass)?|APPLIANCE_(?:SILVER|GRAPHITE))$/.test(name);
  const foliage=name==='B_CONTEXT6_BROADLEAF'||name==='B_CONTEXT6_FOREST_BACKDROP';
  if(!(lawn||road||paving||stone||glass||metal||foliage))continue;
  originals.set(material,{copy:material.clone(),compile:material.onBeforeCompile,key:material.customProgramCacheKey});
  stats.materials++;
  if(lawn){
   // Identical base for both old grass batches eliminates their 11 m seams.
   material.map=null;material.normalMap=null;material.bumpMap=null;material.roughnessMap=null;
   material.vertexColors=false;material.color.set(options.apartment?'#697960':'#63735a');
   material.roughness=1;material.metalness=0;material.envMapIntensity=.18;
   lawnShader(material);stats.lawns++;
  }else if(road){
   material.normalScale.setScalar(.035);material.roughness=.97;material.metalness=0;
   material.color.set('#a7acab');material.envMapIntensity=.15;stats.roads++;
  }else if(paving){
   material.normalScale.setScalar(.065);material.roughness=Math.max(.78,material.roughness);
   material.envMapIntensity=.3;
  }else if(stone){
   const dark=name==='B_STONE_dark';
   material.normalScale.setScalar(name==='B_FLOOR'?.045:dark?.065:.035);
   material.metalness=0;material.envMapIntensity=.7;
   if(name==='B_CERAMIC')material.roughness=.19;
   else if(name==='B_FLOOR')material.roughness=.91;
   else material.roughness=material.roughnessMap?.88:.38;
   stats.stone++;
  }else if(glass){
   material.roughness=name==='B_GLASS_smoked'?.095:.025;
   material.envMapIntensity=.75;
   if(name==='B_GLASS')material.color.set('#f1f7f4');
   // Keep alpha/transmission and render-list classification stable. A runtime
   // conversion to opaque glass would incorrectly re-enable its shadow cast.
   stats.glass++;
  }else if(metal){
   material.envMapIntensity=.85;
   if(name==='B_MIRROR'){material.metalness=1;material.roughness=.035;}
   else if(name==='B_STEEL_brushed'||name==='B_APPLIANCE_SILVER'){
    material.metalness=.92;material.roughness=material.roughnessMap?.85:.26;material.normalScale.setScalar(.035);
   }
  }else if(foliage){
   material.roughness=1;material.metalness=0;material.envMapIntensity=.2;
  }
  for(const texture of [material.map,material.normalMap,material.roughnessMap]){
   if(!texture||textures.has(texture))continue;
   textures.set(texture,texture.anisotropy);texture.anisotropy=Math.max(1,Math.min(8,options.maxAnisotropy??4));texture.needsUpdate=true;
  }
  material.needsUpdate=true;
 }
 const refinement={stats,dispose(){
  if(disposed)return;disposed=true;
  for(const [material,previous]of originals){material.copy(previous.copy);material.onBeforeCompile=previous.compile;material.customProgramCacheKey=previous.key;material.needsUpdate=true;previous.copy.dispose();}
  for(const [texture,anisotropy]of textures){texture.anisotropy=anisotropy;texture.needsUpdate=true;}
  originals.clear();textures.clear();installed.delete(root);
 }};
 installed.set(root,refinement);return refinement;
}
