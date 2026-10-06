import * as T from 'three';
import type {Own} from './mSurfaces';
export function poolWater41(own:Own){
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d')!,data=ctx.createImageData(256,256);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const i=(y*256+x)*4,u=x/256*Math.PI*2,v=y/256*Math.PI*2;
  const wave=Math.sin(u*7+Math.sin(v*4)*1.4)+Math.sin(v*9+Math.sin(u*3));
  const caustic=Math.pow(Math.max(0,1-Math.abs(wave)*2),7)*36;
  const joint=x%16===0||y%16===0?-8:0;
  data.data[i]=47+caustic+joint;data.data[i+1]=137+caustic+joint;data.data[i+2]=145+caustic+joint;data.data[i+3]=255;
 }
 ctx.putImageData(data,0,0);
 const map=own(new T.CanvasTexture(c));map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(.22,.22);map.anisotropy=4;
 const bumpCanvas=document.createElement('canvas');bumpCanvas.width=bumpCanvas.height=128;const b=bumpCanvas.getContext('2d')!,d=b.createImageData(128,128);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,v=128+28*Math.sin(y*Math.PI/8+Math.sin(x*Math.PI/16));d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;}b.putImageData(d,0,0);
 const bump=own(new T.CanvasTexture(bumpCanvas));bump.wrapS=bump.wrapT=T.RepeatWrapping;bump.repeat.set(.24,.24);
 const m=own(new T.MeshPhysicalMaterial({color:'#d4e9e3',bumpMap:bump,bumpScale:.035,roughness:.065,metalness:0,transmission:.70,thickness:1.4,ior:1.333,attenuationColor:'#5ca2a0',attenuationDistance:3.2,clearcoat:.3,clearcoatRoughness:.08,envMapIntensity:1.2}));m.name='M pool physical water web53';return m;
}
export function porcelain41(own:Own){
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d')!;
 ctx.fillStyle='#d6cfbf';ctx.fillRect(0,0,256,256);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){const v=208+Math.sin(x*.06+y*.09)*2+Math.sin(x*17.3+y*7.2)*2;ctx.fillStyle='rgb('+v+','+(v-5)+','+(v-15)+')';ctx.fillRect(x,y,1,1);}
 ctx.fillStyle='#a69e8c';ctx.fillRect(0,0,256,1);ctx.fillRect(0,0,1,256);
 const map=own(new T.CanvasTexture(c));map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(2.0833,2.0833);map.anisotropy=4;
 const m=own(new T.MeshStandardMaterial({map,roughness:.64,color:'#ffffff'}));m.name='M limestone porcelain 120cm';return m;
}
export function poolTiles53(own:Own){
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d')!;
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){const v=Math.sin(x*31.7+y*17.3)*.5+.5;ctx.fillStyle=`rgb(${130+v*20},${178+v*20},${172+v*22})`;ctx.fillRect(x*16,y*16,16,16);ctx.fillStyle='#70938e';ctx.fillRect(x*16,y*16,16,1);ctx.fillRect(x*16,y*16,1,16);}
 const map=own(new T.CanvasTexture(c));map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(.625,.625);map.anisotropy=8;
 const m=own(new T.MeshStandardMaterial({map,color:'#ffffff',roughness:.48}));m.name='M53 mineral pool mosaic';return m;
}
