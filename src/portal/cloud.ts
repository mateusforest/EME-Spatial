import {createClient} from '@supabase/supabase-js';
import {DocumentStore} from '../../shared/portal-documents';
import type {CloudDocument} from '../../shared/portal-documents';

const url = import.meta.env.VITE_SPATIAL_SUPABASE_URL;
const key = import.meta.env.VITE_SPATIAL_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key, {auth: {storageKey: 'eme-spatial:auth:v1', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce'}}) : null;
export const workspace = new DocumentStore({async save(kind, id, payload, version, owner) {
  if (!supabase) throw Error('O acesso ao servidor ainda não está configurado.');
  const {data, error} = await supabase.rpc('spatial_portal_save', {p_kind: kind, p_id: id, p_payload: payload, p_version: version, p_owner: owner});
  if (error) {
    if (error.message.includes('STALE_VERSION')) throw Error('O documento mudou em outro computador. Exporte esta versão e use Atualizar dados antes de continuar.');
    if (error.code === '42501' || error.code === 'PGRST301') throw Error('Acesso não autorizado ou sessão expirada. Entre novamente.');
    throw Error('Não foi possível salvar no servidor. Suas alterações continuam abertas; exporte uma cópia e tente novamente.');
  }
  return data as CloudDocument;
}});
export async function loadWorkspace(userId: string) {
  if (!supabase) throw Error('Servidor não configurado.');
  const {data: member, error: denied} = await supabase.from('spatial_portal_members').select('email').eq('enabled', true).limit(1);
  if (denied || !member?.length) throw Error('Esta conta ainda não tem acesso ao EME Spatial. Solicite a liberação ao administrador.');
  const rows: CloudDocument[] = [];
  for (let offset = 0; ; offset += 500) {
    const {data, error} = await supabase.from('spatial_portal_documents').select('kind,document_id,payload,version,updated_at').eq('owner_id', userId).order('kind').order('document_id').range(offset, offset + 499);
    if (error) throw Error('Não foi possível carregar seus documentos. Verifique a conexão e tente novamente.');
    rows.push(...data as CloudDocument[]); if (data.length < 500) break;
  }
  return rows;
}
const dirtyEditors = new Set<string>();
export function setEditorDirty(id: string, dirty: boolean) { if (dirty) dirtyEditors.add(id); else dirtyEditors.delete(id); }
export function canLeaveWorkspace() { return !dirtyEditors.size || window.confirm('Há alterações ainda não salvas. Sair desta tela e descartá-las?'); }
