import {useEffect,useRef,useState} from 'react';
import {ArrowDown,ArrowLeft,ArrowRight,ArrowUp,Footprints,Layers,Map,RotateCcw,X} from 'lucide-react';
import {createApartmentScene} from './apartment-scene';
import type {ApartmentScene} from './apartment-scene';
import {furniture,rooms,start,walls} from './apartment-layout';
import type {ApartmentRoom} from './apartment-layout';
import './apartment.css';

export default function ApartmentTour({onClose}:{onClose:()=>void}){
 const host=useRef<HTMLDivElement>(null),engine=useRef<ApartmentScene|null>(null),close=useRef<HTMLButtonElement>(null);
 const [ready,setReady]=useState(false),[error,setError]=useState(false),[plan,setPlan]=useState(false),[moving,setMoving]=useState(false);
 const [mapOpen,setMapOpen]=useState(()=>!matchMedia('(max-width:700px)').matches),[room,setRoom]=useState<ApartmentRoom>('living');
 const [position,setPosition]=useState({...start,yaw:0});
 useEffect(()=>{try{engine.current=createApartmentScene(host.current!,{ready:()=>setReady(true),error:()=>setError(true),position:setPosition,room:setRoom,moving:setMoving});}catch(e){console.error('Apartamento Amici',e);setError(true);}close.current?.focus();return()=>{engine.current?.dispose();engine.current=null;};},[]);
 useEffect(()=>{engine.current?.pause(plan);},[plan]);
 useEffect(()=>{if(!plan)return;const previous=document.activeElement;const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setPlan(false);if(e.key==='Tab'){e.preventDefault();document.querySelector<HTMLButtonElement>('.aa-plan button')?.focus();}};window.addEventListener('keydown',key);return()=>{window.removeEventListener('keydown',key);if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};},[plan]);
 const hold=(key:string)=>(e:React.PointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);engine.current?.hold(key,true);};
 const release=(key:string)=>()=>engine.current?.hold(key,false);
 const visit=(id:ApartmentRoom)=>engine.current?.goTo(id);
 return <section className="am-apartment-tour" aria-label="Visita ao apartamento Final 03">
  <div className="aa-canvas" ref={host}/>
  <header className="aa-header"><button ref={close} onClick={onClose}><ArrowLeft size={18}/><span>Voltar ao prédio</span></button><div><b>Amici <i>/</i> Final 03</b><span>Apartamento modelo · 58,56 m²</span></div><button aria-label="Planta oficial" onClick={()=>setPlan(true)}><Layers size={17}/><span>Planta oficial</span></button></header>
  <div className="aa-location"><span><Footprints size={14}/>{rooms.find(r=>r.id===room)?.name}</span><p>Arraste para olhar. Caminhe com WASD, setas ou toque no piso.</p>{moving&&<button onClick={()=>engine.current?.stop()}>Parar caminhada <X size={14}/></button>}</div>
  {!ready&&!error&&<div className="aa-status" role="status">Preparando seu apartamento…</div>}
  {error&&<div className="aa-status" role="alert"><b>Não foi possível abrir a visita.</b><p>Volte ao prédio para tentar novamente.</p><button onClick={onClose}>Voltar ao prédio</button></div>}
  <div className={'aa-map '+(mapOpen?'is-open':'')}>
   <button className="aa-map-toggle" aria-expanded={mapOpen} onClick={()=>setMapOpen(v=>!v)}><Map size={15}/>{mapOpen?'Recolher mapa':'Mapa do apartamento'}</button>
   {mapOpen&&<><svg viewBox="-0.2 -0.2 10.4 6.55" role="img" aria-label="Mapa do apartamento e sua posição">
    <rect x="0" y="0" width="10" height="6.15" fill="#e5dfd3" stroke="#a59882" strokeWidth=".08"/>
    {furniture.map((r,i)=><rect key={'f'+i} x={r.x-r.w/2} y={r.z-r.d/2} width={r.w} height={r.d} fill="#b4a085" rx=".07"/>)}
    {walls.map((r,i)=><rect key={i} x={r.x-r.w/2} y={r.z-r.d/2} width={r.w} height={r.d} fill="#575b59"/>)}
    {rooms.map(r=><g key={r.id} role="button" tabIndex={0} aria-label={'Ir para '+r.name} onClick={()=>visit(r.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();visit(r.id);}}}><circle cx={r.x} cy={r.z} r=".24" fill="#8a6d47"/><circle cx={r.x} cy={r.z} r=".08" fill="#fff7e8"/></g>)}
    <g transform={`translate(${position.x} ${position.z}) rotate(${-position.yaw*180/Math.PI})`}><path d="M 0,-.6 L -.28,-.1 L .28,-.1 Z" fill="#386a8590"/><circle r=".15" fill="#285a78" stroke="white" strokeWidth=".06"/></g>
   </svg><small>Toque nos pontos para caminhar até o ambiente.</small></>}
  </div>
  <div className="aa-pad" aria-label="Controles de caminhada do apartamento">{(['w','a','s','d'] as const).map((key,i)=>{const Icon=[ArrowUp,ArrowLeft,ArrowDown,ArrowRight][i];return <button key={key} className={'aa-key-'+key} aria-label={['Avançar no apartamento','Mover à esquerda','Recuar no apartamento','Mover à direita'][i]} disabled={!ready||plan||error} onPointerDown={hold(key)} onPointerUp={release(key)} onPointerCancel={release(key)} onLostPointerCapture={release(key)}><Icon size={21}/></button>;})}<button className="aa-reset" aria-label="Voltar à entrada do apartamento" onClick={()=>engine.current?.reset()}><RotateCcw size={16}/></button></div>
  <nav className="aa-rooms" aria-label="Ambientes do apartamento">{rooms.map(r=><button key={r.id} disabled={!ready||error} aria-pressed={r.id===room} onClick={()=>visit(r.id)}>{r.name}</button>)}</nav>
  <p className="aa-note">Planta de divulgação ZM · mobiliário ilustrativo e dimensões aproximadas.</p>
  {plan&&<div className="aa-plan-backdrop" onClick={e=>{if(e.currentTarget===e.target)setPlan(false);}}><section className="aa-plan" role="dialog" aria-modal="true" aria-label="Planta oficial do Final 03"><header><div><b>Final 03 · 58,56 m²</b><p>Recorte da planta tipo divulgada pela ZM.</p></div><button autoFocus aria-label="Fechar planta do apartamento" onClick={()=>setPlan(false)}><X size={22}/></button></header><img src="/assets/amici/apartment-03/plan.webp" alt="Planta oficial do Final 03: sala e cozinha integradas, dois dormitórios e dois banheiros"/><p>O mobiliário da visita é uma interpretação desta referência. Não corresponde a uma unidade decorada oficial.</p></section></div>}
 </section>;
}
