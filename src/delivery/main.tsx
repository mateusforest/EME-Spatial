import {Component,lazy,Suspense,useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowLeft,ArrowRight,Box,Check,Copy,FileText,Share2,Smartphone,Sun,SwatchBook,X} from 'lucide-react';
import type {Delivery} from '../../tools/delivery-config';
import publicProjects from 'virtual:delivery-public';
import './delivery.css';

const BotaniqueExperience=lazy(()=>import('./BotaniqueExperience'));
type ClientDelivery=Delivery&{canonical:string};
function readDelivery():ClientDelivery|null{try{return JSON.parse(document.getElementById('delivery-data')?.textContent||'null');}catch{return null;}}
const project=readDelivery();
function Brand(){return <a href="/" className="delivery-brand" aria-label="EME Spatial — início"><img src="/assets/spatial-symbol-transparent.png" alt=""/><span>EME <b>SPATIAL</b></span></a>;}
class ExperienceBoundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div className="delivery-loading" role="alert">A experiência não pôde ser aberta. Volte à apresentação para tentar novamente ou consultar o PDF.</div>:this.props.children;}
}
function App({p}:{p:ClientDelivery}){
  const [opened,setOpened]=useState(false),[entry,setEntry]=useState(()=>{
    const requested=Number(new URLSearchParams(location.search).get('entrada')||'0');
    return Number.isInteger(requested)&&requested>=0&&requested<(p.entries?.length||1)?requested:0;
  }),[shareOpen,setShareOpen]=useState(false),[notice,setNotice]=useState(''),[frameLoaded,setFrameLoaded]=useState(false);
  const entries=p.entries||[{label:'Visita completa',description:p.description,experience:p.experience}];
  const selected=entries[entry];
  const related=p.status==='public'?publicProjects.filter(x=>x.slug!==p.slug).sort((a,b)=>Number(b.category===p.category)-Number(a.category===p.category)).slice(0,3):[];
  function chooseEntry(index:number){setEntry(index);setFrameLoaded(false);}
  const launch=useRef<HTMLButtonElement>(null),back=useRef<HTMLButtonElement>(null),dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const pop=()=>setOpened(Boolean(history.state?.emeDelivery));window.addEventListener('popstate',pop);
    return()=>window.removeEventListener('popstate',pop);
  },[]);
  useEffect(()=>{
    if(!opened)return;
    const previous=document.body.style.overflow;document.body.style.overflow='hidden';back.current?.focus();
    return()=>{document.body.style.overflow=previous;launch.current?.focus();};
  },[opened]);
  useEffect(()=>{if(shareOpen)dialog.current?.showModal();else dialog.current?.close();},[shareOpen]);
  function enter(){setFrameLoaded(false);history.pushState({emeDelivery:true},'',location.pathname+location.search+'#experiencia');setOpened(true);}
  function close(){if(history.state?.emeDelivery)history.back();else setOpened(false);}
  async function share(){
    setNotice('');
    if(navigator.share){try{await navigator.share({title:p.title+' · EME Spatial',text:'Conheça esta apresentação e explore o projeto em 3D.',url:p.canonical});return;}catch(e){if(e instanceof Error&&e.name==='AbortError')return;}}
    setShareOpen(true);
  }
  async function copy(){try{await navigator.clipboard.writeText(p.canonical);setNotice('Link copiado. Pronto para encaminhar.');}catch{setNotice('Selecione e copie o link abaixo.');}}
  const message=`Conheça ${p.title} em uma experiência EME Spatial. Explore o projeto${p.pdf?' e veja a apresentação em PDF':''}:\n${p.canonical}`;
  return <div className="delivery-page">
    <a className="delivery-skip" href="#apresentacao" inert={opened}>Pular para o conteúdo</a>
    <header className="delivery-header" inert={opened}><Brand/><nav className="delivery-nav" aria-label="Navegação da apresentação"><a href="/#projetos">Projetos</a><a href="/#planos">Planos</a><button className="delivery-share" onClick={share}><Share2 size={17}/><span>Compartilhar</span></button></nav></header>
    <main id="apresentacao" inert={opened}>
      <section className="delivery-hero">
        <div className="delivery-copy"><a className="delivery-back" href="/#projetos"><ArrowLeft size={14}/>Todos os projetos</a><p className="delivery-eyebrow">{p.category||p.eyebrow}{p.stage&&' · '+p.stage}</p><h1>{p.title}</h1><p className="delivery-description">{p.description}</p>
          {entries.length>1&&<fieldset className="delivery-entry-picker"><legend>Por onde quer começar?</legend>{entries.map((e,i)=><button key={e.label} aria-pressed={entry===i} onClick={()=>chooseEntry(i)}><span><strong>{e.label}</strong><small>{e.description}</small></span>{entry===i?<Check size={18}/>:<ArrowRight size={18}/>}</button>)}</fieldset>}
          <div className="delivery-actions"><button ref={launch} className="delivery-primary" onClick={enter}><Box size={19}/>Entrar na experiência<ArrowRight size={19}/></button>{p.pdf&&<a className="delivery-pdf" href={p.pdf} target="_blank" rel="noopener"><FileText size={18}/>Ver apresentação em PDF<ArrowRight size={16}/></a>}</div>
          <div className="delivery-welcome"><span className="delivery-dot"/>Sem cadastro. No seu próprio ritmo.<small>O cenário 3D só carrega quando você entra na experiência.</small></div>
        </div>
        <figure className="delivery-visual"><img src={p.cover} alt={p.title+' · '+p.coverCredit} fetchPriority="high"/><span className="delivery-image-shade"/><figcaption><span>O PROJETO, POR OUTRO OLHAR</span><small>{p.coverCredit}</small></figcaption></figure>
      </section>
      {!!p.highlights?.length&&<section className="delivery-highlights" aria-label="Destaques do projeto"><span>NESTA EXPERIÊNCIA</span>{p.highlights.map(h=><p key={h}><Check size={16}/>{h}</p>)}</section>}
      {!!p.gallery?.length&&<section className="delivery-gallery" aria-labelledby="gallery-title"><div className="delivery-section-heading"><p className="delivery-eyebrow">O PROJETO EM PERSPECTIVA</p><h2 id="gallery-title">Um olhar antes da visita.</h2><p>Imagens e referências que ajudam a conhecer a proposta.</p></div><div>{p.gallery.map(g=><figure key={g.image}><img src={g.image} alt={g.caption} width="1000" height="650" loading="lazy" decoding="async"/><figcaption>{g.caption}</figcaption></figure>)}</div></section>}
      <section className="delivery-guide" aria-label="Como aproveitar a apresentação"><div><span>01</span><Box size={23}/><h2>Entre no espaço</h2><p>Conheça os ambientes e escolha suas perspectivas.</p></div><div><span>02</span>{p.viewer==='botanique'?<SwatchBook size={23}/>:<Sun size={23}/>}<h2>{p.viewer==='botanique'?'Explore as possibilidades':'Descubra os detalhes'}</h2><p>{p.viewer==='botanique'?'Experimente materiais, móveis e diferentes cenários de luz.':'Observe o projeto e conheça os recursos disponíveis na visita.'}</p></div><div><span>03</span><Share2 size={23}/><h2>Continue a conversa</h2><p>Encaminhe este mesmo link para seus clientes ou sua equipe.</p></div></section>
      {!!related.length&&<section className="delivery-related" aria-labelledby="related-title"><div className="delivery-section-heading"><p className="delivery-eyebrow">CONTINUE EXPLORANDO</p><h2 id="related-title">Outras formas de viver o espaço.</h2></div><div>{related.map(r=><a href={r.href} key={r.slug}><img src={r.image} alt={r.alt} width="600" height="400" loading="lazy" decoding="async"/><small>{r.category}</small><h3>{r.name}<ArrowRight size={18}/></h3></a>)}</div><a className="delivery-all" href="/#projetos">Ver todos os projetos <ArrowRight size={16}/></a></section>}
    </main>
    <footer className="delivery-footer" inert={opened}><p>{p.note}</p><span>Uma experiência EME Spatial</span></footer>
    {opened&&<section className="delivery-experience" role="dialog" aria-modal="true" aria-label={'Experiência '+p.title}>
      <header><button ref={back} onClick={close}><ArrowLeft size={17}/><span>Apresentação</span></button><strong>{p.title}</strong>{entries.length>1&&<select aria-label="Escolher cenário" value={entry} onChange={e=>chooseEntry(+e.target.value)}>{entries.map((e,i)=><option value={i} key={e.label}>{e.label}</option>)}</select>}<button onClick={share} aria-label="Compartilhar apresentação"><Share2 size={17}/></button></header>
      <div className="delivery-stage"><ExperienceBoundary><Suspense fallback={<div className="delivery-loading" role="status">Preparando sua visita…</div>}>{p.viewer==='botanique'?<BotaniqueExperience manifestUrl={p.manifest!} scene={selected.scene||'exterior'} onApartment={()=>chooseEntry(Math.max(0,entries.findIndex(e=>e.scene==='apartamento')))}/>:<>{!frameLoaded&&<div className="delivery-frame-loading" role="status">Abrindo a experiência…</div>}<iframe key={selected.experience} src={selected.experience} title={'Experiência 3D · '+p.title} allow="fullscreen" onLoad={()=>setFrameLoaded(true)}/></>}</Suspense></ExperienceBoundary></div>
      <div className="delivery-rotate"><Smartphone size={16}/>Para uma vista mais ampla, gire o celular.</div>
    </section>}
    <dialog className="delivery-share-dialog" ref={dialog} onCancel={()=>setShareOpen(false)} onClose={()=>setShareOpen(false)} onClick={e=>{if(e.target===e.currentTarget)setShareOpen(false);}}><div className="delivery-share-heading"><h2>Compartilhe a experiência.</h2><button aria-label="Fechar compartilhamento" onClick={()=>setShareOpen(false)}><X size={21}/></button></div><p>Quem receber poderá abrir e encaminhar este mesmo link.</p><input aria-label="Link da apresentação" readOnly value={p.canonical} onFocus={e=>e.target.select()}/><div className="delivery-share-actions"><button className="delivery-primary" onClick={copy}>{notice.startsWith('Link copiado')?<Check size={17}/>:<Copy size={17}/>}Copiar link</button><a className="delivery-pdf" href={'https://wa.me/?text='+encodeURIComponent(message)} target="_blank" rel="noopener noreferrer">Abrir WhatsApp<ArrowRight size={17}/></a></div><p role="status">{notice}</p></dialog>
  </div>;
}
createRoot(document.getElementById('delivery-root')!).render(project?<App p={project}/>:<main className="delivery-unavailable"><Brand/><p className="delivery-eyebrow">APRESENTAÇÃO</p><h1>Este link não está disponível.</h1><p>Solicite um link atualizado a quem enviou o convite ou conheça os projetos disponíveis.</p><a href="/#projetos">Ver todos os projetos<ArrowRight size={17}/></a></main>);
