import {useEffect,useRef,useState} from 'react';
import {Check,Copy,Link,LoaderCircle,Radio,Square,Users} from 'lucide-react';
import {startLiveHost} from './botaniqueLive';
import type {LiveOptions,LiveSession,LiveState} from './botaniqueLive';
import './botaniqueLive.css';

export type BotaniqueLiveHostProps={getCanvas:()=>HTMLCanvasElement|null;requestFrame?:()=>void;disabled?:boolean;options?:LiveOptions};
export default function BotaniqueLiveHost({getCanvas,requestFrame,disabled=false,options}:BotaniqueLiveHostProps){
 const [state,setState]=useState<LiveState>({phase:'ended',message:'',viewers:0}),[copied,setCopied]=useState(false),[copyHint,setCopyHint]=useState('');
 const session=useRef<LiveSession|null>(null),controller=useRef<AbortController|null>(null),link=useRef<HTMLInputElement>(null),callbacks=useRef({getCanvas,requestFrame}),mounted=useRef(true);
 callbacks.current={getCanvas,requestFrame};
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort();session.current?.stop();};},[]);
 const active=['starting','waiting','live','paused'].includes(state.phase);
 async function start(){
  if(active||disabled)return;controller.current?.abort();session.current?.stop();const abort=new AbortController();controller.current=abort;setCopied(false);setCopyHint('');
  setState({phase:'starting',message:'Preparando o link da visita…',viewers:0});
  try{const next=await startLiveHost({getCanvas:()=>callbacks.current.getCanvas(),requestFrame:()=>callbacks.current.requestFrame?.(),options,signal:abort.signal,onState:value=>{if(mounted.current&&!abort.signal.aborted)setState(value);}});if(abort.signal.aborted)next.stop();else session.current=next;}
  catch(error){if(mounted.current&&!abort.signal.aborted)setState({phase:'error',message:error instanceof Error?error.message:'Não foi possível iniciar a visita. Tente novamente.',viewers:0});}
 }
 function stop(){session.current?.stop();controller.current?.abort();session.current=null;setState({phase:'ended',message:'Visita encerrada. O link deixou de transmitir.',viewers:0});setCopied(false);}
 async function copy(){if(!state.url)return;try{await navigator.clipboard.writeText(state.url);setCopied(true);setCopyHint('Link copiado. Compartilhe com seu visitante.');}catch{link.current?.focus();link.current?.select();setCopyHint('Selecione e copie o link abaixo.');}}
 return <section className={'bl-host '+(active?'is-active':'')} aria-label="Apresentar ao vivo">
  <div className="bl-host-heading"><div><Radio size={17}/><strong>Visita ao vivo</strong></div>{active&&<span className="bl-viewers"><Users size={14}/>{state.viewers} {state.viewers===1?'visitante':'visitantes'}</span>}</div>
  {!active&&<p>Guie a visita e compartilhe sua navegação por um link.</p>}
  {state.message&&<p className={'bl-status '+(state.phase==='error'?'is-error':'')} role="status">{state.phase==='starting'&&<LoaderCircle className="bl-spin" size={14}/>}<span>{state.message}</span></p>}
  {active&&state.url&&<><div className="bl-link-row"><Link size={14}/><input ref={link} value={state.url} readOnly aria-label="Link exclusivo da visita" onFocus={event=>event.currentTarget.select()}/><button type="button" onClick={copy} aria-label="Copiar link da visita">{copied?<Check size={16}/>:<Copy size={16}/>}</button></div>{copyHint&&<p className="bl-copy-hint" role="status">{copyHint}</p>}</>}
  <div className="bl-host-actions">{active?<button type="button" className="bl-stop" onClick={stop}><Square size={13}/>Encerrar visita</button>:<button type="button" className="bl-start" disabled={disabled} onClick={start}><Radio size={15}/>{state.phase==='error'?'Tentar novamente':'Iniciar visita ao vivo'}</button>}{active&&state.url&&<button type="button" className="bl-share" onClick={copy}>{copied?'Copiado':'Copiar link'}<Copy size={14}/></button>}</div>
  <small>{active?'Somente a cena 3D · sem áudio · até 3 visitantes. Mantenha esta aba aberta.':'Somente a cena 3D é transmitida. Câmera, microfone e outras abas não são compartilhados.'}</small>
 </section>;
}
