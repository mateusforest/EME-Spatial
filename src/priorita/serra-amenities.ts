import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {padLevel,terrainHeight} from './model';
import type {SerraLook} from './serra-look';

/**
 * Émera · equipamentos ilustrativos da rota Serra.
 *  - Recreação 01 (plataforma nivelada): letreiro ÉMERA junto à avenida de entrada e quadra de vôlei de areia.
 *  - Área institucional (plataforma nivelada): quiosque com churrasqueira, piscina e deck.
 * Tudo é estudo visual: dimensões plausíveis, sem projeto, aprovação ou memorial.
 */

const LOGO_URL='/assets/priorita/serra-v8/emera-logo.webp';

/** Quadra: centro, eixo maior ao longo de X. Areia 22 × 14 m; quadra oficial 16 × 8 m. */
export const COURT={x:-40,z:-77,sandW:22,sandD:14};
/** Letreiro: centro e ponto para onde a face está voltada (quem chega pela avenida). */
export const SIGN={x:-18,z:-86,face:[4,-130] as [number,number],width:10.5};
/** Quiosque e piscina na área institucional. */
export const KIOSK={x0:17,x1:27,z0:-79,z1:-71};
export const POOL={x0:33.5,x1:51.5,z0:-79,z1:-71};
export const DECK={x0:29.6,x1:57,z0:-84,z1:-66.5};
/** Piscina infantil no lado leste do deck. */
export const KIDS={x0:52.6,x1:56.3,z0:-77.2,z1:-72.8};
/** Playground no braço norte da Recreação 01 e pergolado com mesas a oeste da quadra. */
export const PLAY={x0:-76,x1:-63.5,z0:-52,z1:-37};
export const PICNIC={x0:-60.5,x1:-54.5,z0:-85,z1:-71};

/** Retângulos que a vegetação existente deve deixar livres (x0,x1,z0,z1). */
export const clearings:[number,number,number,number][]=[
  [COURT.x-COURT.sandW/2-3,COURT.x+COURT.sandW/2+3,COURT.z-COURT.sandD/2-3,COURT.z+COURT.sandD/2+3],
  [SIGN.x-7.5,SIGN.x+7.5,SIGN.z-6,SIGN.z+6],
  [KIOSK.x0-2,DECK.x1+2,DECK.z0-2,DECK.z1+2],
  [PLAY.x0-2.5,PLAY.x1+3,PLAY.z0-2.5,PLAY.z1+2.5],
  [PICNIC.x0-1.5,PICNIC.x1+1.5,PICNIC.z0-1.5,PICNIC.z1+1.5],
];
/** Bancos de frente para a quadra, plantas novas e árvores de sombra (formato dos layouts: x, z, escala/altura, rotação). */
export const amenityBenches:number[][]=[
  [-46,-67.3,1,Math.PI],[-40,-67.3,1,Math.PI],[-34,-67.3,1,Math.PI],
  [-46,-86.7,1,0],[-34,-86.7,1,0],
  [-61.6,-48,1,-Math.PI/2],[-61.6,-42,1,-Math.PI/2],[-69.8,-34.6,1,Math.PI],
  [-24.5,-74,1,-Math.PI/2],[-24.5,-80,1,-Math.PI/2],
  [24,-84.5,1,0],[36,-64.6,1,Math.PI],[46,-64.6,1,Math.PI],
];
export const amenityShrubs:number[][]=(()=>{
  const out:number[][]=[];
  // canteiro diante do letreiro
  const [fx,fz]=SIGN.face,nx=fx-SIGN.x,nz=fz-SIGN.z,l=Math.hypot(nx,nz),ux=-nz/l,uz=nx/l,ox=nx/l,oz=nz/l;
  for(let i=0;i<17;i++){const s=(i-8)*.62;out.push([SIGN.x+ux*s+ox*1.5,SIGN.z+uz*s+oz*1.5,.6+.12*Math.sin(i*1.7),i*.9]);}
  // bordas do deck e fundo do quiosque
  for(let x=DECK.x0+1;x<DECK.x1;x+=1.4){out.push([x,DECK.z1+1.1,.6+.1*Math.sin(x),x]);}
  for(let z=KIOSK.z0;z<=KIOSK.z1;z+=1.3)out.push([KIOSK.x0-1.2,z,.75+.1*Math.cos(z),z]);
  // floreiras do deck e contorno do playground
  for(const [x,z] of [[30.4,-83.2],[56.2,-83.2],[30.4,-67.3],[56.2,-67.3]])for(let k=0;k<4;k++)out.push([x+(k%2-.5)*.5,z+(k>>1)*.5-.25,.55,k]);
  for(let x=PLAY.x0;x<=PLAY.x1;x+=1.3){out.push([x,PLAY.z0-1.1,.5,x]);}
  for(let z=PLAY.z0;z<=PLAY.z1;z+=1.3){out.push([PLAY.x0-1.1,z,.5,z]);}
  return out;
})();
export const amenityTrees:number[][]=[[13.5,-85,7.6,.4],[13.5,-65.5,7.2,1.9],[58,-85.5,8,2.7],[60,-65,7.4,4.1],[-58,-88,7.8,.8],[-24,-87,7.2,3.3],[-56,-66,7.5,5.2],[-78,-56,7.6,1.2],[-60.5,-33,7.2,2.2],[-78,-34,6.8,4.4],[-71,-63,7,3.1]];

