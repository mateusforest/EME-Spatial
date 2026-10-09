import {useSyncExternalStore} from 'react';
import {Circle,Download,Pause,Play,Square} from 'lucide-react';
import './botaniqueRecorder.css';

type RecordingState={phase:'idle'|'recording'|'paused'|'saving'|'done'|'error';seconds:number;url:string;filename:string;message:string};
let state:RecordingState={phase:'idle',seconds:0,url:'',filename:'',message:''};
const listeners=new Set<()=>void>();
const subscribe=(callback:()=>void)=>{listeners.add(callback);return()=>{listeners.delete(callback);};};
const snapshot=()=>state;
function update(value:Partial<RecordingState>){state={...state,...value};listeners.forEach(callback=>callback());}
let session:{stop:()=>void;pause:()=>void;resume:()=>void}|null=null;
export const isBotaniqueRecording=()=>!!session;
export function stopBotaniqueRecording(){session?.stop();}
function download(url=state.url,filename=state.filename){if(!url)return;const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();}

function start(){
 if(session||state.phase==='saving')return;
 const canvas=document.querySelector<HTMLCanvasElement>('.b-canvas canvas');
 if(!canvas||!window.MediaRecorder||!canvas.captureStream){update({phase:'error',message:'Para gravar, abra o 3D no Chrome ou Edge atualizado.'});return;}
 const output=document.createElement('canvas');output.width=1920;output.height=1080;
 const context=output.getContext('2d',{alpha:false});if(!context)return;
 let stream:MediaStream|undefined,recorder:MediaRecorder|undefined;
 try{
  stream=output.captureStream(30);stream.getVideoTracks().forEach(track=>{track.contentHint='detail';});
  for(const mimeType of ['video/mp4;codecs=avc1.420028','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']){
   if(!MediaRecorder.isTypeSupported(mimeType))continue;
   try{recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:14000000});break;}catch{/* Try the next encoder supported by this browser. */}
  }
  if(!recorder)throw Error('Nenhum formato de gravação está disponível neste navegador.');
 }catch{stream?.getTracks().forEach(track=>track.stop());update({phase:'error',message:'Não foi possível preparar o vídeo. Tente Chrome ou Edge atualizado.'});return;}
 const media=recorder,tracks=stream!;const chunks:Blob[]=[];let bytes=0,last=-Infinity,activeTime=0,since=performance.now(),ended=false,automaticPause=false,finished=false,notice='';
 const seconds=()=>Math.floor((activeTime+(media.state==='recording'?performance.now()-since:0))/1000);
 const request=()=>document.dispatchEvent(new Event('b-live-frame'));
 function remove(){clearInterval(pump);clearInterval(clock);document.removeEventListener('b-live-rendered',rendered);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('beforeunload',beforeUnload);}
 function stop(){if(ended)return;ended=true;const duration=seconds();remove();update({phase:'saving',seconds:duration,message:'Preparando seu vídeo…'});if(media.state!=='inactive')media.stop();}
 function pause(){if(media.state!=='recording')return;activeTime+=performance.now()-since;media.pause();update({phase:'paused',seconds:Math.floor(activeTime/1000),message:'Gravação pausada.'});}
 function resume(){if(ended||media.state!=='paused')return;since=performance.now();media.resume();automaticPause=false;update({phase:'recording',message:''});request();}
 function visibility(){if(document.hidden&&media.state==='recording'){automaticPause=true;pause();update({message:'Pausada enquanto você está em outra aba.'});}else if(!document.hidden&&automaticPause)resume();}
 function beforeUnload(event:BeforeUnloadEvent){event.preventDefault();event.returnValue='';}
 function rendered(event:Event){
  if(ended||media.state!=='recording'||document.hidden)return;
  const source=(event as CustomEvent<{canvas:HTMLCanvasElement}>).detail?.canvas;
  if(!source||source!==document.querySelector('.b-canvas canvas')||!source.width||!source.height)return;
  const now=performance.now();if(now-last<1000/30-2)return;last=now;
  try{const scale=Math.min(1920/source.width,1080/source.height),w=source.width*scale,h=source.height*scale;context!.fillStyle='#142d27';context!.fillRect(0,0,1920,1080);context!.drawImage(source,(1920-w)/2,(1080-h)/2,w,h);(tracks.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack)?.requestFrame?.();}
  catch{notice='A captura foi interrompida. O trecho disponível foi salvo.';stop();}
 }
 function finish(){
  if(finished)return;finished=true;ended=true;
  remove();tracks.getTracks().forEach(track=>track.stop());session=null;document.dispatchEvent(new Event('b-recording-quality'));output.width=output.height=0;
  if(!chunks.length){update({phase:'error',message:'Não houve imagens suficientes. Inicie novamente com a cena carregada.'});return;}
  const blob=new Blob(chunks,{type:media.mimeType}),url=URL.createObjectURL(blob),filename='Botanique-visita-'+new Date().toISOString().replace(/[:.]/g,'-')+(media.mimeType.includes('mp4')?'.mp4':'.webm');
  if(state.url)URL.revokeObjectURL(state.url);
  update({phase:'done',url,filename,message:notice||'Vídeo pronto. Se o download não iniciou, clique em Baixar.'});download(url,filename);
 }
 media.ondataavailable=event=>{if(event.data.size){chunks.push(event.data);bytes+=event.data.size;if(bytes>512*1024*1024&&!ended){notice='Take salvo ao atingir 512 MB. Você pode iniciar uma nova gravação.';stop();}}};
 media.onstop=finish;media.onerror=()=>{notice='O navegador interrompeu a captura. Salvamos o trecho disponível.';stop();};
 const pump=setInterval(()=>{if(media.state==='recording'&&!document.hidden)request();},1000/30);
 const clock=setInterval(()=>{if(!ended)update({seconds:seconds()});},1000);
 document.addEventListener('b-live-rendered',rendered);document.addEventListener('visibilitychange',visibility);window.addEventListener('beforeunload',beforeUnload);
 session={stop,pause,resume};
 try{media.start(1000);update({phase:'recording',seconds:0,message:''});document.dispatchEvent(new Event('b-recording-quality'));request();}
 catch{ended=true;remove();tracks.getTracks().forEach(track=>track.stop());session=null;update({phase:'error',message:'O navegador não conseguiu iniciar a gravação.'});document.dispatchEvent(new Event('b-recording-quality'));}
}

