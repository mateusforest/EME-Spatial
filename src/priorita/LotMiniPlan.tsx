import {areas,lots,plan,statusInfo} from './model';
import type {LotStatus} from './model';
const points=(p:number[][])=>p.map(([x,y])=>`${x},${y}`).join(' ');
const all=[...lots.flatMap(l=>l.polygon),...plan.roads.flatMap(r=>r.polygon),...areas.flatMap(a=>a.polygon)];
const minX=Math.min(...all.map(p=>p[0]))-7,minY=Math.min(...all.map(p=>p[1]))-7;
const width=Math.max(...all.map(p=>p[0]))-minX+7,height=Math.max(...all.map(p=>p[1]))-minY+7;
export default function LotMiniPlan({selected,stock,onSelect}:{selected:string;stock:Record<string,LotStatus>;onSelect:(id:string)=>void}){
 const chosen=lots.find(l=>l.id===selected);
 return <section className="pr-mini-plan" aria-label="Planta para escolher o lote">
  <header><div><span className="pr-eyebrow">LOCALIZE SUA ESCOLHA</span><h4>Lote {selected}</h4></div><span>Toque em outro lote para comparar valores</span></header>
  <svg viewBox={`${minX} ${minY} ${width} ${height}`} aria-label={`Planta do Priorità com lote ${selected} destacado`}>
   {plan.roads.map((r,i)=><polygon key={`r${i}`} points={points(r.polygon)} fill="#61756a" opacity=".5"/>)}
   {areas.map(a=><polygon key={a.id} points={points(a.polygon)} fill="#556447" stroke="#879170" strokeWidth=".4"/>)}
   {lots.map(l=><polygon key={l.id} points={points(l.polygon)} fill={statusInfo[stock[l.id]].color} fillOpacity={selected===l.id?1:.22} stroke={selected===l.id?'#ffe2a0':'#b5c7a5'} strokeWidth={selected===l.id?1.8:.4} role="button" tabIndex={0} aria-label={`Escolher lote ${l.id}, ${statusInfo[stock[l.id]].label}`} aria-pressed={selected===l.id} onClick={()=>onSelect(l.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(l.id);}}}><title>{l.id} · {statusInfo[stock[l.id]].label}</title></polygon>)}
   {chosen&&<g pointerEvents="none"><line x1={chosen.center[0]} y1={chosen.center[1]} x2={chosen.center[0]} y2={chosen.center[1]-12} stroke="#ffe2a0" strokeWidth=".8"/><rect x={chosen.center[0]-14} y={chosen.center[1]-20} width="28" height="10" rx="3" fill="#efdb9f"/><text x={chosen.center[0]} y={chosen.center[1]-13} textAnchor="middle" fill="#12352c" fontSize="6" fontWeight="600">{selected}</text></g>}
  </svg>
  <footer>{Object.entries(statusInfo).map(([key,v])=><span key={key}><i style={{background:v.color}}/>{v.label}</span>)}</footer>
  <small>Planta de consulta · disponibilidade demonstrativa</small>
 </section>;
}