class Builder{
  parts=new Map<T.MeshStandardMaterial,T.BufferGeometry[]>();
  add(m:T.MeshStandardMaterial,g:T.BufferGeometry){const flat=g.index?g.toNonIndexed():g;if(flat!==g)g.dispose();(this.parts.get(m)||this.parts.set(m,[]).get(m)!).push(flat);}
  box(m:T.MeshStandardMaterial,x0:number,x1:number,y0:number,y1:number,z0:number,z1:number){this.add(m,new T.BoxGeometry(Math.abs(x1-x0),Math.abs(y1-y0),Math.abs(z1-z0)).translate((x0+x1)/2,(y0+y1)/2,(z0+z1)/2));}
  cyl(m:T.MeshStandardMaterial,x:number,z:number,y0:number,y1:number,r0:number,r1=r0,seg=12){this.add(m,new T.CylinderGeometry(r1,r0,y1-y0,seg).translate(x,(y0+y1)/2,z));}
  meshes(name:string){const out:T.Mesh[]=[];for(const [material,list] of this.parts){const geometry=mergeGeometries(list);list.forEach(g=>g.dispose());if(!geometry)continue;geometry.computeBoundingSphere();const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;out.push(mesh);}return out;}
}

/** Máscara do logotipo: letras creme → branco, fundo oliva → preto (alphaMap e emissiveMap usam o canal verde). */
function logoMask(onReady:()=>void){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=496;
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.NoColorSpace;texture.anisotropy=8;
  const image=new Image();image.decoding='async';
  image.onload=()=>{
    const g=canvas.getContext('2d',{willReadFrequently:true})!;
    // recorte do conteúdo do arquivo 1254 × 1254 (monograma + palavra)
    g.drawImage(image,150,385,955,462,0,0,canvas.width,canvas.height);
    const data=g.getImageData(0,0,canvas.width,canvas.height),d=data.data;
    for(let i=0;i<d.length;i+=4){const l=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2],t=Math.max(0,Math.min(1,(l-105)/(205-105)))*255;d[i]=d[i+1]=d[i+2]=t;d[i+3]=255;}
    g.putImageData(data,0,0);texture.needsUpdate=true;onReady();
  };
  image.src=LOGO_URL;
  return texture;
}

/** Rede de vôlei: malha de 10 cm e faixa superior branca, como alphaMap. */
function netMask(){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const g=canvas.getContext('2d')!;
  g.fillStyle='#000';g.fillRect(0,0,1024,128);g.strokeStyle='#fff';g.lineWidth=2;
  for(let i=0;i<=95;i++){const x=i/95*1024;g.beginPath();g.moveTo(x,0);g.lineTo(x,128);g.stroke();}
  for(let j=0;j<=10;j++){const y=j/10*128;g.beginPath();g.moveTo(0,y);g.lineTo(1024,y);g.stroke();}
  g.fillStyle='#fff';g.fillRect(0,0,1024,10);g.fillRect(0,122,1024,6);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.NoColorSpace;texture.anisotropy=8;return texture;
}

