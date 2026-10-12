import * as T from 'three';

export const materialLibrary = {
 upholstery: [
  {id:'original',label:'Do projeto',detail:'Tecido original do ambiente'},
  {id:'linen',label:'Linho',detail:'Trama cruzada · fosco'},
  {id:'boucle',label:'Bouclé',detail:'Laços em relevo · macio'},
  {id:'velvet',label:'Veludo',detail:'Pelo curto · brilho suave'},
  {id:'chenille',label:'Chenille',detail:'Fios espessos · encorpado'},
  {id:'twill',label:'Sarja',detail:'Trama diagonal · discreta'},
 ],
 stone: [
  {id:'original',label:'Do projeto',detail:'Pedra original das bancadas'},
  {id:'limestone',label:'Calcário claro',detail:'Granulação fina · acetinado'},
  {id:'travertine',label:'Travertino',detail:'Camadas minerais · poros suaves'},
  {id:'marble',label:'Mármore claro',detail:'Veios cinza · polido'},
  {id:'basalt',label:'Pedra grafite',detail:'Grão escuro · fosco'},
 ],
 wall: [
  {id:'original',label:'Do projeto',detail:'Parede original'},
  {id:'plaster',label:'Reboco fino',detail:'Marfim · microtextura fosca'},
  {id:'limewash',label:'Pintura mineral',detail:'Areia · nuances suaves'},
  {id:'cement',label:'Cimento suave',detail:'Greige · superfície acetinada'},
 ],
 wood: [
  {id:'original',label:'Do projeto',detail:'Acabamento original'},
  {id:'matte',label:'Fosco',detail:'Veios naturais · pouco reflexo'},
  {id:'satin',label:'Acetinado',detail:'Reflexo suave e difuso'},
  {id:'polished',label:'Envernizado',detail:'Reflexos mais definidos'},
 ],
} as const;
export type MaterialCategory=keyof typeof materialLibrary;
export type MaterialSelections=Record<MaterialCategory,string>;
export const defaultMaterials:MaterialSelections={upholstery:'original',stone:'original',wall:'original',wood:'original'};
export function isMaterialChoice(category:string,value:unknown):category is MaterialCategory{
 return Object.hasOwn(materialLibrary,category)&&materialLibrary[category as MaterialCategory].some(option=>option.id===value);
}

// All fields are periodic so repeating a tile introduces no border seam.
const tau=Math.PI*2;
function noise(u:number,v:number){
 function layer(period:number){
  const x=(u-Math.floor(u))*period,y=(v-Math.floor(v))*period,ix=Math.floor(x),iy=Math.floor(y);
  const sx=(x-ix)**2*(3-2*(x-ix)),sy=(y-iy)**2*(3-2*(y-iy));
  function hash(a:number,b:number){let n=Math.imul(a%period,374761393)+Math.imul(b%period,668265263)+period*23;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295*2-1;}
  return T.MathUtils.lerp(T.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),sx),T.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),sx),sy);
 }
 return layer(4)*.58+layer(8)*.28+layer(16)*.14;
}
export function materialPixels(id:string,size=256){
 const heights=new Float32Array(size*size),color=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4);
 const fabric=['linen','boucle','velvet','chenille','twill'].includes(id);
 const colors:Record<string,number[]>={limestone:[223,217,200],travertine:[212,192,159],marble:[238,236,228],basalt:[75,79,75],plaster:[237,232,220],limewash:[221,211,193],cement:[192,189,182]};
 const base=colors[id]||[242,240,234];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,n=noise(u,v),grain=noise(u*8,v*8);
  // Small yarn deviations break the synthetic, perfectly straight grid. The
  // deformation is periodic, so tiles remain seamless at their measured scale.
  const a=Math.sin(tau*u*48+n*.72),b=Math.cos(tau*v*48+grain*.35);
  let h=.5,shade=0,r=.9;
  if(id==='linen'){h=.5+.18*a+.15*b+.07*a*b+grain*.035;shade=(h-.5)*22+n*5;r=.95;}
  else if(id==='boucle'){const loop=Math.sin(tau*u*26+Math.sin(tau*v*24)+n*.9) * Math.cos(tau*v*24+Math.sin(tau*u*26)+grain*.55);h=.45+.32*loop+.12*grain;shade=(h-.5)*32+n*6;r=.98;}
  else if(id==='velvet'){h=.5+grain*.055;shade=n*7+grain*3;r=.69+n*.06;}
  else if(id==='chenille'){h=.5+.24*Math.sin(tau*u*30+n*.8)+.10*Math.sin(tau*v*60+grain*.5)+grain*.08;shade=(h-.5)*26+n*5;r=.93;}
  else if(id==='twill'){h=.5+.23*Math.sin(tau*(u-v)*42+n*.8)+grain*.05;shade=(h-.5)*22+n*4;r=.89;}
  else if(id==='travertine'){const layers=Math.sin(tau*v*13+n*1.6);h=.5+layers*.05+grain*.018;shade=layers*9+n*7+grain*3;r=.78;}
  else if(id==='marble'){const veins=Math.pow(Math.max(0,1-Math.abs(Math.sin(tau*(u+v*2)+n*2.3))*9),2);h=.5+grain*.008;shade=n*4-veins*72;r=.24+grain*.03;}
  else if(id==='basalt'){h=.5+grain*.09;shade=n*5+grain*18;r=.91;}
  else if(id==='limestone'){h=.5+grain*.06;shade=n*6+grain*7;r=.73;}
  else {h=.5+grain*(id==='plaster'?.035:.015);shade=n*(id==='limewash'?12:id==='cement'?8:3);r=id==='cement'?.72:.98;}
  const p=(y*size+x)*4;heights[y*size+x]=h;
  for(let c=0;c<3;c++){color[p+c]=T.MathUtils.clamp(base[c]+shade,0,255);rough[p+c]=T.MathUtils.clamp((r+grain*.025)*255,0,255);}
  color[p+3]=rough[p+3]=255;
 }
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(heights[y*size+(x+1)%size]-heights[y*size+(x+size-1)%size])*(fabric?1.2:.8)*size/256;
  const dy=(heights[((y+1)%size)*size+x]-heights[((y+size-1)%size)*size+x])*(fabric?1.2:.8)*size/256;
  const d=Math.hypot(dx,dy,1),p=(y*size+x)*4;
  normal[p]=(-dx/d*.5+.5)*255;normal[p+1]=(-dy/d*.5+.5)*255;normal[p+2]=(1/d*.5+.5)*255;normal[p+3]=255;
 }
 return {color,normal,rough,size};
}

