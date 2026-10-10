import {useEffect, useRef, useState, type RefObject} from 'react';
import {finishes70, initial70, type Design70} from './mDesign70';
import './m-inline-demo.css';

type Stage = 'plan' | 'walk' | 'design';
type Props = {
  host: RefObject<HTMLDivElement | null>;
  ready: boolean;
  error: boolean;
  journey: boolean;
  room: string | null;
  time: number;
  message: string;
  visit: (room: string) => void;
  setTime: (time: number) => void;
  design: (design: Design70) => void;
  move: (direction: string, active: boolean) => void;
  zoom: (amount: number) => void;
};

const rooms = ['Living', 'Cozinha e jantar', 'Sacada'];
const steps = [{id:'plan', label:'Planta 3D'}, {id:'walk', label:'Percorrer'}, {id:'design', label:'Personalizar'}] as const;
const times = [{value:0, label:'Dia', icon:'☀'}, {value:55, label:'Fim de tarde', icon:'◒'}, {value:100, label:'Noite', icon:'☾'}];
const channels = [{key:'wood', label:'Madeira'}, {key:'fabric', label:'Estofado'}, {key:'stone', label:'Pedra'}] as const;

/** A temporary, unsaved configuration of the public M14 model. */
export default function MInlineDemo(props: Props) {
  const [stage, setStage] = useState<Stage>('plan');
  const [design, setDesign] = useState<Design70>({...initial70});
  const embedded = window.parent !== window;
  const pulseTimers = useRef(new Map<string, number>());
  useEffect(() => {if(props.room === 'Planta') setStage('plan');}, [props.room]);
  useEffect(() => () => {pulseTimers.current.forEach(timer => window.clearTimeout(timer)); pulseTimers.current.clear();}, []);
  const blocked = !props.ready || props.journey || props.error;
  const inside = props.room !== 'Planta' && !!props.room;
  const updateDesign = (next: Design70) => {setDesign(next); props.design(next);};
  const selectStage = (next: Stage) => {
    setStage(next);
    if(next === 'plan') props.visit('Planta');
    else if(!inside) props.visit('Living');
  };

  return <main className="m-demo" data-demo="m14" data-embedded={embedded} data-ready={props.ready && !props.error} data-room={props.room || 'loading'} data-time={props.time} data-design={JSON.stringify(design)} data-stage={stage} data-journey={props.journey}>
    {!embedded && <header className="m-demo-header">
      <div className="m-demo-project"><span className="m-demo-mark" aria-hidden="true">M</span><div><strong>Um espaço. Suas escolhas.</strong><span>Torre M · apartamento 14</span></div></div>
      <a href="/apresentar/m?apartamento=14" target="_blank" rel="noreferrer">Experiência completa <span aria-hidden="true">↗</span></a>
    </header>}
    <nav className="m-demo-steps" aria-label="Etapas da demonstração">
      {steps.map((step, index) => <button key={step.id} disabled={blocked} aria-pressed={stage === step.id} onClick={() => selectStage(step.id)}><span>0{index + 1}</span>{step.label}</button>)}
    </nav>
    <div className="m-demo-view">
      <div ref={props.host} className="m-demo-canvas" data-testid="m-canvas" data-ready={props.ready} />
      {props.ready && !props.error && <>
        <div className="m-demo-view-label"><span>{stage === 'plan' ? 'CONHEÇA A DISTRIBUIÇÃO' : stage === 'design' ? 'VEJA SUAS ESCOLHAS NO ESPAÇO' : 'EXPLORE EM PRIMEIRA PESSOA'}</span><strong>{props.room === 'Planta' ? 'Seu projeto, por inteiro.' : props.room}</strong></div>
        <div className="m-demo-zoom" role="group" aria-label="Aproximação"><button aria-label="Aproximar" onClick={() => props.zoom(.85)} disabled={props.journey}>+</button><button aria-label="Afastar" onClick={() => props.zoom(1.15)} disabled={props.journey}>−</button></div>
        {inside && stage !== 'design' && <div className="m-demo-walk" role="group" aria-label="Caminhar pelo apartamento">
          {[{id:'left', label:'Mover à esquerda', icon:'←'}, {id:'forward', label:'Avançar', icon:'↑'}, {id:'back', label:'Recuar', icon:'↓'}, {id:'right', label:'Mover à direita', icon:'→'}].map(direction => <button key={direction.id} aria-label={direction.label} disabled={props.journey}
            onClick={event => {if(event.detail !== 0) return; window.clearTimeout(pulseTimers.current.get(direction.id)); props.move(direction.id, true); pulseTimers.current.set(direction.id, window.setTimeout(() => {props.move(direction.id, false); pulseTimers.current.delete(direction.id);}, 180));}}
            onPointerDown={event => {event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); props.move(direction.id, true);}}
            onPointerUp={() => props.move(direction.id, false)} onPointerCancel={() => props.move(direction.id, false)} onLostPointerCapture={() => props.move(direction.id, false)}
            onKeyDown={event => {if(event.key === ' ' || event.key === 'Enter') {event.preventDefault(); props.move(direction.id, true);}}}
            onKeyUp={() => props.move(direction.id, false)} onBlur={() => props.move(direction.id, false)}>{direction.icon}</button>)}
        </div>}
        <p className="m-demo-help" id="m-demo-help">{props.journey ? 'Entrando no ambiente…' : inside ? 'Arraste para olhar · toque no piso para caminhar' : 'Arraste para girar · escolha um ambiente para entrar'}</p>
      </>}
      {(!props.ready || props.error) && <div className="m-demo-loading" role={props.error ? 'alert' : 'status'}>
        <span className="m-demo-loading-mark" aria-hidden="true">M</span>
        <strong>{props.error ? 'O espaço não carregou.' : 'Preparando seu espaço em 3D…'}</strong>
        <p>{props.error ? 'Tente novamente para explorar o apartamento.' : 'Só mais um instante para começar a explorar.'}</p>
        {props.error && <button onClick={() => location.reload()}>Tentar novamente</button>}
      </div>}
    </div>
    <section className="m-demo-controls" aria-label="Controles da experiência">
      <div className="m-demo-control-row">
        <div className="m-demo-room-controls"><span className="m-demo-control-label">{inside ? 'Ir para' : 'Entre em um ambiente'}</span><div className="m-demo-pills" role="group" aria-label="Ambientes">{rooms.map(room => <button key={room} disabled={blocked} aria-pressed={props.room === room} onClick={() => {if(stage === 'plan') setStage('walk'); props.visit(room);}}>{room}<span aria-hidden="true">↗</span></button>)}</div></div>
        <div className="m-demo-time-controls"><span className="m-demo-control-label">Luz natural e atmosfera</span><div className="m-demo-pills" role="group" aria-label="Iluminação">{times.map(time => <button key={time.value} disabled={!props.ready || props.error} aria-pressed={props.time === time.value} onClick={() => props.setTime(time.value)}><span aria-hidden="true">{time.icon}</span>{time.label}</button>)}</div></div>
      </div>
      {stage === 'design' && <div className="m-demo-finishes" aria-label="Materiais e formato da mesa">
        {channels.map(channel => <fieldset key={channel.key}><legend>{channel.label}</legend><div className="m-demo-swatches">{finishes70[channel.key].map(([label, color], index) => <button key={label} title={label} aria-label={`${channel.label}: ${label}`} aria-pressed={design[channel.key] === index} disabled={blocked} onClick={() => updateDesign({...design, [channel.key]:index})}><i style={{backgroundColor:color}} aria-hidden="true"/><span>{label}</span></button>)}</div></fieldset>)}
        <fieldset><legend>Formato da mesa</legend><div className="m-demo-pills m-demo-table">{(['round', 'oval'] as const).map(shape => <button key={shape} disabled={blocked} aria-pressed={design.table === shape} onClick={() => updateDesign({...design, table:shape})}><i className={`m-demo-table-${shape}`} aria-hidden="true"/>{shape === 'round' ? 'Redonda' : 'Oval'}</button>)}</div></fieldset>
      </div>}
      <p className="m-demo-note">{stage === 'design' ? 'Experimente materiais e proporções em tempo real.' : 'Empreendimento conceito · modelo 3D interativo'}</p>
      <span className="m-demo-sr" aria-live="polite">{props.message}</span>
    </section>
  </main>;
}
