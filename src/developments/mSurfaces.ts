import * as T from 'three';

export type Own = <A extends {dispose:()=>void}>(resource:A)=>A;

/** Shared maps are loaded once; colour and linear surface data stay separate. */
export function mSurfaces(own:Own,anisotropy=4) {
 const loader=new T.TextureLoader(),maps=new Map<string,T.Texture>(),loads:Promise<void>[]=[];
 const map=(file:string,color=false)=>{
  const existing=maps.get(file);if(existing)return existing;
  let resolve!:()=>void,reject!:(e:unknown)=>void;
  loads.push(new Promise<void>((r,j)=>{resolve=r;reject=j;}));
  const texture=own(loader.load('/assets/m/materials/'+file,resolve,undefined,reject));
  texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=anisotropy;
  if(color)texture.colorSpace=T.SRGBColorSpace;maps.set(file,texture);return texture;
 };
 // Photographed Blender50 PBR maps, resized for real-time use; shared across finishes.
 const stoneColor=map('realism50/stone-color.webp',true),stoneRough=map('realism50/stone-rough.webp'),mineral=map('realism50/stone-normal.webp');
 const woodColor=map('realism50/oak-color.webp',true),woodNormal=map('realism50/oak-normal.webp'),woodRough=map('realism50/oak-rough.webp');
 const linenNormal=map('refinement49/linen-normal.png'),linenRough=map('refinement49/linen-rough.png');
 const finishWood=(m:T.MeshStandardMaterial)=>{m.color.set('#fff8ef');m.map=woodColor;m.normalMap=woodNormal;m.normalScale.set(.20,.20);m.roughnessMap=woodRough;m.roughness=.88;m.needsUpdate=true;};
 const finishStone=(m:T.MeshStandardMaterial)=>{m.color.set('#ffffff');m.map=stoneColor;m.normalMap=mineral;m.normalScale.set(.17,.17);m.bumpMap=null;m.roughnessMap=stoneRough;m.roughness=.88;m.needsUpdate=true;};
 const finishLinen=(m:T.MeshStandardMaterial)=>{m.normalMap=linenNormal;m.normalScale.set(.22,.22);m.roughnessMap=linenRough;m.roughness=1;m.needsUpdate=true;};
 return {finishWood,finishStone,finishLinen,mineral,ready:Promise.all(loads)};
}

/** Small contact shadows represent occlusion under furniture without an extra render pass. */
export function contactShadow(own:Own) {
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const c=canvas.getContext('2d')!,gradient=c.createRadialGradient(64,64,8,64,64,64);
 gradient.addColorStop(0,'rgba(41,32,24,.24)');gradient.addColorStop(.55,'rgba(41,32,24,.13)');gradient.addColorStop(1,'rgba(41,32,24,0)');
 c.fillStyle=gradient;c.fillRect(0,0,128,128);
 const texture=own(new T.CanvasTexture(canvas));texture.colorSpace=T.SRGBColorSpace;
 const material=own(new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
 const geometry=own(new T.PlaneGeometry(1,1));geometry.rotateX(-Math.PI/2);
 return (parent:T.Group,x:number,z:number,w:number,d:number,y=.362)=>{const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(w,1,d);mesh.renderOrder=1;parent.add(mesh);};
}


