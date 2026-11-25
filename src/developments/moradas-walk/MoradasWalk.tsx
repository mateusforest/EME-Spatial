import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowUp, ArrowDown, ArrowUpRight, Building2, Compass, Footprints, Home, Loader2, Map as MapIcon, Pause, Play, RotateCcw, RotateCw, Sparkles, Sun, X } from 'lucide-react';
import { whatsappUrl } from '../../data';
import { createEngine, type Engine, type WalkState } from './engine';
import { PLACES, TOWERS, LOT } from './site';
import { APT_SPOTS, PLAN_IMAGE, towerToPlan } from './apartment';
import { compassLabel, FRONT_AZIMUTH, headingFromYaw, solarPosition, sunTimes, timeLabel } from './solar';
import { ASSETS } from '../moradas';
import './walk.css';

const today = () => new Date().toISOString().slice(0, 10);
const year = new Date().getFullYear();
const DATES = [
  { id: 'hoje', label: 'Hoje', date: today() },
  { id: 'verao', label: 'Verão', date: `${year}-12-21` },
  { id: 'outono', label: 'Outono', date: `${year}-03-20` },
  { id: 'inverno', label: 'Inverno', date: `${year}-06-21` },
];

type AiState = { status: 'idle' } | { status: 'working'; preview: string; started: number } | { status: 'done'; preview: string; result: string } | { status: 'error'; preview: string; message: string };

