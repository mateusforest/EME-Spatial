import {supabase,workspace} from './cloud';
import {validatePayload} from '../../shared/portal-documents';
import type {Media74} from './production74';
type StoredMedia = Omit<Media74,'blob'> & {path:string};
const bucket='spatial-portal-media';
async function digest(blob:Blob){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');}
export async function list74():Promise<Media74[]>{
 if(!supabase||!workspace.userId)throw Error('Entre novamente para acessar os arquivos.');
 return workspace.list('media').map(record=>({...record.payload as StoredMedia,blob:new Blob()}));
}
export async function readBlob74(row:Media74):Promise<Blob>{
 if(row.blob.size)return row.blob;
 if(!supabase||!workspace.userId)throw Error('Entre novamente para acessar os arquivos.');
 const owner=workspace.userId, metadata=workspace.get('media',row.id)?.payload as StoredMedia|undefined;
 if(!metadata||!metadata.path.startsWith(owner+'/'))throw Error('Arquivo fora desta conta.');
 const {data,error}=await supabase.storage.from(bucket).download(metadata.path);
 if(error||!data)throw Error('Não foi possível baixar o arquivo. Confira a conexão e tente novamente.');
 if(owner!==workspace.userId)throw Error('A sessão mudou. Entre novamente.');
 if(await digest(data)!==metadata.sha256)throw Error('A integridade do arquivo não confere. Preserve a cópia original.');
 return data;
}
export async function save74(rows:Media74[],expectedOwner:string|null){
 if(!supabase||!workspace.userId)throw Error('Entre novamente para salvar os arquivos.');
 const owner=workspace.userId;
 if(owner!==expectedOwner)throw Error('A sessão mudou. Confira a conta antes de salvar.');
 for(const row of rows){
  if(owner!==workspace.userId)throw Error('A sessão mudou. Entre novamente.');
  if(row.blob.size>50*1024*1024)throw Error('Cada arquivo pode ter até 50 MB. Exporte uma versão menor na MF.');
  const current=workspace.get('media',row.id), old=current?.payload as StoredMedia|undefined;
  if(old&&old.sha256!==row.sha256)throw Error('Já existe uma versão diferente com este identificador.');
  const {blob,...info}=row;
  const metadata:StoredMedia={...info,path:owner+'/'+row.id+'/'+row.sha256};
  validatePayload('media',metadata);
  if(!old){
   if(!blob.size||await digest(blob)!==row.sha256)throw Error('O arquivo não corresponde à versão informada.');
   const {error}=await supabase.storage.from(bucket).upload(metadata.path,blob,{contentType:row.mime,upsert:false});
   if(error){
    // A previous attempt may have uploaded the original before metadata failed.
    const existing=await supabase.storage.from(bucket).download(metadata.path);
    if(existing.error||!existing.data||await digest(existing.data)!==row.sha256)throw Error('Não foi possível enviar o arquivo. Confira a conexão e o espaço disponível. O original local foi preservado.');
   }
  }
  if(owner!==workspace.userId)throw Error('A sessão mudou. Entre novamente.');
  await workspace.save('media',row.id,metadata,current?.version||0,owner);
 }
}
