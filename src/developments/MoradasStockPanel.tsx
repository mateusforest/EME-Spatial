import {moradasUnits,floorStatus,statusLabels,stockDate} from './moradas-stock';
const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
export default function MoradasStockPanel({tower,floor,setTower,setFloor,onClose}:{tower:'A'|'B';floor:number;setTower:(tower:'A'|'B')=>void;setFloor:(floor:number)=>void;onClose:()=>void}){
 const selected=moradasUnits.filter(u=>u.floor===floor);
 return <aside className="moradas-stock" aria-label="Disponibilidade por andar"><button className="moradas-stock-close" onClick={onClose} aria-label="Recolher disponibilidade">Fechar ×</button>
  <div className="moradas-stock-details"><div className="moradas-stock-title"><strong>Escolha seu próximo lugar</strong><span>Espelho de {stockDate}</span></div>
   <div className="moradas-stock-legend"><span className="stock-available">● Disponível</span><span className="stock-negotiation">● Reservada / em negociação</span><span className="stock-sold">● Vendida / indisponível</span></div>
   <div className="moradas-stock-towers" role="group" aria-label="Selecionar torre">{(['A','B'] as const).map(t=><button key={t} type="button" aria-pressed={tower===t} onClick={()=>{setTower(t);setFloor(8);}}>Torre {t} · {t==='A'?'10 disponíveis':'100% vendida'}</button>)}</div>
   {tower==='A'?<><div className="moradas-stock-floors" role="group" aria-label="Selecionar andar">{[8,7,6,5,4,3,2,1].map(f=><button key={f} type="button" className={'stock-'+floorStatus(f)} aria-pressed={floor===f} onClick={()=>setFloor(f)}>{f}º</button>)}</div>
    <div className="moradas-stock-units" aria-live="polite">{selected.map(u=><article key={u.number} className={'stock-'+u.status}><strong>{u.number}</strong><span>{statusLabels[u.status]}</span><small>{u.area.toLocaleString('pt-BR')} m² · {u.bedrooms} dormitórios</small>{u.price&&<b>{money(u.price)}</b>}{['reserved','negotiation'].includes(u.status)&&<p>Esta unidade está em negociação. Consulte a equipe para confirmar a situação.</p>}{u.status==='available'&&<a href={'https://wa.me/5554991578029?text='+encodeURIComponent(`Olá! Tenho interesse na unidade ${u.number}, Torre A, do Moradas da Serra. Podemos confirmar a disponibilidade?`)} target="_blank" rel="noopener noreferrer">Consultar unidade ↗</a>}</article>)}</div></>:<p role="status">Torre B totalmente vendida: 36 de 36 unidades. Confira as opções da Torre A.</p>}
   <p className="moradas-stock-note">As faixas indicam a situação geral do andar; consulte cada unidade. Dados do espelho de {stockDate}, sujeitos a confirmação e alteração.</p>
  </div>
 </aside>;
}
