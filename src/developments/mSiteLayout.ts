/** Local web model is the spatial authority. No coordinates imported from v13 Blender studies.
 * Three.js Y is height; +Z is arrival/front. These are local axes, not geographic north.
 */
export const M_SITE = {
 version:'web-60-torre-m',
 tower:[0,0], entrance:[0,13], pool:[51,2], reflectingPool:[-8,30],
 campus:{minX:-44,maxX:194,minZ:-55,maxZ:48},
 garage:{x:-32,startZ:43,endZ:-8,depth:3.2,width:8},
 clubhouse:[51,-43],football:[99,-10],beach:[99,31],
 lake:{center:[65,-116],radius:[70,38],deck:[62,-70]},
 golf:[
  {points:[[-76,20],[-87,-28],[-91,-73],[-66,-126]],width:33,green:[-66,-130],tee:[-76,20],bunkers:[[-78,-125,8,4],[-55,-139,6,3.6]]},
  {points:[[-161,12],[-161,-48],[-141,-95],[-136,-158]],width:36,green:[-136,-160],tee:[-161,12],bunkers:[[-148,-152,5.5,4],[-125,-169,6.5,3.5]]},
  {points:[[227,-13],[239,-57],[232,-92],[242,-142]],width:31,green:[243,-144],tee:[227,-11],bunkers:[[228,-147,7,3.5],[253,-133,5,4.5]]},
 ],
} as const;

export const M_SITE_VIEWS = {
 'Duas torres':[253,127,247,71,37,-8], 'Torre Lago':[211,57,86,153,27,-3],
 'Fachada Torre Lago':[186,30,49,153,26,3], 'Lobby Torre Lago':[154,5,39,153,4,1],
 'Rooftop Torre Lago':[193,73,46,153,53,-3], 'Alameda iluminada':[93,4.0,44,153,3,25],
 'Condomínio Pátio':[350,235,490,28,0,196], 'Casas e lotes':[83,18,160,-37,3,124], 'Clube do condomínio':[97,27,258,40,1,187],
 'Entrada do Pátio':[24,9,62,4,2,86], 'Casa em detalhe':[60,11,144,40,3,115],
 'Interior da garagem':[-22,-1.55,-19,13,-1.65,-17.8],
 'Elevadores do subsolo':[9,-1.55,-23,10.2,-1.60,-15.4],
 'Vagas e recarga':[-18,-1.53,-18.9,-21,-2.05,-12.5],
 'Edifício':[135,95,215,10,48,0], 'Fachada':[29,37,41,0,34,5], 'Varandas':[22,29,27,0,25.5,7],
 'Fundos':[-74,58,-138,0,44,-4], 'Lateral':[-150,51,32,0,43,-1], 'Detalhe dos fundos':[29,40,-36,0,37,-7], 'Rooftop':[34,118,42,0,102,-2], 'Salão panorâmico':[34,101,37,0,96,0],
 'Implantação':[180,180,210,25,15,-25], 'Galeria e lobby':[35,23,65,0,9,2], 'Entrada do lobby':[0,3.2,40,0,3.5,9], 'Terraços da galeria':[43,27,48,0,13,0], 'MGym':[32,10,27,20,6.5,9], 'MCoffe':[31,5,28,20,2.2,9],
 'Jardim e lazer':[81,30,69,51,1,-5], 'Quiosque':[74,9,-19,51,2,-42], 'Parque e lago':[128,43,-24,65,1,-96],
 'Kids e família':[-12,27,-66,5,1,-31], 'Espaço pet':[-49,17,-60,-24,1,-35], 'Garagem':[-45,8,53,-32,-1,9], 'Quadras':[141,35,62,99,1,4],
 'Rua e chegada':[90,32,119,18,1,43], 'Golfe':[-129,37,53,-98,1,-73], 'Cobertura':[42,105,56,0,93,3],
} as const;
export type MDestination=keyof typeof M_SITE_VIEWS;

/** Heading describes the camera's direction, not a promise of unobstructed views. */
export function mViewDirection(x:number,z:number){
 const angle=Math.atan2(x,z),sector=(Math.round(angle/(Math.PI/4))+8)%8;
 return ['Frente · chegada','Frente / lado do lazer','Lado do lazer','Fundos / lado do lago','Fundos · parque','Fundos / lado do golfe','Lado do golfe','Frente / lado do golfe'][sector];
}

















