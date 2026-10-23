import {useEffect, useRef, useState} from 'react';
import {ArrowRight, ArrowUpRight, Footprints, Menu, SlidersHorizontal, X} from 'lucide-react';
import {offerings as experiences} from './data';
import './home-landing.css';
import './landing-content.css';

function Brand() {
  return <a className="ms-brand" href="/" aria-label="EME Spatial — início"><img className="ms-brand-logo" src="/assets/spatial-symbol-transparent.png" alt="" width={56} height={64}/><span>SPATIAL</span></a>;
}

function HeroVideo() {
  return <div className="ms-hero-film">
    <video autoPlay muted loop playsInline preload="metadata" poster="/assets/marketing/spatial-hero-v2-poster.webp" aria-label="EME Spatial: fachadas, interiores e perspectivas em 3D">
      <source src="/assets/marketing/spatial-hero-v2-mobile.mp4" type="video/mp4" media="(max-width: 700px)"/>
      <source src="/assets/marketing/spatial-hero-v2.mp4" type="video/mp4"/>
    </video>
    <div className="ms-film-shade" aria-hidden="true"/>
  </div>;
}

function ProductVideo() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (!('IntersectionObserver' in window)) { setReady(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setReady(true);
        observer.disconnect();
      }
    }, {rootMargin: '100px'});
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);
  return <div className="ms-product-stage" ref={stageRef}>
    {ready ? <video autoPlay muted loop playsInline preload="metadata" poster="/assets/marketing/spatial-product-v2-poster.webp" aria-label="Percurso por ambientes, interiores e vistas aéreas em 3D">
      <source src="/assets/marketing/spatial-product-v2-mobile.mp4" type="video/mp4" media="(max-width: 700px)"/>
      <source src="/assets/marketing/spatial-product-v2.mp4" type="video/mp4"/>
    </video> : <img src="/assets/marketing/spatial-product-v2-poster.webp" alt="Interior apresentado na sequência de vídeos do EME Spatial." loading="lazy" decoding="async" width="1920" height="1080"/>}
  </div>;
}

const planIntroductions: Record<string, string> = {
  visual: 'Um modelo existente. Novas possibilidades.',
  interactive: 'Interiores, exteriores e cada detalhe.',
  signature: 'Uma experiência feita sob medida.',
};

