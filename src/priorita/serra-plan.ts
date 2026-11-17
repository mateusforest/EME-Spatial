import source from './plan-source.json';

/**
 * Émera · ampliação ilustrativa do traçado (rota Serra, apresentação comercial).
 * Mantém as 8 quadras e a avenida da prancha e acrescenta um anel viário (Ruas 05, 06 e 07),
 * a continuação da avenida e quatro quadras novas (I, J, K, L) com lotes de 12 × 30 m e
 * esquinas de 16 m. Não é projeto urbanístico nem foi aprovado: serve só para a apresentação.
 */
type P=[number,number];
type Edge={a:P;b:P;value:number;source:string;score:number};
export type PlanLot=typeof source.lots[number];
export type PlanRoad={name:string;polygon:number[][];label:number[];generated?:boolean};

const r1=(v:number)=>Math.round(v*1000)/1000;
const add=(a:P,b:P,k=1):P=>[a[0]+b[0]*k,a[1]+b[1]*k];
const unit=(v:P):P=>{const l=Math.hypot(v[0],v[1])||1;return [v[0]/l,v[1]/l];};
/** Mesma orientação dos polígonos da prancha (área assinada negativa em x/z): as superfícies ficam viradas para cima. */
function oriented<Q extends number[]>(poly:Q[]):Q[]{let s=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];s+=a[0]*b[1]-b[0]*a[1];}return s>0?[...poly].reverse():poly;}

/** Bordas da implantação original (retas medidas nas quadras do perímetro). */
export const eastEdge=(z:number)=>82.1+.1025*(z+27.4);
export const westEdge=(z:number)=>-84.8-.184*(z+27.4);
export const ROAD=12;           // largura da pista; a calçada de 2,5 m fica fora do polígono, como na prancha
export const LOT_DEPTH=30;
const AV_END=134.1;
export const NORTH0=AV_END,NORTH1=AV_END+ROAD,SOUTH=-29.3,NORTH_LOTS=NORTH1+LOT_DEPTH;
/** Largura (x) da avenida central, igual à Rua 01. */
export const AVENUE:[number,number]=[-6.2,8.8];

/**
 * Lotes enfileirados ao longo de uma testada reta (de `from` a `to`), aprofundando para o lado `side` (+1/-1
 * em relação à direção da testada). Esquinas com 16 m e demais com cerca de 12 m.
 */
function row(block:string,street:string,from:P,to:P,side:1|-1,start:number,corners:[boolean,boolean]=[true,true]){
  const dir=unit([to[0]-from[0],to[1]-from[1]]),len=Math.hypot(to[0]-from[0],to[1]-from[1]);
  const inward:P=[-dir[1]*side,dir[0]*side];
  const cw=16,inner=len-(corners[0]?cw:0)-(corners[1]?cw:0),n=Math.max(1,Math.round(inner/12)),w=inner/n;
  const widths=[...(corners[0]?[cw]:[]),...Array(n).fill(w),...(corners[1]?[cw]:[])];
  const out:PlanLot[]=[];let s=0;
  widths.forEach((width,i)=>{
    const a=add(from,dir,s),b=add(from,dir,s+width),c=add(b,inward,LOT_DEPTH),d=add(a,inward,LOT_DEPTH);s+=width;
    const poly=oriented([a,b,c,d].map(p=>[r1(p[0]),r1(p[1])]) as P[]);
    const center:P=[r1((a[0]+c[0])/2),r1((a[1]+c[1])/2)];
    const edge=(p:P,q:P,value:number):Edge=>({a:[r1(p[0]),r1(p[1])],b:[r1(q[0]),r1(q[1])],value:Math.round(value*100)/100,source:'study',score:0});
    const number=start+i;
    out.push({id:`${block}-${String(number).padStart(2,'0')}`,block,number,area:Math.round(width*LOT_DEPTH),polygon:poly,center,
      front:edge(a,b,width),back:edge(c,d,width),sides:[edge(b,c,LOT_DEPTH),edge(d,a,LOT_DEPTH)],street,frontAxis:[r1(-inward[0]),r1(-inward[1])]} as unknown as PlanLot);
  });
  return out;
}

