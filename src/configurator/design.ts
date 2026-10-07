export const layouts=['island','peninsula','lshape'] as const;
export type Layout=typeof layouts[number];
export type Surface='cabinet'|'counter'|'floor'|'fabric';
export type Design={layout:Layout;cabinet:number;counter:number;floor:number;fabric:number;day:number;lights:boolean};
export const initialDesign:Design={layout:'island',cabinet:0,counter:0,floor:0,fabric:0,day:15,lights:true};
export const layoutNames:Record<Layout,string>={island:'Ilha central',peninsula:'Península',lshape:'Cozinha em L'};
export const surfaceNames:Record<Surface,string>={cabinet:'Armários',counter:'Bancadas',floor:'Piso',fabric:'Estofados'};
export const finishes:Record<Surface,{name:string;color:string}[]>={
 cabinet:[{name:'Carvalho natural',color:'#bb9365'},{name:'Nogueira',color:'#63432d'},{name:'Verde sálvia',color:'#849079'},{name:'Areia fosca',color:'#d3c6ac'}],
 counter:[{name:'Pedra clara',color:'#d4cbbb'},{name:'Verde floresta',color:'#254b3b'},{name:'Grafite',color:'#454744'}],
 floor:[{name:'Travertino claro',color:'#d7cdbb'},{name:'Pedra cinza',color:'#999c99'},{name:'Areia quente',color:'#c4ae8c'}],
 fabric:[{name:'Linho natural',color:'#ded6c4'},{name:'Oliva',color:'#66704b'},{name:'Caramelo',color:'#a7774e'}]
};
export function validDesign(value:unknown):Design{
 const v=value&&typeof value==='object'?value as Record<string,unknown>:{};const d={...initialDesign};
 if(layouts.includes(v.layout as Layout))d.layout=v.layout as Layout;
 for(const k of ['cabinet','counter','floor','fabric'] as Surface[])if(Number.isInteger(v[k])&&Number(v[k])>=0&&Number(v[k])<finishes[k].length)d[k]=Number(v[k]);
 if(typeof v.day==='number'&&Number.isFinite(v.day))d.day=Math.min(100,Math.max(0,v.day));if(typeof v.lights==='boolean')d.lights=v.lights;return d;
}
export function readDesign(){try{const raw=new URLSearchParams(location.search).get('design');return raw?validDesign(JSON.parse(raw)):initialDesign}catch{return initialDesign}}