export default function MoradasWalk({ onClose, initialFloor = 6 }: { onClose: () => void; initialFloor?: number }) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [st, setSt] = useState<WalkState>({ x: 0, z: 0, yaw: 0, level: 'ground', mode: 'walk', floor: initialFloor, moving: false });
  const [date, setDate] = useState(today());
  const [hour, setHour] = useState(16.5);
  const [playing, setPlaying] = useState(false);
  const [hint, setHint] = useState(true);
  const [ai, setAi] = useState<AiState>({ status: 'idle' });
  const [mapOpen, setMapOpen] = useState(true);
  const sun = useMemo(() => solarPosition(hour, date), [hour, date]);
  const times = useMemo(() => sunTimes(date), [date]);

  useEffect(() => {
    let disposed = false;
    createEngine(host.current!, s => !disposed && setSt(s), () => !disposed && setReady(true))
      .then(e => { if (disposed) e.dispose(); else { engine.current = e; e.setFloor(initialFloor); } })
      .catch(err => { console.error(err); setFailed(true); });
    return () => { disposed = true; engine.current?.dispose(); engine.current = null; };
  }, [initialFloor]);
  useEffect(() => { engine.current?.setSun(hour, date); }, [hour, date, ready]);
  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = performance.now();
    const step = (now: number) => { const dt = (now - last) / 1000; last = now; setHour(h => { const n = h + dt * .9; return n > times.set + .7 ? times.rise - .3 : n; }); raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [playing, times]);
  useEffect(() => { const t = setTimeout(() => setHint(false), 9000); return () => clearTimeout(t); }, []);
  useEffect(() => { const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && ai.status !== 'idle') setAi({ status: 'idle' }); }; window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc); }, [ai.status]);

  const inside = st.level === 'apt';
  const heading = headingFromYaw(st.yaw);
  const contact = whatsappUrl(`Olá! Estou fazendo a visita 3D do Moradas da Serra (Torre A, ${st.floor}º andar, Tipo 2). Gostaria de saber mais sobre as unidades disponíveis.`);
  const move = (f: number, t: number) => engine.current?.setMoveInput(f, t);

  async function realistic() {
    const e = engine.current; if (!e) return;
    const preview = e.capture();
    setAi({ status: 'working', preview, started: Date.now() });
    const where = inside ? 'interior de apartamento residencial novo, piso de madeira clara, paredes brancas' :'área externa de condomínio residencial com piscina, quadra e jardins';
    try {
      const res = await fetch('/api/realista', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: preview, context: { where, hour: timeLabel(hour), sunElevation: Math.round(sun.elevation), inside } }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.id) throw new Error(data.error || 'O serviço de imagem realista não está disponível agora.');
      for (let i = 0; i < 90; i++) {
        await new Promise(r => setTimeout(r, i < 5 ? 2500 : 4000));
        const poll = await fetch(`/api/realista?id=${encodeURIComponent(data.id)}`).then(r => r.json());
        if (poll.status === 'COMPLETED' && poll.image) { setAi({ status: 'done', preview, result: poll.image }); return; }
        if (poll.status === 'FAILED' || poll.error) throw new Error(poll.error || 'A geração falhou.');
      }
      throw new Error('Demorou mais do que o esperado. Tente de novo em instantes.');
    } catch (err) { setAi({ status: 'error', preview, message: (err as Error).message }); }
  }

  // minimapa
  const map = inside ? (() => { const [px, py] = towerToPlan(st.x - TOWERS.a.x, st.z - TOWERS.a.z); return { left: px / 1200 * 100, top: py / (PLAN_IMAGE.height * PLAN_IMAGE.scaleTo1200) * 100 }; })()
    : { left: (st.x - LOT.minX) / (LOT.maxX - LOT.minX) * 100, top: (st.z - LOT.minZ) / (LOT.maxZ + 14 - LOT.minZ) * 100 };
  const arrow = -st.yaw * 180 / Math.PI;

  return <div className="mw" data-level={st.level} data-mode={st.mode}>
    <div ref={host} className="mw-stage" />
    {!ready && !failed && <div className="mw-loading" role="status"><Loader2 className="mw-spin" size={22} /> Montando o condomínio em 3D…</div>}
    {failed && <div className="mw-loading" role="alert">Este navegador não conseguiu abrir a visita 3D. <button onClick={onClose}>Voltar</button></div>}

    <header className="mw-top">
      <button className="mw-back" onClick={onClose}><ArrowLeft size={15} /> Apresentação</button>
      <div className="mw-title"><small>DeVille · Vacaria, RS</small><strong>Moradas da Serra</strong><span>{inside ? `Torre A · ${st.floor}º andar · Tipo 2 · 3 dormitórios` : 'Caminhe pelo condomínio'}</span></div>
      <div className="mw-mode" role="group" aria-label="Modo de visita">
        <button aria-pressed={st.mode === 'walk'} onClick={() => engine.current?.setMode('walk')}><Footprints size={15} /> Caminhar</button>
        <button aria-pressed={st.mode === 'aerial'} onClick={() => engine.current?.setMode('aerial')}><Building2 size={15} /> Vista aérea</button>
      </div>
    </header>

    <nav className="mw-places" aria-label="Ir para">
      <p>Condomínio</p>
      {PLACES.map(p => <button key={p.id} onClick={() => engine.current?.goTo(p.id)}>{p.label}</button>)}
      <p>Apartamento · {st.floor}º andar</p>
      {APT_SPOTS.map(s => <button key={s.id} className={inside ? 'is-in' : ''} onClick={() => engine.current?.goTo(s.id)}>{s.label}</button>)}
      <div className="mw-floor"><span>Andar</span><div>{[1, 2, 3, 4, 5, 6, 7, 8].map(f => <button key={f} aria-pressed={st.floor === f} onClick={() => engine.current?.setFloor(f)}>{f}º</button>)}</div><small>Troque o andar e veja a vista mudar pela sacada.</small></div>
      {inside ? <button className="mw-cta-out" onClick={() => engine.current?.goTo('acesso')}><Home size={14} /> Sair para o condomínio</button> : <button className="mw-cta-in" onClick={() => engine.current?.goTo('sala')}><Home size={14} /> Entrar no apartamento</button>}
    </nav>

    {mapOpen ? <aside className={`mw-map ${inside ? 'is-plan' : ''}`} aria-label="Mapa">
      <button className="mw-map-close" onClick={() => setMapOpen(false)} aria-label="Fechar mapa"><X size={13} /></button>
      {inside ? <img src={ASSETS + PLAN_IMAGE.file} alt="Planta Tipo 2" /> : <SiteMap />}
      <i className="mw-dot" style={{ left: `${map.left}%`, top: `${map.top}%`, transform: `translate(-50%,-50%) rotate(${arrow}deg)` }} />
      <small>{inside ? 'Planta Tipo 2 · 70,82 m²' : 'Implantação ilustrativa'}</small>
    </aside> : <button className="mw-map-open" onClick={() => setMapOpen(true)}><MapIcon size={15} /> Mapa</button>}

    <section className="mw-sun" aria-label="Posição solar">
      <div className="mw-sun-head">
        <Sun size={16} /><strong>{timeLabel(hour)}</strong>
        <span>{sun.elevation > 0 ? `Sol a ${Math.round(sun.elevation)}° · vindo do ${compassLabel(sun.azimuth)}` : 'Sol abaixo do horizonte'}</span>
        <button className="mw-play" onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pausar o dia' : 'Animar o dia'}>{playing ? <Pause size={14} /> : <Play size={14} />}</button>
      </div>
      <input type="range" min={Math.floor(times.rise) - .5} max={Math.ceil(times.set) + 1.5} step={1 / 12} value={hour} onChange={e => { setPlaying(false); setHour(Number(e.target.value)); }} aria-label="Hora do dia" />
      <div className="mw-sun-scale"><span>☀ {timeLabel(times.rise)}</span><span>{timeLabel(times.set)} ☾</span></div>
      <div className="mw-dates" role="group" aria-label="Época do ano">{DATES.map(d => <button key={d.id} aria-pressed={date === d.date} onClick={() => setDate(d.date)}>{d.label}</button>)}<input type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)} aria-label="Data" /></div>
    </section>

    <div className="mw-compass" title={`Olhando para o ${compassLabel(heading)}`}><Compass size={15} style={{ transform: `rotate(${-heading}deg)` }} /><span>{compassLabel(heading)}</span></div>

    <div className="mw-actions">
      <button className="mw-ai" onClick={realistic} disabled={!ready || ai.status === 'working'}><Sparkles size={16} /> Ver esta vista realista</button>
      <a className="mw-contact" href={contact} target="_blank" rel="noopener noreferrer">Falar com a equipe <ArrowUpRight size={15} /></a>
    </div>

    {st.mode === 'walk' && <div className="mw-pad" aria-label="Controles de caminhada">
      <button aria-label="Girar à esquerda" onPointerDown={() => move(0, 1)} onPointerUp={() => move(0, 0)} onPointerLeave={() => move(0, 0)}><RotateCcw size={18} /></button>
      <div><button aria-label="Andar para frente" onPointerDown={() => move(1, 0)} onPointerUp={() => move(0, 0)} onPointerLeave={() => move(0, 0)}><ArrowUp size={18} /></button>
        <button aria-label="Andar para trás" onPointerDown={() => move(-1, 0)} onPointerUp={() => move(0, 0)} onPointerLeave={() => move(0, 0)}><ArrowDown size={18} /></button></div>
      <button aria-label="Girar à direita" onPointerDown={() => move(0, -1)} onPointerUp={() => move(0, 0)} onPointerLeave={() => move(0, 0)}><RotateCw size={18} /></button>
    </div>}

    {hint && ready && <div className="mw-hint" onClick={() => setHint(false)}>Arraste para olhar · clique no chão para ir até lá · <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> ou setas para andar · <kbd>Shift</kbd> corre</div>}
    <p className="mw-note">Estudo ilustrativo. Implantação, acabamentos e mobiliário sujeitos ao projeto aprovado. Orientação solar {FRONT_AZIMUTH === 0 ? 'provisória' : 'conforme implantação'}.</p>

    {ai.status !== 'idle' && <div className="mw-ai-sheet" role="dialog" aria-label="Vista realista">
      <div className="mw-ai-card">
        <button className="mw-ai-close" onClick={() => setAi({ status: 'idle' })} aria-label="Fechar"><X size={16} /></button>
        <div className="mw-ai-images">
          <figure><img src={ai.preview} alt="Vista 3D" /><figcaption>Vista 3D</figcaption></figure>
          <figure className={ai.status === 'working' ? 'is-working' : ''}>{ai.status === 'done' ? <img src={ai.result} alt="Vista realista gerada" /> : ai.status === 'working' ? <div className="mw-ai-wait"><Loader2 className="mw-spin" size={26} /><span>Gerando a imagem realista…<br /><small>leva de 20 a 60 segundos</small></span></div> : <div className="mw-ai-wait"><span>{ai.status === 'error' ? ai.message : ''}</span></div>}<figcaption>Realista (IA)</figcaption></figure>
        </div>
        <p>Imagem gerada por IA a partir desta vista. Serve para sentir o ambiente; não substitui o memorial descritivo.</p>
        {ai.status === 'done' && <a className="mw-contact" href={ai.result} download={`moradas-da-serra-${timeLabel(hour).replace(':', 'h')}.jpg`}>Baixar imagem</a>}
      </div>
    </div>}
  </div>;
}

