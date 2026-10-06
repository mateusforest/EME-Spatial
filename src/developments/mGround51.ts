import * as T from 'three';
import type {Own} from './mSurfaces';

/** One world-space grass appearance, independent of each parcel's UVs or dimensions. */
export function grassSurface51(own:Own,tint='#628448'){
 const m=own(new T.MeshStandardMaterial({color:tint,roughness:.94}));m.name='M51 continuous meadow';
 m.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vGrassWorld51;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
   vec4 grassPosition51=vec4(transformed,1.0);
   #ifdef USE_INSTANCING
    grassPosition51=instanceMatrix*grassPosition51;
   #endif
   vGrassWorld51=(modelMatrix*grassPosition51).xyz;`);
  shader.fragmentShader=`varying vec3 vGrassWorld51;
   float grassHash51(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float grassNoise51(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(grassHash51(i),grassHash51(i+vec2(1,0)),f.x),mix(grassHash51(i+vec2(0,1)),grassHash51(i+vec2(1,1)),f.x),f.y);}
   `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 grassXZ51=vGrassWorld51.xz;
   float broad51=grassNoise51(grassXZ51*.045),detail51=grassNoise51(grassXZ51*4.0);
   float fine51=grassNoise51(grassXZ51*vec2(43.0,15.0));
   float distance51=length(vViewPosition);
   float detailFade51=1.0-smoothstep(18.0,110.0,distance51);
   diffuseColor.rgb*=mix(vec3(.74,.83,.68),vec3(1.09,1.08,.91),broad51);
   diffuseColor.rgb*=.94+.12*detail51+detailFade51*(fine51-.5)*.13;`);
 };
 m.customProgramCacheKey=()=> 'continuous-grass-51';return m;
}
