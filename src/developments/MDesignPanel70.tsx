import {useEffect,useState} from 'react';
import {finishes70,read70,save70,initial70,type Design70} from './mDesign70';
import './m-design70.css';
export default function MDesignPanel70({apply,onClose}:{apply:(d:Design70)=>void;onClose:()=>void}){
 const [saved,setSaved]=useState(()=>read70(localStorage)),[draft,setDraft]=useState(saved),[compare,setCompare]=useState(false),[message,setMessage]=useState('Explore os acabamentos no próprio pavimento.');
 useEffect(()=>{apply(compare?saved:draft);},[draft,compare,saved,apply]);
 useEffect(()=>()=>apply(read70(localStorage)),[apply]);
 function approve(){try{const next=save70(localStorage,draft);setSaved(next);setCompare(false);setMessage('Aprovado e salvo neste navegador. Será restaurado nas próximas visitas.');}catch{setMessage('Não foi possível salvar. Sua prévia continua aberta; tente novamente.');}}
 return <aside className="m-design70" aria-label="Personalizar apartamento 14">
  <div className="m-design70-head"><span>APARTAMENTO 14 · PAVIMENTO ATUAL</span><button onClick={onClose} aria-label="Fechar personalização">×</button></div>
  <h2>Seu espaço, seus acabamentos.</h2><p>Prévia no modelo completo. Paredes, circulação e sacada preservadas.</p>
  {(Object.keys(finishes70) as (keyof typeof finishes70)[]).map(key=><fieldset key={key}><legend>{{wood:'Madeira e marcenaria',fabric:'Estofados e tecidos',accent:'Poltronas e almofadas',stone:'Pedras do mobiliário'}[key]}</legend><div>{finishes70[key].map(([label,color],index)=><button key={label} aria-pressed={draft[key]===index} disabled={compare} onClick={()=>{setDraft({...draft,[key]:index});setMessage('Prévia não salva.');}}><i style={{background:color}}/>{label}</button>)}</div></fieldset>)}
  <fieldset><legend>Mesa de centro</legend><div>{(['round','oval'] as const).map(table=><button key={table} disabled={compare} aria-pressed={draft.table===table} onClick={()=>setDraft({...draft,table})}>{table==='round'?'Redonda':'Oval'}</button>)}</div></fieldset>
  <label><input type="checkbox" checked={compare} onChange={e=>setCompare(e.target.checked)}/> Comparar com a versão salva</label>
  <p role="status">{message}</p><button className="m-design70-save" onClick={approve} disabled={compare}>Aprovar e salvar</button>
  <div className="m-design70-actions"><button onClick={()=>{setDraft(saved);setCompare(false);setMessage('Prévia descartada.');}}>Descartar prévia</button><button onClick={()=>{setDraft({...initial70});setCompare(false);}}>Acabamentos originais</button></div>
  <small>Salvo somente neste navegador. Não publica alterações para outros visitantes. Fechar sem salvar descarta a prévia.</small>
 </aside>;
}
