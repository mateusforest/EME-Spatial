import * as T from 'three';
import type {Own} from './mSurfaces';

/** Metric PBR maps: trowelled mineral variation, fine aggregate and quiet roughness. */
export function garageMaterials55(own:Own){
 const size=512,heights=new Float32Array(size*size);let seed=55;
 const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const lattices=[8,32,128].map(n=>({n,data:Float32Array.from({length:n*n},random)}));
 function noise(x:number,y:number,k:number){const {n,data}=lattices[k],xx=x/size*n,yy=y/size*n,ix=Math.floor(xx),iy=Math.floor(yy),sx=xx-ix,sy=yy-iy,u=sx*sx*(3-2*sx),v=sy*sy*(3-2*sy),get=(a:number,b:number)=>data[(b%n)*n+a%n];return T.MathUtils.lerp(T.MathUtils.lerp(get(ix,iy),get(ix+1,iy),u),T.MathUtils.lerp(get(ix,iy+1),get(ix+1,iy+1),u),v);}
 const canvases=Array.from({length:4},()=>{const c=document.createElement('canvas');c.width=c.height=size;return c;}),contexts=canvases.map(c=>c.getContext('2d')!),images=contexts.map(c=>c.createImageData(size,size));
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*size+x,n=noise(x,y,0)*.55+noise(x,y,1)*.30+noise(x,y,2)*.15,grain=random(),pore=grain>.989?18:0;
  heights[i]=n*.7+grain*.04-pore*.0015;const value=164+(n-.5)*34+(grain-.5)*9-pore;
  [value+4,value+1,value-5].forEach((v,c)=>images[0].data[i*4+c]=v);images[0].data[i*4+3]=255;
  const rough=164+(n-.5)*54+(grain-.5)*12,vein=Math.pow(Math.max(0,1-Math.abs(Math.sin(y*.032+x*.014+(n-.5)*7))*12),2);
  for(let c=0;c<3;c++){images[1].data[i*4+c]=rough;images[3].data[i*4+c]=[210,204,188][c]+(n-.5)*22+vein*15-pore*.42;}images[1].data[i*4+3]=images[3].data[i*4+3]=255;
 }
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*size+x,dx=heights[y*size+(x+1)%size]-heights[y*size+(x+size-1)%size],dy=heights[((y+1)%size)*size+x]-heights[((y+size-1)%size)*size+x];images[2].data.set([128-dx*200,128-dy*200,255,255],i*4);}
 const textures=canvases.map((c,i)=>{contexts[i].putImageData(images[i],0,0);const t=own(new T.CanvasTexture(c));t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;if(i===0||i===3)t.colorSpace=T.SRGBColorSpace;return t;});
 const create=(name:string,color:string,roughness=.7,metalness=0)=>{const m=own(new T.MeshStandardMaterial({color,roughness,metalness}));m.name='Garage55 '+name;m.userData.noNightFill=true;return m;};
 const concrete=create('cast concrete','#cfcbc1',.95);concrete.map=textures[0];concrete.normalMap=textures[2];concrete.normalScale.set(.26,.26);concrete.roughnessMap=textures[1];concrete.emissive.set('#d6c8af');concrete.emissiveMap=textures[0];concrete.emissiveIntensity=.11;concrete.userData.alwaysLit=true;
 const floor=own(new T.MeshPhysicalMaterial({color:'#c2bdb2',map:textures[0],normalMap:textures[2],normalScale:new T.Vector2(.10,.10),roughnessMap:textures[1],roughness:.64,metalness:.02,clearcoat:.18,clearcoatRoughness:.38}));floor.name='Garage55 honed concrete floor';floor.userData.noNightFill=true;
 const dark=create('charcoal anodized base','#30312d',.48,.35),steel=create('galvanized services','#b0b0a3',.37,.75),bronze=create('brushed champagne bronze','#a7926c',.29,.82),white=create('ivory road paint','#d6d0bd',.7),red=create('sprinkler pipe','#96392c',.5,.3),rubber=create('rubber','#20201d',.88);
 bronze.normalMap=textures[2];bronze.normalScale.set(.025,.13);bronze.roughnessMap=textures[1];
 const led=create('warm opal diffuser','#fff8e9',.32);led.emissive.set('#fff1d5');led.emissiveIntensity=4.1;led.userData.alwaysLit=true;
 const accent=create('concealed 2700K diffuser','#ffebca',.4);accent.emissive.set('#ffd2a0');accent.emissiveIntensity=2.9;accent.userData.alwaysLit=true;
 const travertine=create('large cut travertine slabs','#eee9dd',.65);travertine.map=textures[3];travertine.normalMap=textures[2];travertine.normalScale.set(.075,.075);travertine.roughnessMap=textures[1];
 return {concrete,floor,travertine,dark,steel,bronze,white,red,rubber,led,accent,create};
}
