import {MeshStandardMaterial,ShaderChunk} from 'three';
const installed=new WeakSet<MeshStandardMaterial>();

/** Point sources in this scene represent diffuse bounce, not visible bulbs.
 * Keep their light off the specular lobes: otherwise they create bright discs
 * in glass and stone that slide across the room as the visitor turns. */
export function casaIndirectChunk(){
 const source=ShaderChunk.lights_fragment_begin;
 const start=source.indexOf('#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )');
 const end=source.indexOf('#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )');
 if(start<0||end<start)throw new Error('Casa M: incompatible lighting shader');
 const points=source.slice(start,end).replace(
  'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );',
  'reflectedLight.directDiffuse += saturate( dot( geometryNormal, directLight.direction ) ) * directLight.color * BRDF_Lambert( material.diffuseColor );'
 );
 return source.slice(0,start)+points+source.slice(end);
}

export function casaIndirectMaterial(material:MeshStandardMaterial){
 if(installed.has(material))return;
 installed.add(material);
 const before=material.onBeforeCompile;
 material.onBeforeCompile=(shader,renderer)=>{
  before.call(material,shader,renderer);
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',casaIndirectChunk());
 };
 material.customProgramCacheKey=()=> 'casa-diffuse-fill-v1';
 material.needsUpdate=true;
}
