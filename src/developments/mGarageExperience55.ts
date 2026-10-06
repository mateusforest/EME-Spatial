import * as T from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import type {Own} from './mSurfaces';

/** A local reflection probe plus one restrained, rough planar floor reflection. */
export function garageExperience55(scene:T.Scene,renderer:T.WebGLRenderer,own:Own){
 const garage=scene.getObjectByName('M basement garage web55');if(!garage)return;
 // Capture this garage's surfaces and luminaires, avoiding outdoor sky reflected in parked cars.
 const proxy=garage.clone(true),probeScene=new T.Scene(),proxyMaterials=new Map<T.Material,T.MeshBasicMaterial>();probeScene.add(proxy);probeScene.background=new T.Color('#28241f');
 proxy.traverse(o=>{if(!(o instanceof T.Mesh))return;const convert=(original:T.Material)=>{
  const existing=proxyMaterials.get(original);if(existing)return existing;const s=original as T.MeshStandardMaterial;
  const luminous=s.emissive?.getHex()&&s.emissiveIntensity>1;const color=luminous?s.emissive.clone().multiplyScalar(s.emissiveIntensity*1.8):(s.color?.clone()??new T.Color('#aaa69d')).multiplyScalar(.52);
  const m=new T.MeshBasicMaterial({color,map:luminous?s.emissiveMap:s.map,transparent:s.transparent,opacity:s.opacity,side:s.side});proxyMaterials.set(original,m);return m;
 };o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);});
 const pmrem=new T.PMREMGenerator(renderer),target=own(pmrem.fromScene(probeScene,.03,.05,100,{size:128,position:new T.Vector3(-12,-1.5,-19)}));proxyMaterials.forEach(m=>m.dispose());pmrem.dispose();
 garage.traverse(o=>{if(!(o instanceof T.Mesh))return;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof T.MeshStandardMaterial){m.envMap=target.texture;m.envMapIntensity=m.metalness>.4?1.2:.55;m.needsUpdate=true;}});
 const geometry=own(new T.PlaneGeometry(63.6,43.6));
 const mirror=new Reflector(geometry,{textureWidth:768,textureHeight:768,multisample:0,clipBias:.001,color:'#ffffff',shader:{
  uniforms:{tDiffuse:{value:null},textureMatrix:{value:new T.Matrix4()},color:{value:new T.Color('#ffffff')}},
  vertexShader:`uniform mat4 textureMatrix;varying vec4 vReflect55;varying vec3 vFloor55;void main(){vReflect55=textureMatrix*vec4(position,1.0);vFloor55=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform sampler2D tDiffuse;varying vec4 vReflect55;varying vec3 vFloor55;
   void main(){vec2 uv=vReflect55.xy/vReflect55.w;vec2 p=vFloor55.xz;
    float texture55=sin(p.x*2.1+sin(p.y*2.8))*.5+sin(p.y*4.7+p.x*.8)*.25;
    vec2 warp=vec2(sin(p.x*7.1+p.y*3.4),cos(p.y*8.7-p.x*2.5))*.00036;uv+=warp;
    float blur=.0045+.002*abs(texture55);vec3 c=texture2D(tDiffuse,uv).rgb*.20;
    for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 d=vec2(cos(a),sin(a))*blur;c+=texture2D(tDiffuse,uv+d).rgb*.10;}
    float grazing=1.0-abs(normalize(cameraPosition-vFloor55).y);
    float strength=(.055+.17*pow(grazing,3.0))*(.94+.06*texture55);
    gl_FragColor=vec4(c,strength);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 }});
 mirror.name='Garage55 satin floor reflections';mirror.rotation.x=-Math.PI/2;mirror.position.set(-4,-3.176,-30);mirror.visible=false;mirror.renderOrder=3;
 const material=mirror.material as T.ShaderMaterial;material.transparent=true;material.depthWrite=false;own(mirror);scene.add(mirror);
 return {environment:target.texture,update(camera:T.Camera,reflections=true){const p=camera.position;const active=p.y<.05&&p.y>-3.1&&p.x>-36&&p.x<28&&p.z>-52&&p.z<-8;mirror.visible=active&&reflections;return active;}};
}
