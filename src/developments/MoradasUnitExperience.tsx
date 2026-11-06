import {lazy,Suspense,useState} from 'react';
import {ArrowLeft, ArrowUpRight, Box, ImageIcon, LayoutTemplate, Minus, Plus, RotateCcw} from 'lucide-react';
import {Dialog} from '../ui';
import {whatsappUrl} from '../data';
import type {DevelopmentConfig} from '../../shared/development.mjs';
import {ASSETS,galleries} from './moradas';
import {moradasUnits,statusLabels,stockDate} from './moradas-stock';
import {resolveUnitPlan} from './moradas-unit-plan';
import './moradas-unit.css';
import {moradasPlanForType} from './moradas-plans';
const MoradasFloorplanModel=lazy(()=>import('./MoradasFloorplanModel'));

export default function MoradasUnitExperience({number,config,onClose}:{number:number;config:DevelopmentConfig;onClose:()=>void}){
 const unit=moradasUnits.find(u=>u.number===number)!;
 const plan=resolveUnitPlan(config,number);
 const typePlan=moradasPlanForType(unit.type);
 const [tab,setTab]=useState<'model'|'plan'|'rooms'>('plan');
 const [room,setRoom]=useState(0);
 const [zoom,setZoom]=useState(1);
 const [failedImage,setFailedImage]=useState<string|null>(null);
 const rooms=galleries.interiors.images;
 const src=tab==='model'?undefined:tab==='rooms'?ASSETS+rooms[room].file:plan?.imageUrl||ASSETS+typePlan.imageFile;
 const imageUrl=src?.startsWith('/api/')?'https://www.emeselect.com'+src:src;
 const title=tab==='rooms'?rooms[room].caption:`Planta Tipo ${unit.type} · unidade ${number}`;
 function changeTab(value:typeof tab){setTab(value);setZoom(1);}
 return <Dialog className="moradas-dialog moradas-unit-dialog" title={`Torre A · ${unit.floor}º andar · ${number}`} onClose={onClose} wide>
  <div className="moradas-unit-layout">
   <section className="moradas-unit-stage" aria-label="Explorar a unidade">
    <div className="moradas-unit-tabs" role="group" aria-label="Visualização da unidade">
     <button aria-pressed={tab==='plan'} onClick={()=>changeTab('plan')}><LayoutTemplate size={16}/>Planta · Tipo {unit.type}</button>
     <button aria-pressed={tab==='model'} onClick={()=>changeTab('model')}><Box size={16}/>Planta 3D</button>
     <button aria-pressed={tab==='rooms'} onClick={()=>changeTab('rooms')}><ImageIcon size={16}/>Ambientes</button>
    </div>
    {tab==='model'?<Suspense fallback={<div className="moradas-unit-pending" role="status">Preparando a planta 3D…</div>}><MoradasFloorplanModel type={unit.type} onPhoto={index=>{setRoom(index);changeTab('rooms');}}/></Suspense>:<div className={`moradas-unit-canvas ${!imageUrl?'is-empty':''} ${tab==='rooms'?'is-room':''}`}>
     {imageUrl&&failedImage!==imageUrl?<div className="moradas-unit-image" style={{width:`${zoom*100}%`,height:`${zoom*100}%`}}><img key={imageUrl} src={imageUrl} alt={title} width={tab==='plan'?typePlan.width:undefined} height={tab==='plan'?typePlan.height:undefined} onError={()=>setFailedImage(imageUrl)}/></div>:<div className="moradas-unit-pending"><LayoutTemplate size={44}/><p className="moradas-unit-eyebrow">TIPO {unit.type} · {unit.bedrooms} DORMITÓRIOS</p><h3>{imageUrl?'Não foi possível abrir esta imagem.':'A planta deste espaço está chegando.'}</h3><p>{imageUrl?'Escolha outro ambiente ou consulte a equipe para receber o material.':`A planta individual da unidade ${number} será incluída após a confirmação da incorporadora.`}</p><button onClick={()=>changeTab('rooms')}>Ver ambientes <ArrowUpRight size={16}/></button></div>}
    </div>}
    {imageUrl&&<div className="moradas-unit-zoom" aria-label="Ampliar imagem"><button onClick={()=>setZoom(z=>Math.max(1,z-.25))} disabled={zoom===1} aria-label="Diminuir planta ou imagem"><Minus size={16}/></button><span>{Math.round(zoom*100)}%</span><button onClick={()=>setZoom(z=>Math.min(3,z+.25))} disabled={zoom===3} aria-label="Ampliar planta ou imagem"><Plus size={16}/></button><button onClick={()=>setZoom(1)} aria-label="Restaurar imagem"><RotateCcw size={16}/></button></div>}
    {tab==='rooms'&&<div className="moradas-unit-rooms" aria-label="Escolher ambiente">{rooms.map((r,i)=><button key={r.file} aria-pressed={room===i} onClick={()=>{setRoom(i);setZoom(1);}}><img src={ASSETS+r.file} alt=""/><span>{r.caption}</span></button>)}</div>}
    <p className="moradas-unit-caption">{tab==='model'?`Reconstrução ilustrativa da planta Tipo ${unit.type} fornecida pela equipe. Alturas, mobiliário e acabamentos são representativos; consulte a planta original para conferir a distribuição.`:tab==='plan'?(plan?.imageUrl?'Planta vinculada a esta unidade pela equipe.':`Planta Tipo ${unit.type} · material atualizado fornecido pela equipe. Mobiliário ilustrativo.`):'Perspectivas ilustrativas da incorporadora. Não representam uma visita virtual à unidade.'}</p>
   </section>
   <aside className="moradas-unit-summary"><p className="moradas-unit-eyebrow">SEU ESPAÇO NO MORADAS</p><h2>Unidade {number}</h2><span className={'moradas-unit-status stock-'+unit.status}>{statusLabels[unit.status]}</span><dl><div><dt>Torre / andar</dt><dd>A / {unit.floor}º</dd></div><div><dt>Tipologia</dt><dd>Tipo {unit.type}</dd></div><div><dt>Área privativa</dt><dd>{unit.area.toLocaleString('pt-BR')} m²</dd></div><div><dt>Dormitórios</dt><dd>{unit.bedrooms}</dd></div><div><dt>Banheiros</dt><dd>{typePlan.bathrooms}</dd></div></dl>
    {unit.price&&<div className="moradas-unit-price"><small>Valor no espelho de {stockDate}</small><strong>{unit.price.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}</strong></div>}
    {['reserved','negotiation'].includes(unit.status)&&<p className="moradas-unit-alert">Unidade reservada ou em negociação. Consulte a equipe antes de prosseguir.</p>}
    <a className="moradas-unit-contact" href={whatsappUrl(`Olá! Gostaria de informações sobre a unidade ${number}, Torre A, ${unit.floor}º andar, do Moradas da Serra. Podemos confirmar a planta e a situação atual?`)} target="_blank" rel="noopener noreferrer">{unit.status==='available'?'Quero conhecer':'Consultar a equipe'}<ArrowUpRight size={17}/></a>
    <button className="moradas-unit-back" onClick={onClose}><ArrowLeft size={16}/>Voltar aos andares</button><small>Espelho de {stockDate}. Valores e situação sujeitos a confirmação.</small>
   </aside>
  </div>
 </Dialog>;
}
