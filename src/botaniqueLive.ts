import type {Peer,DataConnection,MediaConnection,PeerOptions} from 'peerjs';
import {createLiveId,liveMetadata,livePeerId,liveToken,liveVisitUrl,validLiveId,validLiveMetadata,validIceServers,LIVE_MAX_VIEWERS,LIVE_PROTOCOL} from './botaniqueLiveProtocol';
export {readLiveVisitId} from './botaniqueLiveProtocol';

export type LivePhase='starting'|'waiting'|'connecting'|'live'|'paused'|'ended'|'error';
export type LiveState={phase:LivePhase;message:string;viewers:number;url?:string};
export type LiveOptions={iceServers?:RTCIceServer[];relayOnly?:boolean;peerServer?:Pick<PeerOptions,'host'|'port'|'path'|'secure'|'key'>};
export type LiveSession={stop:()=>void;id:string};
type StateCallback=(state:LiveState)=>void;
const NETWORK_MESSAGE='A rede não permitiu conectar o vídeo. Tente outra rede ou abra a experiência individual.';
const OPEN_TIMEOUT=22000;
function errorMessage(error:unknown){const type=(error as {type?:string})?.type;return type==='peer-unavailable'?'Esta visita não está ativa. Peça ao apresentador um novo link.':type==='unavailable-id'?'Não foi possível reservar esta visita. Inicie novamente.':type==='network'||type==='socket-error'||type==='server-error'?'O serviço de conexão está indisponível. Tente novamente em instantes.':NETWORK_MESSAGE;}
function assertAvailable(signal?:AbortSignal){if(signal?.aborted)throw new DOMException('Visita cancelada.','AbortError');if(!window.isSecureContext||!window.RTCPeerConnection)throw Error('Use um navegador atualizado e uma conexão HTTPS para a visita ao vivo.');}
async function peerOptions(options:LiveOptions={},signal?:AbortSignal):Promise<PeerOptions>{
 let servers=options.iceServers;
 // Optional SAME-ORIGIN endpoint returns short-lived {iceServers:[...]} credentials.
 // Never place permanent TURN credentials in VITE_* variables or source code.
 const endpoint=import.meta.env.VITE_BOTANIQUE_LIVE_ICE_ENDPOINT as string|undefined;
 if(!servers&&endpoint){const url=new URL(endpoint,location.origin);if(url.origin!==location.origin)throw Error('Configuração de conexão indisponível.');const response=await fetch(url,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(6000)])});if(!response.ok)throw Error('Não foi possível preparar a conexão segura.');const result=await response.json();if(!validIceServers(result.iceServers))throw Error('Configuração de conexão inválida.');servers=result.iceServers;}
 if(servers&&!validIceServers(servers))throw Error('Configuração de conexão inválida.');
 return {...options.peerServer,debug:0,config:{iceServers:servers||[{urls:'stun:stun.l.google.com:19302'}],iceTransportPolicy:options.relayOnly?'relay':'all'}};
}
function send(connection:DataConnection,message:object){if(connection.open){try{connection.send(message);}catch{/* A close handler owns the disconnected state. */}}}

