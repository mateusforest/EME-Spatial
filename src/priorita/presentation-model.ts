import type {Lot,LotStatus} from './model';

export type StockFilter='all'|LotStatus;
export function filterLots(items:Lot[],stock:Record<string,LotStatus>,filter:StockFilter,block:string,query:string,favorites:string[],onlyFavorites:boolean){
 const q=query.trim().toLowerCase();
 return items.filter(l=>(block==='Todas'||l.block===block)&&(filter==='all'||stock[l.id]===filter)&&(!onlyFavorites||favorites.includes(l.id))&&(!q||l.id.toLowerCase().includes(q)||String(l.number)===q));
}
export function projection(base:number,rate:number,years:number){
 if(!Number.isFinite(base)||base<0||!Number.isFinite(rate)||rate< -100||!Number.isFinite(years)||years<0)return null;
 return base*Math.pow(1+rate/100,years);
}

export type PresentationAsset={id:string;title:string;kind:'image'|'video'|'document';url:string;description:string;local?:boolean};
export const presentationAssets:PresentationAsset[]=[
 {id:'aerial',title:'O loteamento, por inteiro',kind:'image',url:'/assets/priorita/presentation/aerea.png',description:'Imagem de demonstração do cenário 3D. Relevo e paisagismo ilustrativos.'},
 {id:'street',title:'Uma perspectiva das ruas',kind:'image',url:'/assets/priorita/presentation/passeio.png',description:'Imagem de demonstração. Materiais e vegetação sujeitos ao projeto definitivo.'},
 {id:'plan',title:'Implantação de consulta',kind:'image',url:'/assets/priorita/presentation/implantacao.svg',description:'Leitura esquemática dos 96 lotes a partir do urbanístico. Não substitui a prancha técnica.'},
 {id:'plan-file',title:'Planta esquemática • SVG',kind:'document',url:'/assets/priorita/presentation/implantacao.svg',description:'Lotes, quadras, ruas e áreas comuns para consulta durante a apresentação.'},
];
