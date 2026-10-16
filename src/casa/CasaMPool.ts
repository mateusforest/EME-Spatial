import type {MeshStandardMaterial} from 'three';

/** Keep every context ground surface outside the real pool excavation. */
export function casaPoolCutout(material:MeshStandardMaterial){
 const before=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
 const previousKey=key();
 material.onBeforeCompile=(shader,renderer)=>{
  before.call(material,shader,renderer);
  shader.vertexShader='varying vec3 vCasaGround;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','vCasaGround=(modelMatrix*vec4(transformed,1.)).xyz;\n#include <project_vertex>');
  shader.fragmentShader='varying vec3 vCasaGround;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
   if(vCasaGround.x>6.5&&vCasaGround.x<15.6&&vCasaGround.z< -13.35&&vCasaGround.z> -16.25)discard;`);
 };
 material.customProgramCacheKey=()=>previousKey+':pool-excavation-v5';
}
