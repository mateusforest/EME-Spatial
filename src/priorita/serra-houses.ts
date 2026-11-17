import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Priorità · Serra — casas ilustrativas contemporâneas, modeladas em código para lotes de ~10 m de frente.
 * Volumes puros, lajes finas, balanços, grandes panos de vidro, ripado de madeira, concreto e metal escuro.
 * Largura 7,2 m; frente = +Z; piso em y = 0. Genéricas: não representam projeto aprovado nem memorial.
 */
type Mat='Parede'|'Concreto'|'Escuro'|'Madeira'|'Ripado'|'Telhado'|'Vidro'|'Esquadria'|'Deck'|'Portão';
const palette:Record<Mat,{color:string;roughness:number;metalness?:number}>={
  Parede:{color:'#f2f0ea',roughness:.9},
  Concreto:{color:'#8f8e89',roughness:.86},
  Escuro:{color:'#2e3134',roughness:.6,metalness:.25},
  Madeira:{color:'#a06e45',roughness:.72},
  Ripado:{color:'#b07c4c',roughness:.7},
  Telhado:{color:'#26282b',roughness:.64,metalness:.18},
  Vidro:{color:'#4d6272',roughness:.05,metalness:.9},
  Esquadria:{color:'#17191b',roughness:.45,metalness:.4},
  Deck:{color:'#a07e5c',roughness:.75},
  Portão:{color:'#3b3e42',roughness:.5,metalness:.4},
};

class House{
  private parts=new Map<Mat,T.BufferGeometry[]>();
  private add(m:Mat,g:T.BufferGeometry){
    const flat=g.index?g.toNonIndexed():g;if(flat!==g)g.dispose();
    (this.parts.get(m)||this.parts.set(m,[]).get(m)!).push(flat);
  }
  box(m:Mat,x0:number,x1:number,y0:number,y1:number,z0:number,z1:number){
    this.add(m,new T.BoxGeometry(x1-x0,y1-y0,z1-z0).translate((x0+x1)/2,(y0+y1)/2,(z0+z1)/2));
  }
  /** Perfil (x,y) extrudado ao longo de Z: empenas e águas inclinadas. */
  prism(m:Mat,profile:[number,number][],z0:number,z1:number){
    const shape=new T.Shape(profile.map(([x,y])=>new T.Vector2(x,y)));
    this.add(m,new T.ExtrudeGeometry(shape,{depth:z1-z0,bevelEnabled:false}).translate(0,0,z0));
  }
  /** Pano de vidro numa parede perpendicular a Z; out = +1 (frente) ou -1 (fundos). Caixilho escuro e montantes. */
  glassZ(x0:number,x1:number,y0:number,y1:number,z:number,out:number,mullions=0){
    const a=Math.min(z,z+out*.035),b=Math.max(z,z+out*.035),fa=Math.min(z,z+out*.08),fb=Math.max(z,z+out*.08),t=.055;
    this.box('Vidro',x0,x1,y0,y1,a,b);
    this.box('Esquadria',x0-t,x1+t,y1,y1+t,fa,fb);this.box('Esquadria',x0-t,x1+t,y0-t,y0,fa,fb);
    this.box('Esquadria',x0-t,x0,y0,y1,fa,fb);this.box('Esquadria',x1,x1+t,y0,y1,fa,fb);
    for(let i=1;i<=mullions;i++){const x=x0+(x1-x0)*i/(mullions+1);this.box('Esquadria',x-.025,x+.025,y0,y1,fa,fb);}
  }
  /** Idem, em parede perpendicular a X; out = +1 (lado direito) ou -1 (lado esquerdo). */
  glassX(x:number,out:number,y0:number,y1:number,z0:number,z1:number,mullions=0){
    const a=Math.min(x,x+out*.035),b=Math.max(x,x+out*.035),fa=Math.min(x,x+out*.08),fb=Math.max(x,x+out*.08),t=.055;
    this.box('Vidro',a,b,y0,y1,z0,z1);
    this.box('Esquadria',fa,fb,y1,y1+t,z0-t,z1+t);this.box('Esquadria',fa,fb,y0-t,y0,z0-t,z1+t);
    this.box('Esquadria',fa,fb,y0,y1,z0-t,z0);this.box('Esquadria',fa,fb,y0,y1,z1,z1+t);
    for(let i=1;i<=mullions;i++){const z=z0+(z1-z0)*i/(mullions+1);this.box('Esquadria',fa,fb,y0,y1,z-.025,z+.025);}
  }
  finish(){
    const out:{material:Mat;geometry:T.BufferGeometry}[]=[];
    for(const [material,list] of this.parts){const geometry=mergeGeometries(list);list.forEach(g=>g.dispose());if(geometry)out.push({material,geometry});}
    return out;
  }
}