export function createSerraAmenities(scene:T.Scene,look:SerraLook|undefined,invalidate:()=>void){
  const group=new T.Group();group.name='Émera · equipamentos';scene.add(group);
  const owned:{dispose():void}[]=[];
  const mat=(name:string,color:string,roughness=.8,metalness=0,extra:T.MeshStandardMaterialParameters={})=>{
    const m=new T.MeshStandardMaterial({name,color,roughness,metalness,...extra});look?.building(m);owned.push(m);return m;
  };
  const night:{material:T.MeshStandardMaterial;peak:number}[]=[];
  const L1=padLevel(0),L2=padLevel(1);

  // ------------------------------------------------------------ letreiro ÉMERA
  {
    const b=new Builder();
    const wall=mat('Letreiro · Concreto oliva','#525a3f',.86);
    const plinth=mat('Letreiro · Pedra','#8d8a82',.9);
    const bed=mat('Letreiro · Canteiro','#3a2e22',.98);
    const W=SIGN.width,lw=W*.8,lh=lw*462/955,H=.32+lh+1.0;
    b.box(plinth,-W/2-.45,W/2+.45,-.4,.32,-.7,.7);
    b.box(wall,-W/2,W/2,.32,H,-.38,.38);
    b.box(bed,-W/2-.3,W/2+.3,-.3,.22,.7,2.4);
    const sign=new T.Group();sign.name='Émera · letreiro';
    b.meshes('Émera · letreiro').forEach(m=>sign.add(m));
    const mask=logoMask(invalidate);owned.push(mask);
    const letters=new T.MeshStandardMaterial({name:'Letreiro · Letras',color:'#efe6d1',roughness:.35,metalness:.55,alphaMap:mask,alphaTest:.45,emissive:'#ffe3b5',emissiveMap:mask,emissiveIntensity:0,envMapIntensity:1.2});owned.push(letters);
    night.push({material:letters,peak:1.6});
    const plate=new T.Mesh(new T.PlaneGeometry(lw,lh),letters);plate.position.set(0,.32+.5+lh/2,.405);plate.castShadow=true;plate.name='Émera · letras';sign.add(plate);
    // relevo das letras: uma cópia escura logo atrás dá espessura às bordas
    const depth=new T.MeshStandardMaterial({name:'Letreiro · Letras sombra',color:'#2c2f23',roughness:.6,alphaMap:mask,alphaTest:.45});owned.push(depth);
    const back=new T.Mesh(plate.geometry,depth);back.position.set(.014,.32+.5+lh/2-.006,.387);sign.add(back);owned.push(plate.geometry);
    const [fx,fz]=SIGN.face;sign.rotation.y=Math.atan2(fx-SIGN.x,fz-SIGN.z);
    sign.position.set(SIGN.x,L1,SIGN.z);group.add(sign);
  }

  // ------------------------------------------------------------ quadra de vôlei de areia
  {
    const b=new Builder(),{x,z,sandW,sandD}=COURT,y=L1;
    const sand=mat('Quadra · Areia','#d9c8a2',.98);
    const curb=mat('Quadra · Borda Madeira','#8a6a4c',.75);
    const tape=mat('Quadra · Fita','#1f4f8f',.55);
    const post=mat('Quadra · Poste','#2b2e31',.4,.6);
    b.box(sand,x-sandW/2,x+sandW/2,y-.3,y+.07,z-sandD/2,z+sandD/2);
    for(const [x0,x1,z0,z1] of [[x-sandW/2-.18,x+sandW/2+.18,z-sandD/2-.18,z-sandD/2],[x-sandW/2-.18,x+sandW/2+.18,z+sandD/2,z+sandD/2+.18],[x-sandW/2-.18,x-sandW/2,z-sandD/2,z+sandD/2],[x+sandW/2,x+sandW/2+.18,z-sandD/2,z+sandD/2]])b.box(curb,x0,x1,y-.3,y+.16,z0,z1);
    const t=.05,ty0=y+.07,ty1=y+.085;
    b.box(tape,x-8,x+8,ty0,ty1,z-4,z-4+t);b.box(tape,x-8,x+8,ty0,ty1,z+4-t,z+4);
    b.box(tape,x-8,x-8+t,ty0,ty1,z-4,z+4);b.box(tape,x+8-t,x+8,ty0,ty1,z-4,z+4);
    for(const s of [-1,1]){b.cyl(post,x,z+s*5,y,y+2.55,.055);b.cyl(post,x,z+s*5,y-.02,y+.08,.11);}
    b.meshes('Émera · quadra de vôlei').forEach(m=>group.add(m));
    const netTex=netMask();owned.push(netTex);
    const netMat=new T.MeshStandardMaterial({name:'Quadra · Rede',color:'#f1efe8',roughness:.8,alphaMap:netTex,alphaTest:.35,side:T.DoubleSide});owned.push(netMat);
    const net=new T.Mesh(new T.PlaneGeometry(9.5,1),netMat);net.rotation.y=Math.PI/2;net.position.set(x,y+1.93,z);net.castShadow=true;net.name='Émera · rede';group.add(net);owned.push(net.geometry);
    // bola esquecida na areia: escala para o olhar
    const ball=new T.Mesh(new T.SphereGeometry(.105,16,12),mat('Quadra · Bola','#f2d33c',.5));ball.position.set(x-4.2,y+.17,z+1.6);ball.castShadow=true;group.add(ball);owned.push(ball.geometry);
  }

  // ------------------------------------------------------------ quiosque com churrasqueira
  {
    const b=new Builder(),{x0,x1,z0,z1}=KIOSK,y=L2;
    const slab=mat('Quiosque · Concreto piso','#bdb7ab',.86);
    const stone=mat('Quiosque · Pedra','#8f8a80',.9);
    const wood=mat('Quiosque · Madeira','#a46f45',.7);
    const slats=mat('Quiosque · Ripado','#b07c4c',.7);
    const steel=mat('Quiosque · Escuro','#2a2d30',.5,.35);
    const roof=mat('Quiosque · Cobertura','#2b2d30',.7,.1);
    const top=mat('Quiosque · Concreto bancada','#d6d1c6',.6);
    const glow=mat('Quiosque · Luz','#fff4de',.6,0,{emissive:'#ffcf8a',emissiveIntensity:0});night.push({material:glow,peak:3.2});
    const fire=mat('Quiosque · Brasa','#2a1a12',.9,0,{emissive:'#ff6a1e',emissiveIntensity:0});night.push({material:fire,peak:1.4});
    b.box(slab,x0-.3,x1+.3,y-.5,y+.16,z0-.3,z1+.3);
    const f=y+.16,h=3.25;
    // parede de pedra ao fundo e ripado lateral
    b.box(stone,x0,x0+.35,f,f+h,z0,z1);
    b.box(slats,x0+.35,x0+4.2,f,f+h,z0,z0+.12);
    // churrasqueira: base de pedra, bancada, grelha, coifa metálica e chaminé
    b.box(stone,x0+.35,x0+1.15,f,f+.92,-77,-74.4);
    b.box(top,x0+.35,x0+1.2,f+.92,f+.98,-77.05,-74.35);
    b.box(fire,x0+.45,x0+1.05,f+.98,f+1.0,-76.6,-74.8);
    b.box(steel,x0+.35,x0+1.2,f+1.9,f+2.05,-76.8,-74.6);
    b.box(steel,x0+.35,x0+.95,f+2.05,f+h,-76.25,-75.15);
    b.box(steel,x0+.05,x0+.75,f+h+.25,f+h+1.25,-76.05,-75.35);
    // bancadas laterais com armários de madeira
    for(const [za,zb] of [[z0+.15,-77.2],[-74.2,z1-.15]]){b.box(wood,x0+.35,x0+1.0,f,f+.88,za,zb);b.box(top,x0+.35,x0+1.05,f+.88,f+.94,za,zb);}
    // pilares metálicos esbeltos
    for(const zz of [z0+.3,(z0+z1)/2,z1-.3])b.box(steel,x1-.42,x1-.26,f,f+h,zz-.08,zz+.08);
    // laje de cobertura fina com forro de madeira e fita de luz
    b.box(roof,x0-.45,x1+.45,f+h,f+h+.26,z0-.45,z1+.45);
    b.box(wood,x0+.35,x1+.4,f+h-.05,f+h,z0-.4,z1+.4);
    b.box(glow,x1-.9,x1-.8,f+h-.08,f+h-.05,z0+.6,z1-.6);
    // mesa comunitária e bancos
    const cx=22.6,cz=(z0+z1)/2;
    b.box(wood,cx-1.8,cx+1.8,f+.72,f+.78,cz-.5,cz+.5);
    for(const s of [-1.3,1.3])b.box(steel,cx+s-.05,cx+s+.05,f,f+.72,cz-.4,cz+.4);
    for(const s of [-.95,.95]){b.box(wood,cx-1.7,cx+1.7,f+.42,f+.47,cz+s-.18,cz+s+.18);for(const t2 of [-1.4,1.4])b.box(steel,cx+t2-.04,cx+t2+.04,f,f+.42,cz+s-.15,cz+s+.15);}
    // passarela até o deck
    b.box(slab,x1+.3,DECK.x0,y-.3,y+.1,-76.2,-73.8);
    b.meshes('Émera · quiosque').forEach(m=>group.add(m));
  }

  // ------------------------------------------------------------ piscina e deck
  {
    const b=new Builder(),y=L2;
    const deck=mat('Piscina · Piso Concreto','#c4bcac',.86);
    const coping=mat('Piscina · Borda Concreto','#ddd6c8',.7);
    const tile=mat('Piscina · Pastilha','#5fb6c4',.3);
    const frame=mat('Piscina · Escuro','#2c2f33',.5,.3);
    const cushion=mat('Piscina · Estofado','#efebe2',.9);
    const canvas=mat('Piscina · Ombrelone','#ece4d2',.95,0,{side:T.DoubleSide});
    const {x0,x1,z0,z1}=POOL,top=y+.2;
    // deck em volta da piscina (quatro faixas) e borda
    b.box(deck,DECK.x0,DECK.x1,y-.5,top,DECK.z0,z0-.4);b.box(deck,DECK.x0,DECK.x1,y-.5,top,z1+.4,DECK.z1);
    b.box(deck,DECK.x0,x0-.4,y-.5,top,z0-.4,z1+.4);
    // faixa leste com a piscina infantil recortada
    const K=KIDS,ktop=top;
    b.box(deck,x1+.4,DECK.x1,y-.5,top,z0-.4,K.z0-.3);b.box(deck,x1+.4,DECK.x1,y-.5,top,K.z1+.3,z1+.4);
    b.box(deck,x1+.4,K.x0-.3,y-.5,top,K.z0-.3,K.z1+.3);b.box(deck,K.x1+.3,DECK.x1,y-.5,top,K.z0-.3,K.z1+.3);
    b.box(coping,K.x0-.3,K.x1+.3,ktop,ktop+.05,K.z0-.3,K.z0);b.box(coping,K.x0-.3,K.x1+.3,ktop,ktop+.05,K.z1,K.z1+.3);
    b.box(coping,K.x0-.3,K.x0,ktop,ktop+.05,K.z0,K.z1);b.box(coping,K.x1,K.x1+.3,ktop,ktop+.05,K.z0,K.z1);
    b.box(tile,K.x0,K.x1,y-.3,ktop,K.z0,K.z0+.04);b.box(tile,K.x0,K.x1,y-.3,ktop,K.z1-.04,K.z1);b.box(tile,K.x0,K.x0+.04,y-.3,ktop,K.z0,K.z1);b.box(tile,K.x1-.04,K.x1,y-.3,ktop,K.z0,K.z1);
    // degrau de transição entre as duas piscinas
    b.box(tile,x1+.4,K.x0-.3,top+.05,top+.07,-75.6,-74.4);
    b.box(coping,x0-.4,x1+.4,top,top+.05,z0-.4,z0);b.box(coping,x0-.4,x1+.4,top,top+.05,z1,z1+.4);
    b.box(coping,x0-.4,x0,top,top+.05,z0,z1);b.box(coping,x1,x1+.4,top,top+.05,z0,z1);
    // paredes internas visíveis acima da água
    b.box(tile,x0,x1,y-.6,top,z0,z0+.04);b.box(tile,x0,x1,y-.6,top,z1-.04,z1);b.box(tile,x0,x0+.04,y-.6,top,z0,z1);b.box(tile,x1-.04,x1,y-.6,top,z0,z1);
    // espreguiçadeiras e ombrelones
    for(const lx of [35.5,38.3,41.1,43.9,46.7,49.5]){const lz=-81.6;
      b.box(frame,lx-.34,lx+.34,top,top+.3,lz-.95,lz+.95);
      b.box(cushion,lx-.31,lx+.31,top+.3,top+.38,lz-.92,lz+.4);
      b.add(cushion,new T.BoxGeometry(.62,.08,.75).rotateX(-.75).translate(lx,top+.62,lz+.62));
    }
    for(const ux of [32.4,53.4]){const uz=-81.8;b.cyl(frame,ux,uz,top,top+2.45,.025);b.add(canvas,new T.ConeGeometry(1.45,.42,16,1,true).translate(ux,top+2.55,uz));b.cyl(frame,ux,uz,top,top+.06,.28);}
    // mesinhas entre as espreguiçadeiras
    for(const lx of [36.9,42.5,48.1]){b.cyl(frame,lx,-81.1,top,top+.42,.04);b.cyl(cushion,lx,-81.1,top+.42,top+.46,.26,.26,16);}
    // pergolado com estar no lado norte do deck
    const wood=mat('Piscina · Pergolado Madeira','#a46f45',.7),sofa=mat('Piscina · Sofá','#d9d2c3',.92),pillow=mat('Piscina · Almofada','#556b4b',.9);
    const px0=34,px1=46,pz0=-70.3,pz1=-66.9,ph=top+2.7;
    for(const px of [px0,(px0+px1)/2,px1])for(const pz of [pz0,pz1])b.box(frame,px-.07,px+.07,top,ph,pz-.07,pz+.07);
    b.box(wood,px0-.3,px1+.3,ph,ph+.18,pz0-.1,pz0+.1);b.box(wood,px0-.3,px1+.3,ph,ph+.18,pz1-.1,pz1+.1);
    for(let px=px0-.2;px<=px1+.2;px+=.38)b.box(wood,px-.04,px+.04,ph+.18,ph+.32,pz0-.35,pz1+.35);
    for(const [sx0,sx1] of [[35,39.6],[40.4,45]]){b.box(sofa,sx0,sx1,top,top+.42,-68.1,-67.2);b.box(sofa,sx0,sx1,top+.42,top+.85,-67.45,-67.2);
      for(let px=sx0+.5;px<sx1-.3;px+=1.1)b.add(pillow,new T.BoxGeometry(.45,.4,.12).rotateX(-.2).translate(px,top+.65,-67.5));}
    b.box(wood,37.6,42.4,top,top+.36,-69.6,-68.8);
    // ducha
    b.cyl(frame,30.6,-79.6,top,top+2.25,.04);b.box(frame,30.6,31.1,top+2.2,top+2.25,-79.65,-79.55);b.cyl(frame,31.05,-79.6,top+2.08,top+2.2,.09,.06,10);
    // floreiras de concreto nos cantos do deck
    const planter=mat('Piscina · Floreira Concreto','#9a968e',.88);
    for(const [cx,cz] of [[30.4,-83.2],[56.2,-83.2],[30.4,-67.3],[56.2,-67.3]])b.box(planter,cx-.55,cx+.55,top,top+.55,cz-.55,cz+.55);
    // escada em inox
    for(const s of [-.3,.3])b.add(frame,new T.TorusGeometry(.28,.022,6,12,Math.PI).rotateY(Math.PI/2).translate(x1-.25,top+.25,z1-1.1+s));
    b.meshes('Émera · piscina').forEach(m=>group.add(m));
    const water=new T.MeshStandardMaterial({name:'Piscina · Água',color:'#3fb4c6',roughness:.04,metalness:.1,envMapIntensity:1.4,emissive:'#5fe3f0',emissiveIntensity:0});owned.push(water);
    look?.water(water,new T.Vector4(x0,x1,z0,z1));night.push({material:water,peak:.55});
    const surface=new T.Mesh(new T.PlaneGeometry(x1-x0,z1-z0),water);surface.rotation.x=-Math.PI/2;surface.position.set((x0+x1)/2,top-.1,(z0+z1)/2);surface.receiveShadow=true;surface.name='Émera · água';
    group.add(surface);owned.push(surface.geometry);
    const kidsWater=new T.MeshStandardMaterial({name:'Piscina · Água rasa',color:'#5cc8d4',roughness:.04,metalness:.1,envMapIntensity:1.4,emissive:'#5fe3f0',emissiveIntensity:0});owned.push(kidsWater);
    look?.water(kidsWater,new T.Vector4(KIDS.x0,KIDS.x1,KIDS.z0,KIDS.z1));night.push({material:kidsWater,peak:.55});
    const kids=new T.Mesh(new T.PlaneGeometry(KIDS.x1-KIDS.x0,KIDS.z1-KIDS.z0),kidsWater);kids.rotation.x=-Math.PI/2;kids.position.set((KIDS.x0+KIDS.x1)/2,top-.06,(KIDS.z0+KIDS.z1)/2);kids.receiveShadow=true;group.add(kids);owned.push(kids.geometry);
    // cerca de vidro em volta do deck, com portão aberto para o quiosque
    const glass=new T.MeshStandardMaterial({name:'Cerca · Vidro temperado',color:'#d5e6ea',roughness:.05,metalness:.1,transparent:true,opacity:.2,depthWrite:false,envMapIntensity:1.6});owned.push(glass);
    const fb=new Builder(),fy=top+.05,fh=1.25,post=mat('Cerca · Perfil','#2a2d30',.45,.4);
    const run=(ax:number,az:number,bx:number,bz:number)=>{const len=Math.hypot(bx-ax,bz-az),n=Math.max(1,Math.round(len/1.6));for(let i=0;i<n;i++){const t0=i/n,t1=(i+1)/n,x0p=ax+(bx-ax)*t0,z0p=az+(bz-az)*t0,x1p=ax+(bx-ax)*t1,z1p=az+(bz-az)*t1;
      fb.box(glass as T.MeshStandardMaterial,Math.min(x0p,x1p)-(ax===bx?.012:-.03),Math.max(x0p,x1p)+(ax===bx?.012:-.03),fy+.04,fy+fh,Math.min(z0p,z1p)-(az===bz?.012:-.03),Math.max(z0p,z1p)+(az===bz?.012:-.03));
      fb.box(post,x0p-.03,x0p+.03,fy,fy+fh+.04,z0p-.03,z0p+.03);}
      fb.box(post,bx-.03,bx+.03,fy,fy+fh+.04,bz-.03,bz+.03);};
    const ex=DECK.x0+.1,ez0=DECK.z0+.1,ez1=DECK.z1-.1,ex1=DECK.x1-.1;
    run(ex,ez0,ex1,ez0);run(ex,ez1,ex1,ez1);run(ex1,ez0,ex1,ez1);run(ex,ez0,ex,-76.6);run(ex,-73.4,ex,ez1);
    fb.meshes('Émera · cerca da piscina').forEach(m=>{if(m.material===glass){m.castShadow=false;m.renderOrder=3;}group.add(m);});
  }

  // ------------------------------------------------------------ playground, pergolado com mesas e mobiliário da Recreação 01
  {
    const b=new Builder(),y=L1;
    const floor=mat('Parque · Piso emborrachado','#5c8a5a',.95);
    const floor2=mat('Parque · Piso emborrachado terracota','#b5674a',.95);
    const steel=mat('Parque · Aço pintado','#2f6f8f',.45,.3);
    const yellow=mat('Parque · Plástico amarelo','#f0b632',.45);
    const red=mat('Parque · Plástico vermelho','#d0533c',.45);
    const wood=mat('Parque · Madeira','#a46f45',.72);
    const chain=mat('Parque · Corrente','#8d9196',.4,.8);
    const P=PLAY;
    b.box(floor,P.x0,P.x1,y-.2,y+.06,P.z0,P.z1);
    b.box(floor2,P.x0+.6,P.x0+5.6,y+.06,y+.07,P.z0+.6,P.z0+6.2);
    b.box(wood,P.x0-.12,P.x1+.12,y-.2,y+.2,P.z0-.12,P.z0);b.box(wood,P.x0-.12,P.x1+.12,y-.2,y+.2,P.z1,P.z1+.12);
    b.box(wood,P.x0-.12,P.x0,y-.2,y+.2,P.z0,P.z1);b.box(wood,P.x1,P.x1+.12,y-.2,y+.2,P.z0,P.z1);
    const f=y+.06;
    // balanço duplo
    {const sx=P.x0+3.1,sz0=P.z1-5.2,sz1=P.z1-1.2,h=2.35;
      for(const sz of [sz0,sz1])for(const s of [-1,1])b.add(steel,new T.CylinderGeometry(.05,.05,h+.15,10).rotateX(s*.32).translate(sx,f+h/2,sz+s*.38));
      b.add(steel,new T.CylinderGeometry(.06,.06,sz1-sz0+.4,10).rotateX(Math.PI/2).translate(sx,f+h,(sz0+sz1)/2));
      for(const seat of [sz0+1.1,sz1-1.1]){for(const s of [-.22,.22])b.cyl(chain,sx,seat+s,f+.45,f+h,.012);b.box(red,sx-.22,sx+.22,f+.42,f+.48,seat-.25,seat+.25);}}
    // torre com escorregador, escada e telhadinho
    {const tx=P.x1-3.2,tz=P.z1-4,pl=f+1.5;
      for(const dx of [-.75,.75])for(const dz of [-.75,.75])b.box(steel,tx+dx-.06,tx+dx+.06,f,pl+1.4,tz+dz-.06,tz+dz+.06);
      b.box(wood,tx-.8,tx+.8,pl-.08,pl,tz-.8,tz+.8);
      for(const dz of [-.8,.8])b.box(yellow,tx-.8,tx+.8,pl,pl+.75,tz+dz-.03,tz+dz+.03);
      b.add(red,new T.ConeGeometry(1.25,.9,4,1).rotateY(Math.PI/4).translate(tx,pl+1.85,tz));
      // escorregador descendo para -x
      const sl=3.2,ang=Math.atan2(1.4,sl);
      b.add(yellow,new T.BoxGeometry(Math.hypot(sl,1.4),.06,.7).rotateZ(-ang).translate(tx-.8-sl/2,f+.1+.7,tz));
      for(const s of [-.36,.36])b.add(yellow,new T.BoxGeometry(Math.hypot(sl,1.4),.22,.05).rotateZ(-ang).translate(tx-.8-sl/2,f+.25+.7,tz+s));
      b.box(yellow,tx-.8-sl-.6,tx-.8-sl,f,f+.1,tz-.35,tz+.35);
      // escada do lado +z
      for(const s of [-.3,.3])b.add(steel,new T.CylinderGeometry(.035,.035,1.9,8).rotateX(-.45).translate(tx+s,f+.8,tz+1.2));
      for(let k=1;k<5;k++)b.box(wood,tx-.3,tx+.3,f+k*.32-.02,f+k*.32+.02,tz+.8+k*.1,tz+.95+k*.1);}
    // gangorra e brinquedos de mola
    {const gx=P.x0+3.2,gz=P.z0+3.4;b.box(steel,gx-.1,gx+.1,f,f+.45,gz-.25,gz+.25);
      b.add(wood,new T.BoxGeometry(3.2,.08,.32).rotateZ(.14).translate(gx,f+.5,gz));
      for(const s of [-1.35,1.35])b.add(steel,new T.CylinderGeometry(.025,.025,.5,8).rotateZ(Math.PI/2).translate(gx+s,f+.62+s*.14,gz));
      for(const [mx,mz,m] of [[P.x1-2.2,P.z0+2.2,red],[P.x1-4.4,P.z0+2.6,yellow]] as [number,number,T.MeshStandardMaterial][]){
        b.add(chain,new T.CylinderGeometry(.12,.12,.45,10,4,true).translate(mx,f+.23,mz));
        b.add(m,new T.SphereGeometry(.32,12,8).scale(1.3,.8,.7).translate(mx,f+.66,mz));b.cyl(steel,mx+.25,mz,f+.7,f+1.05,.02);}}
    // pergolado com mesas de piquenique ao lado da quadra
    {const Q=PICNIC,ph=y+2.75;
      for(const px of [Q.x0,Q.x1])for(const pz of [Q.z0,(Q.z0+Q.z1)/2,Q.z1])b.box(wood,px-.1,px+.1,y,ph,pz-.1,pz+.1);
      for(const px of [Q.x0,Q.x1])b.box(wood,px-.12,px+.12,ph,ph+.22,Q.z0-.4,Q.z1+.4);
      for(let pz=Q.z0-.3;pz<=Q.z1+.3;pz+=.42)b.box(wood,Q.x0-.5,Q.x1+.5,ph+.22,ph+.34,pz-.05,pz+.05);
      b.box(mat('Parque · Piso Concreto','#bdb7ab',.86),Q.x0-.6,Q.x1+.6,y-.2,y+.05,Q.z0-.6,Q.z1+.6);
      for(const tz of [Q.z0+3.3,Q.z1-3.3]){const tx=(Q.x0+Q.x1)/2;
        b.box(wood,tx-.45,tx+.45,y+.72,y+.78,tz-1.1,tz+1.1);for(const s of [-.85,.85])b.box(wood,tx+s-.17,tx+s+.17,y+.42,y+.47,tz-1.1,tz+1.1);
        for(const s of [-.75,.75])b.box(steel,tx-.9,tx+.9,y,y+.72,tz+s-.03,tz+s+.03);}}
    // lixeiras, bicicletário e balizadores de luz
    const bin=mat('Parque · Lixeira','#2f3a33',.6,.2),lamp=mat('Parque · Balizador','#f4ead6',.5,0,{emissive:'#ffd7a0',emissiveIntensity:0});night.push({material:lamp,peak:2.6});
    for(const [bx,bz] of [[-49.6,-67.3],[-30.4,-86.7],[-61.6,-45],[-58,-70],[-23.6,-77],[25.5,-84.5],[33,-64.6]]){b.cyl(bin,bx,bz,terrainHeight(bx,bz),terrainHeight(bx,bz)+.85,.24,.27,12);}
    for(let x=-27;x>-8;x+=3.2){const bz=COURT.z+1.3,by=terrainHeight(x,bz);b.cyl(bin,x,bz,by,by+.7,.07);b.cyl(lamp,x,bz,by+.7,by+.82,.09);}
    for(let x=10.5;x<KIOSK.x0-.6;x+=3.2){const bz=-73.6,by=terrainHeight(x,bz);b.cyl(bin,x,bz,by,by+.7,.07);b.cyl(lamp,x,bz,by+.7,by+.82,.09);}
    for(let z=P.z0;z<=P.z1;z+=3.75){b.cyl(bin,P.x1+1.4,z,y,y+.7,.07);b.cyl(lamp,P.x1+1.4,z,y+.7,y+.82,.09);}
    for(let k=0;k<5;k++){const bx=-14+k*.7,bz=-68.5;b.add(steel,new T.TorusGeometry(.38,.025,6,14,Math.PI).translate(bx,y+.02,bz).rotateY(0));}
    b.meshes('Émera · playground e mobiliário').forEach(m=>group.add(m));
  }

  // ------------------------------------------------------------ caminhos de pedra até as avenidas, seguindo o terreno
  {
    const b=new Builder(),paver=mat('Caminho · Concreto','#c9c3b6',.86);
    const path=(xa:number,xb:number,z:number,w:number)=>{const step=1.1;for(let x=xa;x<xb;x+=step){const cx=x+step/2;const y=terrainHeight(cx,z);b.box(paver,x+.06,x+step-.06,y-.25,y+.05,z-w/2,z+w/2);}};
    path(-28.5,-6.6,COURT.z,1.6);
    // passeio da quadra até o playground e o pergolado
    for(let z=-68;z<PLAY.z0-1;z+=1.1){const y=terrainHeight(-66,z+.55);b.box(paver,-66.8,-65.2,y-.25,y+.05,z+.06,z+1.04);}
    for(let x=-53.6;x<-51.4;x+=1.1){const y=terrainHeight(x+.55,-77);b.box(paver,x+.06,x+1.04,y-.25,y+.05,-77.8,-76.2);}
    path(9.2,KIOSK.x0-.3,-75,1.8);
    b.meshes('Émera · caminhos').forEach(m=>{m.castShadow=false;group.add(m);});
  }

  group.traverse(o=>{if(o instanceof T.Mesh)owned.push(o.geometry);});
  invalidate();
  return {
    setNight(level:number){for(const n of night)n.material.emissiveIntensity=n.peak*level;},
    dispose(){scene.remove(group);owned.forEach(o=>o.dispose());}
  };
}
