import * as T from 'three';
import type {Own} from './mSurfaces';

/** Solid folded-ribbon M inspired by the approved green marble monogram. */
export function greenMarbleMonogram(own:Own){
 // Silhouette traced against public/assets/brand-lockup.png, preserving its asymmetric folded ribbon.
 const s=new T.Shape();s.moveTo(-3.6,0);s.lineTo(-3.6,4.22);s.lineTo(-2.33,4.87);
 s.bezierCurveTo(-2.22,4.94,-2.14,4.93,-2.06,4.84);s.lineTo(.41,2.27);
 s.lineTo(.69,3.04);s.bezierCurveTo(.79,3.27,.92,3.44,1.12,3.58);s.lineTo(3.4,4.96);
 s.bezierCurveTo(3.51,5.03,3.6,4.99,3.6,4.85);s.lineTo(3.6,0);s.lineTo(1.66,0);s.lineTo(1.66,2.91);
 s.bezierCurveTo(1.66,3.49,.89,3.51,.79,2.98);s.lineTo(.79,1.51);
 s.bezierCurveTo(.79,1.17,.72,1.06,.45,.89);s.lineTo(-.28,.47);
 s.bezierCurveTo(-.5,.35,-.68,.4,-.83,.65);s.lineTo(-1.98,3.0);s.lineTo(-1.98,0);s.closePath();
 const g=own(new T.ExtrudeGeometry(s,{depth:.60,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:5,curveSegments:36}));g.translate(0,0,-.3);g.scale(.82,.82,.82);
 const size=512,data=new Uint8Array(size*size*4);
 const hash=(x:number,y:number)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
 const noise=(x:number,y:number)=>{const ix=Math.floor(x),iy=Math.floor(y);let u=x-ix,v=y-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);return T.MathUtils.lerp(T.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),u),T.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),u),v);};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const cloud=noise(x*.022,y*.022)*.58+noise(x*.067,y*.067)*.27+noise(x*.19,y*.19)*.15;
  const vein=Math.pow(Math.max(0,1-Math.abs(Math.sin(x*.075+y*.112+cloud*7))*18),1.5);
  const fine=Math.pow(Math.max(0,1-Math.abs(Math.sin(x*.29-y*.21+cloud*12))*33),2)*.24;
  const fleck=hash(x,y)*5,strength=(vein+fine)*(70+noise(x*.04,y*.04)*65);
  const i=(y*size+x)*4;data[i]=24+cloud*21+strength+fleck;data[i+1]=47+cloud*29+strength*.86+fleck;data[i+2]=36+cloud*23+strength*.70+fleck;data[i+3]=255;
 }
 const map=own(new T.DataTexture(data,size,size));map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(.30,.30);map.magFilter=map.minFilter=T.LinearFilter;map.anisotropy=4;map.needsUpdate=true;
 const m=own(new T.MeshPhysicalMaterial({color:'#d4e2d8',map,roughness:.17,metalness:.02,clearcoat:.3,clearcoatRoughness:.19,emissive:'#fff0d4',emissiveMap:map,emissiveIntensity:1.45}));m.name='M green marble internally illuminated';m.userData.noNightFill=true;
 const mesh=new T.Mesh(g,m);mesh.name='M green marble monogram';return mesh;
}
