import * as T from 'three';

/** Small world-space contact map. Updated only when the static planting loads. */
export function createSurfaceFinish(){
  const size=512,data=new Uint8Array(size*size*4);data.fill(255);
  const texture=new T.DataTexture(data,size,size,T.RGBAFormat);
  texture.minFilter=texture.magFilter=T.LinearFilter;texture.needsUpdate=true;
  const seen=new WeakSet<T.Material>();
  function contacts(points:{x:number;z:number;radius:number;strength:number}[]){
    data.fill(255);
    for(const p of points){
      const cx=(p.x+140)/280*size,cy=(p.z+185)/370*size,rx=p.radius/280*size,ry=p.radius/370*size;
      for(let y=Math.max(0,Math.floor(cy-ry));y<=Math.min(size-1,Math.ceil(cy+ry));y++)for(let x=Math.max(0,Math.floor(cx-rx));x<=Math.min(size-1,Math.ceil(cx+rx));x++){
        const d=((x+.5-cx)/rx)**2+((y+.5-cy)/ry)**2;if(d>=1)continue;
        const value=1-p.strength*(1-d)**3,i=(y*size+x)*4;
        data[i]=Math.round(data[i]*value);
      }
    }
    texture.needsUpdate=true;
  }
  function apply(material:T.Material){
    if(!(material instanceof T.MeshStandardMaterial)||seen.has(material))return;
    seen.add(material);
    const asphalt=material.name.startsWith('Asfalto'),paving=material.name.startsWith('Calçada');
    const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
    material.onBeforeCompile=(shader,renderer)=>{
      previous.call(material,shader,renderer);
      shader.uniforms.prContactMap={value:texture};
      shader.vertexShader='varying vec3 prFinishWorld;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <fog_vertex>',`#include <fog_vertex>
        vec4 finishPosition=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
          finishPosition=instanceMatrix*finishPosition;
        #endif
        prFinishWorld=(modelMatrix*finishPosition).xyz;`);
      shader.fragmentShader=`varying vec3 prFinishWorld;uniform sampler2D prContactMap;
        float prHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float prNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(prHash(i),prHash(i+vec2(1,0)),f.x),mix(prHash(i+vec2(0,1)),prHash(i+vec2(1)),f.x),f.y);}
      `+shader.fragmentShader;
      if(asphalt||paving){
        shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
          float prPatch=prNoise(prFinishWorld.xz*.42);
          float prGrain=prNoise(prFinishWorld.xz*48.0);
          float prGrainFade=1.0-smoothstep(.015,.06,max(length(dFdx(prFinishWorld.xz)),length(dFdy(prFinishWorld.xz))));
          diffuseColor.rgb*=mix(.86,1.12,prPatch)*mix(1.0,mix(.76,1.2,prGrain),prGrainFade*.55);
          ${paving?'diffuseColor.rgb*=mix(.9,1.06,prHash(floor(prFinishWorld.xz/vec2(.3,.2))));':''}
        `);
        shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
          roughnessFactor=clamp(roughnessFactor+(.5-prPatch)*.18,.65,.98);`);
      }
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
        vec2 prContactUV=(prFinishWorld.xz+vec2(140.0,185.0))/vec2(280.0,370.0);
        float prContactInside=step(0.0,prContactUV.x)*step(prContactUV.x,1.0)*step(0.0,prContactUV.y)*step(prContactUV.y,1.0);
        float prContact=mix(1.0,texture2D(prContactMap,prContactUV).r,prContactInside);
        outgoingLight*=mix(.42,1.0,prContact);
        #include <opaque_fragment>`);
    };
    material.customProgramCacheKey=()=>key+'-surface-finish-v14-'+Number(asphalt)+Number(paving);
    material.needsUpdate=true;
  }
  return {texture,contacts,apply};
}