export async function startLiveHost({getCanvas,requestFrame,onState,signal,options}:{getCanvas:()=>HTMLCanvasElement|null;requestFrame?:()=>void;onState:StateCallback;signal?:AbortSignal;options?:LiveOptions}):Promise<LiveSession>{
 assertAvailable(signal);if(!getCanvas())throw Error('Abra a experiência 3D antes de iniciar a visita.');
 onState({phase:'starting',message:'Preparando o link da visita…',viewers:0});
 const config=await peerOptions(options,signal),{default:PeerConstructor}=await import('peerjs');assertAvailable(signal);
 const id=createLiveId(),url=liveVisitUrl(id),peer=new PeerConstructor(livePeerId(id),config);
 const output=document.createElement('canvas');output.width=1280;output.height=720;
 const context=output.getContext('2d',{alpha:false});
 if(!context||!output.captureStream){peer.destroy();throw Error('Este navegador não permite transmitir a cena. Tente Chrome ou Edge atualizado.');}
 let stream:MediaStream;
 try{stream=output.captureStream(15);}catch(error){peer.destroy();throw error;}
 stream.getVideoTracks().forEach(track=>{track.contentHint='detail';});
 type Visitor={connection:DataConnection;call?:MediaConnection;connected:boolean;lastSeen:number;timer:ReturnType<typeof setTimeout>};
 const visitors=new Map<string,Visitor>();let ended=false,opened=false,lastFrame=-Infinity,hadCanvas=false;
 const count=()=>[...visitors.values()].filter(visitor=>visitor.connected).length;
 const state=()=>{if(!ended&&opened)onState({phase:document.hidden?'paused':count()?'live':'waiting',message:document.hidden?'Visita pausada: volte a esta aba para continuar.':count()?'Sua navegação está sendo transmitida.':'Link pronto. Aguardando o visitante.',viewers:count(),url});};
 const captureFrame=()=>{(stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack|undefined)?.requestFrame?.();};
 const slate=(text:string)=>{context.fillStyle='#142d27';context.fillRect(0,0,1280,720);context.fillStyle='#eae9df';context.font='22px sans-serif';context.textAlign='center';context.fillText(text,640,360);captureFrame();};
 slate('Preparando o próximo ambiente…');
 function stop(phase:LivePhase='ended',message='Visita encerrada. O link deixou de transmitir.'){
  if(ended)return;ended=true;clearTimeout(openTimer);clearInterval(heartbeat);
  document.removeEventListener('b-live-rendered',rendered);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pageHide);signal?.removeEventListener('abort',abort);
  for(const visitor of visitors.values()){send(visitor.connection,{type:'ended'});clearTimeout(visitor.timer);visitor.call?.close();visitor.connection.close();}visitors.clear();
  stream.getTracks().forEach(track=>track.stop());peer.destroy();output.width=0;output.height=0;
  onState({phase,message,viewers:0});
 }
 function remove(key:string){const visitor=visitors.get(key);if(!visitor)return;visitors.delete(key);clearTimeout(visitor.timer);visitor.call?.close();visitor.connection.close();state();}
 function copy(canvas:HTMLCanvasElement){if(ended||document.hidden||canvas!==getCanvas()||!canvas.width||!canvas.height)return;const now=performance.now();if(now-lastFrame<1000/15)return;lastFrame=now;try{const scale=Math.min(1280/canvas.width,720/canvas.height),width=canvas.width*scale,height=canvas.height*scale;context!.fillStyle='#101e1a';context!.fillRect(0,0,1280,720);context!.drawImage(canvas,(1280-width)/2,(720-height)/2,width,height);hadCanvas=true;captureFrame();}catch{stop('error','Não foi possível transmitir esta cena. Reabra a experiência e tente novamente.');}}
 function rendered(event:Event){const canvas=(event as CustomEvent<{canvas?:HTMLCanvasElement}>).detail?.canvas;if(canvas instanceof HTMLCanvasElement)copy(canvas);}
 function visibility(){for(const visitor of visitors.values())send(visitor.connection,{type:document.hidden?'paused':'resumed'});state();if(!document.hidden)requestFrame?.();}
 const pageHide=()=>stop(),abort=()=>stop();
 const openTimer=setTimeout(()=>stop('error','O serviço de conexão não respondeu. Tente novamente.'),OPEN_TIMEOUT);
 const heartbeat=setInterval(()=>{if(ended)return;const now=Date.now();for(const [key,visitor] of visitors){if(now-visitor.lastSeen>25000){remove(key);continue;}send(visitor.connection,{type:'heartbeat',paused:document.hidden});}if(!document.hidden){if(!getCanvas()){if(hadCanvas){slate('Preparando o próximo ambiente…');hadCanvas=false;}}else requestFrame?.();}},1000);
 document.addEventListener('b-live-rendered',rendered);document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pageHide);signal?.addEventListener('abort',abort,{once:true});
 stream.getVideoTracks()[0]?.addEventListener('ended',()=>stop('error','A captura da cena foi interrompida. Inicie outra visita.'),{once:true});
 peer.on('open',()=>{if(ended)return;opened=true;clearTimeout(openTimer);state();requestFrame?.();});
 peer.on('connection',connection=>{
  if(ended||!validLiveMetadata(connection.metadata,id)||visitors.has(connection.peer)){connection.close();return;}
  if(visitors.size>=LIVE_MAX_VIEWERS){connection.on('open',()=>{send(connection,{type:'limit'});setTimeout(()=>connection.close(),300);});setTimeout(()=>connection.close(),3000);return;}
  const visitor:Visitor={connection,connected:false,lastSeen:Date.now(),timer:setTimeout(()=>{send(connection,{type:'error',message:NETWORK_MESSAGE});remove(connection.peer);},OPEN_TIMEOUT)};visitors.set(connection.peer,visitor);
  connection.on('open',()=>{if(ended||!visitors.has(connection.peer))return;send(connection,{type:'accepted'});const call=peer.call(connection.peer,stream,{metadata:{protocol:LIVE_PROTOCOL,token:liveToken(id)}});visitor.call=call;
   if(!call){remove(connection.peer);return;}
   const check=()=>{if(ended||!visitors.has(connection.peer))return;const status=call.peerConnection?.connectionState;if(status==='connected'){visitor.connected=true;clearTimeout(visitor.timer);state();requestFrame?.();}else if(status==='failed'||status==='closed')remove(connection.peer);};
   call.peerConnection?.addEventListener('connectionstatechange',check);call.on('close',()=>remove(connection.peer));call.on('error',()=>remove(connection.peer));check();
  });
  connection.on('data',data=>{if(data&&typeof data==='object'&&(data as {type?:string}).type==='pong')visitor.lastSeen=Date.now();});
  connection.on('close',()=>remove(connection.peer));connection.on('error',()=>remove(connection.peer));
 });
 peer.on('call',call=>call.close()); // The presenter never accepts visitor media or controls.
 peer.on('error',error=>{if(error.type==='peer-unavailable')return;stop('error',errorMessage(error));});
 peer.on('disconnected',()=>stop('error','A conexão da visita foi interrompida. Inicie uma nova visita.'));
 if(signal?.aborted)stop();
 return {id,stop:()=>stop()};
}

