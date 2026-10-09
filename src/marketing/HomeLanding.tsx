import {useEffect, useRef, useState} from 'react';
import type {KeyboardEvent} from 'react';
import {ArrowRight, ArrowUpRight, Maximize, Menu, X} from 'lucide-react';
import './home-landing.css';

type Scene = 'exterior' | 'interior' | 'aerea';
const scenes: {id: Scene; label: string; image: string; alt: string}[] = [
  {id: 'exterior', label: 'Exterior', image: '/assets/marketing/casa-m-exterior.webp', alt: 'Prévia conceitual da Casa M: fachada curva em pedra natural, vegetação e piscina.'},
  {id: 'interior', label: 'Interiores', image: '/assets/marketing/casa-m-interior.webp', alt: 'Prévia conceitual da sala da Casa M, com materiais naturais e abertura para a varanda e a piscina.'},
  {id: 'aerea', label: 'Visão aérea', image: '/assets/marketing/casa-m-aerea.webp', alt: 'Prévia conceitual aérea da Casa M, mostrando a relação entre a casa, a piscina e o jardim.'},
];

function Brand() {
  return <a className="ms-brand" href="/" aria-label="M Spatial — início"><span className="ms-brand-symbol" aria-hidden="true">M</span><span>SPATIAL</span></a>;
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const selectedScene = scenes.find(view => view.id === scene)!;

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

  function returnToExterior() {
    setScene('exterior');
    document.getElementById('experiencia')?.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    document.getElementById('hero-tab-exterior')?.focus({preventScroll: true});
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
          <a className="ms-header-cta" href="/criar-projeto">Começar meu projeto <ArrowUpRight size={14}/></a>
        </nav>
      </div>
    </header>

    <main id="conteudo">
      <section className="ms-hero" id="experiencia" aria-labelledby="ms-hero-title">
        <div className="ms-hero-copy">
          <p className="ms-eyebrow">ARQUITETURA EM 3D</p>
          <h1 id="ms-hero-title">Seu projeto em 3D.<br/>Uma experiência<br/>para explorar.</h1>
          <p className="ms-hero-description">Criação e visualização imersiva para projetos de arquitetura e interiores.</p>
          <p className="ms-hero-categories"><a href="/solucoes/casas">Casas</a><span>·</span><a href="/solucoes/interiores">Interiores</a><span>·</span><a href="/solucoes/edificios">Empreendimentos</a></p>
          <div className="ms-hero-actions">
            <a className="ms-button" href="/apresentar/m" title="Explorar a Torre M em 3D">Explorar um projeto <ArrowRight size={19}/></a>
            <a className="ms-text-link ms-light-link" href="#como-funciona">Como funciona</a>
          </div>
          <p className="ms-hero-demo-note">Explore a experiência 3D da Torre M.</p>
        </div>

        <div className={`ms-scene ms-scene-${scene}`}>
          <div className="ms-scene-panel" id="hero-panel" role="tabpanel" aria-labelledby={`hero-tab-${scene}`} tabIndex={0}>
            <img className="ms-scene-image" src={selectedScene.image} alt={selectedScene.alt} fetchPriority="high" decoding="async"/>
          </div>
          <div className="ms-scene-shade" aria-hidden="true"/>
          <p className="ms-scene-eyebrow">CONHEÇA OUTRAS PERSPECTIVAS</p>
          <button className={`ms-hotspot ms-hero-hotspot ms-hotspot-${scene}`} type="button" onClick={() => setScene(scene === 'interior' ? 'exterior' : 'interior')}>
            <span className="ms-hotspot-dot" aria-hidden="true"><span/></span>
            <span className="ms-hotspot-label">{scene === 'interior' ? 'Ir para a varanda' : 'Sala de estar'} <ArrowRight size={14}/></span>
          </button>
          <div className="ms-scene-bottom">
            <p className="ms-scene-caption"><strong>Casa M</strong><span>Prévia visual</span></p>
            <SceneTabs scene={scene} onChange={setScene} prefix="hero"/>
            <button className="ms-expand" type="button" aria-label="Ampliar a prévia visual da Casa M" onClick={openPreview} ref={expandButtonRef}><Maximize size={20}/></button>
          </div>
        </div>
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
          <img src="/assets/marketing/casa-m-interior.webp" alt="Sala da Casa M integrada à varanda e à área da piscina — prévia visual conceitual." loading="lazy" decoding="async"/>
          <p className="ms-interior-caption">SALA DE ESTAR · CASA M</p>
          <button className="ms-hotspot ms-interior-hotspot" type="button" onClick={returnToExterior}><span className="ms-hotspot-dot" aria-hidden="true"><span/></span><span className="ms-hotspot-label">Ir para a varanda <ArrowRight size={14}/></span></button>
        </div>
        <div className="ms-interior-copy">
          <p className="ms-eyebrow">DENTRO DO PROJETO</p>
          <h2 id="ms-interior-title">Veja o espaço.<br/>Entenda cada detalhe.</h2>
          <p>Do exterior aos ambientes internos, explore a arquitetura e compreenda o projeto.</p>
          <span className="ms-fine-rule" aria-hidden="true"/>
          <a className="ms-text-link" href="/apresentar/m?apartamento=14">Conhecer a experiência <ArrowRight size={19}/></a>
          <span className="ms-interior-link-note">Navegue pelo apartamento da Torre M.</span>
        </div>
      </section>

      <section className="ms-projects ms-container" id="projetos" aria-labelledby="ms-projects-title">
        <div className="ms-projects-heading" id="autorais">
          <div><p className="ms-eyebrow">OUTRAS FORMAS DE EXPLORAR</p><h2 id="ms-projects-title">Novas perspectivas.</h2></div>
          <p>Conheça os projetos e experiências do M Spatial.</p>
        </div>
        <div className="ms-project-grid">
          {[
            {name: 'Torre M', image: '/assets/torre.webp', href: '/apresentar/m', description: 'Projeto autoral · Experiência 3D', alt: 'Torre M: edifício conceitual com varandas curvas e vegetação.'},
            {name: 'G400', image: '/assets/g400.webp', href: '/apresentar/g400', description: 'Empreendimento · Apresentação visual', alt: 'Fachada do empreendimento G400.'},
            {name: 'Moradas da Serra', image: '/assets/moradas.webp', href: '/apresentar/moradas-da-serra', description: 'Empreendimento · Experiência interativa', alt: 'Vista do empreendimento Moradas da Serra.'},
          ].map(project => <a className="ms-project" href={project.href} key={project.name}>
            <div className="ms-project-image"><img src={project.image} alt={project.alt} loading="lazy" decoding="async"/><span aria-hidden="true"><ArrowUpRight size={19}/></span></div>
            <h3>{project.name}</h3><p>{project.description}</p>
          </a>)}
        </div>
        <div className="ms-solutions" id="solucoes"><p>Para o que você imagina.</p><div><a href="/solucoes/casas">Casas</a><a href="/solucoes/interiores">Interiores</a><a href="/solucoes/edificios">Edifícios</a><a href="/solucoes/condominios">Condomínios</a><a href="/solucoes/mixed-use">Mixed Use <ArrowUpRight size={13}/></a></div></div>
      </section>
    </main>

    <footer className="ms-footer">
      <div className="ms-container">
        <div className="ms-footer-invitation"><h2>Vamos dar forma ao seu projeto?</h2><a className="ms-button" href="/criar-projeto">Começar meu projeto <ArrowRight size={19}/></a></div>
        <div className="ms-footer-brand"><Brand/><span aria-hidden="true"/></div>
        <div className="ms-footer-bottom"><p>Arquitetura, visualização e novas possibilidades.</p><nav aria-label="Links complementares"><a href="/projetos/torre-m">Projetos autorais</a><a href="/personalizar">Personalização</a><a href="/portal">Workspace <ArrowUpRight size={12}/></a></nav></div>
      </div>
    </footer>

    <dialog className="ms-preview-dialog" ref={dialogRef} onClose={restorePreviewFocus} aria-labelledby="ms-preview-title" onClick={event => {if (event.target === event.currentTarget) closePreview();}}>
      <div className="ms-preview-inner">
        <div className="ms-preview-heading"><div><h2 id="ms-preview-title">Casa M</h2><p>Prévia visual conceitual</p></div><button className="ms-expand" type="button" aria-label="Fechar prévia ampliada" onClick={closePreview} autoFocus><X size={23}/></button></div>
        <div className="ms-preview-image" id="preview-panel" role="tabpanel" aria-labelledby={`preview-tab-${scene}`} tabIndex={0}><img src={selectedScene.image} alt={selectedScene.alt}/></div>
        <div className="ms-preview-controls"><SceneTabs scene={scene} onChange={setScene} prefix="preview"/><p>Escolha uma vista para conhecer o espaço.</p></div>
      </div>
    </dialog>
  </div>;
}
