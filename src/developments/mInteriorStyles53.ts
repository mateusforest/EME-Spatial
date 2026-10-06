import * as T from 'three';
import type {Own} from './mSurfaces';
import type {MUnit} from './mUnits';
export function interiorStyle53(unit:MUnit){
 const index=unit.kind==='duplex'?(unit.startFloor===11?3:2):unit.kind==='penthouse'?2:(unit.startFloor-1)%4;
 return {index,...[
  {name:'Botânico · verde e latão',wall:'#263b30',sofa:'#194936',accent:'#35614b',rug:'#7a947e',metal:'#b39757',oak:'#e9c9a0'},
  {name:'Contemporâneo · couro caramelo',wall:'#214b43',sofa:'#a86e43',accent:'#e6e1d5',rug:'#dfd8c9',metal:'#aa9467',oak:'#d9b389'},
  {name:'Mineral · pedra e linho',wall:'#d6ccba',sofa:'#e5ded0',accent:'#aaa08f',rug:'#b7ae9e',metal:'#695c48',oak:'#c4a27c'},
  {name:'Orgânico · madeira e curvas',wall:'#ddd4c2',sofa:'#e4e0d6',accent:'#b2b7a0',rug:'#c3ba9f',metal:'#534f42',oak:'#f1d4ac'},
 ][index]};
}
export function textile53(own:Own,index:number){
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d')!;ctx.fillStyle=index===0?'#ced3bd':'#ede8dd';ctx.fillRect(0,0,256,256);
 ctx.strokeStyle=index===0?'#284c3b':'#434841';ctx.lineWidth=3;
 if(index===0){for(let j=0;j<5;j++){const x=20+j*52;ctx.beginPath();ctx.moveTo(x,256);ctx.quadraticCurveTo(x+35,140,x,0);ctx.stroke();for(let y=20;y<256;y+=32){ctx.fillStyle=y%64?'#31533d':'#719274';ctx.beginPath();ctx.ellipse(x+(y%64?14:-5),y,17,6,y%64?-.7:.7,0,Math.PI*2);ctx.fill();}}}
 else for(let y=0;y<256;y+=28){ctx.beginPath();for(let x=0;x<=256;x+=24){const yy=y+(x%48?14:0);if(x===0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);}ctx.stroke();}
 const map=own(new T.CanvasTexture(c));map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;const m=own(new T.MeshStandardMaterial({map,roughness:.96}));m.name='M53 woven patterned cushions';return m;
}
