import {useEffect,useState} from 'react';
import BotaniqueViewer from '../BotaniqueViewer';
import type {BotaniqueManifest} from '../BotaniquePage';
import {stopBotaniqueRecording} from '../BotaniqueRecorder';
import '../botanique.css';

export default function BotaniqueExperience({manifestUrl,scene,onApartment}:{manifestUrl:string;scene:'apartamento'|'exterior';onApartment:()=>void}){
  const [manifest,setManifest]=useState<BotaniqueManifest|null>(null),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
  useEffect(()=>()=>stopBotaniqueRecording(),[scene]);
  useEffect(()=>{
    const controller=new AbortController();setError(false);
    fetch(manifestUrl,{signal:controller.signal,cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then((data:BotaniqueManifest)=>{
      for(const key of ['apartamento','exterior'] as const){const s=data.scenes?.[key];if(!s||!s.url.startsWith('/assets/botanique/')||s.url.includes('..')||!s.camera||!Array.isArray(s.views))throw Error();}
      setManifest(data);
    }).catch(()=>{if(!controller.signal.aborted)setError(true);});
    return()=>controller.abort();
  },[manifestUrl,attempt]);
  if(error)return <div className="delivery-loading" role="alert"><p>Não foi possível carregar a experiência.</p><button onClick={()=>setAttempt(x=>x+1)}>Tentar novamente</button><p>Você também pode voltar à apresentação e abrir o PDF.</p></div>;
  if(!manifest)return <div className="delivery-loading" role="status">Preparando sua visita…</div>;
  return <div className="botanique delivery-botanique"><BotaniqueViewer key={scene} kind={scene} definition={manifest.scenes[scene]!} onEnterApartment={onApartment}/></div>;
}