/** Térrea linear: volume branco sob uma laje fina que avança e cobre a varanda; ripado na entrada. */
function terreaLinear(){
  const h=new House();
  h.box('Concreto',-3.7,3.7,-3,0,-6.6,6.6);
  h.box('Parede',-3.6,3.6,0,3,-6.5,4.5);
  h.box('Telhado',-3.95,3.95,3,3.24,-7.1,6.6);
  h.box('Madeira',-3.6,3.6,2.93,3,4.5,6.5);
  h.box('Concreto',-3.6,-3.32,0,2.93,4.5,6.5);
  h.box('Esquadria',3.36,3.46,0,2.93,6.3,6.4);
  h.box('Deck',-3.32,3.6,0,.08,4.5,6.5);
  h.box('Ripado',-3.32,-1.15,.08,2.93,4.5,4.6);
  h.box('Esquadria',-2.75,-1.75,.08,2.25,4.6,4.63);
  h.glassZ(-.95,3.25,.12,2.75,4.5,1,3);
  h.glassX(3.6,1,1.75,2.45,-5.2,-2.6,1);h.glassX(3.6,1,.35,2.6,1.9,3.5);
  h.glassX(-3.6,-1,1.75,2.45,-5.2,-2.6,1);h.glassX(-3.6,-1,1.75,2.45,-1.2,1.6,1);
  h.glassZ(-2.9,2.9,.12,2.7,-6.5,-1,3);
  h.box('Deck',-3.6,3.6,-.25,.06,-8.5,-6.5);
  return h.finish();
}

/** Sobrado: base escura recuada, caixa branca em balanço sobre a entrada, brise ripado e terraço nos fundos. */
function sobradoBalanco(){
  const h=new House();
  h.box('Concreto',-3.7,3.7,-3,0,-6.1,6.1);
  h.box('Escuro',-3.6,3.6,0,2.9,-6,4.6);
  h.box('Portão',-3.25,-.25,0,2.4,4.6,4.66);
  h.box('Madeira',.9,1.95,.06,2.3,4.6,4.66);
  h.glassZ(2.15,2.7,.12,2.3,4.6,1);
  h.box('Concreto',-3.6,3.6,0,.06,4.6,6);
  h.box('Parede',-3.6,3.6,2.9,5.95,-4.4,6);
  h.box('Telhado',-3.66,3.66,5.95,6.05,-4.46,6.06);
  h.box('Madeira',-3.58,3.58,2.84,2.9,4.6,5.98);
  h.glassZ(-2.9,.9,3.45,5.45,6,1,2);
  h.box('Ripado',1.25,3.35,3.15,5.7,6,6.1);
  h.glassX(3.6,1,3.8,5.2,-.5,2,1);h.glassX(-3.6,-1,3.8,5.2,-.5,2,1);h.glassX(-3.6,-1,3.8,5.2,-3.6,-1.8);
  h.glassX(3.6,1,1.7,2.4,-4.5,-1.5,1);h.glassX(-3.6,-1,1.7,2.4,-4.5,-1.5,1);
  h.glassZ(-2.9,2.9,.12,2.6,-6,-1,3);
  h.box('Deck',-3.6,3.6,2.9,2.98,-6,-4.4);
  h.box('Vidro',-3.6,3.6,2.98,3.95,-6,-5.97);h.box('Vidro',-3.6,-3.57,2.98,3.95,-6,-4.4);h.box('Vidro',3.57,3.6,2.98,3.95,-6,-4.4);
  h.glassZ(-2.7,2.7,3.08,5.4,-4.4,-1,3);
  return h.finish();
}

