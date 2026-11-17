import original from './plan-source.json';
import {serraPlan} from './serra-plan';
/** True only on /apresentar/priorita-serra; Node tests have no location and keep the original study. */
const serraRoute=typeof location!=='undefined'&&location.pathname.replace(/\/$/,'').split('/').pop()==='priorita-serra';
/** Rota Serra: traçado ampliado (serra-plan.ts). Demais rotas: a prancha original. */
const source=(serraRoute?serraPlan:original) as typeof original;

/** Nome comercial exibido. A rota Serra usa a nova marca ÉMERA; o estudo original mantém Priorità. */
export const brandName=serraRoute?'Émera':'Priorità';
export const isSerraRoute=serraRoute;

export type Point2 = [number, number];
export type LotStatus = 'available' | 'reserved' | 'unavailable';
export type ViewMode = 'aerial' | 'plan' | 'walk' | 'lot' | 'area';
export const plan = source;
export type Lot = typeof source.lots[number];
export const lots = source.lots;
export const lotById = new Map(lots.map(lot => [lot.id, lot]));
/** Quadras presentes no plano ativo, em ordem. */
export const blockNames=[...new Set(source.lots.map(l=>l.block))];
export const areas=source.otherPolygons.map((area,i)=>({...area,id:`area-${i+1}`,name:['Recreação 01','Área institucional','Recreação 02'][i],kind:i===1?'Institucional':'Recreação'}));
export const areaById=new Map(areas.map(area=>[area.id,area]));
export const statusInfo = {
  available: {label: 'Disponível', color: '#3caa78'},
  reserved: {label: 'Reservado', color: '#e59132'},
  unavailable: {label: 'Indisponível', color: '#d85c55'},
} satisfies Record<LotStatus, {label: string; color: string}>;
export const number = (value: number) => value.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
export const timeLabel = (hour:number) => {const m=Math.round(hour*60);return `${Math.floor(m/60).toString().padStart(2,'0')}:${(m%60).toString().padStart(2,'0')}`;};

/** Authored demonstration landform. Never a survey elevation or earthworks plan. */
const smoothStep=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
/** Where the Serra relief applies: full inside the development, fading to the surrounding field. Zero at the gate. */
export function serraMask(x: number, z: number) {
  const sx=1-smoothStep(110,200,Math.abs(x+8));
  const sz=z<0?1-smoothStep(125,158,-z):1-smoothStep(130,220,z);
  return sx*sz;
}
/** Illustrative small hills and level changes for the Serra route. Not a survey or earthworks design. */
function rawRelief(x: number, z: number) {
  const mask=serraMask(x,z);
  if(mask<=0)return 0;
  return mask*(2.4*Math.sin(.043*x+.021*z+1.1)+1.5*Math.sin(-.027*x+.049*z+2.3)+.7*Math.sin(.085*x-.05*z+.4)+.2*Math.sin(.19*x+.13*z));
}
const baseHeight=(x:number,z:number)=>2.3 * Math.sin(x * .012) + 3.1 * Math.sin(z * .011) + 1.15 * Math.cos((x + z) * .018) + z * .008;

/**
 * Centro do loteamento mais plano (rota Serra): dentro do traçado ampliado o relevo é aproximado de um
 * plano em CENTER_FLAT (85 %), voltando ao relevo natural numa faixa de transição até o campo.
 */
const CENTER_FLAT=.85;
let centerLevel:number|undefined;
function centerWeight(x:number,z:number){
  const d=Math.max(Math.abs(x+5)/170,z<27?(27-z)/160:(z-27)/165);
  return 1-smoothStep(.95,1.4,d);
}
function shapedHeight(x:number,z:number){
  const natural=baseHeight(x,z)+rawRelief(x,z);
  if(!serraRoute)return natural;
  if(centerLevel===undefined){let s=0,n=0;for(let gx=-150;gx<=140;gx+=10)for(let gz=-120;gz<=175;gz+=10){s+=baseHeight(gx,gz)+rawRelief(gx,gz);n++;}centerLevel=s/n;}
  const w=centerWeight(x,z)*CENTER_FLAT;
  return w>0?natural+(centerLevel-natural)*w:natural;
}

