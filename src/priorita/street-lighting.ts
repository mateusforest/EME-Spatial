import * as T from 'three';

export type StreetLamp={x:number;z:number;rotation:number};
/** Photocell-like transition, tied to solar elevation rather than clock time. */
export function streetLightLevel(elevation:number){
  const t=Math.max(0,Math.min(1,(5-elevation)/9));
  return t*t*(3-2*t);
}

export function streetLampLayout(roads:{polygon:number[][]}[]):StreetLamp[]{
  const lamps:StreetLamp[]=[];
  const cross=roads.slice(1).map(r=>({
    minX:Math.min(...r.polygon.map(p=>p[0])),maxX:Math.max(...r.polygon.map(p=>p[0])),
    minZ:Math.min(...r.polygon.map(p=>p[1])),maxZ:Math.max(...r.polygon.map(p=>p[1])),
  }));
  for(const side of [-1,1])for(let z=-104;z<131;z+=22){
    if(cross.some(r=>z>r.minZ-3&&z<r.maxZ+3))continue;
    lamps.push({x:side<0?-5.3:7.9,z,rotation:side<0?0:Math.PI});
  }
  // Corner fixtures cover the crossings instead of leaving dark gaps there.
  for(const r of cross)for(const x of [-5.3,7.9])for(const z of [r.minZ-2,r.maxZ+2]){
    if(!lamps.some(p=>Math.hypot(p.x-x,p.z-z)<6))lamps.push({x,z,rotation:x<0?0:Math.PI});
  }
  for(const r of cross)for(const side of [-1,1]){
    const z=side<0?r.minZ+.9:r.maxZ-.9;
    for(let x=r.minX+7;x<r.maxX-5;x+=22){
      if(x>-13&&x<16)continue;
      lamps.push({x,z,rotation:side<0?-Math.PI/2:Math.PI/2});
    }
  }
  return lamps;
}

/** Shared ground irradiance, computed once. One filtered texture sample per
 * material instead of a shadow pass per pole. No luminous overlay on the road:
 * the contribution is multiplied by the actual asphalt/paving/grass albedo. */
export function createStreetLighting(lamps:StreetLamp[],height:(x:number,z:number)=>number){
  const width=384,heightPixels=512,minX=-140,minZ=-185,spanX=280,spanZ=370;
  const field=new Float32Array(width*heightPixels);
  for(const lamp of lamps){
    const dx=Math.cos(lamp.rotation),dz=-Math.sin(lamp.rotation);
    // Position of the LED in the supplied Blender v7 mesh: x=1.22, y=5.49.
    // The road optic throws its beam inward from the LED.
    const lx=lamp.x+dx*3.2,lz=lamp.z+dz*3.2;
    const x0=Math.max(0,Math.floor((lx-23-minX)/spanX*width)),x1=Math.min(width-1,Math.ceil((lx+23-minX)/spanX*width));
    const z0=Math.max(0,Math.floor((lz-23-minZ)/spanZ*heightPixels)),z1=Math.min(heightPixels-1,Math.ceil((lz+23-minZ)/spanZ*heightPixels));
    for(let iz=z0;iz<=z1;iz++)for(let ix=x0;ix<=x1;ix++){
      const x=minX+(ix+.5)/width*spanX-lx,z=minZ+(iz+.5)/heightPixels*spanZ-lz;
      const across=x*dx+z*dz,along=-x*dz+z*dx;
      // Broad street optic: soft edges, longer footprint along the pavement.
      const r2=(across/14)**2+(along/22)**2;
      if(r2>=1)continue;
      const edge=(1-r2)**2,falloff=1/(1+(across/7)**2+(along/12)**2);
      field[iz*width+ix]+=2.3*edge*falloff;
    }
  }
  const data=new Uint8Array(width*heightPixels*4);
  for(let z=0;z<heightPixels;z++)for(let x=0;x<width;x++){
    const i=z*width+x;
    data[i*4]=Math.round(Math.min(1,field[i]/8)*255);
    data[i*4+1]=Math.round(T.MathUtils.clamp((height(minX+(x+.5)/width*spanX,minZ+(z+.5)/heightPixels*spanZ)+20)/40,0,1)*255);
    data[i*4+3]=255;
  }
  const texture=new T.DataTexture(data,width,heightPixels,T.RGBAFormat);
  texture.minFilter=texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
  const strength={value:0},color={value:new T.Color('#ffe8c7')};
  const patched=new WeakSet<T.Material>();
  function apply(material:T.Material){
    if(!(material instanceof T.MeshStandardMaterial)||patched.has(material))return;
    patched.add(material);
    const previous=material.onBeforeCompile,cacheKey=material.customProgramCacheKey();
    const response=material.name.startsWith('Asfalto')?1.7:material.name.startsWith('Grama')?.3:1;
    material.onBeforeCompile=(shader,renderer)=>{
      previous.call(material,shader,renderer);
      shader.uniforms.prStreetMap={value:texture};shader.uniforms.prStreetStrength=strength;shader.uniforms.prStreetColor=color;
      shader.vertexShader='varying vec3 prStreetPosition;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <fog_vertex>',`#include <fog_vertex>
        vec4 streetPosition=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
          streetPosition=instanceMatrix*streetPosition;
        #endif
        prStreetPosition=(modelMatrix*streetPosition).xyz;`);
      shader.fragmentShader='varying vec3 prStreetPosition;uniform sampler2D prStreetMap;uniform float prStreetStrength;uniform vec3 prStreetColor;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
        vec2 streetUV=(prStreetPosition.xz-vec2(${minX.toFixed(1)},${minZ.toFixed(1)}))/vec2(${spanX.toFixed(1)},${spanZ.toFixed(1)});
        vec2 streetField=texture2D(prStreetMap,streetUV).rg;
        float streetInside=step(0.0,streetUV.x)*step(streetUV.x,1.0)*step(0.0,streetUV.y)*step(streetUV.y,1.0);
        float groundHeight=streetField.g*40.0-20.0;
        float streetHeight=1.0-smoothstep(1.0,5.5,abs(prStreetPosition.y-groundHeight));
        vec3 streetNormal=inverseTransformDirection(normal,viewMatrix);
        float streetFacing=.16+.84*max(0.0,streetNormal.y);
        reflectedLight.indirectDiffuse+=diffuseColor.rgb*prStreetColor*streetField.r*8.0*prStreetStrength*streetHeight*streetFacing*streetInside*${response.toFixed(2)};`);
    };
    material.customProgramCacheKey=()=>cacheKey+'-street-irradiance-v1-'+response;
    material.needsUpdate=true;
  }
  return {apply,texture,setSun(elevation:number){strength.value=streetLightLevel(elevation);return strength.value;}};
}
