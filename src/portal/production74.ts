export type Origin74={projectId:string;projectName:string;originType:string;engine:string;sourceSha256?:string;id?:string;mode?:string;view?:string;parents?:string[];[key:string]:unknown};
export type Media74={id:string;name:string;kind:'image'|'video';mime:string;sha256:string;createdAt:string;origin:Origin74;blob:Blob;approvedAt:string|null};
const mime74=['image/png','image/jpeg','image/webp','video/mp4'];
function fail():never{throw Error('Pacote inválido. Exporte os resultados pela área Spatial da MF.');}
export async function decode74(text:string):Promise<Media74[]>{
 if(text.length>115*1024*1024)throw Error('Pacote muito grande. Exporte cada resultado separadamente na MF.');
 const p=JSON.parse(text);if(p.schema!=='eme-spatial-library/1'||!Array.isArray(p.items)||p.items.length<1||p.items.length>30)fail();
 const ids=new Set<string>();const rows:Media74[]=[];let size=0;
 for(const i of p.items){
  if(typeof i.id!=='string'||!/^[\w-]{1,80}$/.test(i.id)||ids.has(i.id)||typeof i.name!=='string'||i.name.length>240||!mime74.includes(i.mime)||!['image','video'].includes(i.kind)||!i.mime.startsWith(i.kind+'/')||typeof i.sha256!=='string'||!/^[a-f0-9]{64}$/.test(i.sha256)||typeof i.data!=='string'||!Number.isFinite(Date.parse(i.createdAt)))fail();
  const o=i.origin;if(!o||typeof o.projectId!=='string'||!/^[\w-]{1,80}$/.test(o.projectId)||typeof o.projectName!=='string'||o.projectName.length>120||typeof o.engine!=='string'||o.engine.length>100)fail();
  const binary=atob(i.data);size+=binary.length;if(size>80*1024*1024)fail();
  const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(digest!==i.sha256)throw Error('A integridade de um arquivo não confere. Exporte novamente na MF.');
  rows.push({id:i.id,name:i.name,kind:i.kind,mime:i.mime,sha256:i.sha256,createdAt:i.createdAt,origin:o,blob:new Blob([bytes],{type:i.mime}),approvedAt:null});ids.add(i.id);
 }
 return rows;
}
function db74():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open('eme-spatial-production',1);r.onupgradeneeded=()=>r.result.createObjectStore('media',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function list74():Promise<Media74[]>{const db=await db74();return new Promise((resolve,reject)=>{const t=db.transaction('media');const r=t.objectStore('media').getAll();t.oncomplete=()=>{db.close();resolve(r.result as Media74[]);};t.onerror=()=>{db.close();reject(t.error);};});}
export async function save74(rows:Media74[]){const db=await db74();return new Promise<void>((resolve,reject)=>{const t=db.transaction('media','readwrite');const store=t.objectStore('media');for(const row of rows)store.put(row);t.oncomplete=()=>{db.close();resolve();};t.onabort=t.onerror=()=>{db.close();reject(t.error||Error('Armazenamento indisponível.'));};});}
export async function import74(rows:Media74[]){const current=await list74();const byId=new Map(current.map(r=>[r.id,r]));for(const row of rows){const old=byId.get(row.id);if(old&&old.sha256!==row.sha256)throw Error('Uma versão existente tem o mesmo identificador e conteúdo diferente.');if(old)row.approvedAt=old.approvedAt;}await save74(rows);}
export function approved74(rows:Media74[]){if(!rows.length||rows.some(r=>!r.approvedAt))throw Error('Revise e aprove cada arquivo antes de preparar a entrega.');return rows;}
export function download74(blob:Blob,name:string){const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
export async function package74(rows:Media74[],approvedOnly=false){if(approvedOnly)approved74(rows);if(rows.length>30||rows.reduce((n,r)=>n+r.blob.size,0)>80*1024*1024)throw Error('Exporte por projeto ou use Backup desta versão. Limite de 80 MB e 30 arquivos por pacote.');const items=[];for(const r of rows){const b=new Uint8Array(await r.blob.arrayBuffer());let s='';for(let i=0;i<b.length;i+=32768)s+=String.fromCharCode(...b.subarray(i,i+32768));items.push({id:r.id,name:r.name,kind:r.kind,mime:r.mime,sha256:r.sha256,createdAt:r.createdAt,origin:r.origin,approval:approvedOnly?{approvedAt:r.approvedAt}:null,data:btoa(s)});}return new Blob([JSON.stringify({schema:'eme-spatial-library/1',exportedAt:new Date().toISOString(),items})],{type:'application/json'});}
