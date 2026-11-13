import {validateSpatialProject} from '../../shared/spatial-studio.mjs';
import type {SpatialProject} from '../../shared/spatial-studio.mjs';
import {workspace} from './cloud';
export class ApiError extends Error {status=0;}
export async function api<T>(path:string,method='GET',body?:{project?:SpatialProject;version?:number}):Promise<T>{
 if(!workspace.userId)throw new ApiError('Entre na sua conta para acessar os projetos.');
 if(method==='GET')return {projects:workspace.list('studio').map(r=>({id:r.document_id,version:r.version,project:r.payload,updatedAt:r.updated_at})),aiReady:false,productionReady:false} as T;
 if(!body?.project||!['POST','PATCH'].includes(method))throw new ApiError('Integração indisponível nesta versão.');
 const project=validateSpatialProject(body.project),id=method==='POST'?crypto.randomUUID():path.split('/')[2];
 const row=await workspace.save('studio',id,project,method==='POST'?0:body.version||0);
 return {id:row.document_id,version:row.version,project:row.payload,updatedAt:row.updated_at} as T;
}
