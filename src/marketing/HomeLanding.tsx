import {useEffect, useRef, useState} from 'react';
import {ArrowRight, ArrowUpRight, Box, Check, Footprints, Menu, Pause, Play, SlidersHorizontal, X} from 'lucide-react';
import {offerings as experiences} from './data';
import publicProjects from 'virtual:delivery-public';
import './home-landing.css';

function Brand() {
  return <a className="ms-brand" href="/" aria-label="EME Spatial — início"><img className="ms-brand-logo" src="/assets/spatial-symbol-transparent.png" alt="" width={56} height={64}/><span>SPATIAL</span></a>;
}

function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      if (reduced.matches || document.hidden || userPaused.current) video.pause();
      else void video.play().catch(() => setPlaying(false));
    };
    reduced.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => {
      reduced.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);
  return <div className="ms-hero-film">
    <video ref={videoRef} muted loop playsInline preload="metadata" poster="/assets/marketing/spatial-immersive-poster.webp" aria-label="Demonstração do EME Spatial: exterior, interiores e varanda em 3D" onPlay={() => {setPlaying(true);setFailed(false);}} onPause={() => setPlaying(false)} onError={() => {if(videoRef.current?.error) setFailed(true);}}>
      <source src="/assets/marketing/spatial-immersive-mobile.mp4" type="video/mp4" media="(max-width: 700px)"/>
      <source src="/assets/marketing/spatial-immersive.mp4" type="video/mp4"/>
    </video>
    <div className="ms-film-shade" aria-hidden="true"/>
    {!failed && <button className="ms-film-toggle" type="button" aria-label={playing ? 'Pausar vídeo' : 'Reproduzir vídeo'} onClick={() => {
      const video = videoRef.current;
      if (!video) return;
      userPaused.current = !video.paused;
      if (video.paused) void video.play().catch(() => setPlaying(false));
      else video.pause();
    }}>{playing ? <Pause size={16}/> : <Play size={16}/>}</button>}
  </div>;
}

export default function HomeLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [category,setCategory]=useState('Todos');
  const categories=['Todos','Casas','Edifícios','Condomínios'];
  const visibleProjects=publicProjects.filter(p=>category==='Todos'||p.category===category);
  useEffect(() => {
    // The browser may resolve the incoming anchor before React has created its target.
    const frame=requestAnimationFrame(()=>{
      try { const id=decodeURIComponent(location.hash.slice(1));if(id)document.getElementById(id)?.scrollIntoView({block:'start',behavior:'instant'}); } catch { /* Ignore a malformed external fragment. */ }
    });
    return()=>cancelAnimationFrame(frame);
  }, []);

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
        <HeroVideo/>
        <div className="ms-hero-copy">
          <p className="ms-eyebrow">3D IMERSIVO</p>
          <h1 id="ms-hero-title">Seu projeto.<br/>Uma nova perspectiva.</h1>
          <p className="ms-hero-description">Explore cada espaço, antes de existir.</p>
          <div className="ms-hero-actions">
            <a className="ms-button" href="#projetos">Explorar projetos <ArrowUpRight size={18}/></a>
          </div>
        </div>
      </section>

      <section className="ms-live-demo ms-container" id="experimentar" aria-labelledby="ms-live-demo-title">
        <div className="ms-live-demo-heading"><div><p className="ms-eyebrow">EXPERIMENTE O EME SPATIAL</p><h2 id="ms-live-demo-title">Mais do que olhar. Explorar.</h2></div><p>Navegue, personalize e descubra cada ambiente.</p></div>
        <div className="ms-live-demo-features">
          <article><Box size={23} strokeWidth={1.3} aria-hidden="true"/><div><h3>Planta 3D</h3><p>Veja a distribuição dos ambientes e escolha por onde começar.</p></div></article>
          <article><Footprints size={23} strokeWidth={1.3} aria-hidden="true"/><div><h3>Percorrer</h3><p>Explore os espaços e escolha os percursos disponíveis em cada projeto.</p></div></article>
          <article><SlidersHorizontal size={23} strokeWidth={1.3} aria-hidden="true"/><div><h3>Personalizar e iluminar</h3><p>Experimente materiais e cenários de luz no mesmo ambiente.</p></div></article>
        </div>
        <div className="ms-live-demo-actions"><a className="ms-button ms-button-forest" href="/visitar/casa-m">Conhecer a Casa M <ArrowRight size={19}/></a><p className="ms-loading-note">O 3D só carrega ao entrar na experiência.</p></div>
      </section>

      <section className="ms-projects ms-container" id="projetos" aria-labelledby="ms-projects-title">
        <div className="ms-projects-heading" id="autorais">
          <div><p className="ms-eyebrow">PROJETOS</p><h2 id="ms-projects-title">Escolha seu próximo espaço.</h2></div>
          <p>Escolha um projeto e entre na experiência.</p>
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
            <p>Três formas de transformar seu projeto em uma experiência.</p>
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



  </div>;
}