function build(){
  // ------------------------------------------------------------ vias novas
  const east:PlanRoad={name:'Rua 05',generated:true,label:[eastEdge(60)+ROAD/2,60],
    polygon:[[eastEdge(SOUTH),SOUTH],[eastEdge(SOUTH)+ROAD,SOUTH],[eastEdge(NORTH1)+ROAD,NORTH1],[eastEdge(NORTH1),NORTH1]]};
  const west:PlanRoad={name:'Rua 06',generated:true,label:[westEdge(60)-ROAD/2,60],
    polygon:[[westEdge(SOUTH)-ROAD,SOUTH],[westEdge(SOUTH),SOUTH],[westEdge(NORTH1),NORTH1],[westEdge(NORTH1)-ROAD,NORTH1]]};
  const north:PlanRoad={name:'Rua 07',generated:true,label:[-60,NORTH0+ROAD/2],
    polygon:[[westEdge(NORTH0),NORTH0],[eastEdge(NORTH0),NORTH0],[eastEdge(NORTH1),NORTH1],[westEdge(NORTH1),NORTH1]]};
  const avenue:PlanRoad={name:'Av. Émera',generated:true,label:[1.3,NORTH1+20],
    polygon:[[AVENUE[0],NORTH1],[AVENUE[1],NORTH1],[AVENUE[1],NORTH_LOTS],[AVENUE[0],NORTH_LOTS]]};
  // ------------------------------------------------------------ quadras novas
  // I: leste, de frente para a Rua 05 (testada de sul para norte, lotes para leste)
  const iFrom:P=[eastEdge(SOUTH)+ROAD,SOUTH],iTo:P=[eastEdge(NORTH0)+ROAD,NORTH0];
  const I=row('I','Rua 05',iFrom,iTo,-1,1);
  // J: oeste, de frente para a Rua 06
  const jFrom:P=[westEdge(SOUTH)-ROAD,SOUTH],jTo:P=[westEdge(NORTH0)-ROAD,NORTH0];
  const J=row('J','Rua 06',jFrom,jTo,1,1);
  // K e L: norte, de frente para a Rua 07, separadas pela Av. Émera
  const K=row('K','Rua 07',[westEdge(NORTH1)-ROAD,NORTH1],[-6.2,NORTH1],1,1);
  const L=row('L','Rua 07',[8.8,NORTH1],[eastEdge(NORTH1)+ROAD,NORTH1],1,1);
  const lots=[...I,...J,...K,...L];
  const outline=(list:PlanLot[])=>list.length?[list[0].polygon[0],list[list.length-1].polygon[1],list[list.length-1].polygon[2],list[0].polygon[3]]:[];
  const blocks=[['I',I],['J',J],['K',K],['L',L]].map(([block,list])=>({block,outer:outline(list as PlanLot[]),inner:[]}));
  for(const road of [east,west,north,avenue])road.polygon=oriented(road.polygon);
  return {roads:[east,west,north,avenue],lots,blocks};
}

const extra=build();
/** Plano da rota Serra: o original mais a ampliação. */
export const serraPlan={...source,name:'Émera',source:'Ampliação ilustrativa sobre o Projeto Urbanístico · prancha 01 · julho de 2024',
  lots:[...source.lots,...extra.lots] as PlanLot[],roads:[...source.roads,...extra.roads] as PlanRoad[],blocks:[...source.blocks,...extra.blocks] as typeof source.blocks};
export const generatedRoads=extra.roads;
/** Cerca de um terço dos lotes novos aparece como vendido, com casa. */
export const serraExtraSold=new Set(extra.lots.filter((_,i)=>i%3===1).map(l=>l.id));
