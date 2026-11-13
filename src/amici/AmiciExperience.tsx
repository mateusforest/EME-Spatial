import {lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import {ArrowDown,ArrowLeft,ArrowRight,ArrowUp,Box,Building2,Camera,Check,ChevronRight,Expand,Footprints,Image,Info,Layers,MapPin,Maximize,Minus,Plus,RotateCcw,Share2,Trees,X} from 'lucide-react';
import {apartments,asset,facts,gallery,number,plans,sourceUrl} from './data';
import type {View} from './data';
import {createAmiciScene} from './scene';
import type {AmiciScene} from './scene';
import AmiciSolarControls from './AmiciSolarControls';
import {openingHour} from './solar';
import type {WalkZone} from './navigation';
import '../priorita/priorita.css';
import '../priorita/premium.css';
import './amici.css';
import './solar.css';

type Tab='Visão geral'|'Galeria'|'Plantas'|'Localização'|'Sobre';
const tabs:Tab[]=['Visão geral','Galeria','Plantas','Localização','Sobre'];
type Media={name:string;file:string;official:boolean};
const ApartmentTour=lazy(()=>import('./ApartmentTour'));

export default function AmiciExperience(){
 const host=useRef<HTMLDivElement>(null),engine=useRef<AmiciScene|null>(null),shell=useRef<HTMLDivElement>(null),dialog=useRef<HTMLDialogElement>(null);
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0),[progress,setProgress]=useState(0);
 const [panel,setPanel]=useState<'apartments'|'areas'|null>(null),[selected,setSelected]=useState('03');
 const [tour,setTour]=useState(()=>new URLSearchParams(location.search).get('apartamento')==='03');
 const [exteriorEnabled,setExteriorEnabled]=useState(!tour);
 const [view,setView]=useState<View>('facade'),[photo,setPhoto]=useState(false);
 const [opened,setOpened]=useState(false),[tab,setTab]=useState<Tab>('Visão geral'),[media,setMedia]=useState<Media|null>(null),[category,setCategory]=useState('Todos');
 const [notice,setNotice]=useState(''),[capture,setCapture]=useState('');
 const [walk,setWalk]=useState<WalkZone|null>(null),[moving,setMoving]=useState(false);
 const solarValue=useRef({hour:openingHour,date:new Date().toLocaleDateString('en-CA'),trajectory:false});
 const changeSun=useCallback((hour:number,date:string)=>{solarValue.current={...solarValue.current,hour,date};engine.current?.lighting(hour,date);},[]);
 const changeTrajectory=useCallback((value:boolean)=>{solarValue.current.trajectory=value;engine.current?.setSolarTrajectory(value);},[]);
 const openSolar=useCallback((value:boolean)=>{if(value)setPanel(null);},[]);
 const apartment=apartments.find(a=>a.id===selected);
 useEffect(()=>{const old=document.title;document.title='Amici · ZM Empreendimentos | EME Spatial';return()=>{document.title=old;};},[]);
 useEffect(()=>{
  if(!exteriorEnabled)return;
  let scene:AmiciScene|undefined;
  try{scene=createAmiciScene(host.current!,{onReady:()=>setReady(true),onError:()=>setFailed(true),onProgress:setProgress,onWalk:setWalk,onMoving:setMoving});engine.current=scene;}
  catch(error){console.error('Amici scene initialization',error);setFailed(true);}
  return()=>{scene?.dispose();engine.current=null;};
 },[retry,exteriorEnabled]);
 useEffect(()=>{const s=solarValue.current;engine.current?.lighting(s.hour,s.date);engine.current?.setSolarTrajectory(s.trajectory);},[ready,retry]);
 useEffect(()=>{engine.current?.pause(opened||photo||failed||tour);},[opened,photo,failed,tour,ready,retry]);
 useEffect(()=>{if(opened)dialog.current?.showModal();else dialog.current?.close();},[opened]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),5000);return()=>clearTimeout(timer);},[notice]);
 function present(next:Tab){setMedia(null);setCapture('');setTab(next);setOpened(true);}
 function showImage(file:string,name:string,official=true){setMedia({file,name,official});setCapture('');setOpened(true);}
 function chooseView(next:View){setPhoto(false);setView(next);engine.current?.view(next);}
 function restart(){setReady(false);setFailed(false);setProgress(0);setPhoto(false);setWalk(null);setMoving(false);setRetry(r=>r+1);}
 function stroll(){setPhoto(false);setPanel(null);engine.current?.startWalk();}
 async function enterApartment(){if(document.fullscreenElement){try{await document.exitFullscreen();}catch{/* The tour can still open in the page. */}}const url=new URL(location.href);url.searchParams.set('apartamento','03');history.replaceState(null,'',url);setPhoto(false);setPanel(null);setTour(true);}
 const closeApartment=useCallback(()=>{const url=new URL(location.href);url.searchParams.delete('apartamento');history.replaceState(null,'',url);setTour(false);setExteriorEnabled(true);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('.am-intro-actions button')?.focus());},[]);
 const hold=(key:string)=>(event:React.PointerEvent<HTMLButtonElement>)=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);engine.current?.hold(key,true);};
 const release=(key:string)=>()=>engine.current?.hold(key,false);
 async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await shell.current?.requestFullscreen();}catch{setNotice('A apresentação já ocupa a área disponível da tela.');}}
 async function share(){try{await navigator.clipboard.writeText(location.origin+'/apresentar/amici');setNotice('Link do Amici copiado.');}catch{setNotice('Copie o endereço desta página para compartilhar o Amici.');}}
 function screenshot(){try{setCapture(engine.current!.capture());setMedia(null);setOpened(true);}catch{setNotice('Aguarde o modelo terminar de carregar para salvar a imagem.');}}
 const inactive=!ready||failed||photo;
 return <><div className={'priorita amici '+(panel?'am-panel-open ':'')+(walk&&!photo?'am-walking':'')} ref={shell} inert={tour}>
  <div className="pr-canvas" ref={host}/>
  {(photo||failed)&&<div className="am-photo"><img src={asset('fachada.webp')} alt="Perspectiva oficial da fachada do Amici, divulgada pela ZM"/></div>}
  <div className="pr-vignette"/>
  <header className="pr-header"><a href="/" className="pr-brand" aria-label="EME Spatial início"><Box size={19}/><span>EME SPATIAL</span></a><span className="pr-header-center"><b>Amici</b><i/><span>ZM · PASSO FUNDO</span></span><div><a className="am-project-link" href="/apresentar/priorita">Priorità <ArrowRight size={13}/></a><button className="pr-material-trigger" onClick={()=>present('Visão geral')}><Image size={15}/><span>Apresentação</span></button><button aria-label="Sobre o Amici" onClick={()=>present('Sobre')}><Info size={17}/></button><button aria-label="Ampliar experiência" onClick={fullscreen}><Maximize size={17}/></button></div></header>

  <section className="am-intro" aria-label="Apresentação do Amici"><span className="pr-eyebrow">RESIDENCIAL · PASSO FUNDO</span><h1>amici<span>Seu futuro perto de tudo.</span></h1><p>52 residências · Entrega prevista em 2029</p><div className="am-intro-actions"><button aria-expanded={panel==='apartments'} onClick={()=>setPanel(p=>p==='apartments'?null:'apartments')}><Building2 size={17}/>Apartamentos<ChevronRight size={15}/></button><button aria-label="Conhecer os ambientes" aria-expanded={panel==='areas'} onClick={()=>setPanel(p=>p==='areas'?null:'areas')}><Trees size={17}/></button></div></section>
  <div className="am-top-actions"><button aria-pressed={photo} onClick={()=>setPhoto(p=>!p)}><Image size={16}/>{photo?'Voltar ao 3D':'Fachada original'}</button><button onClick={()=>present('Plantas')}><Layers size={16}/>Plantas</button></div>

  {panel&&<aside className="pr-sheet am-sheet" aria-label={panel==='apartments'?'Apartamentos do Amici':'Ambientes do Amici'}>
   <div className="pr-panel-heading"><div><span className="pr-eyebrow">CONHEÇA O EMPREENDIMENTO</span><h2>{panel==='apartments'?'Seu lugar no Amici':'Espaços para viver'}</h2></div><button aria-label="Fechar painel" onClick={()=>setPanel(null)}><X size={19}/></button></div>
   <div className="pr-sheet-body">
    {panel==='apartments'?<>
     <p className="am-panel-copy">Conheça por dentro um apartamento mobiliado: Final 03, com dois dormitórios e 58,56 m².</p>
     <button className="am-primary am-visit-unit" onClick={enterApartment}><Footprints size={18}/>Visitar apartamento · Final 03<ArrowRight size={17}/></button>
     <p className="am-unit-visit-note">Uma visita completa. Os demais finais ficam disponíveis para consulta de área e planta.</p>
     <div className="am-apartments">{apartments.map(a=><button key={a.id} aria-pressed={selected===a.id} onClick={()=>setSelected(a.id)}><span>Final <b>{a.id}</b></span><span>{number(a.area)} <small>m²</small></span>{selected===a.id?<Check size={16}/>:<ChevronRight size={16}/>}</button>)}</div>
     {apartment&&<section className="am-unit-detail" aria-label={'Final '+apartment.id}><span className="pr-eyebrow">FINAL {apartment.id} · PLANTA TIPO</span><strong>{number(apartment.area)} <small>m²</small></strong><p>Área indicada na planta divulgada pela ZM. Consulte a construtora sobre pavimento e disponibilidade.</p></section>}
     <button className="am-primary" onClick={()=>showImage('planta-tipo.webp','Pavimento tipo')}><Layers size={16}/>Ver a planta tipo<ArrowRight size={16}/></button>
     <section className="am-commercial"><span className="pr-eyebrow">VALORES E DISPONIBILIDADE</span><b>Sob consulta</b><p>Confirme unidades, metragens e condições com a ZM.</p><a href={sourceUrl} target="_blank" rel="noreferrer">Consultar a construtora <ArrowRight size={14}/></a></section>
    </>:<div className="am-areas">{gallery.filter(g=>g.id!=='facade').map(g=><button key={g.id} onClick={()=>showImage(g.file,g.name)}><img src={asset(g.file)} alt="" loading="lazy"/><span>{g.name}<ArrowRight size={15}/></span></button>)}</div>}
   </div>
  </aside>}

  {!ready&&!failed&&<div className="am-model-loading" role="status"><span className="am-spinner"/>Preparando o Amici em 3D… {progress>0?progress+'%':''}</div>}
  {failed&&<div className="am-error" role="status"><b>Veja o Amici pelas imagens oficiais</b><p>O modelo 3D não carregou neste navegador. Galeria e plantas continuam disponíveis.</p><button onClick={restart}>Tentar abrir o 3D</button><button onClick={()=>present('Galeria')}>Ver galeria</button></div>}
  <div className="am-caption"><span>{photo||failed?'PERSPECTIVA OFICIAL · ZM':'AMICI · ESTUDO 3D'}</span><small>{photo||failed?'Imagem de divulgação do empreendimento':'Reconstrução visual · dimensões e entorno aproximados'}</small></div>
  <AmiciSolarControls paused={opened||photo||failed||!ready||tour} onChange={changeSun} onTrajectory={changeTrajectory} onOpen={openSolar} selected={false}/>
  <nav className="pr-dock am-dock" aria-label="Navegação do Amici"><button aria-pressed={!photo&&!walk&&view==='facade'} disabled={!ready||failed} onClick={()=>chooseView('facade')}><Building2 size={18}/><span>Fachada</span></button><button aria-pressed={!photo&&!walk&&view==='aerial'} disabled={!ready||failed} onClick={()=>chooseView('aerial')}><Box size={18}/><span>Vista aérea</span></button><button aria-pressed={!photo&&!walk&&view==='entrance'} disabled={!ready||failed} onClick={()=>chooseView('entrance')}><MapPin size={18}/><span>Entrada</span></button><button aria-pressed={Boolean(walk&&!photo)} disabled={!ready||failed} onClick={stroll}><Footprints size={18}/><span>Passear</span></button><span className="pr-separator"/><button onClick={()=>present('Galeria')}><Image size={18}/><span>Galeria</span></button></nav>
  <div className="am-tools"><button aria-label="Aproximar" disabled={inactive||Boolean(walk)} onClick={()=>engine.current?.zoom(.85)}><Plus size={18}/></button><button aria-label="Afastar" disabled={inactive||Boolean(walk)} onClick={()=>engine.current?.zoom(1.18)}><Minus size={18}/></button><button aria-label="Restaurar vista" disabled={!ready||failed} onClick={()=>chooseView('facade')}><RotateCcw size={17}/></button><button aria-label="Salvar imagem do modelo" disabled={inactive} onClick={screenshot}><Camera size={17}/></button><button aria-label="Copiar link do Amici" onClick={share}><Share2 size={17}/></button></div>
  {walk&&!photo&&!failed&&<><section className="am-walk-banner" aria-label="Passeio pelo Amici"><div><Footprints size={18}/><b>{walk==='hall'?'Hall de entrada':'Passeio pela calçada'}</b><button aria-label="Sair do passeio" onClick={()=>chooseView('facade')}><X size={17}/></button></div><p>Arraste para olhar. Use WASD, setas ou toque no piso para caminhar.</p><div className="am-walk-actions">{moving?<button onClick={()=>engine.current?.stopMoving()}>Parar caminhada <X size={14}/></button>:walk==='outside'?<button onClick={()=>engine.current?.enterHall()}>Entrar no hall <ArrowRight size={15}/></button>:<button onClick={()=>engine.current?.returnOutside()}>Voltar à calçada <ArrowLeft size={15}/></button>}{walk==='hall'&&<button onClick={enterApartment}>Visitar apartamento <ArrowRight size={15}/></button>}{walk==='hall'&&<button onClick={()=>showImage('lobby.webp','Lobby oficial')}>Ver referência <Image size={14}/></button>}</div></section><div className="am-walk-pad" aria-label="Controles de caminhada">{(['w','a','s','d'] as const).map((key,i)=>{const Icon=[ArrowUp,ArrowLeft,ArrowDown,ArrowRight][i];return <button key={key} className={'am-key-'+key} aria-label={['Caminhar para frente','Caminhar para esquerda','Caminhar para trás','Caminhar para direita'][i]} onPointerDown={hold(key)} onPointerUp={release(key)} onPointerCancel={release(key)} onLostPointerCapture={release(key)}><Icon size={21}/></button>;})}</div></>}
  <p className="am-instructions">{photo?'Imagem oficial da ZM · alterne para explorar o modelo':walk?'Arraste para olhar · WASD/setas para caminhar · Esc para sair':'Arraste para girar · role ou use dois dedos para aproximar'}</p>
  {notice&&<div className="am-toast" role="status">{notice}</div>}

  <dialog className="am-dialog" ref={dialog} onCancel={()=>setOpened(false)} onClick={e=>{if(e.target===e.currentTarget)setOpened(false);}} aria-label="Apresentação do Amici">
   <header><div><span className="pr-eyebrow">ZM EMPREENDIMENTOS</span><h2>{capture?'Sua vista do Amici':media?media.name:'Amici · Seu futuro perto de tudo'}</h2></div><button aria-label="Fechar apresentação" onClick={()=>setOpened(false)}><X size={22}/></button></header>
   {capture?<div className="am-capture"><img src={capture} alt="Vista capturada do modelo 3D do Amici"/><a href={capture} download="amici-vista.png">Baixar imagem <Camera size={16}/></a></div>:media?<div className="am-media"><button className="am-back" onClick={()=>setMedia(null)}><ArrowLeft size={15}/>Voltar à apresentação</button><img src={asset(media.file)} alt={media.name}/><p>{media.official?'Imagem de divulgação · ZM Empreendimentos':'Render do estudo 3D · EME Spatial'}</p><a href={asset(media.file)} target="_blank" rel="noreferrer">Abrir imagem em tamanho completo <Expand size={14}/></a></div>:<>
    <nav className="am-tabs" aria-label="Seções da apresentação">{tabs.map(t=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t}</button>)}</nav>
    <div className="am-presentation-content">
     {tab==='Visão geral'&&<section className="am-overview"><button className="am-cover" onClick={()=>showImage('fachada.webp','Fachada oficial')}><img src={asset('fachada.webp')} alt="Fachada oficial do Amici"/><span>Fachada original <Expand size={15}/></span></button><div><span className="pr-eyebrow">PASSO FUNDO · RIO GRANDE DO SUL</span><h3>Seu futuro<br/>perto de tudo.</h3><p>Um residencial da ZM para viver, trabalhar e aproveitar a cidade. Apartamentos de 2 e 3 dormitórios e opções com 3 suítes.</p><dl><div><dt>Residências</dt><dd>52</dd></div><div><dt>Entrega prevista</dt><dd>2029</dd></div><div><dt>Planta tipo</dt><dd>6 finais</dd></div><div><dt>Localização</dt><dd>Centro</dd></div></dl><button className="am-primary" onClick={()=>setTab('Plantas')}>Conhecer as plantas <ArrowRight size={17}/></button><a className="am-source" href={sourceUrl} target="_blank" rel="noreferrer">Informações publicadas pela ZM <ArrowRight size={14}/></a></div></section>}
     {tab==='Galeria'&&<><div className="am-categories">{['Todos','Arquitetura','Convivência','Lazer','Conveniência'].map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="am-gallery">{gallery.filter(g=>category==='Todos'||g.category===category).map(g=><button key={g.id} onClick={()=>showImage(g.file,g.name)}><img src={asset(g.file)} alt={g.name} loading="lazy"/><span>{g.name}<Expand size={14}/></span></button>)}</div><p className="am-note">Imagens oficiais de divulgação · ZM Empreendimentos.</p></>}
     {tab==='Plantas'&&<><p className="am-panel-copy">Explore as plantas divulgadas pela ZM. Toque em uma imagem para ampliar.</p><div className="am-plans">{plans.map(p=><button key={p.id} onClick={()=>showImage(p.file,p.name)}><img src={asset(p.file)} alt={p.name}/><span><b>{p.name}</b><small>{p.description}</small></span><Expand size={17}/></button>)}</div></>}
     {tab==='Localização'&&<section className="am-location"><img src={asset('mapa.webp')} alt="Mapa de localização do Amici publicado pela ZM"/><div><MapPin size={24}/><h3>No centro de Passo Fundo.</h3><p>{facts.address}<br/>{facts.city}</p><a className="am-primary" href="https://www.google.com/maps/search/?api=1&query=Rua+Lava+P%C3%A9s+414+Passo+Fundo+RS" target="_blank" rel="noreferrer">Abrir no mapa <ArrowRight size={17}/></a></div></section>}
     {tab==='Sobre'&&<section className="am-about"><h3>Uma apresentação para explorar o Amici.</h3><p>O modelo foi reconstruído no Blender a partir das imagens e plantas de divulgação. A fachada, os materiais e o paisagismo foram interpretados a partir dessas referências.</p><p>Dimensões, laterais, fundos e edifícios vizinhos são aproximados. Este estudo não substitui o projeto arquitetônico oficial. O lazer está apresentado nas imagens e plantas; sua posição não foi inferida no modelo 3D.</p><p>As áreas dos finais vêm da planta tipo publicada. Valores e disponibilidade devem ser confirmados com a ZM. A previsão de entrega de 2029 consta no material fornecido.</p><a href={sourceUrl} target="_blank" rel="noreferrer">Fonte: ZM Empreendimentos <ArrowRight size={14}/></a><button className="am-primary" onClick={()=>showImage('render-v15.webp','Fachada atualizada · estudo V15',false)}>Ver o render do modelo <Image size={17}/></button><a className="am-source" href="/apresentar/priorita">Abrir a apresentação do Priorità <ArrowRight size={14}/></a></section>}
    </div>
   </>}
  </dialog>
 </div>{tour&&<Suspense fallback={<div className="am-apartment-loading" role="status">Abrindo o apartamento…</div>}><ApartmentTour onClose={closeApartment}/></Suspense>}</>;
}
