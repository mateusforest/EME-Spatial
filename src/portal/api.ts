import {validateSpatialProject} from '../../shared/spatial-studio.mjs';
import type {SpatialProject} from '../../shared/spatial-studio.mjs';
export class ApiError extends Error {status=0;}
type Row={id:string;version:number;project:SpatialProject;updatedAt:string};
const key='eme-spatial:studio:v1';
export async function api<T>(path:string,method='GET',body?:{project?:SpatialProject;version?:number}):Promise<T>{
 let rows:Row[];
 try {rows=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(rows))throw Error();}
 catch {throw new ApiError('Não foi possível ler os rascunhos deste navegador. Exporte os dados antes de limpar o armazenamento.');}
 if(method==='GET')return {projects:rows,aiReady:false,productionReady:false} as T;
 if(!body?.project)throw new ApiError('Integração indisponível nesta prévia.');
 const project=validateSpatialProject(body.project),id=path.split('/')[2];
 const previous=rows.find(r=>r.id===id);
 if(method==='PATCH'&&(!previous||previous.version!==body.version))throw new ApiError('Este rascunho mudou em outra aba. Atualize a lista antes de salvar.');
 const row:Row={id:previous?.id||crypto.randomUUID(),version:(previous?.version||0)+1,project,updatedAt:new Date().toISOString()};
 try {localStorage.setItem(key,JSON.stringify([row,...rows.filter(r=>r.id!==row.id)]));}
 catch {throw new ApiError('Não foi possível salvar neste navegador. Exporte o projeto para preservar seu trabalho.');}
 return row as T;
}
