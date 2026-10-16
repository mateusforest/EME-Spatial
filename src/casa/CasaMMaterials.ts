import * as T from 'three';
import {casaPoolCutout} from './CasaMPool';

/** Photographed PBR finishes, measured against the export's two-metre UVs. */
export function createCasaMaterials(renderer:T.WebGLRenderer,request:()=>void){
 const loader=new T.TextureLoader(),textures=new Map<string,T.Texture>(),pending:Promise<unknown>[]=[];
 let disposed=false;
 function texture(file:string,color=false,repeat=1,rotate=0){
  const key=[file,color,repeat,rotate].join(':');let t=textures.get(key);if(t)return t;
  let resolve!:()=>void;pending.push(new Promise<void>(r=>resolve=r));
  t=loader.load(file,()=>{resolve();if(disposed)t!.dispose();else request();},undefined,resolve);
  t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.flipY=false;t.wrapS=t.wrapT=T.RepeatWrapping;
  t.repeat.setScalar(repeat);t.center.set(.5,.5);t.rotation=rotate;t.anisotropy=Math.min(12,renderer.capabilities.getMaxAnisotropy());
  textures.set(key,t);return t;
 }
 const base='/assets/botanique/materials/',photo='/assets/casa-m/materials/v2/';
 function upgrade(source:T.MeshStandardMaterial){
  const m=new T.MeshPhysicalMaterial();T.MeshStandardMaterial.prototype.copy.call(m,source);
  // copy() through the base class preserves the GLB UV channel and texture transforms.
  if(source instanceof T.MeshPhysicalMaterial)m.copy(source);
  m.userData={...source.userData};const f=m.userData.finish as string|undefined,n=m.name.toLowerCase();
  if(f==='walnut'){
   const angle=n.includes('piso')?0:Math.PI/2;
   m.map=texture(photo+'walnut_veneer_02-color.jpg',true,1.25,angle);
   m.normalMap=texture(photo+'walnut_veneer_02-normal.jpg',false,1.25,angle);
   m.roughnessMap=texture(photo+'walnut_veneer_02-roughness.jpg',false,1.25,angle);
   m.color.set('#b29276');m.roughness=.72;m.normalScale.setScalar(.23);m.clearcoat=.18;m.clearcoatRoughness=.36;
  }else if(f==='linen'||f==='velvet'||f==='rug'){
   m.map=texture(base+(f==='velvet'?'linen-olive-color.png':f==='rug'?'v6/wool-natural-color.png':'linen-cream-color.png'),true,f==='rug'?3:5);
   m.normalMap=texture(base+(f==='rug'?'v6/wool-normal.png':'linen-photo-normal.png'),false,f==='rug'?3:5);
   m.roughnessMap=texture(base+(f==='rug'?'v6/wool-roughness.png':'linen-photo-roughness.png'),false,f==='rug'?3:5);
   m.normalScale.setScalar(f==='rug'?.65:.3);m.roughness=1;m.color.set(f==='rug'?'#d8c6a8':'#ffffff');
   m.sheen=f==='velvet'?.22:.32;m.sheenColor.set(f==='velvet'?'#56603d':'#d2c5ad');m.sheenRoughness=.88;
   if(f==='velvet')m.color.set('#879269');
  }else if(f==='leather'){
   m.normalMap=texture(base+'v6/upholstery-normal.png',false,7);m.normalScale.setScalar(.16);
   m.roughnessMap=texture(base+'v6/upholstery-roughness.png',false,7);m.roughness=.75;
   m.clearcoat=.14;m.clearcoatRoughness=.42;m.sheen=.12;m.sheenColor.set('#b47b4b');
  }else if(f==='travertine'){
   m.map=texture('/assets/m/materials/realism50/stone-color.webp',true,.9);
   m.normalMap=texture('/assets/m/materials/realism50/stone-normal.webp',false,.9);
   m.roughnessMap=texture('/assets/m/materials/realism50/stone-rough.webp',false,.9);
   m.color.set('#f0e4cf');m.roughness=.48;m.normalScale.setScalar(.12);m.clearcoat=.12;m.clearcoatRoughness=.38;
  }else if(f==='stone'){
   const stone='/assets/casa-m/materials/v5/stone-wall-';
   m.map=texture(stone+'color.jpg',true,.9);m.normalMap=texture(stone+'normal.jpg',false,.9);
   m.roughnessMap=texture(stone+'roughness.jpg',false,.9);
   m.color.set('#fff2dc');m.normalScale.setScalar(.38);m.roughness=.85;
   // Retain photographed stone pores and joints, with the pale limestone palette
   // of the supplied design rather than the weathered colour of the scan.
   m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    float casaStoneTone=dot(sampledDiffuseColor.rgb,vec3(.2126,.7152,.0722));
    diffuseColor.rgb=diffuse*mix(vec3(.48),vec3(.82),smoothstep(.035,.58,casaStoneTone));`);};
   m.customProgramCacheKey=()=> 'casa-limestone-v5';
  }else if(f==='pool-tile'){
   m.color.set('#b5d2c8');m.roughness=.5;m.normalScale.setScalar(.22);
  }else if(f==='marble'){
   m.color.set('#c4c5aa');m.roughness=.22;m.normalScale.setScalar(.12);m.clearcoat=.38;m.clearcoatRoughness=.2;
   m.roughnessMap=texture('/assets/m/materials/realism50/stone-rough.webp',false,1);
  }else if(f==='plaster'){
   m.map=texture(base+'clean-ivory-color.png',true,2);m.normalMap=texture(base+'plaster-normal.png',false,5);
   m.color.set('#f3ede3');m.normalScale.setScalar(.045);m.roughness=.96;
  }else if(f==='grass'){
   m.map=texture(photo+'grass_ground-color.jpg',true,1);m.normalMap=texture(photo+'grass_ground-normal.jpg',false,1);
   m.roughnessMap=texture(photo+'grass_ground-roughness.jpg',false,1);m.normalScale.setScalar(.45);m.roughness=1;m.color.set('#aeb99a');casaPoolCutout(m);
  }else if(f==='road'){
   m.map=texture(base+'v6/context-asphalt-color.png',true,1.8);m.normalMap=texture(base+'v6/context-asphalt-normal.png',false,1.8);m.normalScale.setScalar(.22);m.color.set('#92948e');m.roughness=.96;
  }
  if(n.includes('automovel')){m.metalness=.62;m.roughness=.22;m.clearcoat=1;m.clearcoatRoughness=.13;m.envMapIntensity=1.4;}
  if(n==='glass'){m.color.set('#52676b');m.opacity=.72;m.metalness=.15;m.roughness=.09;m.clearcoat=1;m.clearcoatRoughness=.07;m.depthWrite=false;}
  if(n.includes('vidro')){m.opacity=.045;m.color.set('#c5d2ce');m.roughness=.16;m.metalness=0;m.specularIntensity=.35;m.depthWrite=false;}
  if(n.includes('tire')){m.roughness=.88;m.metalness=0;}
  // Several car materials inherited a white emission in the authoring file.
  if(['brake','mirror','hardware','rim2','rim1','material_2'].includes(n)){m.emissive.set(0);m.emissiveIntensity=0;if(n.startsWith('rim')||n==='mirror'){m.metalness=1;m.roughness=n==='mirror'?.06:.26;}}
  if(n==='headlight'){m.emissive.set('#d9e9ff');m.emissiveIntensity=.4;}
  if(n==='signallight'||n==='brakelight'||n==='dashboard')m.emissiveIntensity=.1;
  if(n.includes('led')&&!m.userData.vehicle){m.emissive.set('#ffe0b5');m.emissiveIntensity=3;m.userData.casaLed=true;m.polygonOffset=true;m.polygonOffsetFactor=-2;m.polygonOffsetUnits=-2;}
  if(n.includes('integrado')){m.side=T.DoubleSide;m.alphaTest=.4;m.alphaToCoverage=false;m.transparent=false;m.depthWrite=true;m.roughness=1;m.metalness=0;m.specularIntensity=0;m.envMapIntensity=0;m.emissive.set(0);m.normalScale.setScalar(.12);}
  if(n.includes('leaves')){
   m.map=texture('/assets/casa-m/materials/v4/tree_small_02_leaves_diff_1k.jpg',true);
   m.alphaMap=texture('/assets/casa-m/materials/v4/tree_small_02_leaves_alpha_1k.jpg');
   m.color.set('#ffffff');m.normalScale.setScalar(0);m.alphaTest=.4;m.alphaToCoverage=false;
  }
  m.needsUpdate=true;return m;
 }
 return {upgrade,texture,ready:()=>Promise.all(pending),dispose(){disposed=true;textures.forEach(t=>t.dispose());textures.clear();}};
}
