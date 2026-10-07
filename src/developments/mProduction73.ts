import {DESIGN_KEY,validate70,initial70,finishes70} from './mDesign70.ts';

/** Only the persisted approval is eligible for production, never the open preview. */
export function production73(storage:Pick<Storage,'getItem'>){
 const raw=storage.getItem(DESIGN_KEY);const saved=raw?JSON.parse(raw):null;
 if(raw&&!saved)throw new Error('Invalid saved approval');
 const design=saved?validate70(saved.design):{...initial70};
 if(!design||(saved&&(saved.version!==70||saved.unit!=='m-14'||!Number.isFinite(Date.parse(saved.approvedAt)))))throw new Error('Invalid saved approval');
 return {schema:'eme-spatial-production/1',unit:'m-14',source:'apartment72/floor14.json.gz',geometryRevision:72,
  approval:saved?'saved':'original',approvedAt:saved?.approvedAt??null,design,
  finishes:Object.fromEntries(Object.entries(finishes70).map(([key,options])=>[key,options[design[key as keyof typeof finishes70]]])),
  exportedAt:new Date().toISOString()};
}

export function downloadProduction73(storage:Pick<Storage,'getItem'>){
 const record=production73(storage),url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='EME-M14-versao-aprovada.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return record;
}