export default function HomeLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    // The browser may resolve the incoming anchor before React has created its target.
    const frame=requestAnimationFrame(()=>{
      try { const requested=decodeURIComponent(location.hash.slice(1));const aliases: Record<string,string>={projetos:'experimentar',autorais:'experimentar',solucoes:'possibilidades',ferramentas:'possibilidades'};const id=aliases[requested]||requested;if(id)document.getElementById(id)?.scrollIntoView({block:'start',behavior:'instant'}); } catch { /* Ignore a malformed external fragment. */ }
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
          <a href="#experimentar" onClick={() => setMenuOpen(false)}>Experiência</a>
          <a href="#possibilidades" onClick={() => setMenuOpen(false)}>Possibilidades</a>
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
            <a className="ms-button" href="#experimentar">Conhecer a experiência <ArrowUpRight size={18}/></a>
          </div>
        </div>
      </section>

      <section className="ms-product ms-container" id="experimentar" aria-labelledby="ms-product-title">
        <div className="ms-product-heading">
          <div><p className="ms-eyebrow">DO PROJETO À EXPERIÊNCIA</p><h2 id="ms-product-title">O espaço ganha vida.</h2></div>
          <p>Um ambiente que você pode percorrer,<br className="ms-desktop-break"/> transformar e apresentar.</p>
        </div>
        <ProductVideo/>
        <div className="ms-product-note"><span>Exterior. Interior. Novas perspectivas.</span><span>Uma nova forma de apresentar.</span></div>
      </section>

      <section className="ms-benefits ms-container" id="possibilidades" aria-labelledby="ms-benefits-title">
        <div className="ms-benefits-heading"><p className="ms-eyebrow">MAIS DO QUE UMA IMAGEM</p><h2 id="ms-benefits-title">Veja. Experimente. Decida.</h2></div>
        <div className="ms-benefits-grid">
          <article><Footprints size={25} strokeWidth={1.3} aria-hidden="true"/><h3>Explore os espaços.</h3><p>Percorra os ambientes e descubra cada perspectiva.</p></article>
          <article><SlidersHorizontal size={25} strokeWidth={1.3} aria-hidden="true"/><h3>Visualize suas escolhas.</h3><p>Experimente materiais, mobiliário e cenários de luz.</p></article>
          <article><ArrowUpRight size={25} strokeWidth={1.3} aria-hidden="true"/><h3>Apresente por um link.</h3><p>Leve a experiência até seus clientes, de onde estiverem.</p></article>
        </div>
        <p className="ms-benefits-note">Recursos disponíveis conforme o escopo de cada experiência.</p>
      </section>

      <section className="ms-process ms-container" id="como-funciona" aria-labelledby="ms-process-title">
        <h2 id="ms-process-title">Da ideia à experiência.</h2>

        <ol className="ms-process-steps">
          {[
            ['01', 'Compartilhe', 'Sua ideia, planta ou modelo.'],
            ['02', 'Transforme', 'Nós criamos a experiência 3D.'],
            ['03', 'Apresente', 'Um link. Novas perspectivas.'],
          ].map(([number, title, description]) => <li key={number}><span className="ms-step-number" aria-hidden="true">{number}</span><div><h3>{title}</h3><p>{description}</p></div></li>)}
        </ol>
      </section>

      <section className="ms-experience" id="planos" aria-labelledby="ms-experience-title">
        <div className="ms-container">
          <div className="ms-experience-heading" id="spatial-experience">
            <div><p className="ms-eyebrow">PARA O SEU PROJETO</p><h2 id="ms-experience-title">Seu próximo passo.</h2></div>
            <p>Escolha o ponto de partida.</p>
          </div>
          <div className="ms-experience-grid">
            {experiences.map((experience, index) => <article className={`ms-experience-card${experience.name === 'Signature' ? ' ms-experience-signature' : ''}`} key={experience.name} aria-labelledby={`ms-package-${index}`}>
              <span className="ms-plan-number" aria-hidden="true">0{index + 1}</span>
              <h3 id={`ms-package-${index}`}>{experience.name}</h3>
              <p className="ms-experience-caption">{planIntroductions[experience.id]}</p>
              <details className="ms-plan-details"><summary>O que inclui</summary><ul>{experience.features.map(feature => <li key={feature}>{feature}</li>)}</ul></details>
              <a className="ms-experience-link" href={`/criar-projeto?${new URLSearchParams({nivel:experience.id,interesse: `Spatial Experience — ${experience.name}`})}`} aria-label={`Preparar meu projeto com Spatial Experience ${experience.name}`}>Escolher este plano <ArrowUpRight size={17} aria-hidden="true"/></a>
            </article>)}
          </div>
          <p className="ms-experience-note">Escopo, recursos e revisões definidos na proposta personalizada.</p>
        </div>
      </section>
    </main>

    <footer className="ms-footer">
      <div className="ms-container">
        <div className="ms-footer-invitation"><h2>Dê vida ao seu projeto.</h2><a className="ms-button" href="/criar-projeto">Começar meu projeto <ArrowRight size={19}/></a></div>
        <div className="ms-footer-brand"><Brand/><span aria-hidden="true"/></div>
        <div className="ms-footer-bottom"><p>3D imersivo. Novas perspectivas.</p><nav aria-label="Links complementares"><a href="#experimentar">Experiência 3D</a><a href="#planos">Planos</a><a href="#possibilidades">Possibilidades</a><a href="/portal">Workspace <ArrowUpRight size={12}/></a></nav></div>
      </div>
    </footer>



  </div>;
}
