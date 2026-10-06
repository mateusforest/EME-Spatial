import type {Obstacle,WalkPoint} from './mWalking';
import {patioPoint53} from './mPatioLayout53.ts';
import {garageObstacles55} from './mGarageLayout55.ts';
import type {MDestination} from './mSiteLayout';

export const NAV_GROUPS54:{title:string;destinations:MDestination[]}[]=[
 {title:'Visão geral',destinations:['Edifício','Implantação','Rua e chegada']},
 {title:'Torre M · 22 andares',destinations:['Edifício','Fachada','Varandas','Fundos','Lateral','Detalhe dos fundos','Rooftop','Salão panorâmico','Cobertura']},
 {title:'Lazer e natureza',destinations:['Jardim e lazer','Alameda iluminada','Quiosque','Parque e lago','Quadras','Kids e família','Espaço pet','Golfe']},
 {title:'Galeria e serviços',destinations:['Galeria e lobby','Entrada do lobby','Terraços da galeria','MGym','MCoffe','Interior da garagem','Elevadores do subsolo','Vagas e recarga','Garagem']},
 {title:'Condomínio de casas',destinations:['Condomínio Pátio','Casas e lotes','Clube do condomínio','Entrada do Pátio','Casa em detalhe']},
];
export type CommonVisit54={eye:[number,number,number];look:[number,number,number];bounds:Obstacle;obstacles:Obstacle[];areas?:Obstacle[];exclusions?:WalkPoint[][]};
const r=(minX:number,maxX:number,minZ:number,maxZ:number):Obstacle=>({minX,maxX,minZ,maxZ});
const campusObstacles=[r(31.8,62.8,-20.2,22.2),r(62.1,72.4,-27.3,31.4),r(32.2,47.8,26.7,35.3),r(-11.4,-4.6,21,39),r(4.6,11.4,21,39),r(-36.3,-27.7,-10,43),r(-27,27,-17,-13),r(-3,3,-12,-7),r(28,32,-21,23),r(34,68,-49,-48),r(45,58,-47,-44)];
const lakeMask=Array.from({length:72},(_,i)=>{const a=i/72*Math.PI*2,s=1+.095*Math.sin(a*3+.7)+.055*Math.sin(a*5+1.2);return{x:65+Math.cos(a)*70*s,z:-116+Math.sin(a)*38*s};});
const ground:CommonVisit54={eye:[24,2.1,39],look:[51,2.1,0],bounds:r(-55,195,-182,47),obstacles:[...campusObstacles,r(51.8,74.2,-73.2,-73)],exclusions:[lakeMask]};
const patioExclusions=[0,2,5,8,10,13,15,18,20,23].map(i=>{const x=[-121,-97,-73,-49,-25,25,49,73,97,121,145,169][i%12],z=i<12?92:183;return[[-9.5,-8.5],[9.5,-8.5],[9.5,8.5],[-9.5,8.5]].map(([dx,dz])=>patioPoint53(x+dx,z+dz));});
patioExclusions.push([[13,129],[47,129],[47,148],[13,148]].map(([x,z])=>patioPoint53(x,z)));
const patio:CommonVisit54={eye:[0,2.1,80],look:[20,2.1,143],bounds:r(-192,285,73,325),obstacles:[],exclusions:patioExclusions};
export const COMMON_VISITS54:Partial<Record<MDestination,CommonVisit54>>={
 'Jardim e lazer':{...ground,eye:[78,2.08,32],look:[44,2.08,5]},
 'Alameda iluminada':{...ground,eye:[86,2.05,42],look:[145,2.05,38]},
 'Entrada do lobby':{...ground,eye:[0,2.35,16],look:[0,2.35,0]},
 'Galeria e lobby':{...ground,eye:[0,2.35,10],look:[-12,2.35,2]},
 'MCoffe':{...ground,eye:[17,2.35,11],look:[21,2.35,3]},
 'MGym':{eye:[20,8.2,9],look:[20,8.2,0],bounds:r(7,27,-11,12),obstacles:[r(9,14,-9,-1),r(22,26,-9,4)]},
 'Quiosque':{...ground,eye:[52,2.1,-37],look:[51,2.1,-44]},
 'Quadras':{...ground,eye:[80,2.1,20],look:[99,2.1,-2]},
 'Lobby Torre Lago':{...ground,eye:[153,2.35,16],look:[153,2.35,-3]},
 'Parque e lago':{...ground,eye:[62,2.05,-68],look:[65,2.05,-116]},
 'Interior da garagem':{eye:[-21,-1.55,-19],look:[13,-1.60,-17.8],bounds:r(-35.2,27.3,-51.3,-8.6),obstacles:garageObstacles55},
 'Elevadores do subsolo':{eye:[9,-1.55,-23],look:[10.2,-1.60,-15.4],bounds:r(-35.2,27.3,-51.3,-8.6),obstacles:garageObstacles55},
 'Vagas e recarga':{eye:[-18,-1.53,-18.9],look:[-21,-2.05,-12.5],bounds:r(-35.2,27.3,-51.3,-8.6),obstacles:garageObstacles55},
 'Clube do condomínio':{eye:[34,2.1,183],look:[16,2.1,187],bounds:r(-10,95,164,222),obstacles:[r(38,86,174,209)]},
 'Condomínio Pátio':{...patio,eye:[29,2.1,145],look:[90,2.1,164]},
 'Casas e lotes':{...patio,eye:[29,2.1,145],look:[62,2.1,155]},
 'Entrada do Pátio':patio,
 'Casa em detalhe':{...patio,eye:[55,2.1,137],look:[43,2.1,115]},
 'Kids e família':{...ground,eye:[4,2.1,-27],look:[4,2.1,-37]},
 'Espaço pet':{...ground,eye:[-20,2.1,-28],look:[-15,2.1,-36]},
 'Terraços da galeria':{eye:[18,15.1,11],look:[0,15.1,17],bounds:r(-25,25,-14,18),obstacles:[r(-14,14,-14,9)]},
 'Rooftop':{eye:[0,101.45,-.5],look:[0,101.45,-4.5],bounds:r(-10.4,10.4,-10.2,4.3),obstacles:[r(-6,6,-7,-1.5),r(-10,-7,-6,-3),r(7,10,-6,-3),...[-5,0,5].map(x=>r(x-.85,x+.85,1,3.3))]},
 'Salão panorâmico':{eye:[12,96.15,8],look:[0,96.15,0],bounds:r(-17.2,17.2,-17.2,12.4),obstacles:[r(-4,4,-9,-4)]},
 'Rooftop Torre Lago':{eye:[153,52.49,-5],look:[153,52.49,1],bounds:r(130,176,-17,11),areas:[r(146,160,-17,2),r(130,146,-14,11),r(160,176,-14,11)],obstacles:[r(132.5,145.5,.0,8),r(160.5,173.5,.0,8),r(147.6,158.4,-.8,.8)]},
};
export const facadeDestination54=(name:MDestination)=>['Fachada','Varandas','Fundos','Lateral','Detalhe dos fundos','Fachada Torre Lago','Torre Lago','Edifício'].includes(name);
/** Keep both eye and target translations coherent; height never changes orbit distance. */
export function facadeShift54(eyeY:number,targetY:number,delta:number,base:number,levels:number,step:number){const next=Math.max(base+step*.5,Math.min(base+(levels-.5)*step,targetY+delta));return {eyeY:eyeY+next-targetY,targetY:next,floor:Math.max(1,Math.min(levels,Math.round((next-base)/step+.5)))};}