export default function BotaniqueRecorder({ready,compact=false}:{ready:boolean;compact?:boolean}){
 const value=useSyncExternalStore(subscribe,snapshot,snapshot),active=value.phase==='recording'||value.phase==='paused',busy=value.phase==='saving';
 return <div className={'br-recorder '+(compact?'br-inline':'')}>
  <div className="br-actions">{active?<><span className={'br-time '+(value.phase==='recording'?'is-recording':'')}><i/>{String(Math.floor(value.seconds/60)).padStart(2,'0')}:{String(value.seconds%60).padStart(2,'0')}</span><button aria-label={value.phase==='paused'?'Retomar gravação':'Pausar gravação'} onClick={()=>value.phase==='paused'?session?.resume():session?.pause()}>{value.phase==='paused'?<Play size={14}/>:<Pause size={14}/>}</button><button className="br-stop" onClick={stopBotaniqueRecording}><Square size={13}/>Parar e salvar</button></>:<button disabled={!ready||busy} onClick={start}><Circle size={13}/>{busy?'Salvando…':'Gravar vídeo'}<small>1080p</small></button>}{!active&&!busy&&value.url&&<a href={value.url} download={value.filename} aria-label="Baixar gravação"><Download size={15}/><span>Baixar</span></a>}</div>
  {!active&&!busy&&<small className="br-hint">Cena 3D · sem áudio</small>}
  {value.message&&<span className="br-message" role="status">{value.message}</span>}
 </div>;
}
