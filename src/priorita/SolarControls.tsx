import {useEffect,useMemo,useRef,useState} from 'react';
import {ChevronDown,Pause,Play,RotateCcw,Sun,X} from 'lucide-react';
import {solarPosition,timeLabel} from './model';
import {advanceDay} from './experience-state';

type Props={onChange:(hour:number,date:string)=>void;onTrajectory:(visible:boolean)=>void;onOpen:(open:boolean)=>void;selected:boolean};
export default function SolarControls({onChange,onTrajectory,onOpen,selected}:Props){
  const [hour,setHour]=useState(15.5),[date,setDate]=useState(()=>new Date().toLocaleDateString('en-CA'));
  const [open,setOpen]=useState(false),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[trajectory,setTrajectory]=useState(true);
  const frame=useRef(0);
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
  useEffect(()=>{if(hour>=20)setPlaying(false);},[hour]);
  const points=useMemo(()=>Array.from({length:57},(_,i)=>{const h=6+i*.25;return `${12+i/56*276},${76-Math.max(0,solarPosition(h,date).elevation)/90*64}`;}).join(' '),[date]);
  const position=solarPosition(hour,date),x=12+(hour-6)/14*276,y=76-Math.max(0,position.elevation)/90*64;
  const toggle=()=>{if(!playing&&hour>=20)setHour(6);setPlaying(v=>!v);};
  return <section className={'pr-solar '+(open?'pr-solar-open':'')} aria-label="Luz do dia">
    <div className="pr-solar-bar"><button className="pr-solar-time" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-label={'Ajustar luz do dia, '+timeLabel(hour)}><Sun size={20}/><b>{timeLabel(hour)}</b></button><span className="pr-separator"/><button className="pr-solar-play" onClick={toggle} aria-label={playing?'Pausar simulação do dia':'Simular passagem do dia'}>{playing?<Pause size={15}/>:<Play size={15}/>}<span>{playing?'Pausar':'Simular dia'}</span></button><button className="pr-solar-expand" onClick={()=>setOpen(v=>!v)} aria-label={open?'Recolher luz do dia':'Abrir luz do dia'} aria-expanded={open}><ChevronDown size={15}/></button></div>
    {open&&<div className="pr-solar-sheet"><div className="pr-panel-heading"><div><span className="pr-eyebrow">SOL E SOMBRAS</span><h2>Luz do dia</h2></div><button aria-label="Fechar luz do dia" onClick={()=>setOpen(false)}><X size={18}/></button></div><div className="pr-sun-summary"><b>{timeLabel(hour)}</b><span>{position.elevation>0?`Sol a ${Math.round(position.elevation)}° de altura`:'Sol abaixo do horizonte'}</span></div><svg className="pr-solar-curve" viewBox="0 0 300 88" role="img" aria-label="Altura aproximada do sol ao longo do dia"><line x1="12" y1="76" x2="288" y2="76" stroke="#d8d8ca"/><polyline points={points} fill="none" stroke="#b29452" strokeWidth="1.5"/><circle cx={x} cy={y} r="5" fill="#bc944b"/><text x="12" y="87">06h</text><text x="140" y="87">13h</text><text x="274" y="87">20h</text></svg><input type="range" min="6" max="20" step="0.05" value={hour} onChange={e=>{setPlaying(false);setHour(+e.target.value);}} aria-label="Horário da simulação solar" aria-valuetext={timeLabel(hour)}/><label className="pr-solar-date">Data <input type="date" aria-label="Data da simulação solar" value={date} min="2020-01-01" max="2040-12-31" onChange={e=>{if(/^\d{4}-\d{2}-\d{2}$/.test(e.target.value))setDate(e.target.value);}}/></label><div className="pr-solar-actions"><button onClick={toggle}>{playing?<Pause size={15}/>:<Play size={15}/>} {playing?'Pausar':'Simular dia'}</button><label>Ritmo <select aria-label="Velocidade da simulação solar" value={speed} onChange={e=>setSpeed(+e.target.value)}><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label><button aria-label="Reiniciar o dia" onClick={()=>{setHour(6);setPlaying(false);}}><RotateCcw size={15}/></button></div><label className="pr-toggle"><span>Mostrar trajetória do sol</span><input type="checkbox" checked={trajectory} onChange={e=>setTrajectory(e.target.checked)}/></label><p>Observe a direção da luz e as sombras no cenário. Vacaria · norte da prancha · simulação aproximada.</p></div>}
  </section>;
}
