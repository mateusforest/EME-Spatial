import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Box,Play,Sun} from 'lucide-react';
import {M_LEVELS,unitForFloor,unitFloorLabel,areaLabel} from '../developments/mUnits';
import './torre-presentation.css';

export default function TorreMPresentation({onApartment,active}:{onApartment:()=>void;active:boolean}){
 const [floor,setFloor]=useState(14),[playing,setPlaying]=useState(false);
 const video=useRef<HTMLVideoElement>(null);
 useEffect(()=>{if(!active)video.current?.pause();},[active]);
 const unit=unitForFloor(floor);
 return <>
  <section className="torre-film" aria-labelledby="torre-film-title">
   <div><p className="delivery-eyebrow">APARTAMENTO 14 · FILME DO MODELO</p><h2 id="torre-film-title">Entre. Observe.<br/>Imagine morar.</h2><p>Um percurso pelo interior, renderizado a partir do modelo da Torre M. Assista primeiro e depois explore os ambientes no seu ritmo.</p><a className="delivery-pdf" href="/assets/m/cycles74/percurso.mp4" download="Torre-M-Apartamento-14.mp4">Baixar o filme<ArrowRight size={16}/></a><small>Vídeo renderizado. A aparência do 3D interativo pode variar conforme o aparelho.</small></div>
   <div className="torre-film-stage">{playing?<video ref={video} controls autoPlay playsInline preload="none" poster="/assets/m/cycles74/living.webp" aria-label="Percurso renderizado pelo Apartamento 14"><source src="/assets/m/cycles74/percurso.mp4" type="video/mp4"/>Seu navegador não reproduz este vídeo. <a href="/assets/m/cycles74/percurso.mp4">Baixar vídeo</a></video>:<button onClick={()=>setPlaying(true)} aria-label="Assistir ao filme do Apartamento 14"><img src="/assets/m/cycles74/living.webp" alt="Living do Apartamento 14 · render do modelo" loading="lazy"/><span><Play size={21}/>Assistir ao filme</span></button>}</div>
  </section>
  <section className="torre-residences" aria-labelledby="torre-residences-title">
   <div><p className="delivery-eyebrow">RESIDÊNCIAS · CONSULTA DEMONSTRATIVA</p><h2 id="torre-residences-title">Uma perspectiva<br/>em cada andar.</h2><p>Selecione um andar para conhecer a tipologia deste estudo. O Apartamento 14 está preparado para a visita completa.</p><p className="torre-inventory-note">Sem estoque comercial conectado. Disponibilidade e valores serão informados pela construtora.</p><div className="torre-floor-grid" role="group" aria-label="Selecionar andar">{Array.from({length:M_LEVELS},(_,i)=>M_LEVELS-i).map(n=><button key={n} aria-pressed={floor===n} onClick={()=>setFloor(n)} aria-label={`${n}º andar`}>{n}<span>º</span></button>)}</div></div>
   <article className="torre-unit" aria-live="polite"><p>{unitFloorLabel(unit)}</p><h3>{unit.name}</h3><dl><div><dt>Área do estudo</dt><dd>{areaLabel(unit.area)}</dd></div><div><dt>Suítes</dt><dd>{unit.suites}</dd></div><div><dt>Disponibilidade</dt><dd>A consultar</dd></div></dl><p>{unit.description}</p><button className="delivery-primary" onClick={onApartment}><Box size={18}/>{floor===14?'Visitar este apartamento':'Conhecer o apartamento modelo · 14'}<ArrowRight size={18}/></button><small>Projeto conceitual. Áreas estimadas do modelo, incluindo paredes e terraços; não são áreas comerciais verificadas.</small></article>
  </section>
  <section className="torre-sun"><Sun size={29}/><div><h2>A luz transforma os ambientes.</h2><p>Durante a visita 3D, mova o horário para observar a iluminação. Na Torre M, o percurso solar é ilustrativo. Para o empreendimento da construtora, o cálculo deverá usar localização, data e orientação confirmadas.</p></div></section>
 </>;
}
