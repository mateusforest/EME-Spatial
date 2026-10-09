import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,LoaderCircle,Play,Radio,RotateCcw} from 'lucide-react';
import {joinLiveVisit} from './botaniqueLive';
import type {LiveOptions,LiveState} from './botaniqueLive';
import './botaniqueLive.css';

export default function BotaniqueLiveViewer({visitId,options}:{visitId:string;options?:LiveOptions}){
 const [state,setState]=useState<LiveState>({phase:'connecting',message:'Conectando ao apresentador…',viewers:0}),[attempt,setAttempt]=useState(0),[needsPlay,setNeedsPlay]=useState(false),[hasStream,setHasStream]=useState(false);
 const video=useRef<HTMLVideoElement>(null),optionsRef=useRef(options);optionsRef.current=options;
 useEffect(()=>{
  const abort=new AbortController();let active=true;
  setNeedsPlay(false);setHasStream(false);
  void joinLiveVisit({id:visitId,options:optionsRef.current,signal:abort.signal,onState:value=>{if(active)setState(value);},onStream:stream=>{if(!active)return;setHasStream(!!stream);if(video.current){video.current.srcObject=stream;if(stream)void video.current.play().catch(()=>{if(active)setNeedsPlay(true);});}}}).catch(error=>{if(active&&!abort.signal.aborted)setState({phase:'error',message:error instanceof Error?error.message:'Não foi possível abrir a visita.',viewers:0});});
  return()=>{active=false;abort.abort();if(video.current){video.current.pause();video.current.srcObject=null;}};
 },[visitId,attempt]);
 const finished=state.phase==='error'||state.phase==='ended',loading=state.phase==='connecting'||state.phase==='starting';
 const individual=typeof window==='undefined'?'/apresentar/botanique':window.location.pathname;
 return <main className="bl-guest">
  <header className="bl-guest-header"><a href={individual} className="bl-brand" aria-label="Botanique, abrir experiência individual">EME <b>SPATIAL</b><span>BOTANIQUE HOME RESORT</span></a><span className={'bl-live-pill '+(state.phase==='live'?'is-live':'')}><Radio size={15}/>{state.phase==='live'?'AO VIVO':state.phase==='paused'?'EM PAUSA':'VISITA GUIADA'}</span></header>
  <section className="bl-screen" aria-label="Transmissão da visita ao vivo">
   <video ref={video} autoPlay muted playsInline onPlaying={()=>setNeedsPlay(false)} aria-label="Cena 3D apresentada ao vivo" style={{visibility:hasStream?'visible':'hidden'}}/>
   {(!hasStream||needsPlay)&&<div className="bl-screen-message">{loading?<LoaderCircle size={34} className="bl-spin"/>:<Radio size={34}/>}<h1>{needsPlay?'Sua visita está pronta':finished?'A visita está indisponível':'Você está chegando ao Botanique.'}</h1><p role="status">{state.message}</p>{needsPlay&&<button className="bl-start" onClick={()=>{void video.current?.play().catch(()=>setNeedsPlay(true));}}><Play size={16}/>Assistir à visita</button>}{finished&&<div className="bl-guest-actions"><button className="bl-start" onClick={()=>setAttempt(value=>value+1)}><RotateCcw size={16}/>Tentar novamente</button><a href={individual}>Explorar por conta própria<ArrowUpRight size={16}/></a></div>}</div>}
   {hasStream&&state.phase==='paused'&&<div className="bl-paused" role="status">{state.message}</div>}
  </section>
  <footer className="bl-guest-footer"><div><strong>Uma visita conduzida pelo apresentador.</strong><p>{hasStream?'Acompanhe os movimentos e as escolhas em tempo real.':'Seu navegador recebe somente o vídeo da cena 3D.'} Câmera e microfone permanecem desligados.</p></div><a href={individual}>Sair da visita<ArrowUpRight size={15}/></a></footer>
 </main>;
}
