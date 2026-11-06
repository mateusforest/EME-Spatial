import SceneOverlay from './SceneOverlay';
import MoradasStockPanel from './MoradasStockPanel';
import DecodedImage from './DecodedImage';
import { emptyDevelopment, validateDevelopment, type DevelopmentConfig, type DevelopmentPlan } from '../../shared/development.mjs';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Box, Check, ChevronLeft, ChevronRight, ImageIcon, Maximize, Minus, Plus, RotateCcw, Sun, Sunset, Moon, Layers3, Trees, Building2, Scan } from 'lucide-react';
import { Dialog } from '../ui';
import { whatsappUrl } from '../data';
import { ASSETS, galleries, type GalleryId, type Lighting, type Place, type TowerId } from './moradas';
import type { ModelControls } from './DevelopmentModel';
import './development.css';
import './moradas-refinement.css';
import './moradas-stock-panel.css';

const MoradasUnitExperience=lazy(()=>import('./MoradasUnitExperience'));
const DevelopmentModel = lazy(() => import('./DevelopmentModel'));

export default function DevelopmentPage() {
  const [config,setConfig]=useState<DevelopmentConfig>(emptyDevelopment);
  const [selectedUnit,setSelectedUnit]=useState<number|null>(null);
  const [selectedPlan,setSelectedPlan]=useState<DevelopmentPlan|null>(null);
  useEffect(()=>{const controller=new AbortController();fetch('/api/public/developments/moradas-da-serra',{cache:'no-store',signal:controller.signal}).then(async response=>{if(!response.ok)throw Error('Disponibilidade temporariamente indisponível. Consulte a equipe.');const data=await response.json();setConfig(validateDevelopment(data.config));}).catch(e=>{if(e.name!=='AbortError')setNotice('Os detalhes do empreendimento não puderam ser atualizados. O espelho exibido é de 04/11/2026.');});return()=>controller.abort();},[]);
  const [entry]=useState(()=>{const q=new URLSearchParams(window.location.search);const tower:TowerId=q.get('tower')==='b'?'b':'a';const floor=Number(q.get('floor'));return {tower,floor:Math.max(1,Math.min(tower==='a'?8:9,Number.isInteger(floor)&&floor>0?floor:6)),selected:q.has('floor')};});
  const [tower, setTower] = useState<TowerId>(entry.tower);
  const [floor, setFloor] = useState(entry.floor);
  const [lighting, setLighting] = useState<Lighting>('sunset');
  const [place, setPlace] = useState<Place>(entry.selected?'floors':'overview');
  const [mode, setMode] = useState<'image' | 'model'>('image');
  const [gallery, setGallery] = useState<GalleryId | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const [modelFailed, setModelFailed] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(entry.selected);
  const pageRef = useRef<HTMLElement>(null);
  const controls = useRef<ModelControls | null>(null);
  const media = gallery ? galleries[gallery] : null;
  const openGallery = (id: GalleryId) => { setGallery(id); setImageIndex(0); };
  const selectFloor = (level: number, selectedTower = tower) => { setToolsOpen(true);setSelectedPlan(null);setTower(selectedTower); setFloor(level); setPlace('floors'); };
  const contact = whatsappUrl(`Olá! Gostaria de conhecer o Moradas da Serra, da DeVille, em Vacaria. Estou explorando a torre ${tower === 'a' ? 'A' : 'B'}, ${floor}º andar na apresentação conceitual. Podemos confirmar as plantas e a disponibilidade?`);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => { document.documentElement.dataset.developmentView = mode; return () => { delete document.documentElement.dataset.developmentView; }; }, [mode]);
  function choosePlace(next: Place) {
    setPlace(next);
    if (next === 'leisure') openGallery('leisure');
    if (next === 'surroundings') openGallery('entrance');
    if (next === 'floors') { setToolsOpen(true); }
    if (next === 'overview') { setZoom(1); controls.current?.reset(); }
  }
  function changeZoom(direction: number) { if (mode === 'model') controls.current?.zoom(direction); else setZoom(value => Math.max(1, Math.min(1.7, value + direction * .15))); }
  async function fullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await pageRef.current?.requestFullscreen(); }
    catch { setNotice('Use a opção de tela cheia do seu navegador para ampliar a experiência.'); }
  }
  function startModel() { setMode('model'); setReady(false); setModelFailed(false); }
  return <main id="conteudo" className={`development-page development-page--${mode}`} ref={pageRef}>
    <div className={`development-stage development-stage--${lighting}`} data-testid="development-stage">
      {mode === 'image' ? <div className="development-image-world" style={{ transform: `scale(${zoom})` }}>
        <img src={`${ASSETS}hero.webp`} alt="Reconstrução visual conceitual das duas torres do Moradas da Serra, com áreas de convivência" fetchPriority="high" />

        <SceneOverlay tower={tower} floor={floor} lighting={lighting} showFloor={place==='floors'} onSelectFloor={selectFloor}/>
        <div className="development-hotspots">
          <button className="development-hotspot development-hotspot--court" onClick={() => openGallery('court')}><span>Quadra <ArrowUpRight size={12} /></span><i><Plus size={16} /></i></button>
          <button className="development-hotspot development-hotspot--entrance" onClick={() => openGallery('entrance')}><span>Acesso <ArrowUpRight size={12} /></span><i><Plus size={16} /></i></button>
          <button className="development-hotspot development-hotspot--leisure" onClick={() => openGallery('leisure')}><span>Lazer <ArrowUpRight size={12} /></span><i><Plus size={16} /></i></button>
        </div>
      </div> : <Suspense fallback={null}><DevelopmentModel ref={controls} showFloor={place==='floors'} tower={tower} floor={floor} lighting={lighting} onSelectFloor={selectFloor} onArea={openGallery} onReady={() => setReady(true)} onFail={() => { setModelFailed(true); setReady(false); }} /></Suspense>}
      {mode === 'model' && !ready && !modelFailed && <div className="development-loading" role="status">Preparando a maquete 3D…</div>}
      {mode === 'model' && modelFailed && <div className="development-model-error"><h2>A vista ilustrada continua disponível.</h2><p>Este navegador não conseguiu abrir a maquete 3D.</p><button className="primary-button" onClick={() => setMode('image')}>Voltar à apresentação <ArrowRight size={16} /></button></div>}
    </div>
    <div className="development-veil" aria-hidden="true" />
    <section className="development-intro" aria-labelledby="development-title">
      <a className="development-back" href="https://www.emeselect.com/" target="_blank" rel="noopener noreferrer"><ArrowLeft size={13} /> EME Select</a>
      <p className="eyebrow"><span className="tiny-rule" /> {config.developer} · {config.location}</p>
      <h1 id="development-title">{config.name}<em>Seu lugar, por outro ângulo.</em></h1>
      <p>{config.description}</p>
      <div className="development-view-switch" role="group" aria-label="Visualização do empreendimento">
        <button aria-pressed={mode === 'image'} onClick={() => setMode('image')}><ImageIcon size={14} /> Apresentação</button>
        <button aria-pressed={mode === 'model'} onClick={startModel} disabled={mode === 'model'}><Box size={15} /> Explorar em 3D</button>
      </div>
      <span className="development-model-note">{mode === 'model' ? 'Maquete conceitual · gire para descobrir' : 'Uma experiência EME Select · estudo de apresentação'}</span>
    </section>
    {<><button className="development-panel-toggle" aria-expanded={toolsOpen} onClick={()=>setToolsOpen(v=>!v)}>{toolsOpen?'Recolher disponibilidade':'Consultar unidades'} {toolsOpen?<Minus size={14}/>:<Plus size={14}/>}</button>
    {toolsOpen && <MoradasStockPanel tower={tower==='a'?'A':'B'} floor={floor} setTower={t=>{setTower(t==='A'?'a':'b');setFloor(8);}} setFloor={selectFloor} onClose={()=>setToolsOpen(false)} onUnit={setSelectedUnit}/>}</>}
    <div className="development-bottom">
      <div className="development-navigation"><p className="eyebrow">Explore o empreendimento</p><div role="group" aria-label="Áreas do empreendimento">{([{ id: 'overview', label: 'Visão geral', icon:Scan }, { id: 'floors', label: 'Andares', icon:Layers3 }, { id: 'leisure', label: 'Lazer', icon:Trees }, { id: 'surroundings', label: 'Fachadas', icon:Building2 }] as const).map(item => <button key={item.id} aria-pressed={place === item.id} onClick={() => choosePlace(item.id)}><item.icon size={16}/>{item.label}</button>)}</div></div>
      <div className="development-lighting" role="group" aria-label="Luz do cenário"><span>Luz do cenário<small>Simulação visual</small></span>{([{ id: 'day', label: 'Dia', icon:Sun }, { id: 'sunset', label: 'Entardecer', icon:Sunset }, { id: 'night', label: 'Noite', icon:Moon }] as const).map(item => <button key={item.id} aria-pressed={lighting === item.id} onClick={() => setLighting(item.id)}><item.icon size={16}/>{item.label}</button>)}</div>
      <div className="development-controls"><div><button aria-label="Restaurar visão geral" onClick={() => { setZoom(1); controls.current?.reset(); }}><RotateCcw size={14} /></button><button onClick={fullscreen} aria-label="Alternar tela cheia"><Maximize size={14} /><span>Visão ampla</span></button><button aria-label="Afastar cenário" onClick={() => changeZoom(-1)}><Minus size={16} /></button><button aria-label="Aproximar cenário" onClick={() => changeZoom(1)}><Plus size={16} /></button></div><small>{mode === 'model' ? 'Arraste para girar. Clique em um andar.' : 'Passe o mouse ou toque em um andar.'}</small></div>
    </div>
    <p className="development-footnote">Estudo visual · Arquitetura e disponibilidade sujeitas à validação da incorporadora.</p>
    {notice && <div className="development-notice" role="status"><Check size={14} />{notice}</div>}
    {selectedUnit!==null&&<Suspense fallback={<div className="development-notice" role="status">Abrindo a unidade…</div>}><MoradasUnitExperience number={selectedUnit} config={config} onClose={()=>setSelectedUnit(null)}/></Suspense>}
    {selectedPlan&&<Dialog className="moradas-dialog" title={selectedPlan.title} onClose={()=>setSelectedPlan(null)} wide><img className="development-selected-plan" src={selectedPlan.imageUrl} alt={'Planta '+selectedPlan.title}/><p>{selectedPlan.area} m² · {selectedPlan.bedrooms??'—'} dormitórios · {selectedPlan.suites??'—'} suítes · {selectedPlan.parking??'—'} vagas</p></Dialog>}
    {media && <Dialog className="moradas-dialog" title={media.title} onClose={() => setGallery(null)} wide><div className="development-gallery" onKeyDown={event => { if (event.key === 'ArrowRight') setImageIndex(value => (value + 1) % media.images.length); if (event.key === 'ArrowLeft') setImageIndex(value => (value - 1 + media.images.length) % media.images.length); }}>
      <div className={`development-gallery-image${gallery === 'plans' ? ' is-plan' : ''}`}>
        <DecodedImage src={`${ASSETS}${media.images[imageIndex].file}`} alt={media.images[imageIndex].caption}/>
        {media.images.length > 1 && <><button className="gallery-prev" aria-label="Imagem anterior" onClick={() => setImageIndex(value => (value - 1 + media.images.length) % media.images.length)}><ChevronLeft size={22} /></button><button className="gallery-next" aria-label="Próxima imagem" onClick={() => setImageIndex(value => (value + 1) % media.images.length)}><ChevronRight size={22} /></button></>}
      </div>
      <div className="development-gallery-caption" aria-live="polite"><strong>{media.images[imageIndex].caption}</strong><span>{String(imageIndex + 1).padStart(2, '0')} / {String(media.images.length).padStart(2, '0')}</span></div>
      {media.images.length > 1 && <div className="development-thumbnails" aria-label="Escolher imagem">{media.images.map((item, index) => <button key={item.file} aria-label={item.caption} aria-pressed={index === imageIndex} onClick={() => setImageIndex(index)}><img src={`${ASSETS}${item.file}`} alt="" loading="lazy" /></button>)}</div>}
      <p className="small-copy">{media.note}</p><a className="primary-button" href={contact} target="_blank" rel="noopener noreferrer">Conversar sobre o empreendimento <ArrowUpRight size={16} /></a>
    </div></Dialog>}
  </main>;
}
