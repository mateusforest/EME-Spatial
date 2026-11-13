import {useEffect,useMemo,useRef,useState} from 'react';
import {ChevronDown,Pause,Play,RotateCcw,Sun,X} from 'lucide-react';
import {solarPosition,timeLabel} from './model';
import {advanceDay} from './experience-state';
import {openingHour} from './visual-profile';
import {streetLightLevel} from './street-lighting';

type Props={paused:boolean;onChange:(hour:number,date:string)=>void;onTrajectory:(visible:boolean)=>void;onOpen:(open:boolean)=>void;selected:boolean};
export default function SolarControls({paused,onChange,onTrajectory,onOpen,selected}:Props){
  const [hour,setHour]=useState(openingHour),[date,setDate]=useState(()=>new Date().toLocaleDateString('en-CA'));
  const [open,setOpen]=useState(false),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[trajectory,setTrajectory]=useState(true);
  const frame=useRef(0);
  useEffect(()=>{if(paused)setPlaying(false);},[paused]);
  useEffect(()=>onChange(hour,date),[hour,date,onChange]);
  useEffect(()=>onTrajectory(trajectory&&(selected||open||playing)),[trajectory,selected,open,playing,onTrajectory]);
  useEffect(()=>onOpen(open),[open,onOpen]);
  useEffect(()=>{
    if(!playing)return;
    let last=performance.now();
    const tick=(now:number)=>{if(now-last>=180){const elapsed=(now-last)/1000;last=now;setHour(h=>advanceDay(h,elapsed,speed));}frame.current=requestAnimationFrame(tick);};
    const pauseHidden=()=>{if(document.hidden)setPlaying(false);};
    frame.current=requestAnimationFrame(tick);document.addEventListener('visibilitychange',pauseHidden);
    return()=>{cancelAnimationFrame(frame.current);document.removeEventListener('visibilitychange',pauseHidden);};
  },[playing,speed]);
  useEffect(()=>{if(hour>=22)setPlaying(false);},[hour]);
  const points=useMemo(()=>Array.from({length:65},(_,i)=>{const h=6+i*.25;return `${12+i/64*276},${76-Math.max(0,solarPosition(h,date).elevation)/90*64}`;}).join(' '),[date]);
  const position=solarPosition(hour,date),x=12+(hour-6)/16*276,y=76-Math.max(0,position.elevation)/90*64;
  const toggle=()=>{if(!playing&&hour>=22)setHour(6);setPlaying(v=>!v);};
  return <section className={'pr-solar '+(open?'pr-solar-open':'')} aria-label="Luz do dia">
    <div className="pr-solar-bar">
      <button className="pr-solar-time" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-label={'Ajustar luz do dia, '+timeLabel(hour)}><span className="pr-orange-sun"><Sun size={20}/></span><b>{timeLabel(hour)}</b></button>
      <span className="pr-separator"/><button className="pr-solar-play" onClick={toggle} aria-label={playing?'Pausar simulação do dia':'Simular passagem do dia'}>{playing?<Pause size={15}/>:<Play size={15}/>}<span>{playing?'Pausar':'Simular dia'}</span></button>
      <button className="pr-solar-expand" onClick={()=>setOpen(v=>!v)} aria-label={open?'Recolher luz do dia':'Abrir luz do dia'} aria-expanded={open}><ChevronDown size={15}/></button>
    </div>
    {open&&<div className="pr-solar-sheet">
      <div className="pr-panel-heading"><h2>Luz do dia</h2><button aria-label="Fechar luz do dia" onClick={()=>setOpen(false)}><X size={18}/></button></div>
      <div className="pr-sun-summary"><b>{timeLabel(hour)}</b><span>{position.elevation>0?`Sol a ${Math.round(position.elevation)}° de altura`:'Sol abaixo do horizonte'}</span></div>
      <input type="range" min="6" max="22" step="0.05" value={hour} onChange={e=>{setPlaying(false);setHour(+e.target.value);}} aria-label="Horário da simulação solar" aria-valuetext={timeLabel(hour)}/>
      <div className="pr-solar-scale"><span>06h · Manhã</span><span>22h · Noite</span></div>
      <div className="pr-solar-actions"><button onClick={toggle}>{playing?<Pause size={15}/>:<Play size={15}/>} {playing?'Pausar':'Simular dia'}</button><label>Ritmo <select aria-label="Velocidade da simulação solar" value={speed} onChange={e=>setSpeed(+e.target.value)}><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label></div>
      <details className="pr-solar-more"><summary>Data e trajetória <ChevronDown size={14}/></summary><div>
        <label className="pr-solar-date">Data <input type="date" aria-label="Data da simulação solar" value={date} min="2020-01-01" max="2040-12-31" onChange={e=>{if(/^\d{4}-\d{2}-\d{2}$/.test(e.target.value))setDate(e.target.value);}}/></label>
        <svg className="pr-solar-curve" viewBox="0 0 300 88" role="img" aria-label="Altura aproximada do sol ao longo do dia"><line x1="12" y1="76" x2="288" y2="76" stroke="#b5c5ac"/><polyline points={points} fill="none" stroke="#d9b677" strokeWidth="1.5"/><circle cx={x} cy={y} r="5" fill="#f3bb62"/><text x="12" y="87">06h</text><text x="140" y="87">14h</text><text x="274" y="87">22h</text></svg>
        <label className="pr-toggle"><span>Mostrar trajetória do sol</span><input type="checkbox" checked={trajectory} onChange={e=>setTrajectory(e.target.checked)}/></label>
        <button className="pr-solar-reset" onClick={()=>{setHour(6);setPlaying(false);}}><RotateCcw size={14}/>Reiniciar o dia</button>
        <p>Vacaria · norte da prancha · simulação aproximada.</p>
      </div></details>
      <p className="pr-street-light-status">{streetLightLevel(position.elevation)===0?'Iluminação pública apagada':streetLightLevel(position.elevation)<1?'Postes acendendo ao entardecer':'Postes e ruas iluminados'}</p>
    </div>}
  </section>;
}
