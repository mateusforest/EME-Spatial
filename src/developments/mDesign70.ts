import * as T from 'three';
import type {Own, mSurfaces} from './mSurfaces';
export const DESIGN_KEY='eme-spatial:m14:approved:v70';
export const finishes70={
 wood:[['Carvalho','#c5a078'],['Nogueira','#755239'],['Madeira clara','#ddd0b5']],
 fabric:[['Linho natural','#e4dccb'],['Verde floresta','#315247'],['Areia','#c1af91']],
 accent:[['Caramelo','#b78a60'],['Oliva','#687450'],['Marfim','#e8dfcf']],
 stone:[['Pedra clara','#d4c8b3'],['Pedra verde','#345a48'],['Pedra cinza','#909694']],
} as const;
export type Design70={wood:number;fabric:number;accent:number;stone:number;table:'round'|'oval'};
export const initial70:Design70={wood:0,fabric:0,accent:0,stone:0,table:'round'};
export function validate70(value:unknown):Design70|null{
 if(!value||typeof value!=='object')return null;
 const v=value as Record<string,unknown>;
 for(const key of Object.keys(finishes70) as (keyof typeof finishes70)[])if(!Number.isInteger(v[key])||Number(v[key])<0||Number(v[key])>=finishes70[key].length)return null;
 if(v.table!=='round'&&v.table!=='oval')return null;
 return {wood:Number(v.wood),fabric:Number(v.fabric),accent:Number(v.accent),stone:Number(v.stone),table:v.table};
}
export function read70(storage:Pick<Storage,'getItem'>):Design70{
 try{const record=JSON.parse(storage.getItem(DESIGN_KEY)||'null');return record?.version===70&&record?.unit==='m-14'?validate70(record.design)||{...initial70}:{...initial70};}catch{return {...initial70};}
}
export function save70(storage:Pick<Storage,'setItem'>,design:Design70){
 const valid=validate70(design);if(!valid)throw new Error('Configuração inválida');
 storage.setItem(DESIGN_KEY,JSON.stringify({version:70,unit:'m-14',approvedAt:new Date().toISOString(),design:valid}));
 return valid;
}
/** Materials are private to floor 14; textures remain shared and no other unit is changed. */
export function installDesign70(source:T.Group,own:Own,surfaces:ReturnType<typeof mSurfaces>,request:()=>void=()=>{}){
 const loader=typeof document==='undefined'?null:new T.TextureLoader();
 const stoneMap=(kind:string,color=false)=>{if(!loader)return null;const t=own(loader.load('/assets/m/materials/refinement49/limestone-'+kind+'.png',request));t.wrapS=t.wrapT=T.RepeatWrapping;if(color)t.colorSpace=T.SRGBColorSpace;return t;};
 const stoneColor=stoneMap('color',true),stoneNormal=stoneMap('normal'),stoneRough=stoneMap('rough');
 const repeated=new Map<string,T.Texture>();
 const detail=(texture:T.Texture|null,scale:number)=>{if(!texture)return null;const key=texture.uuid+':'+scale;let copy=repeated.get(key);if(!copy){copy=own(texture.clone());copy.repeat.setScalar(scale);copy.anisotropy=4;copy.needsUpdate=true;repeated.set(key,copy);}return copy;};
 const furniture=source.getObjectByName('M apartment furnishing web44');
 const channels=new Map<string,T.MeshStandardMaterial[]>();
 furniture?.traverse(o=>{
  if(!(o instanceof T.Mesh)||Array.isArray(o.material)||!(o.material instanceof T.MeshStandardMaterial))return;
  const channel=o.userData.finish70 as string|undefined;if(!channel)return;
  const m=own(new T.MeshPhysicalMaterial());T.MeshStandardMaterial.prototype.copy.call(m,o.material);o.material=m;m.name='M14 '+channel;
  if(channel==='wood'){surfaces.finishWood(m);m.map=detail(m.map,.55);m.normalMap=detail(m.normalMap,.55);m.roughnessMap=detail(m.roughnessMap,.55);m.normalScale.set(.10,.10);m.roughness=.58;m.clearcoat=.16;m.clearcoatRoughness=.42;}
  if(channel==='stone'){surfaces.finishStone(m);if(stoneColor){m.map=stoneColor;m.normalMap=stoneNormal;m.roughnessMap=stoneRough;m.normalScale.set(.12,.12);m.roughness=.55;}}
  if(channel==='fabric'||channel==='accent'||channel==='rug'||channel==='green'){surfaces.finishLinen(m);const scale=channel==='rug'?5:3;m.normalMap=detail(m.normalMap,scale);m.roughnessMap=detail(m.roughnessMap,scale);m.normalScale.set(channel==='rug'?.45:.3,channel==='rug'?.45:.3);m.roughness=.93;m.sheen=.5;m.sheenColor.set('#d8cebc');m.sheenRoughness=.85;}
  if(channel==='metal'){m.metalness=.82;m.roughness=.34;}
  if(channel==='wall'){m.color.set('#e4dfd2');m.roughness=.96;m.normalMap=stoneNormal;m.normalScale.set(.035,.035);}
  m.envMapIntensity=.85;
  channels.set(channel,[...(channels.get(channel)||[]),m]);
 });
 const apply=(design:Design70,root:T.Object3D=source)=>{
  const d=validate70(design);if(!d)return;
  for(const key of Object.keys(finishes70) as (keyof typeof finishes70)[])for(const m of channels.get(key)||[])m.color.set(finishes70[key][d[key]][1]);
  root.traverse(o=>{if(o.userData.table70){o.scale.set(1,1,d.table==='oval'?.68:1);}});
 };
 return {apply};
}
