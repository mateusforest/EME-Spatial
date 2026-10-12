import {Component,lazy,Suspense,useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowLeft,ArrowRight,Box,Check,Copy,FileText,Share2,Smartphone,Sun,SwatchBook,X} from 'lucide-react';
import type {Delivery} from '../../tools/delivery-config';
import './delivery.css';

const BotaniqueExperience=lazy(()=>import('./BotaniqueExperience'));
type ClientDelivery=Delivery&{canonical:string};
function readDelivery():ClientDelivery|null{try{return JSON.parse(document.getElementById('delivery-data')?.textContent||'null');}catch{return null;}}
const project=readDelivery();
function Brand(){return <div className="delivery-brand"><img src="/assets/simbolo.webp" alt=""/><span>EME <b>SPATIAL</b></span></div>;}
class ExperienceBoundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div className="delivery-loading" role="alert">A experiência não pôde ser aberta. Volte à apresentação para tentar novamente ou consultar o PDF.</div>:this.props.children;}
}
function App({p}:{p:ClientDelivery}){
  const [opened,setOpened]=useState(false),[scene,setScene]=useState<'apartamento'|'exterior'>('apartamento'),[shareOpen,setShareOpen]=useState(false),[notice,setNotice]=useState('');
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
  function enter(){history.pushState({emeDelivery:true},'',location.pathname+'#experiencia');setOpened(true);}
  function close(){if(history.state?.emeDelivery)history.back();else setOpened(false);}
  async function share(){
    setNotice('');
    if(navigator.share){try{await navigator.share({title:p.title+' · EME Spatial',text:'Conheça esta apresentação e explore o projeto em 3D.',url:p.canonical});return;}catch(e){if(e instanceof Error&&e.name==='AbortError')return;}}
    setShareOpen(true);
  }
  async function copy(){try{await navigator.clipboard.writeText(p.canonical);setNotice('Link copiado. Pronto para encaminhar.');}catch{setNotice('Selecione e copie o link abaixo.');}}
  const message=`Conheça ${p.title} em uma experiência EME Spatial. Explore o projeto${p.pdf?' e veja a apresentação em PDF':''}:\n${p.canonical}`;
  return <div className="delivery-page">
    <header className="delivery-header"><Brand/><span className="delivery-header-label">APRESENTAÇÃO DO PROJETO</span><button className="delivery-share" onClick={share}><Share2 size={17}/><span>Compartilhar</span></button></header>
    <main>
      <section className="delivery-hero">
        <div className="delivery-copy"><p className="delivery-eyebrow">{p.eyebrow}</p><h1>{p.title}</h1><p className="delivery-description">{p.description}</p>
          <div className="delivery-actions"><button ref={launch} className="delivery-primary" onClick={enter}><Box size={19}/>Entrar na experiência<ArrowRight size={19}/></button>{p.pdf&&<a className="delivery-pdf" href={p.pdf} target="_blank" rel="noopener"><FileText size={18}/>Ver apresentação em PDF<ArrowRight size={16}/></a>}</div>
          <div className="delivery-welcome"><span className="delivery-dot"/>Abra, explore e compartilhe.<small>Sem cadastro. No seu próprio ritmo.</small></div>
        </div>
        <figure className="delivery-visual"><img src={p.cover} alt={p.title+' · '+p.coverCredit} fetchPriority="high"/><span className="delivery-image-shade"/><figcaption><span>O PROJETO, POR OUTRO OLHAR</span><small>{p.coverCredit}</small></figcaption></figure>
      </section>
      <section className="delivery-guide" aria-label="Como aproveitar a apresentação"><div><span>01</span><Box size={23}/><h2>Entre no espaço</h2><p>Conheça os ambientes e escolha suas perspectivas.</p></div><div><span>02</span>{p.viewer==='botanique'?<SwatchBook size={23}/>:<Sun size={23}/>}<h2>{p.viewer==='botanique'?'Explore as possibilidades':'Descubra os detalhes'}</h2><p>{p.viewer==='botanique'?'Experimente materiais, móveis e diferentes cenários de luz.':'Observe o projeto e conheça os recursos disponíveis na visita.'}</p></div><div><span>03</span><Share2 size={23}/><h2>Continue a conversa</h2><p>Encaminhe este mesmo link para seus clientes ou sua equipe.</p></div></section>
    </main>
    <footer className="delivery-footer"><p>{p.note}</p><span>Uma experiência EME Spatial</span></footer>
    {opened&&<section className="delivery-experience" aria-label={'Experiência '+p.title}>
      <header><button ref={back} onClick={close}><ArrowLeft size={17}/><span>Apresentação</span></button><strong>{p.title}</strong>{p.viewer==='botanique'&&<select aria-label="Escolher cenário" value={scene} onChange={e=>setScene(e.target.value as typeof scene)}><option value="apartamento">Apartamento</option><option value="exterior">Empreendimento</option></select>}<button onClick={share} aria-label="Compartilhar apresentação"><Share2 size={17}/></button></header>
      <div className="delivery-stage"><ExperienceBoundary><Suspense fallback={<div className="delivery-loading" role="status">Preparando sua visita…</div>}>{p.viewer==='botanique'?<BotaniqueExperience manifestUrl={p.manifest!} scene={scene} onApartment={()=>setScene('apartamento')}/>:<iframe src={p.experience} title={'Experiência 3D · '+p.title} allow="fullscreen"/>}</Suspense></ExperienceBoundary></div>
      <div className="delivery-rotate"><Smartphone size={16}/>Para uma vista mais ampla, gire o celular.</div>
    </section>}
    <dialog className="delivery-share-dialog" ref={dialog} onCancel={()=>setShareOpen(false)} onClose={()=>setShareOpen(false)} onClick={e=>{if(e.target===e.currentTarget)setShareOpen(false);}}><div className="delivery-share-heading"><h2>Compartilhe a experiência.</h2><button aria-label="Fechar compartilhamento" onClick={()=>setShareOpen(false)}><X size={21}/></button></div><p>Quem receber poderá abrir e encaminhar este mesmo link.</p><input aria-label="Link da apresentação" readOnly value={p.canonical} onFocus={e=>e.target.select()}/><div className="delivery-share-actions"><button className="delivery-primary" onClick={copy}>{notice.startsWith('Link copiado')?<Check size={17}/>:<Copy size={17}/>}Copiar link</button><a className="delivery-pdf" href={'https://wa.me/?text='+encodeURIComponent(message)} target="_blank" rel="noopener noreferrer">Abrir WhatsApp<ArrowRight size={17}/></a></div><p role="status">{notice}</p></dialog>
  </div>;
}
createRoot(document.getElementById('delivery-root')!).render(project?<App p={project}/>:<main className="delivery-unavailable"><Brand/><p className="delivery-eyebrow">APRESENTAÇÃO</p><h1>Este link não está disponível.</h1><p>Solicite um link atualizado a quem enviou o convite.</p></main>);
