import {useEffect,useRef,useState} from 'react';
import {Armchair,ArrowLeft,ArrowRight,Check,Footprints,House,Layers,Maximize2,Minimize2,RotateCcw,Smartphone,Sun,SwatchBook,X} from 'lucide-react';
import {createCasaEngine} from './CasaMEngine';
import {furnitureLabels,furnitureOptions} from './CasaMFurniture';
import CasaMPreview from './CasaMPreview';
import type {CasaApi,CasaManifest,FurnitureGroup} from './CasaMTypes';
import {CASA_LIGHT_DEFAULTS as lightDefaults} from './CasaMLightState';
import './casa-m.css';

const formatHour=(v:number)=>`${Math.floor(v).toString().padStart(2,'0')}:${Math.round((v%1)*60).toString().padStart(2,'0')}`;
// Indoor and outdoor circuits remain independent throughout the visit.
export default function CasaM(){
 const mount=useRef<HTMLDivElement>(null),shell=useRef<HTMLElement>(null),api=useRef<CasaApi|null>(null),stick=useRef<HTMLButtonElement>(null);
 const [manifest,setManifest]=useState<CasaManifest|null>(null),[ready,setReady]=useState(false),[progress,setProgress]=useState('Preparando a Casa M…'),[error,setError]=useState('');
 const [view,setView]=useState('Fachada'),[viewId,setViewId]=useState('facade'),[walking,setWalking]=useState(false),[panel,setPanel]=useState<'rooms'|'light'|'furniture'|'plan'|null>(null),[group,setGroup]=useState<FurnitureGroup>('sofa');
 const [hour,setHour]=useState(lightDefaults.hour),[lights,setLights]=useState(lightDefaults.interior),[outdoor,setOutdoor]=useState(lightDefaults.exterior),[facade,setFacade]=useState(lightDefaults.facade),[full,setFull]=useState(false),[hint,setHint]=useState(''),[quality,setQuality]=useState('auto'),[stickPos,setStickPos]=useState({x:0,y:0});
 const [choices,setChoices]=useState<Record<FurnitureGroup,string>>({sofa:'original',dining:'original',chairs:'original'}),[finishes,setFinishes]=useState({velvet:'olive',marble:'green',walnut:'walnut'});
 const pointer=useRef<number|null>(null);
 useEffect(()=>{const controller=new AbortController();fetch('/assets/casa-m/manifest.json',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(setManifest).catch(e=>{if(e.name!=='AbortError')setError('Não foi possível abrir esta apresentação. Tente atualizar a página.');});return()=>controller.abort();},[]);
 useEffect(()=>{
  if(!manifest||!mount.current)return;
  try{api.current=createCasaEngine(mount.current,manifest,{progress:setProgress,ready:()=>setReady(true),error:setError,view:v=>{setView(typeof v==='string'?v:v.label);setViewId(typeof v==='string'?'plan':v.id);setWalking(typeof v!=='string'&&v.walk);},pick:g=>{setGroup(g);setPanel('furniture');},hint:setHint});}
  catch{setError('O dispositivo não conseguiu iniciar o 3D. Tente abrir a visita em outro navegador.');}
  return()=>{api.current?.dispose();api.current=null;};
 },[manifest]);
 useEffect(()=>{if(!hint)return;const timer=setTimeout(()=>setHint(''),4500);return()=>clearTimeout(timer);},[hint]);
 useEffect(()=>{if(panel){api.current?.move(0,0);pointer.current=null;setStickPos({x:0,y:0});}},[panel]);
 useEffect(()=>{const changed=()=>setFull(Boolean(document.fullscreenElement));document.addEventListener('fullscreenchange',changed);return()=>document.removeEventListener('fullscreenchange',changed);},[]);
 async function fullscreen(){
  if(document.fullscreenElement){await document.exitFullscreen().catch(()=>{});return;}
  if(full){setFull(false);return;}
  setFull(true);try{await shell.current?.requestFullscreen?.();}catch{/* Fixed viewport remains usable on iOS. */}
 }
 const choose=(id:string)=>{api.current?.view(id);setPanel(null);};
 function moveStick(e:React.PointerEvent<HTMLButtonElement>){if(pointer.current!==e.pointerId||!stick.current)return;const r=stick.current.getBoundingClientRect(),x=(e.clientX-r.x-r.width/2)/34,y=(e.clientY-r.y-r.height/2)/34,d=Math.max(1,Math.hypot(x,y));setStickPos({x:x/d,y:y/d});api.current?.move(x/d,y/d);}
 function stopStick(){pointer.current=null;setStickPos({x:0,y:0});api.current?.move(0,0);}
 const changeFinish=(family:keyof typeof finishes,id:string)=>{api.current?.finish(family,id);setFinishes(v=>({...v,[family]:id}));};
 function resetLight(){setHour(lightDefaults.hour);setLights(lightDefaults.interior);setOutdoor(lightDefaults.exterior);setFacade(lightDefaults.facade);api.current?.sun(lightDefaults.hour);api.current?.lights(lightDefaults.interior);api.current?.outdoorLights(lightDefaults.exterior);api.current?.facadeLights(lightDefaults.facade);}
 return <main className={'cm-experience '+(full?'cm-full':'')} ref={shell}>
  <div className="cm-canvas" ref={mount}/>
  <header className="cm-header"><div className="cm-title"><span>CASA M <i/> VEREDAS</span><strong>{view}</strong></div><div className="cm-header-actions"><button title="Voltar à vista inicial do ambiente" aria-label="Reiniciar vista" onClick={()=>api.current?.reset()} disabled={!ready}><RotateCcw size={18}/></button><button aria-label={full?'Sair da tela cheia':'Ampliar experiência'} onClick={fullscreen}>{full?<Minimize2 size={19}/>:<Maximize2 size={19}/>}</button></div></header>
  {ready&&<nav className="cm-quick" aria-label="Vistas principais">{[['facade','Fachada'],['living','Estar'],['kitchen','Cozinha'],['pool','Piscina'],['master','Suíte master'],['front-balcony','Varanda'],['rooftop','Rooftop']].map(([id,label])=><button key={id} aria-pressed={viewId===id} onClick={()=>choose(id)}>{label}</button>)}</nav>}
  {!ready&&!error&&<div className="cm-loading" role="status"><img src="/assets/simbolo.webp" alt="EME Spatial"/><p>Uma casa para explorar.</p><span>{progress}</span><small>A primeira abertura prepara o modelo e seus materiais.</small></div>}
  {error&&<div className="cm-loading" role="alert"><p>Vamos tentar novamente.</p><span>{error}</span><button onClick={()=>location.reload()}>Reabrir visita</button></div>}
  {ready&&<>
   <div className="cm-rotate"><Smartphone size={16}/>Gire o celular para ampliar a vista.</div>
   {!panel&&walking&&<div className="cm-movement"><button ref={stick} aria-label="Arraste para caminhar" onPointerDown={e=>{pointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);moveStick(e);}} onPointerMove={moveStick} onPointerUp={stopStick} onPointerCancel={stopStick} onLostPointerCapture={stopStick}><span style={{transform:`translate(${stickPos.x*25}px,${stickPos.y*25}px)`}}><Footprints size={22}/></span></button><small>Caminhar</small></div>}
   {!panel&&<p className="cm-instructions">{walking?<><span className="cm-desktop-hint">W A S D ou setas para caminhar · </span>Arraste para olhar · Toque no piso para andar</>:<>Arraste para girar · Escolha um ambiente para entrar</>}</p>}
   <nav className="cm-dock" aria-label="Ferramentas da visita">{([{id:'rooms',label:'Ambientes',icon:House},{id:'light',label:'Luz',icon:Sun},{id:'furniture',label:'Personalizar',icon:Armchair},{id:'plan',label:'Plantas',icon:Layers}] as const).map(({id,label,icon:Icon})=><button key={id} aria-pressed={panel===id} onClick={()=>setPanel(panel===id?null:id)}><Icon size={19}/><span>{label}</span></button>)}</nav>
   {panel&&<aside className="cm-panel" aria-label={panel==='rooms'?'Escolher ambiente':panel==='light'?'Luz e qualidade':panel==='plan'?'Plantas da casa':'Personalizar a casa'}>
    <header><div><span>EXPLORE A CASA M</span><h1>{panel==='rooms'?'Para onde vamos?':panel==='light'?'Luz e atmosfera':panel==='plan'?'Veja a casa por inteiro':'Sua composição'}</h1></div><button aria-label="Fechar painel" onClick={()=>setPanel(null)}><X size={19}/></button></header>
    {panel==='rooms'&&<div className="cm-room-list">{['Exterior','Térreo','Lazer','Superior'].map(level=><section key={level}><h2>{level}</h2>{manifest?.views.filter(v=>v.level===level).map(v=><button key={v.id} aria-pressed={viewId===v.id} onClick={()=>choose(v.id)}><span>{v.label}</span><ArrowRight size={16}/></button>)}</section>)}</div>}
    {panel==='light'&&<div className="cm-controls">
     <label><span><Sun size={17}/>Horário do sol <output>{formatHour(hour)}</output></span><input aria-label="Horário do sol" type="range" min="6" max="21" step=".25" value={hour} onChange={e=>{setHour(+e.target.value);api.current?.sun(+e.target.value);}}/></label>
     <div className="cm-presets">{[[9,'Manhã'],[14,'Dia'],[18,'Entardecer'],[21,'Noite']].map(([v,label])=><button key={v} onClick={()=>{setHour(+v);api.current?.sun(+v);}}>{label}</button>)}</div>
     <p className="cm-note">Vacaria · 16/10/2026 · horário de Brasília. Fachada aproximadamente para oeste, conforme a imagem do lote.</p>
     <div className="cm-light-divider">Luminárias e LEDs</div>
     <label><span>Ambientes internos<output>{Math.round(lights*100)}%</output></span><input type="range" aria-label="Intensidade da iluminação" min="0" max="1" step=".05" value={lights} onChange={e=>{setLights(+e.target.value);api.current?.lights(+e.target.value);}}/></label>
     <label><span>Fachada<output>{Math.round(facade*100)}%</output></span><input type="range" aria-label="Intensidade da fachada" min="0" max="1" step=".05" value={facade} onChange={e=>{setFacade(+e.target.value);api.current?.facadeLights(+e.target.value);}}/></label>
     <label><span>Varandas, garagem e jardim<output>{Math.round(outdoor*100)}%</output></span><input type="range" aria-label="Intensidade da iluminação externa" min="0" max="1" step=".05" value={outdoor} onChange={e=>{setOutdoor(+e.target.value);api.current?.outdoorLights(+e.target.value);}}/></label>
     <button className="cm-text-button" onClick={resetLight}><RotateCcw size={15}/>Restaurar iluminação</button>
     <label>Qualidade da visita<select aria-label="Qualidade da visita" value={quality} onChange={e=>{setQuality(e.target.value);api.current?.quality(e.target.value);}}><option value="auto">Automática</option><option value="high">Alta</option><option value="light">Leve</option></select></label><p className="cm-note">{manifest?.note}</p><details className="cm-note"><summary>Créditos dos modelos</summary>{manifest?.credits.map(credit=><p key={credit}>{credit}</p>)}<a href="/assets/casa-m/vehicles/LICENSE-BMW.txt" target="_blank" rel="noreferrer">Licença CC BY 4.0 dos veículos</a><p>O BMW M4 branco é uma alternativa para esta apresentação.</p></details>
    </div>}
    {panel==='plan'&&<div className="cm-plans"><p>Veja a distribuição dos ambientes em um corte 3D do modelo.</p>{[[0,'Térreo','Estar, suíte, serviços e lazer'],[1,'Pavimento superior','Três suítes, varandas e rooftop']].map(([floor,title,desc])=><button key={floor} onClick={()=>{api.current?.plan(+floor);setPanel(null);}}><Layers size={25}/><span><strong>{title}</strong><small>{desc}</small></span><ArrowRight size={18}/></button>)}<small>Dimensões do estudo V15. Não representa projeto executivo.</small><button className="cm-text-button" onClick={()=>choose('facade')}><ArrowLeft size={15}/>Voltar à fachada</button></div>}
    {panel==='furniture'&&<div className="cm-customize"><p>Troque o mobiliário do estar e jantar ou experimente acabamentos na casa.</p><label className="cm-select-label">Mobiliário<select aria-label="Móvel para personalizar" value={group} onChange={e=>setGroup(e.target.value as FurnitureGroup)}>{Object.entries(furnitureLabels).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>{choices[group]!=='original'&&<CasaMPreview group={group} id={choices[group]}/>}
     <div className="cm-options">{furnitureOptions[group].map(option=><button key={option.id} aria-pressed={choices[group]===option.id} onClick={()=>{api.current?.furniture(group,option.id);setChoices(s=>({...s,[group]:option.id}));}}><span><strong>{option.name}</strong><small>{option.detail}</small></span>{choices[group]===option.id?<Check size={17}/>:<Armchair size={17}/>}</button>)}</div><button className="cm-text-button" onClick={()=>choose(group==='sofa'?'living':'dining')}>Ver no ambiente<ArrowRight size={15}/></button>
     <h2><SwatchBook size={18}/>Materiais</h2><div className="cm-swatches"><label>Tecido dos sofás</label>{[['olive','Oliva','#65714d'],['sand','Areia','#d8cbb8'],['clay','Argila','#b87b56']].map(([id,name,color])=><button key={id} aria-label={'Tecido '+name} aria-pressed={finishes.velvet===id} onClick={()=>changeFinish('velvet',id)}><i style={{background:color}}/>{name}</button>)}</div><div className="cm-swatches"><label>Bancadas</label>{[['green','Verde','#263d31'],['light','Travertino','#d4c6a9'],['graphite','Grafite','#484b49']].map(([id,name,color])=><button key={id} aria-label={'Bancada '+name} aria-pressed={finishes.marble===id} onClick={()=>changeFinish('marble',id)}><i style={{background:color}}/>{name}</button>)}</div><div className="cm-swatches"><label>Marcenaria</label>{[['walnut','Nogueira','#71472b'],['oak','Carvalho','#b28a59'],['smoked','Fumê','#5b4f42']].map(([id,name,color])=><button key={id} aria-label={'Marcenaria '+name} aria-pressed={finishes.walnut===id} onClick={()=>changeFinish('walnut',id)}><i style={{background:color}}/>{name}</button>)}</div><p className="cm-note">Opções conceituais EME Spatial. A personalização fica nesta visita.</p></div>}
   </aside>}
   {hint&&<p className="cm-toast" role="status">{hint}</p>}
  </>}
 </main>;
}
