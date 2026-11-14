import {validateBudget} from './commercial-budget.ts';
import {validateOperation} from './lot-operation.ts';
import {validateSpatialProject} from './spatial-studio.mjs';

export type DocumentKind = 'studio' | 'budget' | 'operation' | 'management' | 'briefs' | 'production-queue' | 'media';
export type CloudDocument = {kind: DocumentKind; document_id: string; payload: unknown; version: number; updated_at: string};
export const legacyDocuments: Record<string, DocumentKind> = {
  'eme-spatial:commercial-budget:v1': 'budget', 'eme-spatial:lot-operation:v1': 'operation',
  'eme-spatial:management:v1': 'management', 'eme-spatial:briefs:v1': 'briefs',
  'eme-spatial:production-requests:v74': 'production-queue',
};
const text = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
export function validatePayload(kind: DocumentKind, value: unknown) {
  if (!['studio', 'budget', 'operation', 'management', 'briefs', 'production-queue', 'media'].includes(kind)) throw Error('Tipo de documento desconhecido.');
  if (JSON.stringify(value)?.length > 1500000) throw Error('Documento muito grande. Divida o conteúdo antes de salvar.');
  if (kind === 'studio') return validateSpatialProject(value);
  if (kind === 'budget') return validateBudget(value);
  if (kind === 'operation') return validateOperation(value);
  if (kind === 'media') {
    const v = value as {id: string; name: string; path: string; sha256: string; mime: string; kind: string; createdAt: string; approvedAt: string | null; origin: {projectId: string; projectName: string}};
    if (!v || !text(v.id, 80) || !text(v.name, 240) || !text(v.path, 240) || !/^[a-f0-9]{64}$/.test(v.sha256) || !['image/png', 'image/jpeg', 'image/webp', 'video/mp4'].includes(v.mime) || !v.mime.startsWith(v.kind + '/') || !Number.isFinite(Date.parse(v.createdAt)) || !(v.approvedAt === null || Number.isFinite(Date.parse(v.approvedAt))) || !v.origin || !text(v.origin.projectId, 80) || !text(v.origin.projectName, 120)) throw Error('Metadados do arquivo inválidos.');
    return value;
  }
  if (!Array.isArray(value) || value.length > 5000) throw Error('Lista de registros inválida.');
  const ids = new Set<string>();
  for (const row of value) {
    if (!row || !text(row.id, 100) || !row.id || ids.has(row.id)) throw Error('Registro sem identificação ou duplicado.');
    ids.add(row.id);
    if (kind === 'management' && (!['contratos', 'financeiro'].includes(row.type) || !text(row.name, 180) || !text(row.client, 180) || !Number.isFinite(row.value) || row.value < 0 || row.value > 1e12 || !text(row.date, 10) || !text(row.status, 80) || !['Entrada', 'Saída'].includes(row.direction))) throw Error('Registro de gestão inválido.');
    if (kind === 'briefs' && (!['imagens', 'videos'].includes(row.type) || !text(row.name, 120) || !text(row.prompt, 3000) || !text(row.format, 100) || !text(row.reference, 100))) throw Error('Briefing inválido.');
    if (kind === 'production-queue' && !text(row.projectName, 180)) throw Error('Pedido de produção inválido.');
  }
  return value;
}
export type DocumentTransport = {save: (kind: DocumentKind, id: string, value: unknown, version: number, owner: string) => Promise<CloudDocument>};
export class DocumentStore {
  private user: string | null = null;
  private generation = 0;
  private rows = new Map<string, CloudDocument>();
  private transport: DocumentTransport;
  constructor(transport: DocumentTransport) { this.transport = transport; }
  get userId() { return this.user; }
  attach(user: string, rows: CloudDocument[]) {
    const next = new Map<string, CloudDocument>();
    for (const row of rows) {
      if (!/^[\w-]{1,100}$/.test(row.document_id) || !Number.isSafeInteger(row.version) || row.version < 1 || !Number.isFinite(Date.parse(row.updated_at))) throw Error('Documento do servidor inválido. Preserve os dados e solicite recuperação.');
      validatePayload(row.kind, row.payload); next.set(row.kind + ':' + row.document_id, structuredClone(row));
    }
    this.generation++; this.user = user; this.rows = next;
  }
  clear() { this.generation++; this.user = null; this.rows.clear(); }
  list(kind: DocumentKind) { return [...this.rows.values()].filter(r => r.kind === kind).sort((a, b) => b.updated_at.localeCompare(a.updated_at)).map(r => structuredClone(r)); }
  get(kind: DocumentKind, id = 'main') { const row = this.rows.get(kind + ':' + id); return row ? structuredClone(row) : null; }
  readRaw(key: string) { const kind = legacyDocuments[key]; if (!kind) throw Error('Tipo de documento desconhecido.'); const row = this.get(kind); return row ? JSON.stringify(row.payload) : null; }
  async save(kind: DocumentKind, id: string, payload: unknown, version: number, owner = this.user) {
    if (!this.user) throw Error('Entre novamente para salvar.');
    if (owner !== this.user) throw Error('A sessão mudou. Confira a conta antes de salvar.');
    if (!/^[\w-]{1,100}$/.test(id)) throw Error('Identificação inválida.');
    validatePayload(kind, payload);
    const generation = this.generation;
    const result = await this.transport.save(kind, id, payload, version, this.user);
    if (generation !== this.generation || !this.user) throw Error('A sessão mudou durante o salvamento. Entre novamente para conferir.');
    if (result.kind !== kind || result.document_id !== id || result.version !== version + 1) throw Error('O servidor retornou uma versão inesperada. Atualize os dados antes de continuar.');
    validatePayload(result.kind, result.payload);
    const existing = this.rows.get(kind + ':' + id);
    if (!existing || existing.version < result.version) this.rows.set(kind + ':' + id, structuredClone(result));
    return result;
  }
  async saveRaw(key: string, payload: unknown, expected: string | null, owner = this.user) {
    if (this.readRaw(key) !== expected) throw Error('Este documento mudou. Exporte sua versão e atualize a lista antes de salvar.');
    const kind = legacyDocuments[key], current = this.get(kind);
    const row = await this.save(kind, 'main', payload, current?.version || 0, owner);
    return JSON.stringify(row.payload);
  }
}
export function validateAccountBackup(value: unknown) {
  const backup = value as {schema: string; documents: CloudDocument[]};
  if (!backup || backup.schema !== 'eme-spatial-cloud-backup/1' || !Array.isArray(backup.documents) || backup.documents.length > 5000) throw Error('Backup de conta inválido.');
  const ids = new Set<string>();
  for (const row of backup.documents) {
    if (!row || !/^[\w-]{1,100}$/.test(row.document_id) || ids.has(row.kind + ':' + row.document_id)) throw Error('Documento inválido ou duplicado no backup.');
    ids.add(row.kind + ':' + row.document_id); validatePayload(row.kind, row.payload);
  }
  return backup.documents;
}
export function collectLegacy(storage: Pick<Storage, 'getItem'>) {
  const documents: {kind: DocumentKind; id: string; payload: unknown}[] = [], errors: string[] = [];
  for (const [key, kind] of Object.entries(legacyDocuments)) {
    try { const raw = storage.getItem(key); if (!raw) continue; const payload = validatePayload(kind, JSON.parse(raw)); documents.push({kind, id: 'main', payload}); }
    catch { errors.push(key); }
  }
  try {
    const raw = storage.getItem('eme-spatial:studio:v1');
    if (raw) {
      const rows = JSON.parse(raw); if (!Array.isArray(rows) || rows.length > 1000) throw Error();
      for (const row of rows) { if (!row || !/^[\w-]{1,100}$/.test(row.id)) throw Error(); documents.push({kind: 'studio', id: row.id, payload: validateSpatialProject(row.project)}); }
    }
  } catch { errors.push('eme-spatial:studio:v1'); }
  return {documents, errors};
}
export function archiveLegacy(storage: Pick<Storage, 'getItem'>) {
  const data: Record<string, string> = {};
  for (const key of [...Object.keys(legacyDocuments), 'eme-spatial:studio:v1']) {
    const raw = storage.getItem(key); if (raw !== null) data[key] = raw;
  }
  return {schema: 'eme-spatial-local-archive/1', exportedAt: new Date().toISOString(), data};
}
