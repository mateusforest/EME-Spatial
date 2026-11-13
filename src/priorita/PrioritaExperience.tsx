import {lazy,Suspense,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowDown,ArrowLeft,ArrowRight,ArrowUp,BookOpen,Box,Camera,ChevronDown,Compass,Footprints,Info,Map,Maximize,Minus,Plus,RotateCcw,Search,Settings2,Trees,X} from 'lucide-react';
import {createPrioritaScene} from './scene';
import type {PrioritaScene,WalkState} from './scene';
import {areas,areaById,lotById,lots,number,plan} from './model';
import type {LotStatus,ViewMode} from './model';
import {validFavorites,toggleComparison} from './experience-state';
import {LotComparison,LotDetail,LotFinder,WalkLotPreview} from './LotPanels';
import SolarControls from './SolarControls';
import './priorita.css';
import './premium.css';
import {filterLots} from './presentation-model';
import {demoStatus} from './demo-stock';
import type {PresentationTab} from './PresentationCenter';
import {openingHour} from './visual-profile';
import type {StockFilter} from './presentation-model';
const PresentationCenter=lazy(()=>import('./PresentationCenter'));

const startingStock=()=>Object.fromEntries(lots.map(l=>[l.id,demoStatus(l.id)]));
const ids=new Set(lots.map(l=>l.id));
const favoriteKey='priorita:favorites:v1';
function loadFavorites(){try{return validFavorites(JSON.parse(localStorage.getItem(favoriteKey)||'[]'),ids);}catch{return [];}}

