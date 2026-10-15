import {useEffect, useRef, useState} from 'react';
import type {KeyboardEvent, MouseEvent} from 'react';
import {ArrowRight, ArrowUpRight, Box, Check, Footprints, Maximize, Menu, SlidersHorizontal, X} from 'lucide-react';
import DemoDialog from './DemoDialog';
import SceneImage from './SceneImage';
import publicProjects from 'virtual:delivery-public';
import './home-landing.css';

type Scene = 'exterior' | 'interior' | 'aerea';
const scenes: {id: Scene; label: string; image: string; alt: string}[] = [
  {id: 'exterior', label: 'Exterior', image: '/assets/marketing/casa-m-exterior.webp', alt: 'Prévia conceitual da Casa M: fachada curva em pedra natural, vegetação e piscina.'},
  {id: 'interior', label: 'Interiores', image: '/assets/marketing/casa-m-interior.webp', alt: 'Prévia conceitual da sala da Casa M, com materiais naturais e abertura para a varanda e a piscina.'},
  {id: 'aerea', label: 'Visão aérea', image: '/assets/marketing/casa-m-aerea.webp', alt: 'Prévia conceitual aérea da Casa M, mostrando a relação entre a casa, a piscina e o jardim.'},
];

const experiences = [
  {
    name: 'Essential',
    caption: 'O primeiro passo para explorar.',
    description: 'Para ambientes e residências com uma apresentação objetiva, a partir de um modelo 3D existente.',
    features: ['Preparação do modelo fornecido', 'Materiais e iluminação essenciais', 'Navegação pelos ambientes definidos', 'Experiência para apresentar e compartilhar'],
  },
  {
    name: 'Signature',
    caption: 'Cada detalhe faz parte da experiência.',
    description: 'Para residências de médio e alto padrão que pedem mais profundidade visual e cuidado na apresentação.',
    features: ['Interiores e exteriores integrados', 'Materiais e texturas refinados', 'Iluminação e perspectivas personalizadas', 'Pontos de interesse e identidade visual'],
  },
  {
    name: 'Exclusive',
    caption: 'Uma experiência na escala da sua visão.',
    description: 'Para casas exclusivas, condomínios e empreendimentos com uma experiência desenvolvida sob medida.',
    features: ['Modelagem e otimização sob medida', 'Paisagismo e contexto do projeto', 'Interações personalizadas', 'Apresentação comercial do empreendimento'],
  },
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
  const [demoOpen, setDemoOpen] = useState(false);
  const demoTriggerRef = useRef<HTMLElement | null>(null);
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

  function openDemo(event: MouseEvent<HTMLButtonElement>) {
    demoTriggerRef.current = event.currentTarget;
    setDemoOpen(true);
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
          <a href="#spatial-experience" onClick={() => setMenuOpen(false)}>Spatial Experience</a>
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
            <button className="ms-button" type="button" onClick={openDemo} aria-haspopup="dialog">Experimentar em 3D <ArrowRight size={19}/></button>
            <a className="ms-text-link ms-light-link" href="#como-funciona">Como funciona</a>
          </div>
          <p className="ms-hero-demo-note">Demonstração interativa · Torre M, Apartamento 14.</p>
        </div>

        <div className={`ms-scene ms-scene-${scene}`}>
          <div className="ms-scene-panel" id="hero-panel" role="tabpanel" aria-labelledby={`hero-tab-${scene}`} tabIndex={0}>
            <SceneImage scene={scene} src={selectedScene.image} alt={selectedScene.alt} className="ms-scene-image" eager/>
          </div>
          <div className="ms-scene-shade" aria-hidden="true"/>
          <p className="ms-scene-eyebrow">CONHEÇA OUTRAS PERSPECTIVAS</p>
          <button className={`ms-hotspot ms-hero-hotspot ms-hotspot-${scene}`} type="button" onClick={() => setScene(scene === 'interior' ? 'exterior' : 'interior')}>
            <span className="ms-hotspot-dot" aria-hidden="true"><span/></span>
            <span className="ms-hotspot-label">{scene === 'interior' ? 'Ir para a varanda' : 'Sala de estar'} <ArrowRight size={14}/></span>
          </button>
          <div className="ms-scene-bottom">
            <p className="ms-scene-caption"><strong>Casa M</strong><span>Prévia conceitual</span></p>
            <SceneTabs scene={scene} onChange={setScene} prefix="hero"/>
            <button className="ms-expand" type="button" aria-label="Ampliar a prévia visual da Casa M" onClick={openPreview} ref={expandButtonRef}><Maximize size={20}/></button>
          </div>
        </div>
      </section>

      <section className="ms-live-demo ms-container" id="experimentar" aria-labelledby="ms-live-demo-title">
        <div className="ms-live-demo-heading"><div><p className="ms-eyebrow">EXPERIMENTE O M SPATIAL</p><h2 id="ms-live-demo-title">Entre no projeto.</h2></div><p>Conheça o Apartamento 14 da Torre M em uma experiência 3D que responde às suas escolhas.</p></div>
        <div className="ms-live-demo-features">
          <article><Box size={23} strokeWidth={1.3} aria-hidden="true"/><div><h3>Planta 3D</h3><p>Veja a distribuição dos ambientes e escolha por onde começar.</p></div></article>
          <article><Footprints size={23} strokeWidth={1.3} aria-hidden="true"/><div><h3>Percorrer</h3><p>Entre nos espaços e mova a câmera pelo apartamento.</p></div></article>
          <article><SlidersHorizontal size={23} strokeWidth={1.3} aria-hidden="true"/><div><h3>Personalizar e iluminar</h3><p>Experimente materiais e cenários de luz no mesmo ambiente.</p></div></article>
        </div>
        <div className="ms-live-demo-actions"><button className="ms-button ms-button-forest" type="button" onClick={openDemo} aria-haspopup="dialog">Experimentar em 3D <ArrowRight size={19}/></button><a className="ms-text-link" href="/apresentar/m">Explorar o edifício completo <ArrowUpRight size={16}/></a></div>
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
          {publicProjects.map(project => <a className="ms-project" href={project.href} key={project.name}>
            <div className="ms-project-image"><img src={project.image} alt={project.alt} loading="lazy" decoding="async"/><span aria-hidden="true"><ArrowUpRight size={19}/></span></div>
            <h3>{project.name}</h3><p>{project.description}</p>
          </a>)}
        </div>
        <div className="ms-solutions" id="solucoes"><p>Para o que você imagina.</p><div><a href="/solucoes/casas">Casas</a><a href="/solucoes/interiores">Interiores</a><a href="/solucoes/edificios">Edifícios</a><a href="/solucoes/condominios">Condomínios</a><a href="/solucoes/mixed-use">Mixed Use <ArrowUpRight size={13}/></a></div></div>
      </section>

      <section className="ms-experience" id="spatial-experience" aria-labelledby="ms-experience-title">
        <div className="ms-container">
          <div className="ms-experience-heading">
            <div><p className="ms-eyebrow">SPATIAL EXPERIENCE</p><h2 id="ms-experience-title">Seu projeto, em outra dimensão.</h2></div>
            <p>Produção de experiências 3D para arquitetos, escritórios e empreendimentos. Escolha o ponto de partida; nós damos forma à experiência.</p>
          </div>
          <div className="ms-experience-grid">
            {experiences.map((experience, index) => <article className={`ms-experience-card${experience.name === 'Signature' ? ' ms-experience-signature' : ''}`} key={experience.name} aria-labelledby={`ms-package-${index}`}>
              <div className="ms-experience-card-top"><span aria-hidden="true">0{index + 1}</span><span>{experience.name === 'Signature' ? 'EM DESTAQUE' : 'PRODUÇÃO SOB DEMANDA'}</span></div>
              <h3 id={`ms-package-${index}`}>{experience.name}</h3>
              <p className="ms-experience-caption">{experience.caption}</p>
              <p className="ms-experience-description">{experience.description}</p>
              <ul>{experience.features.map(feature => <li key={feature}><Check size={16} strokeWidth={1.5} aria-hidden="true"/><span>{feature}</span></li>)}</ul>
              <a className="ms-experience-link" href={`/criar-projeto?${new URLSearchParams({interesse: `Spatial Experience — ${experience.name}`})}`} aria-label={`Preparar meu projeto com Spatial Experience ${experience.name}`}>Preparar meu projeto <ArrowUpRight size={17} aria-hidden="true"/></a>
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
        <div className="ms-footer-bottom"><p>Arquitetura, visualização e novas possibilidades.</p><nav aria-label="Links complementares"><a href="/projetos/torre-m">Projetos autorais</a><a href="/personalizar">Personalização</a><a href="/portal">Workspace <ArrowUpRight size={12}/></a></nav></div>
      </div>
    </footer>

    {demoOpen && <DemoDialog onClose={() => setDemoOpen(false)} returnFocusTo={demoTriggerRef.current}/>}

    <dialog className="ms-preview-dialog" ref={dialogRef} onClose={restorePreviewFocus} aria-labelledby="ms-preview-title" onClick={event => {if (event.target === event.currentTarget) closePreview();}}>
      <div className="ms-preview-inner">
        <div className="ms-preview-heading"><div><h2 id="ms-preview-title">Casa M</h2><p>Prévia visual conceitual</p></div><button className="ms-expand" type="button" aria-label="Fechar prévia ampliada" onClick={closePreview} autoFocus><X size={23}/></button></div>
        <div className="ms-preview-image" id="preview-panel" role="tabpanel" aria-labelledby={`preview-tab-${scene}`} tabIndex={0}><SceneImage scene={scene} src={selectedScene.image} alt={selectedScene.alt} className="ms-transition-contain"/></div>
        <div className="ms-preview-controls"><SceneTabs scene={scene} onChange={setScene} prefix="preview"/><p>Escolha uma vista para conhecer o espaço.</p></div>
      </div>
    </dialog>
  </div>;
}