/**
 * Plataformas niveladas (rota Serra): Recreação 01 (quadra de areia e letreiro) e área institucional
 * (quiosque e piscina). Dentro da área o terreno fica plano; uma faixa de PAD_EDGE metros junto ao limite
 * concorda com o relevo vizinho, sem mexer em ruas e lotes. Ilustrativo: não é projeto de terraplenagem.
 */
export const PAD_EDGE=7;
type Pad={polygon:number[][];minX:number;maxX:number;minZ:number;maxZ:number;level:number};
let padCache:Pad[]|undefined;
function pads(){
  if(padCache)return padCache;
  padCache=serraRoute?[0,1].map(i=>{
    const polygon=source.otherPolygons[i].polygon as number[][];
    const xs=polygon.map(p=>p[0]),zs=polygon.map(p=>p[1]);
    // nível = média do terreno ao longo do contorno: concordância suave com ruas e lotes vizinhos
    let sum=0,n=0;
    for(let k=0;k<polygon.length;k++){const a=polygon[k],b=polygon[(k+1)%polygon.length],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2);
      for(let s=0;s<steps;s++){const x=a[0]+(b[0]-a[0])*s/steps,z=a[1]+(b[1]-a[1])*s/steps;sum+=shapedHeight(x,z);n++;}}
    return {polygon,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),level:sum/n};
  }):[];
  return padCache;
}
/** Distância de um ponto interno até o contorno do polígono; -1 se estiver fora. */
export function insideDistance(x:number,z:number,polygon:number[][]){
  if(!containsPoint([x,z],polygon))return -1;
  let best=Infinity;
  for(let k=0;k<polygon.length;k++){const a=polygon[k],b=polygon[(k+1)%polygon.length],dx=b[0]-a[0],dz=b[1]-a[1];
    const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));best=Math.min(best,Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t));}
  return best;
}
/** Nível da plataforma da área (0 = Recreação 01, 1 = institucional) na rota Serra. */
export function padLevel(index:number){return pads()[index]?.level??0;}
export function serraRelief(x: number, z: number) {
  let relief=shapedHeight(x,z)-baseHeight(x,z);
  for(const pad of pads()){
    if(x<pad.minX||x>pad.maxX||z<pad.minZ||z>pad.maxZ)continue;
    const d=insideDistance(x,z,pad.polygon);if(d<0)continue;
    const w=smoothStep(.4,PAD_EDGE,d);
    relief+=(pad.level-baseHeight(x,z)-relief)*w;
  }
  return relief;
}
export function terrainHeight(x: number, z: number) {
  const base=baseHeight(x,z);
  return serraRoute?base+serraRelief(x,z):base;
}
export function lotRelief(lot: Lot) {
  const heights = lot.polygon.map(([x,z]) => terrainHeight(x,z));
  return Math.max(...heights) - Math.min(...heights);
}
export function containsPoint(p: number[], polygon: number[][]) {
  let inside = false;
  for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i],b=polygon[j];
    if ((a[1]>p[1])!==(b[1]>p[1]) && p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
  }
  return inside;
}
export function canWalk(x: number,z: number) {
  return source.roads.some(road=>containsPoint([x,z],road.polygon));
}

/** NOAA fractional-year solar equations. Reference: city of Vacaria, not a
 * surveyed parcel. North direction digitized from the arrow on the PDF. */
export function solarPosition(hour: number, date: string) {
  const [year,month,day]=date.split('-').map(Number);
  const ordinal=(Date.UTC(year,month-1,day)-Date.UTC(year,0,1))/86400000+1;
  const days=(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/86400000;
  const g=2*Math.PI/days*(ordinal-1+(hour-12)/24);
  const eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
  const decl=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
  const lat=-28.5*Math.PI/180,lon=-50.93,offset=-3;
  const ha=((hour*60+eq+4*lon-60*offset)/4-180)*Math.PI/180;
  const elevation=Math.asin(Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.cos(ha));
  const azimuth=Math.atan2(Math.sin(ha),Math.cos(ha)*Math.sin(lat)-Math.tan(decl)*Math.cos(lat))+Math.PI;
  const n=source.northVector, east=[-n[1], n[0]];
  return {elevation:elevation*180/Math.PI,azimuth:azimuth*180/Math.PI,
    direction:[(n[0]*Math.cos(azimuth)+east[0]*Math.sin(azimuth))*Math.cos(elevation),Math.sin(elevation),(n[1]*Math.cos(azimuth)+east[1]*Math.sin(azimuth))*Math.cos(elevation)]};
}
