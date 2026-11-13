import {useEffect, useRef, useState} from 'react';
import {ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Box, Camera, Check, ChevronDown, Compass, Footprints, Info, Layers, Map, Maximize, Minus, Plus, RotateCcw, Search, Sun, Trees, X} from 'lucide-react';
import {createPrioritaScene} from './scene';
import type {PrioritaScene,WalkState} from './scene';
import {areas,areaById,lotById, lotRelief, lots, number, plan, statusInfo, timeLabel} from './model';
import {commercialTerms,money,paymentExample,priceLabel} from './commercial';
import type {LotStatus, ViewMode} from './model';
import './priorita.css';
import './interface.css';

const blocks=['Todas','A','B','C','D','E','F','G','H'];
const startingStock=()=>Object.fromEntries(lots.map(lot=>[lot.id,'available' as LotStatus]));

export default function PrioritaExperience(){
  const canvas=useRef<HTMLDivElement>(null),scene=useRef<PrioritaScene|null>(null),shell=useRef<HTMLDivElement>(null);
  const [ready,setReady]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  const [selected,setSelected]=useState(''),[mode,setMode]=useState<ViewMode>('aerial');
  const [selectedArea,setSelectedArea]=useState(''),[listView,setListView]=useState<'lots'|'areas'>('lots');
  const [walkState,setWalkState]=useState<WalkState>('idle'),[walkSpeed,setWalkSpeed]=useState(8);
  const [stock,setStock]=useState<Record<string,LotStatus>>(startingStock);
  const [hour,setHour]=useState(15.5),[date,setDate]=useState('2026-11-12');
  const [block,setBlock]=useState('Todas'),[query,setQuery]=useState('');
  const [listOpen,setListOpen]=useState(false),[infoOpen,setInfoOpen]=useState(false),[solarOpen,setSolarOpen]=useState(false);
  const [contours,setContours]=useState(false),[light,setLight]=useState(false),[showStock,setShowStock]=useState(true),[showLabels,setShowLabels]=useState(true);
  const [notice,setNotice]=useState(''),[editStatus,setEditStatus]=useState(false);
  const info=useRef<HTMLDialogElement>(null);
  const lot=lotById.get(selected);
  const area=areaById.get(selectedArea);
  const terms=lot?commercialTerms(lot.id,lot.area):null,payment=terms?paymentExample(terms):null;
  const visibleLots=lots.filter(l=>(block==='Todas'||l.block===block)&&(!query||l.id.toLowerCase().includes(query.toLowerCase().trim())||String(l.number)===query.trim()));
  const simulated=Object.values(stock).some(s=>s!=='available');
  const available=Object.values(stock).filter(s=>s==='available').length;
  useEffect(()=>{const previous=document.title;document.title='Priorità · Loteamento 3D | EME Spatial';return()=>{document.title=previous;};},[]);
  useEffect(()=>{
    let engine:PrioritaScene|undefined;
    try{engine=createPrioritaScene(canvas.current!,{onSelect:id=>{setSelected(id);setListOpen(false);setEditStatus(false);},onArea:id=>{setSelectedArea(id);if(id)setListOpen(false);},onWalkState:setWalkState,onNotice:setNotice,onBlock:value=>{setBlock(value);setListView('lots');if(value!=='Todas')setListOpen(true);},onMode:setMode,onReady:()=>setReady(true),onError:()=>setError('A visita 3D foi interrompida. Reabra o cenário para continuar.')});scene.current=engine;}
    catch(e){setError('Não foi possível iniciar o 3D neste navegador. Tente reabrir a experiência com a aceleração gráfica disponível.');console.error('Priorità scene initialization',e);}
    return()=>{engine?.dispose();scene.current=null;};
  },[retry]);
  useEffect(()=>{scene.current?.lighting(hour,date);},[hour,date,ready,retry]);
  useEffect(()=>{scene.current?.setContours(contours);},[contours,ready,retry]);
  useEffect(()=>{scene.current?.setQuality(light);},[light,ready,retry]);
  useEffect(()=>{scene.current?.setStock(showStock);},[showStock,ready,retry]);
  useEffect(()=>{scene.current?.setLabels(showLabels);},[showLabels,ready,retry]);
  useEffect(()=>{for(const [id,status] of Object.entries(stock))scene.current?.setStatus(id,status);},[stock,ready,retry]);
  useEffect(()=>{if(infoOpen)info.current?.showModal();else info.current?.close();},[infoOpen]);
  useEffect(()=>{scene.current?.refresh();},[listOpen,listView,solarOpen,selected,selectedArea,editStatus,walkState]);
  useEffect(()=>{scene.current?.setWalkSpeed(walkSpeed);},[walkSpeed,ready,retry]);
  const choose=(id:string)=>{setSelected(id);setEditStatus(false);scene.current?.select(id,true);setListOpen(false);};
  const overview=()=>{scene.current?.overview();setListOpen(false);};
  const chooseBlock=(value:string)=>{setBlock(value);setSelected('');scene.current?.focusBlock(value);setListOpen(true);};
  const chooseArea=(id:string)=>{scene.current?.selectArea(id,true);setListOpen(false);};
  const openAreas=()=>{scene.current?.stopWalk();setListView('areas');setListOpen(true);};
  async function fullscreen(){
    if(document.fullscreenElement){await document.exitFullscreen();return;}
    try{await shell.current?.requestFullscreen();}catch{setNotice('Continue nesta janela. A experiência já ocupa toda a área disponível.');}
  }
  const changeStatus=(status:LotStatus)=>{if(lot)setStock(s=>({...s,[lot.id]:status}));};
  const enterLot=()=>{if(lot){scene.current?.enterLot(lot.id);setEditStatus(false);}};
  const control=(key:string)=>(event:React.PointerEvent<HTMLButtonElement>)=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);scene.current?.hold(key,true);};
  const stopControl=(key:string)=>()=>scene.current?.hold(key,false);

  return <div className={'priorita '+(lot||area||listOpen?'pr-panel-open':'')} ref={shell}>
    <div className="pr-canvas" ref={canvas}/>
    <div className="pr-vignette"/>
    <header className="pr-header"><a href="/" className="pr-brand" aria-label="EME Spatial início"><Box size={20}/><span>EME <b>SPATIAL</b></span></a><span className="pr-header-center">PRIORITÀ <i/> VACARIA, RS</span><div><button aria-label="Sobre este estudo" onClick={()=>setInfoOpen(true)}><Info size={18}/></button><button aria-label="Ampliar experiência" onClick={fullscreen}><Maximize size={18}/></button></div></header>

    <section className="pr-intro" aria-label="Apresentação do loteamento">
      <span className="pr-eyebrow">LOTEAMENTO · VACARIA</span><h1>Priorità</h1>
      <p>96 lotes · 8 quadras</p>
      <button className="pr-search-button" onClick={()=>{scene.current?.stopWalk();setListView('lots');setListOpen(s=>!s);}} aria-expanded={listOpen&&listView==='lots'}><Search size={17}/>Encontrar um lote<ChevronDown size={15}/></button>
    </section>

    <div className="pr-top-actions"><button className={listOpen&&listView==='areas'?'active':''} onClick={openAreas} aria-pressed={listOpen&&listView==='areas'}><Trees size={16}/><span>Áreas</span></button><button className={contours?'active':''} onClick={()=>setContours(s=>!s)} aria-pressed={contours}><Layers size={16}/><span>Relevo</span></button><button className={mode==='plan'?'active':''} onClick={()=>scene.current?.overview(true)} aria-pressed={mode==='plan'}><Map size={16}/><span>Planta</span></button></div>
    {!lot&&!area&&!listOpen&&mode!=='walk'&&walkState!=='choosing'&&<div className="pr-invitation"><span className="pr-dot"/><span>Explore um lote ou clique na rua para passear</span></div>}

    {listOpen&&<aside className="pr-lot-list" aria-label="Explorar loteamento">
      <div className="pr-panel-heading"><div><span className="pr-eyebrow">EXPLORE O LOTEAMENTO</span><h2>{listView==='areas'?'Além do seu lote':block==='Todas'?'Encontre seu lote':`Quadra ${block}`}</h2></div><button aria-label="Fechar lista de lotes" onClick={()=>setListOpen(false)}><X size={18}/></button></div>
      <div className="pr-list-tabs"><button aria-pressed={listView==='lots'} onClick={()=>setListView('lots')}>Lotes <span>96</span></button><button aria-pressed={listView==='areas'} onClick={()=>setListView('areas')}>Áreas <span>3</span></button></div>
      {listView==='lots'?<>
        <label className="pr-input"><Search size={16}/><input placeholder="Buscar lote · ex. C-03" aria-label="Buscar lote" value={query} onChange={e=>setQuery(e.target.value)}/></label>
        <label className="pr-block-select">Quadra <select value={block} onChange={e=>chooseBlock(e.target.value)}>{blocks.map(b=><option key={b} value={b}>{b==='Todas'?'Todas as quadras':`Quadra ${b}`}</option>)}</select></label>
        <div className="pr-list-results">{visibleLots.map(l=>{const offer=commercialTerms(l.id,l.area),example=paymentExample(offer);return <button key={l.id} className="pr-lot-row" onClick={()=>choose(l.id)}><span className="pr-row-top"><b><i style={{background:statusInfo[stock[l.id]].color}}/>{l.id}</b><span>{number(l.area)} m²</span></span><span className="pr-row-status">{statusInfo[stock[l.id]].label}</span><span className="pr-row-price"><strong>{priceLabel(offer)}</strong><small>{offer.illustrative?'Simulação':'Valor do lote'}</small><ArrowRight size={14}/></span>{example&&<span className="pr-row-terms">{offer.downPaymentPercent}% de entrada · saldo em {example.installments}x</span>}</button>;})}{!visibleLots.length&&<p>Nenhum lote encontrado. Tente outra quadra ou número.</p>}</div>
        <small>{visibleLots.length} lotes · valores e disponibilidade demonstrativos</small>
      </>:<><div className="pr-list-results pr-area-results">{areas.map(a=><button key={a.id} onClick={()=>chooseArea(a.id)}><Trees size={19}/><span><b>{a.name}</b><small>Conhecer a área e entrar no cenário</small></span><ArrowRight size={15}/></button>)}</div><small>Áreas do urbanístico · paisagismo ilustrativo</small></>}
    </aside>}

    {lot&&!listOpen&&<aside className={'pr-detail '+(mode==='lot'?'pr-detail-inside':'')} aria-label={'Informações do lote '+lot.id}>
      <div className="pr-panel-heading"><span className="pr-eyebrow">QUADRA {lot.block} · {lot.street.toUpperCase()}</span><button aria-label="Fechar detalhes do lote" onClick={()=>{setSelected('');scene.current?.select('');if(mode==='lot')overview();}}><X size={19}/></button></div>
      <div className="pr-lot-title"><h2>Lote {String(lot.number).padStart(2,'0')}</h2><span className="pr-status" style={{color:statusInfo[stock[lot.id]].color}}><i style={{background:'currentColor'}}/>{statusInfo[stock[lot.id]].label}</span></div>
      {mode!=='lot'&&<button className="pr-primary pr-mobile-enter" onClick={enterLot}><Compass size={16}/>Entrar neste lote<ArrowRight size={16}/></button>}
      {terms&&<section className="pr-commercial" aria-label="Valor e condições do lote"><div className="pr-price-label"><span>Valor do lote</span>{terms.illustrative&&<small>Simulação</small>}</div><strong>{priceLabel(terms)}</strong>{payment&&<div className="pr-payment"><span>Entrada de {terms.downPaymentPercent}% <b>{money(payment.downPayment)}</b></span><span>Saldo em {payment.installments}x de aproximadamente <b>{money(payment.installment)}</b></span></div>}<p>{terms.paymentConditions}</p></section>}
      {mode==='lot'?<><p className="pr-inside-copy">Você está no centro do lote.<br/>Arraste para olhar ao redor.</p><button className="pr-primary" onClick={()=>{scene.current?.overview();}}><ArrowLeft size={17}/>Voltar à vista aérea</button></>:<>
        <div className="pr-lot-area"><strong>{number(lot.area)}</strong><span>m² de área</span></div>
        <div className="pr-dimensions"><div><span>Frente</span><b>{lot.front.source==='scaled'?'≈ ':''}{number(lot.front.value)} m</b></div><div><span>Fundos</span><b>{lot.back.source==='scaled'?'≈ ':''}{number(lot.back.value)} m</b></div>{lot.sides.map((side,i)=><div key={i}><span>Lateral {i+1}</span><b>{side.source==='scaled'?'≈ ':''}{number(side.value)} m</b></div>)}</div>
        <div className="pr-relief"><Layers size={18}/><div><b>{number(lotRelief(lot))} m de desnível ilustrativo</b><span>Relevo criado para esta demonstração.</span></div></div>
        <p className="pr-enter-hint">Veja o entorno a partir do centro. Apenas olhar, sem caminhar.</p>
        <details className="pr-measure-notes"><summary>Sobre as medidas</summary><p>Área transcrita do urbanístico. Medidas sem ≈ constam na prancha. Valores com ≈ foram medidos no desenho em escala. Frente e fundos seguem a interpretação de acesso pela {lot.street}. Confira o memorial antes de usar comercialmente.</p></details>
        <button className="pr-test-status" aria-expanded={editStatus} onClick={()=>setEditStatus(s=>!s)}>Testar cores de disponibilidade<ChevronDown size={13}/></button>
        {editStatus&&<div className="pr-status-editor"><p>Teste visual nesta sessão. Não altera um estoque comercial.</p>{(Object.keys(statusInfo) as LotStatus[]).map(status=><button key={status} onClick={()=>changeStatus(status)} aria-pressed={stock[lot.id]===status}><i style={{background:statusInfo[status].color}}/>{statusInfo[status].label}{stock[lot.id]===status&&<Check size={14}/>}</button>)}</div>}
      </>}
    </aside>}

    {area&&!listOpen&&<aside className={'pr-detail pr-area-detail '+(mode==='area'?'pr-detail-inside':'')} aria-label={'Informações de '+area.name}>
      <div className="pr-panel-heading"><span className="pr-eyebrow">ÁREAS DO LOTEAMENTO</span><button aria-label="Fechar detalhes da área" onClick={()=>{if(mode==='area')overview();else scene.current?.selectArea('');}}><X size={19}/></button></div>
      <div className="pr-lot-title"><h2>{area.name}</h2></div>
      {mode==='area'?<><p className="pr-inside-copy">Você está no centro desta área. Arraste para olhar ao redor.</p><button className="pr-primary" onClick={overview}><ArrowLeft size={17}/>Voltar à vista aérea</button></>:<>
        <div className="pr-lot-area"><strong>≈ {number(area.areaGeometric)}</strong><span>m²</span></div><p className="pr-area-copy">{area.kind==='Institucional'?'Área destinada ao uso institucional no urbanístico.':'Espaço destinado à recreação no urbanístico.'} Conheça o relevo e veja o entorno a partir do centro.</p>
        <button className="pr-primary" onClick={()=>scene.current?.enterArea(area.id)}><Compass size={17}/>Entrar nesta área<ArrowRight size={16}/></button><p className="pr-enter-hint">Vista do centro, com giro livre e posição fixa.</p>
        <small className="pr-area-note">Área aproximada, medida no desenho. Paisagismo e relevo ilustrativos; equipamentos e uso final dependem do projeto.</small>
      </>}
    </aside>}

    <section className={'pr-solar '+(solarOpen?'pr-solar-open':'')} aria-label="Simulação solar"><button className="pr-solar-heading" aria-expanded={solarOpen} onClick={()=>setSolarOpen(s=>!s)}><span><Sun size={18}/>Luz do dia</span><b>{timeLabel(hour)}</b><ChevronDown size={14}/></button><div className="pr-solar-content"><input type="range" min="6" max="20" step="0.25" value={hour} onChange={e=>setHour(+e.target.value)} aria-label="Horário da simulação solar" aria-valuetext={timeLabel(hour)}/><div className="pr-solar-labels"><span>Manhã</span><span>Entardecer</span></div><label>Data de referência<input type="date" value={date} min="2020-01-01" max="2040-12-31" onChange={e=>{if(e.target.value)setDate(e.target.value);}}/></label><small>Vacaria · norte da prancha · simulação aproximada</small></div></section>

    <div className="pr-legend"><button aria-pressed={showStock} onClick={()=>setShowStock(s=>!s)}><i style={{background:statusInfo.available.color}}/>{available} disponíveis</button><span><i style={{background:statusInfo.reserved.color}}/>Reservado</span><span><i style={{background:statusInfo.unavailable.color}}/>Indisponível</span>{simulated&&<button className="pr-reset-status" onClick={()=>setStock(startingStock())}>Limpar teste</button>}</div>
    <div className="pr-north" title="Norte interpretado da prancha"><Compass size={27}/><span>N</span></div>

    <nav className="pr-dock" aria-label="Navegação do cenário"><button aria-pressed={mode==='aerial'} className={mode==='aerial'?'active':''} onClick={overview}><Box size={18}/><span>Vista aérea</span></button><button aria-pressed={mode==='walk'} className={mode==='walk'?'active':''} onClick={()=>{setListOpen(false);scene.current?.chooseWalkStart();}}><Footprints size={18}/><span>Passear</span></button><span className="pr-dock-divider"/><button aria-label="Identificar lotes" className={showLabels?'active-soft':''} aria-pressed={showLabels} onClick={()=>setShowLabels(s=>!s)}><Map size={18}/><span>Identificar lotes</span></button><button onClick={()=>scene.current?.screenshot()} aria-label="Salvar imagem desta vista"><Camera size={18}/></button></nav>
    <div className="pr-view-controls"><select aria-label="Qualidade do cenário" value={light?'light':'balanced'} onChange={e=>setLight(e.target.value==='light')}><option value="balanced">Equilibrada</option><option value="light">Leve</option></select><button aria-label="Aproximar" onClick={()=>scene.current?.zoom(1)} disabled={mode==='lot'||mode==='area'||mode==='walk'}><Plus size={18}/></button><button aria-label="Afastar" onClick={()=>scene.current?.zoom(-1)} disabled={mode==='lot'||mode==='area'||mode==='walk'}><Minus size={18}/></button><button aria-label="Restaurar vista aérea" onClick={overview}><RotateCcw size={17}/></button></div>
    {(mode==='aerial'||mode==='plan')&&<nav className="pr-pan-controls" aria-label="Deslocar vista aérea"><button aria-label="Mover vista para esquerda" onClick={()=>scene.current?.pan(-1,0)}><ArrowLeft size={16}/></button><button aria-label="Mover vista para frente" onClick={()=>scene.current?.pan(0,1)}><ArrowUp size={16}/></button><button aria-label="Mover vista para trás" onClick={()=>scene.current?.pan(0,-1)}><ArrowDown size={16}/></button><button aria-label="Mover vista para direita" onClick={()=>scene.current?.pan(1,0)}><ArrowRight size={16}/></button></nav>}

    {mode==='walk'&&<div className="pr-walk-controls" aria-label="Mover pela rua"><button aria-label="Andar para frente" onPointerDown={control('w')} onPointerUp={stopControl('w')} onPointerCancel={stopControl('w')}><ArrowUp size={20}/></button><div><button aria-label="Andar para esquerda" onPointerDown={control('a')} onPointerUp={stopControl('a')} onPointerCancel={stopControl('a')}><ArrowLeft size={20}/></button><button aria-label="Andar para trás" onPointerDown={control('s')} onPointerUp={stopControl('s')} onPointerCancel={stopControl('s')}><ArrowDown size={20}/></button><button aria-label="Andar para direita" onPointerDown={control('d')} onPointerUp={stopControl('d')} onPointerCancel={stopControl('d')}><ArrowRight size={20}/></button></div></div>}
    {walkState==='choosing'&&<div className="pr-walk-banner" role="status"><Compass size={19}/><div><b>Onde vamos começar?</b><span>Clique em um ponto da rua.</span><button onClick={()=>scene.current?.walk()}>Começar na entrada <ArrowRight size={12}/></button></div><button className="pr-walk-cancel" aria-label="Cancelar escolha do passeio" onClick={()=>scene.current?.stopWalk()}><X size={16}/></button></div>}
    {mode==='walk'&&<div className="pr-walk-options"><label>Ritmo <select aria-label="Velocidade do passeio" value={walkSpeed} onChange={e=>setWalkSpeed(+e.target.value)}><option value={4}>Tranquilo</option><option value={8}>Ágil</option><option value={12}>Rápido</option></select></label>{walkState==='moving'?<button onClick={()=>scene.current?.stopWalk()}>Parar caminhada <X size={12}/></button>:<span>Clique na rua para caminhar</span>}</div>}
    <p className="pr-instructions">{mode==='lot'||mode==='area'?'Arraste para olhar · posição fixa · Esc para sair':mode==='walk'?'Clique na rua para caminhar · arraste para olhar · WASD ou botões para mover':'Arraste para girar · clique na rua para entrar · botão direito para deslocar'}</p>
    <footer className="pr-footnote">Implantação baseada no urbanístico · relevo e paisagismo ilustrativos{simulated?' · cores em teste':' · todos disponíveis para demonstração'}</footer>
    {notice&&<div className="pr-toast" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Fechar aviso"><X size={16}/></button></div>}
    {(!ready||error)&&<div className="pr-loading" role={error?'alert':'status'}><Box size={32}/><h2>{error?'Vamos retomar a visita':'Preparando seu próximo lugar'}</h2><p>{error||'Organizando ruas, lotes e novas perspectivas…'}</p>{error&&<button onClick={()=>{setError('');setReady(false);setRetry(n=>n+1);}}>Reabrir cenário</button>}</div>}

    <dialog ref={info} className="pr-info" onCancel={()=>setInfoOpen(false)} onClose={()=>setInfoOpen(false)} onClick={e=>{if(e.target===e.currentTarget)setInfoOpen(false);}}><div className="pr-panel-heading"><span className="pr-eyebrow">SOBRE ESTA EXPERIÊNCIA</span><button aria-label="Fechar informações" onClick={()=>setInfoOpen(false)}><X size={20}/></button></div><h2>Uma primeira visão<br/>do Priorità.</h2><p>A implantação parte do Projeto Urbanístico, prancha 01, de julho de 2024, fornecido para este estudo em Vacaria/RS.</p><dl><dt>O que segue a prancha</dt><dd>96 lotes, oito quadras, contornos, áreas declaradas, ruas, áreas recreacionais e institucional.</dd><dt>O que é ilustrativo</dt><dd>Topografia, vegetação, calçadas, mobiliário, iluminação e entorno. Não foi fornecido levantamento altimétrico.</dd><dt>Posição solar</dt><dd>Cálculo aproximado para Vacaria, data e horário escolhidos. Norte interpretado da seta do desenho. Localização exata e orientação de levantamento ainda não validadas.</dd><dt>Disponibilidade</dt><dd>Todos os lotes começam disponíveis conforme o briefing. As cores podem ser testadas nesta sessão. Não há integração com vendas ou reservas.</dd><dt>Valores e pagamento</dt><dd>Simulação comercial para demonstrar a ferramenta. Os valores e o exemplo de parcelamento não constituem oferta e devem ser substituídos pela tabela aprovada da incorporadora.</dd><dt>Conferência da documentação</dt><dd>A prancha informa 4,0175 ha no carimbo e 40.715 m² na síntese. Há divergências entre algumas medidas e áreas. O estudo preserva as áreas declaradas dos lotes, sem corrigir o projeto técnico.</dd></dl><small>{plan.source} · estudo visual sujeito à validação da incorporadora.</small></dialog>
  </div>;
}
