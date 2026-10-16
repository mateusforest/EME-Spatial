import {useEffect, useRef, useState} from 'react';
import type {KeyboardEvent} from 'react';
import {ArrowRight, ArrowUpRight, Box, Check, Footprints, Maximize, Menu, SlidersHorizontal, X} from 'lucide-react';
import {offerings as experiences} from './data';
import SceneImage from './SceneImage';
import publicProjects from 'virtual:delivery-public';
import './home-landing.css';

type Scene = 'exterior' | 'interior' | 'aerea';
const scenes: {id: Scene; label: string; image: string; alt: string}[] = [
  {id: 'exterior', label: 'Exterior', image: '/assets/casa-m/reference-cover.webp', alt: 'Prévia conceitual da Casa M: fachada em pedra natural, jardim e garagem.'},
  {id: 'interior', label: 'Interiores', image: '/assets/casa-m/reference-interior.webp', alt: 'Prévia conceitual da sala da Casa M, com sofá verde, madeira e pedra natural.'},
  {id: 'aerea', label: 'Visão aérea', image: '/assets/casa-m/reference-aerial.webp', alt: 'Prévia conceitual aérea da Casa M, mostrando a relação entre a casa, a piscina e o jardim.'},
];


function Brand() {
  return <a className="ms-brand" href="/" aria-label="EME Spatial — início"><img className="ms-brand-logo" src="/assets/spatial-symbol-transparent.png" alt="" width={56} height={64}/><span>SPATIAL</span></a>;
}

function SceneTabs({scene, onChange, prefix}: {scene: Scene; onChange: (scene: Scene) => void; prefix: string}) {
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % scenes.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + scenes.length) % scenes.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = scenes.length - 1;
    else return;
    event.preventDefault();
    onChange(scenes[next].id);
    document.getElementById(`${prefix}-tab-${scenes[next].id}`)?.focus();
  }
  return <div className="ms-scene-tabs" role="tablist" aria-label="Vistas da Casa M">
    {scenes.map((view, index) => <button
      key={view.id}
      type="button"
      role="tab"
      id={`${prefix}-tab-${view.id}`}
      aria-selected={scene === view.id}
      aria-controls={`${prefix}-panel`}
      tabIndex={scene === view.id ? 0 : -1}
      onKeyDown={event => onKeyDown(event, index)}
      onClick={() => onChange(view.id)}
    >{view.label}</button>)}
  </div>;
}