export async function joinLiveVisit({id,onState,onStream,signal,options}:{id:string;onState:StateCallback;onStream:(stream:MediaStream|null)=>void;signal?:AbortSignal;options?:LiveOptions}):Promise<LiveSession>{
 assertAvailable(signal);if(!validLiveId(id))throw Error('Este link de visita é inválido. Peça um novo link ao apresentador.');
 onState({phase:'connecting',message:'Conectando ao apresentador…',viewers:0});
 const config=await peerOptions(options,signal),{default:PeerConstructor}=await import('peerjs');assertAvailable(signal);
 const peer:Peer=new PeerConstructor(config);let connection:DataConnection|undefined,call:MediaConnection|undefined,received:MediaStream|undefined,ended=false,lastHeartbeat=Date.now();
 function stop(phase:LivePhase='ended',message='A visita foi encerrada ou a conexão terminou.'){
  if(ended)return;ended=true;clearTimeout(timeout);clearInterval(watchdog);signal?.removeEventListener('abort',abort);window.removeEventListener('pagehide',pageHide);
  call?.close();connection?.close();peer.destroy();received?.getTracks().forEach(track=>track.stop());onStream(null);onState({phase,message,viewers:0});
 }
 const abort=()=>stop(),pageHide=()=>stop();
 const timeout=setTimeout(()=>stop('error',NETWORK_MESSAGE),OPEN_TIMEOUT);
 const watchdog=setInterval(()=>{if(Date.now()-lastHeartbeat>25000)stop('error','A conexão com o apresentador foi perdida. Tente entrar novamente.');},3000);
 signal?.addEventListener('abort',abort,{once:true});window.addEventListener('pagehide',pageHide);
 peer.on('open',()=>{if(ended)return;connection=peer.connect(livePeerId(id),{metadata:liveMetadata(id),reliable:true,serialization:'json'});
  connection.on('open',()=>{lastHeartbeat=Date.now();});
  connection.on('data',data=>{if(ended||!data||typeof data!=='object')return;const message=data as {type?:string;paused?:boolean};lastHeartbeat=Date.now();
   if(message.type==='heartbeat'){send(connection!,{type:'pong'});if(received)onState({phase:message.paused?'paused':'live',message:message.paused?'O apresentador está em outra aba. Aguardando…':'Você está acompanhando a navegação do apresentador.',viewers:1});}
   if(message.type==='ended')stop('ended','O apresentador encerrou esta visita.');
   if(message.type==='limit')stop('error','Esta visita está com todos os lugares ocupados. Peça ao apresentador para tentar novamente.');
   if(message.type==='error')stop('error',NETWORK_MESSAGE);
   if(message.type==='paused'&&received)onState({phase:'paused',message:'O apresentador está em outra aba. Aguardando…',viewers:1});
  });
  connection.on('close',()=>stop());connection.on('error',error=>stop('error',errorMessage(error)));
 });
 peer.on('call',incoming=>{
  const metadata=incoming.metadata as {protocol?:string;token?:string}|undefined;
  if(ended||call||incoming.peer!==livePeerId(id)||metadata?.protocol!==LIVE_PROTOCOL||metadata.token!==liveToken(id)){incoming.close();return;}
  call=incoming;incoming.on('stream',stream=>{if(ended)return;if(!stream.getVideoTracks().length||stream.getAudioTracks().length){stop('error','A transmissão recebida não corresponde à visita.');return;}received=stream;clearTimeout(timeout);lastHeartbeat=Date.now();onStream(stream);onState({phase:'live',message:'Você está acompanhando a navegação do apresentador.',viewers:1});});
  incoming.on('close',()=>stop());incoming.on('error',error=>stop('error',errorMessage(error)));
  incoming.answer(); // One-way video: no microphone, webcam or visitor track is acquired.
 });
 peer.on('connection',incoming=>incoming.close());peer.on('error',error=>stop('error',errorMessage(error)));
 peer.on('disconnected',()=>{if(!received)stop('error','O serviço de conexão foi interrompido. Tente entrar novamente.');});
 if(signal?.aborted)stop();return {id,stop:()=>stop()};
}
