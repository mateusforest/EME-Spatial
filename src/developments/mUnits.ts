/** One architectural schedule drives the facade, selectable floors and residence models.
 * Areas describe this fictional study, including walls. They are not surveyed sale areas.
 */
import {M_STRUCTURE} from './mStructureSchedule';
export const M_LEVELS=M_STRUCTURE.tower.levels, M_BASE=M_STRUCTURE.tower.base, M_STEP=M_STRUCTURE.tower.step;
export type MUnitKind='compact'|'standard'|'sky'|'duplex'|'penthouse';
export interface MUnit {
 id:string; name:string; kind:MUnitKind; startFloor:number; endFloor:number;
 width:number; depth:number; terraceWidth:number; terraceDepth:number;
 interiorArea:number; terraceArea:number; area:number; suites:number;
 projection:'left'|'right'|null; description:string;
}
const spec:Record<MUnitKind,{name:string;width:number;depth:number;terraceWidth:number;terraceDepth:number;suites:number;description:string}>={
 compact:{name:'M Jardim',width:16,depth:13,terraceWidth:18,terraceDepth:5.1,suites:2,description:'Duas suítes, living integrado, cozinha com ilha, lavanderia e varanda frontal.'},
 standard:{name:'M Horizonte',width:18,depth:14,terraceWidth:20,terraceDepth:5.1,suites:3,description:'Três suítes, hall privativo, lavabo, cozinha com ilha, escritório e varanda frontal.'},
 sky:{name:'M Panorama',width:20,depth:14,terraceWidth:22,terraceDepth:5.1,suites:4,description:'Quatro suítes, estar amplo, jantar, escritório, apoio de serviço e varanda frontal.'},
 duplex:{name:'M Duplex',width:20,depth:14,terraceWidth:22,terraceDepth:5.1,suites:4,description:'Dois pavimentos, living com pé-direito duplo, suítes no nível superior e terraço projetado.'},
 penthouse:{name:'M Cobertura',width:20,depth:14,terraceWidth:22,terraceDepth:5.1,suites:4,description:'Cobertura em dois níveis, terraço privativo, piscina de borda infinita e living com pé-direito duplo.'},
};
export function makeMUnit(startFloor:number,kind:MUnitKind,endFloor=startFloor,projection:MUnit['projection']=null):MUnit {
 const s=spec[kind],levels=endFloor-startFloor+1;
 // Upper openings: 48 m² living void and 7.36 m² stair opening. Projection adds 28 m².
 const interiorArea=Math.round((s.width*s.depth*levels-(levels>1?55.36:0))*10)/10;
 const terraceArea=Math.round((s.terraceWidth*s.terraceDepth+(projection?28:0))*10)/10;
 return {...s,id:`m-${startFloor}`,kind,startFloor,endFloor,interiorArea,terraceArea,area:Math.round((interiorArea+terraceArea)*10)/10,projection};
}
export const mUnits:MUnit[]=[
 ...[1,2,3,4].map(n=>makeMUnit(n,'compact')),
 makeMUnit(5,'duplex',6,'left'),
 ...[7,8,9,10].map(n=>makeMUnit(n,'standard')),
 makeMUnit(11,'duplex',12,'right'),
 ...[13,14,15,16].map(n=>makeMUnit(n,'sky')),
 makeMUnit(17,'duplex',18,'left'),
 ...[19,20].map(n=>makeMUnit(n,'sky')),
 makeMUnit(21,'penthouse',22,'right'),
];
export const unitForFloor=(floor:number)=>mUnits.find(u=>floor>=u.startFloor&&floor<=u.endFloor)??mUnits.find(u=>u.startFloor===8)!;
export const unitFloorLabel=(unit:MUnit)=>unit.startFloor===unit.endFloor?`${unit.startFloor}º andar`:`${unit.startFloor}º e ${unit.endFloor}º andares`;
export const areaLabel=(area:number)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(area)+' m²';