export default function PrioritaExperience(){
 const canvas=useRef<HTMLDivElement>(null),scene=useRef<PrioritaScene|null>(null),shell=useRef<HTMLDivElement>(null),info=useRef<HTMLDialogElement>(null);
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const [capture,setCapture]=useState('');
 const [presentationTab,setPresentationTab]=useState<PresentationTab>('Visão geral'),[walkDetails,setWalkDetails]=useState(false);
 const [presentation,setPresentation]=useState(false),[statusFilter,setStatusFilter]=useState<StockFilter>('all');
 const [selected,setSelected]=useState(''),[selectedArea,setSelectedArea]=useState(''),[mode,setMode]=useState<ViewMode>('aerial');
 const [listOpen,setListOpen]=useState(false),[areasOpen,setAreasOpen]=useState(false),[settingsOpen,setSettingsOpen]=useState(false),[infoOpen,setInfoOpen]=useState(false),[collapsed,setCollapsed]=useState(false);
 const [block,setBlock]=useState('Todas'),[query,setQuery]=useState(''),[stock,setStock]=useState<Record<string,LotStatus>>(startingStock);
 const [favorites,setFavorites]=useState<string[]>(loadFavorites),[onlyFavorites,setOnlyFavorites]=useState(false),[comparison,setComparison]=useState<string[]>([]),[compareOpen,setCompareOpen]=useState(false);
 const [walkState,setWalkState]=useState<WalkState>('idle'),[walkSpeed,setWalkSpeed]=useState(8),[walkPad,setWalkPad]=useState(false);
 const [contours,setContours]=useState(false),[light,setLight]=useState(()=>matchMedia('(max-width:700px)').matches),[showStock,setShowStock]=useState(true),[showLabels,setShowLabels]=useState(true),[notice,setNotice]=useState('');
 const solarValue=useRef({hour:openingHour,date:new Date().toLocaleDateString('en-CA'),trajectory:false});
 const lot=lotById.get(selected),area=areaById.get(selectedArea);
 const matching=useMemo(()=>filterLots(lots,stock,statusFilter,block,query,favorites,onlyFavorites),[stock,statusFilter,block,query,favorites,onlyFavorites]);
 const filtering=statusFilter!=='all'||block!=='Todas'||Boolean(query.trim())||onlyFavorites;
 const simulated=lots.some(l=>stock[l.id]!==demoStatus(l.id));
 const panelOpen=Boolean(lot&&(mode!=='walk'||walkDetails)||area||listOpen||areasOpen||compareOpen);
 useEffect(()=>{const old=document.title;document.title='Priorità · Seu próximo lugar | EME Spatial';return()=>{document.title=old;};},[]);
 useEffect(()=>{
  let engine:PrioritaScene|undefined;
  try{engine=createPrioritaScene(canvas.current!,{
   onSelect:id=>{setWalkDetails(false);setSelected(id);if(id){setListOpen(false);setAreasOpen(false);setCompareOpen(false);setCollapsed(false);}},
   onArea:id=>{setSelectedArea(id);if(id){setAreasOpen(false);setListOpen(false);setCompareOpen(false);setCollapsed(false);}},
   onWalkState:setWalkState,onNotice:setNotice,
   onBlock:b=>{setBlock(b);if(b!=='Todas'){setListOpen(true);setCollapsed(false);}},onMode:setMode,onReady:()=>setReady(true),onError:()=>setError('Não foi possível concluir a visita 3D. Você pode reabrir o cenário.')
  });scene.current=engine;}catch(e){setError('Não foi possível iniciar o 3D neste navegador. Tente reabrir a experiência.');console.error('Priorità',e);}
  return()=>{engine?.dispose();scene.current=null;};
 },[retry]);
 useEffect(()=>{if(!ready)return;const v=solarValue.current;scene.current?.lighting(v.hour,v.date);scene.current?.setSolarTrajectory(v.trajectory);const requested=new URL(location.href).searchParams.get('lote');if(requested&&lotById.has(requested)){setSelected(requested);scene.current?.select(requested,true);}},[ready,retry]);
 useEffect(()=>{scene.current?.setQuality(light);},[light,ready,retry]);
 useEffect(()=>{scene.current?.setContours(contours);},[contours,ready,retry]);
 useEffect(()=>{scene.current?.setStock(showStock);},[showStock,ready,retry]);
 useEffect(()=>{scene.current?.setLabels(showLabels);},[showLabels,ready,retry]);
 useEffect(()=>{scene.current?.setWalkSpeed(walkSpeed);},[walkSpeed,ready,retry]);
 useEffect(()=>{for(const [id,status] of Object.entries(stock))scene.current?.setStatus(id,status);},[stock,ready,retry]);
 useEffect(()=>{scene.current?.setFilter(filtering?matching.map(l=>l.id):null);},[matching,filtering,ready,retry]);
 useEffect(()=>{scene.current?.setPaused(presentation||Boolean(capture));},[presentation,capture,ready,retry]);
 useEffect(()=>{scene.current?.setComparison(comparison);},[comparison,ready,retry]);
 useEffect(()=>{scene.current?.refresh();},[panelOpen,collapsed,listOpen,compareOpen,settingsOpen]);
 useEffect(()=>{try{localStorage.setItem(favoriteKey,JSON.stringify(favorites));}catch{/* private browsing may disable storage */}},[favorites]);
 useEffect(()=>{if(infoOpen)info.current?.showModal();else info.current?.close();},[infoOpen]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),6000);return()=>clearTimeout(timer);},[notice]);
 const changeSun=useCallback((hour:number,date:string)=>{solarValue.current={...solarValue.current,hour,date};scene.current?.lighting(hour,date);},[]);
 const changeTrajectory=useCallback((trajectory:boolean)=>{solarValue.current.trajectory=trajectory;scene.current?.setSolarTrajectory(trajectory);},[]);
 const openSolar=useCallback((open:boolean)=>{if(open){setSettingsOpen(false);if(matchMedia('(max-width:700px)').matches)setCollapsed(true);}scene.current?.refresh();},[]);
 function clearPanels(){setListOpen(false);setAreasOpen(false);setCompareOpen(false);setSettingsOpen(false);}
 function simulate(){scene.current?.stopWalk();setPresentationTab('Condições');setPresentation(true);}
 function choose(id:string){clearPanels();setSelected(id);setCollapsed(false);scene.current?.select(id,true);}
 function overview(flat=false){clearPanels();scene.current?.overview(flat);}
 function find(){scene.current?.stopWalk();setListOpen(v=>!v);setAreasOpen(false);setCompareOpen(false);setCollapsed(false);setSettingsOpen(false);}
 function chooseStatus(value:StockFilter){setStatusFilter(value);const ids=filterLots(lots,stock,value,block,query,favorites,onlyFavorites).map(l=>l.id);if(ids.length)scene.current?.focusLots(ids);}
 function chooseBlock(b:string){setBlock(b);setSelected('');scene.current?.focusBlock(b);setListOpen(true);setCollapsed(false);}
 function openAreas(){clearPanels();scene.current?.stopWalk();setAreasOpen(true);setCollapsed(false);}
 function addCompare(id:string){const next=toggleComparison(comparison,id);setComparison(next);if(next.length===2){clearPanels();setCompareOpen(true);setCollapsed(false);scene.current?.focusComparison(next);}else if(next.length===1){setNotice('Primeiro lote adicionado. Escolha outro lote e toque em Comparar.');setListOpen(true);setCollapsed(false);}}
 function removeCompare(id:string){const next=comparison.filter(x=>x!==id);setComparison(next);if(next.length<2){setCompareOpen(false);setListOpen(true);setCollapsed(false);}}
 function showCompare(){if(comparison.length<2){find();return;}clearPanels();setCompareOpen(true);setCollapsed(false);scene.current?.focusComparison(comparison);}
 async function shareLot(){if(!lot)return;const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('lote',lot.id);try{await navigator.clipboard.writeText(url.href);setNotice('Link deste lote copiado. Você pode encaminhá-lo.');}catch{setNotice('Não foi possível copiar o link neste navegador.');}}
 async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await shell.current?.requestFullscreen();}catch{setNotice('A experiência já ocupa a tela disponível neste navegador.');}}
 const control=(key:string)=>(event:React.PointerEvent<HTMLButtonElement>)=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);scene.current?.hold(key,true);};
 const stopControl=(key:string)=>()=>scene.current?.hold(key,false);
 const closeLot=()=>{setSelected('');scene.current?.select('');if(mode==='lot')overview();};
 return <div className={'priorita '+(panelOpen?'pr-panel-open ':'')+(collapsed?'pr-panel-collapsed ':'')+`pr-mode-${mode}`} ref={shell}>
  <div className="pr-canvas" ref={canvas}/><div className="pr-vignette"/>
  <header className="pr-header"><a href="/" className="pr-brand" aria-label="EME Spatial início"><Box size={22} strokeWidth={1.3}/><span>EME SPATIAL</span></a><span className="pr-header-center"><b>Priorità</b><i/><span>UM NOVO OLHAR PARA O SEU LUGAR</span></span><div><button className="pr-material-trigger" onClick={()=>{scene.current?.stopWalk();setPresentationTab('Visão geral');setPresentation(true);}}><BookOpen size={16}/><span>Apresentação</span></button><button aria-label="Sobre este estudo" onClick={()=>setInfoOpen(true)}><Info size={17}/></button><button aria-label="Ampliar experiência" onClick={fullscreen}><Maximize size={18}/></button></div></header>
  <div className="pr-search-pill"><button onClick={find} aria-expanded={listOpen}><Search size={16}/><span>Encontrar lote</span></button><span className="pr-separator"/><button onClick={openAreas}><span>Explorar</span><ChevronDown size={14}/></button></div>
  <div className="pr-top-actions"><button aria-label="Opções da experiência" aria-expanded={settingsOpen} onClick={()=>setSettingsOpen(v=>!v)}><Settings2 size={18}/><span>Opções</span></button></div>
  {settingsOpen&&<section className="pr-settings" aria-label="Opções da experiência"><div className="pr-panel-heading"><b>Personalize a vista</b><button aria-label="Fechar opções" onClick={()=>setSettingsOpen(false)}><X size={17}/></button></div><label className="pr-toggle">Identificar lotes<input type="checkbox" checked={showLabels} onChange={e=>setShowLabels(e.target.checked)}/></label><label className="pr-toggle">Cores de disponibilidade<input type="checkbox" checked={showStock} onChange={e=>setShowStock(e.target.checked)}/></label><label className="pr-toggle">Curvas de nível<input type="checkbox" checked={contours} onChange={e=>setContours(e.target.checked)}/></label><label className="pr-toggle">Qualidade<select aria-label="Qualidade do cenário" value={light?'light':'balanced'} onChange={e=>setLight(e.target.value==='light')}><option value="balanced">Equilibrada</option><option value="light">Leve</option></select></label><button className="pr-text-button" onClick={()=>{const image=scene.current?.screenshot();if(image)setCapture(image);setSettingsOpen(false);}}><Camera size={16}/>Salvar imagem desta vista</button></section>}
  {listOpen&&<LotFinder statusFilter={statusFilter} onStatusFilter={chooseStatus} block={block} query={query} favorites={favorites} onlyFavorites={onlyFavorites} stock={stock} onBlock={chooseBlock} onQuery={setQuery} onFavorites={setOnlyFavorites} onChoose={choose} onClose={()=>setListOpen(false)} onCollapse={()=>setCollapsed(v=>!v)} collapsed={collapsed}/>}
  {lot&&(mode!=='walk'||walkDetails)&&!listOpen&&!areasOpen&&!compareOpen&&<LotDetail onSimulate={simulate} key={lot.id} lot={lot} status={stock[lot.id]} inside={mode==='lot'} favorite={favorites.includes(lot.id)} comparing={comparison.includes(lot.id)} collapsed={collapsed} onCollapse={()=>setCollapsed(v=>!v)} onClose={closeLot} onEnter={()=>{scene.current?.enterLot(lot.id);setCollapsed(true);}} onBack={()=>overview()} onFavorite={()=>setFavorites(f=>f.includes(lot.id)?f.filter(id=>id!==lot.id):[...f,lot.id])} onCompare={()=>addCompare(lot.id)} onShare={shareLot} onStatus={status=>setStock(s=>({...s,[lot.id]:status}))}/>}
  {lot&&mode==='walk'&&!walkDetails&&!listOpen&&!areasOpen&&!compareOpen&&!presentation&&<WalkLotPreview lot={lot} status={stock[lot.id]} onClose={closeLot} onDetails={()=>{setWalkDetails(true);setCollapsed(false);}} onSimulate={simulate}/>}
  {compareOpen&&comparison.length===2&&<LotComparison items={comparison.map(id=>lotById.get(id)!)} stock={stock} onChoose={choose} onClose={()=>setCompareOpen(false)} onRemove={removeCompare} collapsed={collapsed} onCollapse={()=>setCollapsed(v=>!v)}/>}
  {comparison.length>0&&!compareOpen&&!listOpen&&!lot&&<button className="pr-compare-basket" onClick={showCompare}><Map size={15}/>Comparar {comparison.length}/2<ArrowRight size={14}/></button>}
  {areasOpen&&<aside className={'pr-lot-list pr-sheet '+(collapsed?'is-collapsed':'')} aria-label="Áreas do loteamento"><button className="pr-sheet-handle" onClick={()=>setCollapsed(v=>!v)} aria-label="Recolher áreas"><span/></button><div className="pr-panel-heading"><div><span className="pr-eyebrow">EXPLORE O LOTEAMENTO</span><h2>Além do seu lote</h2></div><button aria-label="Fechar áreas" onClick={()=>setAreasOpen(false)}><X size={18}/></button></div><div className="pr-sheet-body"><div className="pr-area-results">{areas.map(a=><button key={a.id} onClick={()=>{clearPanels();scene.current?.selectArea(a.id,true);}}><Trees size={20}/><span><b>{a.name}</b><small>Conheça a área e o entorno</small></span><ArrowRight size={15}/></button>)}</div><p className="pr-panel-note">Áreas do urbanístico · paisagismo ilustrativo</p></div></aside>}
  {area&&!listOpen&&!areasOpen&&!compareOpen&&<aside className={'pr-detail pr-sheet '+(collapsed?'is-collapsed':'')} aria-label={'Informações de '+area.name}><button className="pr-sheet-handle" onClick={()=>setCollapsed(v=>!v)} aria-label="Recolher detalhes da área"><span/></button><div className="pr-panel-heading"><span className="pr-eyebrow">ÁREAS DO LOTEAMENTO</span><button aria-label="Fechar detalhes da área" onClick={()=>{if(mode==='area')overview();else scene.current?.selectArea('');}}><X size={18}/></button></div><div className="pr-lot-title"><h2>{area.name}</h2></div><div className="pr-sheet-body"><div className="pr-specs"><span className="pr-eyebrow">ÁREA APROXIMADA</span><div className="pr-area-total"><strong>{number(area.areaGeometric)} <small>m²</small></strong></div></div><p className="pr-area-copy">{mode==='area'?'Arraste para olhar ao redor a partir do centro da área.':area.kind==='Institucional'?'Espaço destinado ao uso institucional no urbanístico.':'Espaço destinado à recreação no urbanístico.'}</p><button className="pr-primary" onClick={()=>{if(mode==='area')overview();else {scene.current?.enterArea(area.id);setCollapsed(true);}}}><Compass size={17}/>{mode==='area'?'Voltar à vista aérea':'Entrar nesta área'}<ArrowRight size={16}/></button><p className="pr-panel-note">Área medida no desenho. Relevo e paisagismo ilustrativos; equipamentos dependem do projeto.</p></div></aside>}
  {filtering&&<button className="pr-filter-indicator" onClick={()=>{setStatusFilter('all');setBlock('Todas');setQuery('');setOnlyFavorites(false);scene.current?.focusBlock('Todas');}}>{matching.length} {matching.length===1?'lote destacado':'lotes destacados'} <X size={13}/></button>}
  {presentation&&<Suspense fallback={<div className="pr-center-loading" role="status">Abrindo apresentação…</div>}><PresentationCenter selected={selected} stock={stock} initialTab={presentationTab} onSelect={id=>{setSelected(id);scene.current?.select(id,false);}} onClose={()=>setPresentation(false)} onExplore={id=>{setPresentation(false);clearPanels();if(id)scene.current?.selectArea(id,true);else scene.current?.overview();}}/></Suspense>}
  {capture&&<CapturePreview source={capture} onClose={()=>setCapture('')}/>}
  <SolarControls paused={presentation||Boolean(capture)} onChange={changeSun} onTrajectory={changeTrajectory} onOpen={openSolar} selected={Boolean(lot||area)}/>
  <div className="pr-legend"><i/><button onClick={()=>setInfoOpen(true)}>Disponibilidade demonstrativa</button>{simulated&&<button onClick={()=>setStock(startingStock())}>Restaurar demonstração</button>}</div>
  <div className="pr-north" title="Norte da prancha"><Compass size={22}/><span>N</span></div>
  <nav className="pr-dock" aria-label="Navegação do cenário"><button aria-pressed={mode==='aerial'} onClick={()=>overview()}><Box size={18}/><span>Aérea</span></button><span className="pr-separator"/><button aria-pressed={mode==='walk'||walkState==='choosing'} onClick={()=>{clearPanels();scene.current?.chooseWalkStart();}}><Footprints size={18}/><span>Passear</span></button><span className="pr-separator"/><button aria-pressed={mode==='plan'} onClick={()=>overview(true)}><Map size={18}/><span>Planta</span></button></nav>
  <div className="pr-view-controls"><button aria-label="Aproximar" onClick={()=>scene.current?.zoom(1)} disabled={mode==='walk'||mode==='lot'||mode==='area'}><Plus size={18}/></button><button aria-label="Afastar" onClick={()=>scene.current?.zoom(-1)} disabled={mode==='walk'||mode==='lot'||mode==='area'}><Minus size={18}/></button><button aria-label="Restaurar vista aérea" onClick={()=>overview()}><RotateCcw size={17}/></button></div>
  {(mode==='aerial'||mode==='plan')&&<nav className="pr-pan-controls" aria-label="Deslocar vista aérea"><button aria-label="Mover vista para esquerda" onClick={()=>scene.current?.pan(-1,0)}><ArrowLeft size={15}/></button><button aria-label="Mover vista para frente" onClick={()=>scene.current?.pan(0,1)}><ArrowUp size={15}/></button><button aria-label="Mover vista para trás" onClick={()=>scene.current?.pan(0,-1)}><ArrowDown size={15}/></button><button aria-label="Mover vista para direita" onClick={()=>scene.current?.pan(1,0)}><ArrowRight size={15}/></button></nav>}
  {walkState==='choosing'&&<div className="pr-walk-banner" role="status"><NavigationIcon/><div><b>Onde vamos começar?</b><span>Toque em uma rua para entrar.</span><button onClick={()=>scene.current?.walk()}>Começar na entrada <ArrowRight size={12}/></button></div><button aria-label="Cancelar escolha do passeio" onClick={()=>scene.current?.stopWalk()}><X size={17}/></button></div>}
  {mode==='walk'&&<><span className="pr-walk-breadcrumb">Passeio <i/> Clique na rua para caminhar</span><div className="pr-walk-options"><label>Ritmo <select aria-label="Velocidade do passeio" value={walkSpeed} onChange={e=>setWalkSpeed(+e.target.value)}><option value={4}>Tranquilo</option><option value={8}>Ágil</option><option value={12}>Rápido</option></select></label>{walkState==='moving'&&<button onClick={()=>scene.current?.stopWalk()}>Parar <X size={13}/></button>}<button aria-label="Mostrar controles de caminhada" aria-pressed={walkPad} onClick={()=>setWalkPad(v=>!v)}><Compass size={17}/></button></div>{walkPad&&<div className="pr-walk-controls" aria-label="Mover pela rua"><button aria-label="Andar para frente" onPointerDown={control('w')} onPointerUp={stopControl('w')} onPointerCancel={stopControl('w')}><ArrowUp size={20}/></button><div>{[['a',ArrowLeft,'esquerda'],['s',ArrowDown,'trás'],['d',ArrowRight,'direita']].map(([key,Icon,label])=>{const I=Icon as typeof ArrowLeft;return <button key={key as string} aria-label={'Andar para '+label} onPointerDown={control(key as string)} onPointerUp={stopControl(key as string)} onPointerCancel={stopControl(key as string)}><I size={20}/></button>;})}</div></div>}</>}
  <p className="pr-instructions">{mode==='lot'||mode==='area'?'Arraste para olhar ao redor · posição fixa':mode==='walk'?'Arraste para olhar · rua para caminhar · lote para conhecer':'Arraste para girar · clique em um lote para conhecer'}</p>
  <footer className="pr-footnote">Conceito visual · relevo e paisagismo ilustrativos</footer>
  {notice&&<div className="pr-toast" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Fechar aviso"><X size={16}/></button></div>}
  {(!ready||error)&&<div className="pr-loading" role={error?'alert':'status'}><Box size={32} strokeWidth={1}/><h2>{error?'Vamos retomar a visita':'Seu próximo lugar, por outro ângulo.'}</h2><p>{error||'Preparando o Priorità…'}</p>{error&&<button onClick={()=>{setError('');setReady(false);setRetry(n=>n+1);}}>Reabrir cenário</button>}</div>}
    <dialog ref={info} className="pr-info" onCancel={()=>setInfoOpen(false)} onClose={()=>setInfoOpen(false)} onClick={e=>{if(e.target===e.currentTarget)setInfoOpen(false);}}><div className="pr-panel-heading"><span className="pr-eyebrow">SOBRE ESTA EXPERIÊNCIA</span><button aria-label="Fechar informações" onClick={()=>setInfoOpen(false)}><X size={20}/></button></div><h2>Uma primeira visão<br/>do Priorità.</h2><p>A implantação parte do Projeto Urbanístico, prancha 01, de julho de 2024, fornecido para este estudo em Vacaria/RS.</p><dl><dt>O que segue a prancha</dt><dd>96 lotes, oito quadras, contornos, áreas declaradas, ruas, áreas recreacionais e institucional.</dd><dt>O que é ilustrativo</dt><dd>Topografia, vegetação, calçadas, mobiliário, iluminação e entorno. Não foi fornecido levantamento altimétrico.</dd><dt>Posição solar</dt><dd>Cálculo aproximado para Vacaria, data e horário escolhidos. Norte interpretado da seta do desenho. Localização exata e orientação de levantamento ainda não validadas.</dd><dt>Disponibilidade</dt><dd>Cores demonstrativas: há exemplos disponíveis, reservados e indisponíveis. Você pode testá-las nesta sessão. Não há integração com vendas ou reservas reais.</dd><dt>Valores e pagamento</dt><dd>Simulação comercial para demonstrar a ferramenta. Os valores e o exemplo de parcelamento não constituem oferta e devem ser substituídos pela tabela aprovada da incorporadora.</dd><dt>Conferência da documentação</dt><dd>A prancha informa 4,0175 ha no carimbo e 40.715 m² na síntese. Há divergências entre algumas medidas e áreas. O estudo preserva as áreas declaradas dos lotes, sem corrigir o projeto técnico.</dd></dl><small>{plan.source} · estudo visual sujeito à validação da incorporadora.</small></dialog>
 </div>;
}
function NavigationIcon(){return <Footprints size={20}/>;}

function CapturePreview({source,onClose}:{source:string;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal();},[]);
 return <dialog ref={ref} className="pr-capture-preview" onClose={onClose} onCancel={onClose}><header><div><span className="pr-eyebrow">SUA PERSPECTIVA</span><h2>Uma vista para compartilhar.</h2></div><button aria-label="Fechar imagem da vista" onClick={onClose}><X size={20}/></button></header><img src={source} alt="Imagem capturada da vista do Priorità"/><footer><span>Estudo visual · relevo e paisagismo ilustrativos</span><a href={source} download="priorita-vista.png">Baixar imagem <ArrowDown size={16}/></a></footer></dialog>;
}