function categoryOf(name:string):MaterialCategory|undefined{
 if(/^B_FABRIC(?:_cream|_olive)?$/.test(name))return 'upholstery';
 if(/^B_STONE(?:_dark)?$/.test(name))return 'stone';
 if(name==='B_WALL')return 'wall';
 if(/^B_WOOD(?:_dark)?$/.test(name))return 'wood';
}

/** Owns only generated textures. Curtains, rugs, floors and borrowed GLB maps stay independent. */
export function createMaterialStudio(root:T.Object3D,maxAnisotropy=4){
 const originals=new Map<T.MeshStandardMaterial,T.MeshStandardMaterial>();
 const buckets:Record<MaterialCategory,T.MeshStandardMaterial[]>={upholstery:[],stone:[],wall:[],wood:[]};
 root.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){
  if(!(m instanceof T.MeshStandardMaterial)||originals.has(m))continue;
  const category=categoryOf(m.name);if(category){originals.set(m,m.clone());buckets[category].push(m);}
 }});
 const cache=new Map<string,{map:T.DataTexture;normalMap:T.DataTexture;roughnessMap:T.DataTexture}>();
 function maps(id:string,material:T.MeshStandardMaterial){
  const span=material.name==='B_STONE_dark'?.6:material.name==='B_STONE'?1.6:material.name==='B_WALL'?1:.256;
  const target=categoryOf(material.name)==='upholstery'?.256:1.6,key=id+':'+span;
  if(cache.has(key))return cache.get(key)!;
  const pixels=materialPixels(id,512);
  function texture(bytes:Uint8Array,srgb=false){
   const t=new T.DataTexture(bytes,pixels.size,pixels.size,T.RGBAFormat);t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;
   t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.setScalar(span/target);t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.anisotropy=Math.min(8,maxAnisotropy);t.needsUpdate=true;return t;
  }
  const result={map:texture(pixels.color,true),normalMap:texture(pixels.normal),roughnessMap:texture(pixels.rough)};cache.set(key,result);return result;
 }
 const selections={...defaultMaterials};
 function apply(category:string,id:unknown){
  if(!isMaterialChoice(category,id))return false;
  for(const m of buckets[category]){
   const original=originals.get(m)!;
   // Preserve the independent upholstery/wood tint when changing its surface.
   m.map=original.map;m.normalMap=original.normalMap;m.roughnessMap=original.roughnessMap;m.roughness=original.roughness;m.normalScale.copy(original.normalScale);
   if(m instanceof T.MeshPhysicalMaterial&&original instanceof T.MeshPhysicalMaterial){m.sheen=original.sheen;m.sheenRoughness=original.sheenRoughness;m.clearcoat=original.clearcoat;m.clearcoatRoughness=original.clearcoatRoughness;}
   if(category==='stone'||category==='wall')m.color.copy(original.color);
   if(id!=='original'){
    if(category==='wood'){
     m.roughness=id==='matte'?1:id==='satin'?.88:.64;
     if(m instanceof T.MeshPhysicalMaterial){m.clearcoat=id==='matte'?.03:id==='satin'?.18:.48;m.clearcoatRoughness=id==='matte'?.6:id==='satin'?.42:.22;}
    }
    else{
     Object.assign(m,maps(id as string,m));m.roughness=1;
     m.normalScale.setScalar(category==='upholstery'?(id==='boucle'?.85:id==='velvet'?.22:.65):category==='wall'?.28:.22);
     if(category==='stone'||category==='wall')m.color.set('#ffffff');
     if(category==='stone'&&m instanceof T.MeshPhysicalMaterial){m.clearcoat=id==='marble'?.28:id==='basalt'?.025:.07;m.clearcoatRoughness=id==='marble'?.2:.45;}
     if(category==='upholstery'&&m instanceof T.MeshPhysicalMaterial){m.sheen=id==='velvet'?1:id==='boucle'?.65:.4;m.sheenRoughness=id==='velvet'?.4:.85;}
    }
   }
   m.needsUpdate=true;
  }
  selections[category]=id as string;return true;
 }
 return {apply,selections,counts:Object.fromEntries(Object.entries(buckets).map(([k,v])=>[k,v.length])),dispose(){
  for(const [m,original] of originals){m.copy(original);original.dispose();}
  for(const maps of cache.values())for(const t of Object.values(maps))t.dispose();cache.clear();originals.clear();
 }};
}
