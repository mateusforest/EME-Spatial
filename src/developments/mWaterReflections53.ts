import * as T from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import type {Own} from './mSurfaces';

/** One nearby water reflection at a time, on top of the physical basin/shore materials. */
export function waterReflections53(scene:T.Scene,own:Own){
 const pool=[[32.52,-19.48],[62.52,-19.48],[62.52,-26.48],[71.48,-26.48],[71.48,30.48],[62.52,30.48],[62.52,21.48],[32.52,21.48]];
 const lake=Array.from({length:72},(_,i)=>{const a=i/72*Math.PI*2,r=1+.095*Math.sin(a*3+.7)+.055*Math.sin(a*5+1.2);return [65+Math.cos(a)*70*r,-116+Math.sin(a)*38*r];});
 const mirrors:Reflector[]=[];
 for(const [index,points]of[pool,lake].entries()){
  const shape=new T.Shape(points.map(([x,z])=>new T.Vector2(x,-z))),geometry=own(new T.ShapeGeometry(shape));
  const mirror=new Reflector(geometry,{textureWidth:768,textureHeight:768,multisample:0,clipBias:.001,color:'#ffffff',shader:{
   uniforms:{color:{value:new T.Color('#ffffff')},tDiffuse:{value:null},textureMatrix:{value:new T.Matrix4()}},
   vertexShader:`uniform mat4 textureMatrix;varying vec4 vReflection;varying vec3 vWaterWorld;
    void main(){vReflection=textureMatrix*vec4(position,1.0);vWaterWorld=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
   fragmentShader:`uniform sampler2D tDiffuse;uniform vec3 color;varying vec4 vReflection;varying vec3 vWaterWorld;
    void main(){
     vec2 p=vWaterWorld.xz;
     vec2 ripple=vec2(sin(p.x*1.8+p.y*.7)+sin(p.y*3.8-p.x*.42)*.3,cos(p.y*2.3-p.x*.4)+cos(p.x*3.1+p.y)*.3);
     vec4 uv=vReflection;uv.xy+=ripple*.0018*uv.w;
     vec3 reflected=texture2DProj(tDiffuse,uv).rgb;
     float facing=abs(normalize(cameraPosition-vWaterWorld).y);
     float fresnel=.055+.68*pow(1.0-facing,2.4);
     gl_FragColor=vec4(reflected*color,fresnel);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`
  }});
  mirror.name=index?'M53 lake planar reflection':'M53 pool planar reflection';mirror.rotation.x=-Math.PI/2;mirror.position.y=index?.292:.496;mirror.visible=false;mirror.renderOrder=3;
  const material=mirror.material as T.ShaderMaterial;material.transparent=true;material.depthWrite=false;
  // Reflectors must be mutually hidden during the reflection render, preventing recursion.
  const before=mirror.onBeforeRender;mirror.onBeforeRender=function(renderer,sc,cam,geo,mat,group){const visibility=mirrors.map(m=>m.visible);mirrors.forEach(m=>{if(m!==mirror)m.visible=false;});before.call(this,renderer,sc,cam,geo,mat,group);mirrors.forEach((m,i)=>m.visible=visibility[i]);};
  own(mirror);mirrors.push(mirror);scene.add(mirror);
 }
 return {update(camera:T.Camera,inside:boolean,target:T.Vector3,enabled=true){const p=camera.position,nearPool=Math.hypot(target.x-51,target.z-2),nearLake=Math.hypot(target.x-65,target.z+116);const visible=enabled&&!inside&&p.y>.8&&p.y<75;mirrors[0].visible=visible&&nearPool<nearLake&&nearPool<150;mirrors[1].visible=visible&&nearLake<=nearPool&&nearLake<190;}};
}