function SiteMap() {
  const W = LOT.maxX - LOT.minX, H = LOT.maxZ + 14 - LOT.minZ;
  const r = (x0: number, z0: number, x1: number, z1: number, fill: string, key: string) => <rect key={key} x={x0 - LOT.minX} y={z0 - LOT.minZ} width={x1 - x0} height={z1 - z0} fill={fill} />;
  return <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
    {r(LOT.minX, LOT.minZ, LOT.maxX, LOT.maxZ, '#cfd8c4', 'lot')}
    {r(LOT.minX, 37 - 3, LOT.maxX, 45, '#8a8f93', 'rua')}
    {r(-4, -6, 6, 34, '#e7e3da', 'eixo')}
    {r(28, -34, 46, 0, '#9aa0a4', 'est')}
    {Object.values(TOWERS).map(t => r(t.x - 11.7, t.z - 8, t.x + 11.7, t.z + 8, '#f7f5ef', t.id))}
    {r(-40, 3, -16, 18, '#6fae6a', 'quadra')}
    {r(5, 1, 25, 12, '#b48a62', 'deck')}{r(8, 4, 22, 9, '#55b7d3', 'piscina')}
    {r(26, -2, 40, 12, '#cfc3b2', 'salao')}
    {r(-13, 6, -1, 15, '#d9b36a', 'play')}
    <circle cx={2 - LOT.minX} cy={10 - LOT.minZ} r={3.4} fill="#b9ad9c" />
    {Object.values(TOWERS).map(t => <text key={'l' + t.id} x={t.x - LOT.minX} y={t.z - LOT.minZ + 2} fontSize="5" textAnchor="middle" fill="#2d3b33">{t.id.toUpperCase()}</text>)}
  </svg>;
}
