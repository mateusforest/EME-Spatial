// Four drawings supplied and explicitly identified by the owner on 06/11/2026.
// The sales sheet assigns final 01/02/03/04 to types 1/2/3/4 in Tower A.
export type MoradasPlanType = 1 | 2 | 3 | 4;
export type MoradasPlanRoom = {id:string; label:string; photo?:number};
const commonRooms:MoradasPlanRoom[] = [
  {id:'living',label:'Estar e jantar',photo:0},
  {id:'kitchen',label:'Cozinha',photo:1},
  {id:'bedroom',label:'Dormitório casal',photo:2},
  {id:'single',label:'Dormitório individual',photo:4},
  {id:'bathroom',label:'Banheiro',photo:5},
  {id:'balcony',label:'Sacada'},
  {id:'laundry',label:'Área de serviço'},
];
export const moradasPlans = {
  1:{type:1,bedrooms:2,bathrooms:1,width:1574,height:915,rooms:commonRooms},
  2:{type:2,bedrooms:3,bathrooms:2,width:1505,height:915,rooms:[...commonRooms.slice(0,4),{id:'suite',label:'Suíte'},{id:'suite-bath',label:'Banheiro da suíte'},...commonRooms.slice(4)]},
  3:{type:3,bedrooms:2,bathrooms:1,width:1397,height:915,rooms:commonRooms},
  4:{type:4,bedrooms:2,bathrooms:1,width:1600,height:898,rooms:commonRooms},
} satisfies Record<MoradasPlanType,{type:number;bedrooms:number;bathrooms:number;width:number;height:number;rooms:MoradasPlanRoom[]}>;
export function moradasPlanForType(type:number){
  if(type!==1&&type!==2&&type!==3&&type!==4)throw new Error('Tipologia Moradas não reconhecida');
  return {...moradasPlans[type],imageFile:`floorplans/moradas-type-${type}.png`,modelFile:`floorplans/moradas-type-${type}.glb`};
}
