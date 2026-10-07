import * as T from 'three';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import type {Own} from './mSurfaces';
import type {Level72} from './mApartmentQuality72';

/** Four fixed area lights, one shadowed sun. No full-scene reflection or refraction passes. */
export function apartmentLight72(scene:T.Scene,own:Own){
 RectAreaLightUniformsLib.init();
 const lights=[[6.6,.1,7,5],[-6.6,-1.5,8,5],[7.6,-8.2,5,3.5],[-7.6,-8.2,5,3.5]].map(([x,z,w,h])=>{
  const light=new T.RectAreaLight('#ffe4bc',0,w,h);light.position.set(x,65.6,z);light.rotation.x=-Math.PI/2;scene.add(light);return light;
 });
 const prepared=new WeakSet<T.Object3D>(),glass=new Set<T.MeshPhysicalMaterial>(),physical=new Set<T.MeshPhysicalMaterial>();let lastLevel:Level72|undefined;
 function prepare(root:T.Object3D){
  if(prepared.has(root))return;prepared.add(root);const copies=new Map<T.Material,T.MeshPhysicalMaterial>();
  root.traverse(o=>{if(!(o instanceof T.Mesh))return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
   if(m.name==='Reference glazing'&&m instanceof T.MeshStandardMaterial){
    if(m instanceof T.MeshPhysicalMaterial&&m.userData.glass72){glass.add(m);o.castShadow=false;continue;}
    let g=copies.get(m);if(!g){g=own(new T.MeshPhysicalMaterial());T.MeshStandardMaterial.prototype.copy.call(g,m);g.name=m.name;g.color.set('#eef4f0');g.roughness=.09;g.metalness=0;g.clearcoat=.4;g.clearcoatRoughness=.08;g.opacity=.12;g.depthWrite=false;g.forceSinglePass=true;g.envMapIntensity=.75;g.userData.glass72=true;
     g.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a = 0.075 + 0.42 * pow(1.0 - abs(dot(normal, geometryViewDir)), 5.0);\n#include <opaque_fragment>');};g.customProgramCacheKey=()=> 'apartment-glass72';copies.set(m,g);glass.add(g);}
    o.material=g;o.castShadow=false;
   }else if(m instanceof T.MeshPhysicalMaterial)physical.add(m);
  }});
 }
 return {prepare,update(night:number,level:Level72,_sun:T.DirectionalLight,ambient:T.HemisphereLight,reflection:T.Texture|null){
  lights.forEach((l,i)=>{
   if(i<2){l.intensity=.04*(1-night)+.72*night;return;}
   // Reuse the two bedroom panels as broad window bounce by day. Four lights total.
   const side=i===2?1:-1;l.position.set(side*T.MathUtils.lerp(11.8,7.6,night),T.MathUtils.lerp(64.45,65.6,night),T.MathUtils.lerp(-3,-8.2,night));
   l.width=T.MathUtils.lerp(14,5,night);l.height=T.MathUtils.lerp(2.65,3.5,night);
   l.lookAt(side*7.6,T.MathUtils.lerp(64.2,62.6,night),T.MathUtils.lerp(-3,-8.2,night));
   l.color.set('#dce9f4').lerp(new T.Color('#ffe4bc'),night);l.intensity=.85*(1-night)+.48*night;
  });
  ambient.intensity=.12*(1-night)+.12*night;scene.environmentIntensity=.18*(1-night)+.13*night;
  for(const g of glass){if(reflection&&g.envMap!==reflection){g.envMap=reflection;g.needsUpdate=true;}g.envMapIntensity=.7*(1-night)+.12*night;}
  if(lastLevel!==level){lastLevel=level;for(const m of physical){m.clearcoat=m.name==='M14 wood'?(level==='light'?0:.16):m.clearcoat;m.sheen=m.name.match(/fabric|accent|green|rug/)?(level==='light'?.22:.5):m.sheen;m.needsUpdate=true;}}
 },dispose(){lights.forEach(l=>l.removeFromParent());glass.clear();physical.clear();}};
}

/** One instanced contact-occlusion layer, aligned with the existing furniture footprint. */
export function apartmentContacts72(parent:T.Object3D,own:Own){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d')!,r=ctx.createRadialGradient(64,64,15,64,64,64);r.addColorStop(0,'rgba(35,28,19,.22)');r.addColorStop(.5,'rgba(35,28,19,.10)');r.addColorStop(1,'rgba(35,28,19,0)');ctx.fillStyle=r;ctx.fillRect(0,0,128,128);
 const map=own(new T.CanvasTexture(canvas)),material=own(new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,toneMapped:false}));
 const geometry=own(new T.PlaneGeometry(1,1));geometry.rotateX(-Math.PI/2);
 const contacts=[[6.7,-1.4,5,1.8],[6.7,1.95,2.5,2.3],[-6.6,1.6,4.3,2.4],[-6.6,-1.6,4.4,2],[-6.6,-3.8,6,1.6],[7.6,-8,3,3.4],[-7.6,-8,3,3.4],[6.8,6.55,3.7,2],[6.4,8,2.8,1.8],[-5.6,7.3,3.2,3.2]];
 const mesh=own(new T.InstancedMesh(geometry,material,contacts.length)),matrix=new T.Matrix4();contacts.forEach(([x,z,w,d],i)=>{matrix.makeScale(w,1,d);matrix.setPosition(x,.51,z);mesh.setMatrixAt(i,matrix);});mesh.name='M14 contact occlusion72';mesh.renderOrder=1;parent.add(mesh);
}
