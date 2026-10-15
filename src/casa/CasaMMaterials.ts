import * as T from 'three';

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
   m.map=texture(base+(f==='velvet'?'linen-olive-color.png':f==='rug'?'v6/wool-natural-color.png':'linen-cream-color.png'),true,f==='rug'?7:6);
   m.normalMap=texture(base+(f==='rug'?'v6/wool-normal.png':'linen-photo-normal.png'),false,f==='rug'?7:6);
   m.roughnessMap=texture(base+'linen-photo-roughness.png',false,6);
   m.normalScale.setScalar(f==='rug'?.33:.22);m.roughness=1;m.color.set('#ffffff');
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
   m.color.set('#e0cbb0');m.roughness=.64;m.normalScale.setScalar(.16);m.clearcoat=.12;m.clearcoatRoughness=.38;
  }else if(f==='stone'){
   m.color.set('#dbceb8');m.normalScale.setScalar(.85);m.roughness=.9;
   m.roughnessMap=texture(base+'v6/honed-limestone-roughness.png',false,2);
  }else if(f==='marble'){
   m.color.set('#c4c5aa');m.roughness=.22;m.normalScale.setScalar(.12);m.clearcoat=.38;m.clearcoatRoughness=.2;
   m.roughnessMap=texture('/assets/m/materials/realism50/stone-rough.webp',false,1);
  }else if(f==='plaster'){
   m.map=texture(base+'clean-ivory-color.png',true,2);m.normalMap=texture(base+'plaster-normal.png',false,5);
   m.color.set('#f3ede3');m.normalScale.setScalar(.045);m.roughness=.96;
  }else if(f==='grass'){
   m.map=texture(photo+'grass_ground-color.jpg',true,1);m.normalMap=texture(photo+'grass_ground-normal.jpg',false,1);
   m.roughnessMap=texture(photo+'grass_ground-roughness.jpg',false,1);m.normalScale.setScalar(.45);m.roughness=1;m.color.set('#aeb99a');
  }else if(f==='road'){
   m.map=texture(base+'v6/context-asphalt-color.png',true,1.8);m.normalMap=texture(base+'v6/context-asphalt-normal.png',false,1.8);m.normalScale.setScalar(.22);m.color.set('#92948e');m.roughness=.96;
  }
  if(n.includes('automovel')){m.metalness=.62;m.roughness=.22;m.clearcoat=1;m.clearcoatRoughness=.13;m.envMapIntensity=1.4;}
  if(n==='glass'){m.color.set('#52676b');m.opacity=.72;m.metalness=.15;m.roughness=.09;m.clearcoat=1;m.clearcoatRoughness=.07;m.depthWrite=false;}
  if(n.includes('vidro')){m.opacity=.055;m.color.set('#b6d1d0');m.roughness=.12;m.metalness=.1;m.depthWrite=false;}
  if(n.includes('tire')){m.roughness=.88;m.metalness=0;}
  // Several car materials inherited a white emission in the authoring file.
  if(['brake','mirror','hardware','rim2','rim1','material_2'].includes(n)){m.emissive.set(0);m.emissiveIntensity=0;if(n.startsWith('rim')||n==='mirror'){m.metalness=1;m.roughness=n==='mirror'?.06:.26;}}
  if(n==='headlight'){m.emissive.set('#d9e9ff');m.emissiveIntensity=.4;}
  if(n==='signallight'||n==='brakelight'||n==='dashboard')m.emissiveIntensity=.1;
  if(n.includes('led')){m.emissive.set('#ffcf8d');m.emissiveIntensity=5;m.userData.casaLed=true;}
  if(n.includes('integrado')){m.side=T.DoubleSide;m.alphaTest=.4;m.alphaToCoverage=false;m.transparent=false;m.depthWrite=true;m.roughness=1;m.metalness=0;m.specularIntensity=0;m.envMapIntensity=0;m.emissive.set(0);m.normalScale.setScalar(.12);}
  if(n.includes('leaves')){m.color.set('#c6d4a4');m.normalScale.setScalar(0);}
  m.needsUpdate=true;return m;
 }
 return {upgrade,texture,ready:()=>Promise.all(pending),dispose(){disposed=true;textures.forEach(t=>t.dispose());textures.clear();}};
}
