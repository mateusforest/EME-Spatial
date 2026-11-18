import {useEffect,useState} from 'react';

/**
 * Logotipo oficial Émera recortado do arquivo enviado (letras creme sobre oliva): o fundo vira transparente
 * no próprio navegador, então a marca pode ficar sobre o 3D, sobre fotos ou sobre fundos claros.
 */
const SOURCE='/assets/priorita/serra-v8/emera-logo.webp';
const CROPS={full:[150,385,955,462],mark:[490,388,275,200],word:[160,645,950,205]} as const;
type Variant=keyof typeof CROPS;
const cache=new Map<string,Promise<string>>();
let image:Promise<HTMLImageElement>|undefined;
function load(){
  image??=new Promise((resolve,reject)=>{const i=new Image();i.decoding='async';i.onload=()=>resolve(i);i.onerror=reject;i.src=SOURCE;});
  return image;
}
function render(variant:Variant,color:string){
  const key=variant+color;
  if(!cache.has(key))cache.set(key,load().then(img=>{
    const [sx,sy,sw,sh]=CROPS[variant],scale=2,canvas=document.createElement('canvas');canvas.width=sw*scale;canvas.height=sh*scale;
    const g=canvas.getContext('2d',{willReadFrequently:true})!;g.drawImage(img,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
    const data=g.getImageData(0,0,canvas.width,canvas.height),d=data.data;
    const c=color.replace('#',''),r=parseInt(c.slice(0,2),16),gg=parseInt(c.slice(2,4),16),b=parseInt(c.slice(4,6),16);
    for(let i=0;i<d.length;i+=4){const l=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2],a=Math.max(0,Math.min(1,(l-100)/(200-100)));d[i]=r;d[i+1]=gg;d[i+2]=b;d[i+3]=Math.round(a*255);}
    g.putImageData(data,0,0);return canvas.toDataURL('image/png');
  }));
  return cache.get(key)!;
}

export default function EmeraLogo({variant='full',color='#efe6d2',height=40,className,title='Émera'}:{variant?:Variant;color?:string;height?:number;className?:string;title?:string}){
  const [src,setSrc]=useState('');
  useEffect(()=>{let alive=true;render(variant,color).then(url=>{if(alive)setSrc(url);}).catch(()=>{});return()=>{alive=false;};},[variant,color]);
  const [,,w,h]=CROPS[variant];
  return src?<img className={className} src={src} alt={title} style={{height,width:Math.round(height*w/h)}}/>:<span className={className} role="img" aria-label={title} style={{display:'inline-block',height,width:Math.round(height*w/h)}}/>;
}
