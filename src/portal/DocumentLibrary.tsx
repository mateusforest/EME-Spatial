import {useState} from 'react';
import type {ReactNode} from 'react';
import {Copy,Plus,FolderOpen} from 'lucide-react';
import {workspace,canLeaveWorkspace} from './cloud';
import './commercial-budget.css';

export type EditorDocument<T>={documentId:string;seed?:T;onSaved:()=>void};
export default function DocumentLibrary<T extends {name:string}>({kind,label,copy,children}:{kind:'budget'|'operation';label:string;copy:(value:T)=>T;children:(props:EditorDocument<T>)=>ReactNode}){
 const [rows,setRows]=useState(()=>workspace.list(kind));
 const [selected,setSelected]=useState(()=>rows.some(r=>r.document_id==='main')?'main':rows[0]?.document_id||'main');
 const [seed,setSeed]=useState<T|undefined>();
 const current=rows.find(r=>r.document_id===selected);
 function open(id:string){if(!canLeaveWorkspace())return;setSeed(undefined);setSelected(id);}
 function create(duplicate=false){
  if(!canLeaveWorkspace())return;
  setSeed(duplicate&&current?copy(structuredClone(current.payload as T)):undefined);setSelected(crypto.randomUUID());
 }
 return <><section className="cb cb-library" aria-label={'Biblioteca de '+label.toLowerCase()}><label><FolderOpen size={16}/>{label} salvo<select aria-label={label+' salvo'} value={current?selected:''} onChange={e=>{if(e.target.value)open(e.target.value);}}><option value="" disabled>Novo rascunho · ainda não salvo</option>{rows.map(r=><option key={r.document_id} value={r.document_id}>{(r.payload as T).name} · versão {r.version}</option>)}</select></label><div className="cb-actions"><button onClick={()=>create()}><Plus size={15}/>Novo {label.toLowerCase()}</button><button disabled={!current} onClick={()=>create(true)}><Copy size={15}/>{kind==='operation'?'Copiar plano sem repasses':'Duplicar versão salva'}</button></div><p className="cb-note">{current?'Versão '+current.version+' · salva em '+new Date(current.updated_at).toLocaleString('pt-BR'):'Edite e salve para adicionar este documento à sua biblioteca.'} {kind==='operation'?'Cada acompanhamento mantém suas etapas e recebimentos separados.':'Duplique para comparar propostas sem substituir o orçamento original.'}</p></section><div key={selected}>{children({documentId:selected,seed,onSaved:()=>{setRows(workspace.list(kind));setSeed(undefined);}})}</div></>;
}