/** Casa em L: bloco social branco mais alto ao fundo, ala em madeira à frente e garagem sob pergolado metálico. */
function casaPergolado(){
  const h=new House();
  h.box('Concreto',-3.7,3.7,-3,0,-6.6,6.6);
  h.box('Parede',-3.6,3.6,0,3.4,-6.5,.2);
  h.box('Telhado',-3.95,3.95,3.4,3.62,-7,.7);
  h.box('Madeira',-3.6,.3,0,2.9,.2,6);
  h.box('Telhado',-3.85,.55,2.9,3.1,.2,6.35);
  h.glassZ(-2.9,-.4,.95,2.4,6,1,1);
  h.box('Concreto',-3.6,.3,0,.5,6,6.5);
  h.box('Esquadria',.3,.36,.06,2.3,2,3);
  h.box('Concreto',.3,3.6,0,.06,.2,6);
  h.box('Esquadria',3.42,3.54,.06,2.55,5.78,5.9);
  h.box('Esquadria',.3,3.6,2.55,2.73,5.76,5.92);
  h.box('Esquadria',3.42,3.58,2.55,2.73,.2,5.92);
  for(let z=.55;z<5.6;z+=.45)h.box('Madeira',.3,3.58,2.73,2.87,z,z+.09);
  h.glassZ(.85,3.25,.12,2.75,.2,1,1);
  h.glassX(3.6,1,1.8,2.6,-5.5,-2.5,1);h.glassX(-3.6,-1,1.8,2.6,-5.5,-2.5,1);h.glassX(-3.6,-1,1,2.3,2,4.2);
  h.glassZ(-2.9,2.9,.12,2.9,-6.5,-1,3);
  h.box('Deck',-3.6,3.6,-.25,.06,-8.7,-6.5);
  return h.finish();
}

/** Galpão contemporâneo: duas águas assimétricas em metal escuro que desce pela lateral; empena em madeira e vidro. */
function galpaoContemporaneo(){
  const h=new House();
  const body:[number,number][]=[[-3.6,0],[3.6,0],[3.6,2.75],[.9,4.95],[-3.6,3.25]];
  h.box('Concreto',-3.7,3.7,-3,0,-6.1,6.1);
  h.prism('Parede',body,-6,4.4);
  h.prism('Madeira',body,4.4,4.47);
  h.prism('Telhado',[[-3.85,3.16],[.9,4.97],[.9,5.17],[-3.85,3.36]],-6.3,6);
  h.prism('Telhado',[[.9,4.97],[3.85,2.57],[3.85,2.77],[.9,5.17]],-6.3,6);
  h.box('Escuro',3.6,3.69,0,2.7,-6,4.4);
  h.glassZ(-2.7,2.9,.12,2.7,4.47,1,3);
  h.glassZ(-.9,2.3,3,3.75,4.47,1,1);
  h.box('Deck',-3.6,3.6,0,.08,4.4,6);
  h.glassX(-3.6,-1,1,2.3,-4.6,-2.6);h.glassX(-3.6,-1,1,2.3,-1.2,1.4,1);
  h.glassZ(-2.9,2.9,.12,2.65,-6,-1,3);
  h.box('Deck',-3.6,3.6,-.25,.06,-8,-6);
  return h.finish();
}

/** depth = projeção ao longo do lote; rear = deck além dela. */
export const houseTypes=[
  {name:'terrea-linear',depth:13,rear:2,build:terreaLinear},
  {name:'sobrado-balanco',depth:12,rear:0,build:sobradoBalanco},
  {name:'casa-pergolado',depth:13,rear:2.2,build:casaPergolado},
  {name:'galpao-contemporaneo',depth:12,rear:2,build:galpaoContemporaneo},
];
export const wallTones=['#ffffff','#f1ede4','#e4e2dc','#f6f3ec','#d9d6cf','#ece7dc'];

export function createHouseLibrary(){
  const materials=new Map<Mat,T.MeshStandardMaterial>();
  const material=(m:Mat)=>materials.get(m)||materials.set(m,new T.MeshStandardMaterial({name:'Casa · '+m,...palette[m]})).get(m)!;
  return houseTypes.map(type=>({...type,parts:type.build().map(p=>({material:material(p.material),geometry:p.geometry}))}));
}