export default function HomeLanding() {
  const [scene, setScene] = useState<Scene>('exterior');
  const [menuOpen, setMenuOpen] = useState(false);
  const [category,setCategory]=useState('Todos');
  const categories=['Todos','Casas','Edifícios','Condomínios'];
  const visibleProjects=publicProjects.filter(p=>category==='Todos'||p.category===category);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const selectedScene = scenes.find(view => view.id === scene)!;

  useEffect(() => {
    // The browser may resolve the incoming anchor before React has created its target.
    const frame=requestAnimationFrame(()=>{
      try { const id=decodeURIComponent(location.hash.slice(1));if(id)document.getElementById(id)?.scrollIntoView({block:'start',behavior:'instant'}); } catch { /* Ignore a malformed external fragment. */ }
    });
    return()=>cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    return () => { document.body.style.removeProperty('overflow'); };
  }, []);

  function openPreview() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
  }

  function closePreview() {
    dialogRef.current?.close();
  }

  function restorePreviewFocus() {
    document.body.style.removeProperty('overflow');
    expandButtonRef.current?.focus({preventScroll: true});
  }

  return <div className="ms-home">
    <a className="ms-skip" href="#conteudo">Pular para o conteúdo</a>
    <header className="ms-header" onKeyDown={event => {if (event.key === 'Escape') {setMenuOpen(false); document.getElementById('ms-menu-button')?.focus();}}}>
      <div className="ms-header-inner">
        <Brand/>
        <button className="ms-menu-button" id="ms-menu-button" type="button" aria-expanded={menuOpen} aria-controls="ms-navigation" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22}/> : <Menu size={22}/>}
        </button>
        <nav className={`ms-navigation${menuOpen ? ' is-open' : ''}`} id="ms-navigation" aria-label="Principal">
          <a href="#experiencia" onClick={() => setMenuOpen(false)}>Experiência</a>
          <a href="#projetos" onClick={() => setMenuOpen(false)}>Projetos</a>
          <a href="#como-funciona" onClick={() => setMenuOpen(false)}>Como funciona</a>
          <a href="#planos" onClick={() => setMenuOpen(false)}>Planos</a>
          <a className="ms-header-cta" href="/criar-projeto">Começar meu projeto <ArrowUpRight size={14}/></a>
        </nav>
      </div>
    </header>

    <main id="conteudo">
      <section className="ms-hero" id="experiencia" aria-labelledby="ms-hero-title">
        <div className="ms-hero-copy">
          <p className="ms-eyebrow">ARQUITETURA EM 3D</p>
          <h1 id="ms-hero-title">Seu projeto em 3D.<br/>Uma experiência<br/>para explorar.</h1>
          <p className="ms-hero-description">Entre nos ambientes, descubra os detalhes e apresente seu projeto por uma nova perspectiva.</p>
          <p className="ms-hero-categories"><a href="/solucoes/casas">Casas</a><span>·</span><a href="/solucoes/interiores">Interiores</a><span>·</span><a href="/solucoes/edificios">Empreendimentos</a></p>
          <div className="ms-hero-actions">
            <a className="ms-button" href="#projetos">Escolher um projeto <ArrowRight size={19}/></a>
            <a className="ms-text-link ms-light-link" href="#como-funciona">Como funciona</a>
          </div>
          <p className="ms-hero-demo-note">No navegador. Sem instalar aplicativos.</p>
        </div>

        <div className={`ms-scene ms-scene-${scene}`}>
          <div className="ms-scene-panel" id="hero-panel" role="tabpanel" aria-labelledby={`hero-tab-${scene}`} tabIndex={0}>
            <SceneImage scene={scene} src={selectedScene.image} alt={selectedScene.alt} className="ms-scene-image" eager/>
          </div>
          <div className="ms-scene-shade" aria-hidden="true"/>
          <p className="ms-scene-eyebrow">0{scenes.findIndex(view=>view.id===scene)+1} / 03 · PERSPECTIVAS DA CASA M</p>
          <div className="ms-scene-bottom">
            <a className="ms-scene-caption" href="/visitar/casa-m" aria-label="Conhecer o projeto Casa M"><strong>Casa M <ArrowUpRight size={16}/></strong><span>Referências visuais · Ver projeto</span></a>
            <SceneTabs scene={scene} onChange={setScene} prefix="hero"/>
            <button className="ms-expand" type="button" aria-label="Ampliar a prévia visual da Casa M" onClick={openPreview} ref={expandButtonRef}><Maximize size={20}/></button>
          </div>
        </div>
      </section>

      <section className="ms-live-demo ms-container" id="experimentar" aria-labelledby="ms-live-demo-title">
        <div className="ms-live-demo-heading"><div><p className="ms-eyebrow">EXPERIMENTE O EME SPATIAL</p><h2 id="ms-live-demo-title">Mais do que olhar. Explorar.</h2></div><p>Conheça a proposta, escolha sua perspectiva e descubra os recursos disponíveis em cada experiência.</p></div>
        <div className="ms-live-demo-features">
          <article><Box size={23} strokeWidth={1.3} aria-hidden="true"/><div><h3>Planta 3D</h3><p>Veja a distribuição dos ambientes e escolha por onde começar.</p></div></article>
          <article><Footprints size={23} strokeWidth={1.3} aria-hidden="true"/><div><h3>Percorrer</h3><p>Explore os espaços e escolha os percursos disponíveis em cada projeto.</p></div></article>
          <article><SlidersHorizontal size={23} strokeWidth={1.3} aria-hidden="true"/><div><h3>Personalizar e iluminar</h3><p>Experimente materiais e cenários de luz no mesmo ambiente.</p></div></article>
        </div>
        <div className="ms-live-demo-actions"><a className="ms-button ms-button-forest" href="/visitar/casa-m">Conhecer a Casa M <ArrowRight size={19}/></a><p className="ms-loading-note">O 3D só carrega ao entrar na experiência.</p></div>
      </section>

      <section className="ms-projects ms-container" id="projetos" aria-labelledby="ms-projects-title">
        <div className="ms-projects-heading" id="autorais">
          <div><p className="ms-eyebrow">PORTFÓLIO INTERATIVO · EME SPATIAL</p><h2 id="ms-projects-title">Escolha seu próximo espaço.</h2></div>
          <p>Uma página para cada projeto. Conheça a proposta, veja as imagens e abra a experiência no seu ritmo.</p>
        </div>
        <div className="ms-project-toolbar"><div className="ms-project-filters" role="group" aria-label="Filtrar projetos por categoria">{categories.map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}<span>{publicProjects.filter(p=>c==='Todos'||p.category===c).length}</span></button>)}</div><p aria-live="polite">{visibleProjects.length} {visibleProjects.length===1?'projeto':'projetos'} para explorar</p></div>
        <div className="ms-project-grid">
          {visibleProjects.map(project => <a className="ms-project" href={project.href} key={project.slug}>
            <div className="ms-project-image"><img src={project.image} alt={project.alt} loading="lazy" decoding="async" width="900" height="600"/><span aria-hidden="true"><ArrowUpRight size={19}/></span></div>
            <div className="ms-project-copy"><div className="ms-project-meta"><span>{project.category}</span><span>{project.stage}</span></div><h3>{project.name}</h3><p>{project.description}</p><ul>{project.highlights.map(h=><li key={h}>{h}</li>)}</ul><span className="ms-project-open">Conhecer projeto <ArrowRight size={17}/></span></div>
          </a>)}
        </div>
        <div className="ms-solutions" id="solucoes"><p>Para o que você imagina.</p><div><a href="/solucoes/casas">Casas</a><a href="/solucoes/interiores">Interiores</a><a href="/solucoes/edificios">Edifícios</a><a href="/solucoes/condominios">Condomínios</a><a href="/solucoes/mixed-use">Mixed Use <ArrowUpRight size={13}/></a></div></div>
      </section>

      <section className="ms-process ms-container" id="como-funciona" aria-labelledby="ms-process-title">
        <h2 id="ms-process-title">Da ideia à experiência.</h2>
        <p className="ms-section-intro">Um caminho claro para visualizar seu projeto.</p>
        <ol className="ms-process-steps">
          {[
            ['01', 'Seu projeto', 'Ideias, referências e objetivos.'],
            ['02', 'Criação em 3D', 'O espaço ganha forma e profundidade.'],
            ['03', 'Explore e apresente', 'Uma experiência para conhecer e compartilhar.'],
          ].map(([number, title, description]) => <li key={number}><span className="ms-step-number" aria-hidden="true">{number}</span><div><h3>{title}</h3><p>{description}</p></div></li>)}
        </ol>
      </section>

      <section className="ms-interior" id="ferramentas" aria-labelledby="ms-interior-title">
        <div className="ms-interior-image">
          <img src="/assets/casa-m/reference-interior.webp" alt="Sala da Casa M com madeira, pedra natural e estofados — referência visual." loading="lazy" decoding="async"/>
          <p className="ms-interior-caption">SALA DE ESTAR · CASA M</p>
          <a className="ms-interior-visit" href="/visitar/casa-m">Conhecer a Casa M <ArrowUpRight size={17}/></a>
        </div>
        <div className="ms-interior-copy">
          <p className="ms-eyebrow">DENTRO DO PROJETO</p>
          <h2 id="ms-interior-title">Veja o espaço.<br/>Entenda cada detalhe.</h2>
          <p>Do exterior aos ambientes internos, explore a arquitetura e compreenda o projeto.</p>
          <span className="ms-fine-rule" aria-hidden="true"/>
          <a className="ms-text-link" href="/visitar/casa-m">Conhecer a experiência <ArrowRight size={19}/></a>
          <span className="ms-interior-link-note">Explore os dois pavimentos da Casa M.</span>
        </div>
      </section>

      <section className="ms-experience" id="planos" aria-labelledby="ms-experience-title">
        <div className="ms-container">
          <div className="ms-experience-heading" id="spatial-experience">
            <div><p className="ms-eyebrow">PLANOS · SPATIAL EXPERIENCE</p><h2 id="ms-experience-title">A experiência certa para o seu projeto.</h2></div>
            <p>Produção de experiências 3D para arquitetos, escritórios e empreendimentos. Escolha o ponto de partida; nós damos forma à experiência.</p>
          </div>
          <div className="ms-experience-grid">
            {experiences.map((experience, index) => <article className={`ms-experience-card${experience.name === 'Signature' ? ' ms-experience-signature' : ''}`} key={experience.name} aria-labelledby={`ms-package-${index}`}>
              <div className="ms-experience-card-top"><span aria-hidden="true">0{index + 1}</span><span>{experience.name === 'Signature' ? 'EM DESTAQUE' : 'PRODUÇÃO SOB DEMANDA'}</span></div>
              <h3 id={`ms-package-${index}`}>{experience.name}</h3>
              <p className="ms-experience-caption">{experience.caption}</p>
              <p className="ms-experience-description">{experience.description}</p>
              <ul>{experience.features.map(feature => <li key={feature}><Check size={16} strokeWidth={1.5} aria-hidden="true"/><span>{feature}</span></li>)}</ul>
              <a className="ms-experience-link" href={`/criar-projeto?${new URLSearchParams({nivel:experience.id,interesse: `Spatial Experience — ${experience.name}`})}`} aria-label={`Preparar meu projeto com Spatial Experience ${experience.name}`}>Preparar meu projeto <ArrowUpRight size={17} aria-hidden="true"/></a>
            </article>)}
          </div>
          <p className="ms-experience-note">Cada projeto começa com uma análise dos materiais disponíveis. Ambientes, recursos, entregas e revisões são definidos na proposta personalizada.</p>
        </div>
      </section>
    </main>

    <footer className="ms-footer">
      <div className="ms-container">
        <div className="ms-footer-invitation"><h2>Vamos dar forma ao seu projeto?</h2><a className="ms-button" href="/criar-projeto">Começar meu projeto <ArrowRight size={19}/></a></div>
        <div className="ms-footer-brand"><Brand/><span aria-hidden="true"/></div>
        <div className="ms-footer-bottom"><p>Arquitetura, visualização e novas possibilidades.</p><nav aria-label="Links complementares"><a href="#projetos">Todos os projetos</a><a href="#planos">Planos</a><a href="/personalizar">Personalização</a><a href="/portal">Workspace <ArrowUpRight size={12}/></a></nav></div>
      </div>
    </footer>


    <dialog className="ms-preview-dialog" ref={dialogRef} onClose={restorePreviewFocus} aria-labelledby="ms-preview-title" onClick={event => {if (event.target === event.currentTarget) closePreview();}}>
      <div className="ms-preview-inner">
        <div className="ms-preview-heading"><div><h2 id="ms-preview-title">Casa M</h2><p>Prévia visual conceitual</p></div><button className="ms-expand" type="button" aria-label="Fechar prévia ampliada" onClick={closePreview} autoFocus><X size={23}/></button></div>
        <div className="ms-preview-image" id="preview-panel" role="tabpanel" aria-labelledby={`preview-tab-${scene}`} tabIndex={0}><SceneImage scene={scene} src={selectedScene.image} alt={selectedScene.alt} className="ms-transition-contain"/></div>
        <div className="ms-preview-controls"><SceneTabs scene={scene} onChange={setScene} prefix="preview"/><p>Escolha uma vista para conhecer o espaço.</p></div>
      </div>
    </dialog>
  </div>;
}
