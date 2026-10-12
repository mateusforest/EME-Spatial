import {useEffect,useRef} from 'react';
import {materialLibrary,materialPixels} from './botaniqueMaterials';
import type {MaterialCategory,MaterialSelections} from './botaniqueMaterials';
import './botaniqueMaterials.css';

function Swatch({id}:{id:string}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{if(['original','matte','satin','polished'].includes(id))return;const ctx=ref.current?.getContext('2d');if(ctx){const p=materialPixels(id);ctx.putImageData(new ImageData(new Uint8ClampedArray(p.color),p.size,p.size),0,0);}},[id]);
 return <canvas aria-hidden="true" ref={ref} width={256} height={256} className={'bms-swatch bms-'+id}/>;
}
const titles:Record<MaterialCategory,string>={upholstery:'Trama dos estofados',stone:'Pedras das bancadas',wall:'Textura das paredes',wood:'Superfície da madeira'};
const scopes:Record<MaterialCategory,string>={upholstery:'Aplicada aos estofados e tecidos da cama. Cortinas e tapetes mantêm seu acabamento.',stone:'Bancadas e tampos em pedra; o piso mantém seu acabamento.',wall:'Paredes e teto pintados; painéis e revestimentos permanecem independentes.',wood:'Mantém o veio e o tom da madeira escolhida.'};
export default function BotaniqueMaterialLibrary({selections,onSelect}:{selections:MaterialSelections;onSelect:(category:MaterialCategory,id:string)=>void}){
 return <div className="bms-library"><p className="bms-intro">Combine textura e cor. As amostras mostram o desenho do material; a luz do ambiente revela o relevo e o brilho.</p>{(Object.keys(materialLibrary) as MaterialCategory[]).map(category=><details key={category} className="bms-section" open={category==='upholstery'?true:undefined}><summary>{titles[category]}<small>{materialLibrary[category].find(o=>o.id===selections[category])?.label}</small></summary><p>{scopes[category]}</p><div className="bms-grid" role="group" aria-label={titles[category]}>{materialLibrary[category].map(option=><button type="button" key={option.id} aria-pressed={selections[category]===option.id} onClick={()=>onSelect(category,option.id)}><Swatch id={option.id}/><span>{option.label}<small>{option.detail}</small></span></button>)}</div></details>)}<small className="bms-note">Materiais ilustrativos para experimentar combinações.</small></div>;
}
