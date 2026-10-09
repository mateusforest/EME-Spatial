export type CatalogGroupId='sofa'|'chairs'|'table'|'pendant'|'cabinetry'|'appliance';
export type CatalogVariantId='contemporaneo'|'organico'|'modular'|'concha';
export type CatalogSupplier={name:string;initials:string;note:string};
export type CatalogVariant={id:CatalogVariantId;name:string;finish:string;description:string;details:readonly string[]};
export type CatalogGroup={id:CatalogGroupId;label:string;title:string;eyebrow:string;supplier:CatalogSupplier;variants:readonly CatalogVariant[]};

const supplier=(name:string,initials:string):CatalogSupplier=>({name,initials,note:'Fornecedor fictício · demonstração'});
const forma=supplier('Casa Forma Demo','CF');
const luz=supplier('Atelier Luz Demo','AL');
const planejada=supplier('Linha Planejada Demo','LP');
const tecnica=supplier('Casa Técnica Demo','CT');

/** Describes the exported variants. Names are fictional; finishes describe appearance only. */
export const botaniqueCatalog:readonly CatalogGroup[]=[
 {id:'sofa',label:'Sofás',title:'Um novo jeito de estar.',eyebrow:'Conforto e composição',supplier:forma,variants:[
  {id:'contemporaneo',name:'Horizonte',finish:'Contemporâneo · linho',description:'Linhas acolhedoras para uma composição leve no living.',details:['Assentos definidos','Aparência de linho']},
  {id:'organico',name:'Serena',finish:'Orgânico · curvo',description:'Um desenho curvo para experimentar outra presença no ambiente.',details:['Volumes arredondados','Composição orgânica']},
  {id:'modular',name:'Módulo',finish:'Modular · costura marcada',description:'Volumes modulares com a costura como detalhe de composição.',details:['Desenho modular','Costuras aparentes']},
 ]},
 {id:'chairs',label:'Cadeiras',title:'Detalhes ao redor da mesa.',eyebrow:'Encontros e texturas',supplier:forma,variants:[
  {id:'contemporaneo',name:'Traço',finish:'Madeira e linho',description:'Madeira e estofado em uma proposta de jantar contemporânea.',details:['Estrutura de madeira','Estofado com aparência de linho']},
  {id:'organico',name:'Arco',finish:'Envolvente · latão',description:'Um encosto envolvente com detalhes de aparência metálica.',details:['Encosto envolvente','Detalhes em tom de latão']},
  {id:'concha',name:'Concha',finish:'Concha · base contínua',description:'Casco de aparência laminada em carvalho, estofado de linho e base metálica contínua.',details:['Casco em concha','Base tubular contínua']},
 ]},
 {id:'table',label:'Mesas',title:'O centro dos encontros.',eyebrow:'Forma e material',supplier:forma,variants:[
  {id:'contemporaneo',name:'Eixo',finish:'Carvalho · bordas suaves',description:'A aparência natural da madeira em um desenho de bordas suaves.',details:['Aparência de carvalho','Bordas suavizadas']},
  {id:'organico',name:'Contorno',finish:'Pedra clara · pedestal duplo',description:'Tampo de pedra clara com contorno arredondado sobre dois pedestais canelados de carvalho.',details:['Aparência de pedra clara','Dois pedestais canelados']},
 ]},
 {id:'pendant',label:'Pendentes',title:'Luz com personalidade.',eyebrow:'Iluminação decorativa',supplier:luz,variants:[
  {id:'contemporaneo',name:'Orbe',finish:'Duplo · vidro opalino',description:'Dois volumes de luz para compor a área de jantar.',details:['Composição dupla','Aparência de vidro opalino']},
  {id:'organico',name:'Pétala',finish:'Pétalas · cerâmica',description:'Duas cúpulas finas de aparência cerâmica, inspiradas em pétalas, com difusores opalinos.',details:['Composição em duas cúpulas','Difusores opalinos']},
 ]},
 {id:'cabinetry',label:'Marcenaria',title:'Uma base para o seu estilo.',eyebrow:'Composição integrada',supplier:planejada,variants:[
  {id:'contemporaneo',name:'Essencial',finish:'Sálvia e carvalho',description:'Tons suaves e madeira como ponto de partida para o ambiente.',details:['Composição em sálvia','Aparência de carvalho']},
  {id:'organico',name:'Ritmo',finish:'Carvalho canelado',description:'A textura canelada acrescenta ritmo às superfícies de madeira.',details:['Frentes com desenho canelado','Aparência de carvalho']},
 ]},
 {id:'appliance',label:'Eletros',title:'Outra presença na cozinha.',eyebrow:'Equipamentos e acabamentos',supplier:tecnica,variants:[
  {id:'contemporaneo',name:'Técnica Inox',finish:'Inox · comandos mecânicos',description:'Aparência de inox e comandos marcados na composição da cozinha.',details:['Aparência de inox','Comandos mecânicos representados']},
  {id:'organico',name:'Técnica Grafite',finish:'Grafite · vidro e toque',description:'Superfícies escuras e vidro em uma proposta visual integrada.',details:['Aparência de grafite e vidro','Comandos de toque representados']},
 ]},
];

export function getCatalogGroup(id:string):CatalogGroup{
 return botaniqueCatalog.find(group=>group.id===id)??botaniqueCatalog[0];
}

export function getCatalogVariant(group:string,id:string):CatalogVariant|undefined{
 return getCatalogGroup(group).variants.find(variant=>variant.id===id);
}
