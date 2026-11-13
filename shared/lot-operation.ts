export const operationKey = 'eme-spatial:lot-operation:v1';
export const stageDefinitions = [
  {id: 'base', name: 'Base e planejamento', weight: 15, detail: 'Insumos, implantação preliminar, referências e plano de produção.'},
  {id: 'scene', name: 'Cena exterior', weight: 30, detail: 'Terreno, vias, áreas comuns, paisagismo e materiais.'},
  {id: 'navigation', name: 'Navegação e piloto', weight: 25, detail: 'Recursos contratados, identificação dos lotes e teste privado.'},
  {id: 'media', name: 'Imagens, vídeos e entrega', weight: 30, detail: 'Imagens, filme, cortes e peças previstos no orçamento.'},
] as const;
export type Stage = {id: string; authorized: string; progress: string; cap: string; spent: string; evidence: string; accepted: boolean};
export type LotReceipt = {id: string; lot: string; entryDate: string; dueDate: string; fee: string; received: string; paidDate: string};
export type Operation = {
  version: 1; name: string; units: string; fee: string; base: string;
  sourceBudget?: {id:string;revision:number;name:string;scope:string;package:string;revisions:string;deliveryWeeks:string;units:string;fee:string;media:{name:string;quantity:string}[]};
  stages: Stage[]; receipts: LotReceipt[];
  cloud: {planned: string; activated: string; pilot: boolean; regular: boolean; authorized: boolean; minutes: string; monthly: string};
  cancellation: {thirdParty: string; thirdPartyEvidence: string; advances: string};
};
export function newOperation(): Operation {
  return {version: 1, name: 'Loteamento · 96 lotes', units: '96', fee: '', base: '',
    stages: stageDefinitions.map(s => ({id: s.id, authorized: '', progress: '0', cap: '', spent: '0', evidence: '', accepted: false})), receipts: [],
    cloud: {planned: '', activated: '', pilot: false, regular: false, authorized: false, minutes: '4500', monthly: ''},
    cancellation: {thirdParty: '', thirdPartyEvidence: '', advances: '0'}};
}
export function validDate(value: unknown): value is string {
  if (value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= '2000-01-01' && value <= '2199-12-31';
}
export function addBusinessDays(value: string, days = 5) {
  if (!value || !validDate(value)) return '';
  const date = new Date(value + 'T12:00:00Z');
  while (days > 0) { date.setUTCDate(date.getUTCDate() + 1); if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) days--; }
  return date.toISOString().slice(0, 10);
}
export function cloudEnd(value: string) {
  if (!value || !validDate(value)) return '';
  const date = new Date(value + 'T12:00:00Z');
  const year = date.getUTCFullYear() + 2, month = date.getUTCMonth();
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), last))).toISOString().slice(0, 10);
}
const cents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export function validateOperation(value: unknown): Operation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Arquivo de acompanhamento inválido.');
  const x = value as Operation;
  const text = (v: unknown, max = 3000) => typeof v === 'string' && v.length <= max;
  const amount = (v: unknown, max = 1e9) => typeof v === 'string' && (v === '' || (/^\d+(\.\d{0,2})?$/.test(v) && Number(v) <= max));
  if (x.version !== 1 || !text(x.name, 180) || typeof x.units !== 'string' || !/^\d+$/.test(x.units) || Number(x.units) < 1 || Number(x.units) > 10000 || !amount(x.fee) || !amount(x.base)) throw Error('Confira nome, quantidade de lotes, preço e base de compensação.');
  if (!Array.isArray(x.stages) || x.stages.length !== 4) throw Error('O plano deve conter as quatro etapas.');
  x.stages.forEach((s, i) => {
    if (!s || s.id !== stageDefinitions[i].id || !validDate(s.authorized) || !amount(s.progress, 100) || !amount(s.cap) || !amount(s.spent) || !text(s.evidence) || typeof s.accepted !== 'boolean') throw Error('Confira os dados das etapas.');
    if (s.accepted && (Number(s.progress) !== 100 || !s.authorized || !s.evidence.trim())) throw Error('O aceite exige execução de 100%, autorização e referência das entregas.');
    if (s.authorized && i > 0 && (!x.stages[i - 1].accepted || s.authorized < x.stages[i - 1].authorized)) throw Error('Autorize a próxima etapa somente depois do aceite da anterior.');
  });
  const cl = x.cloud;
  if (!cl || !validDate(cl.planned) || !validDate(cl.activated) || !['pilot', 'regular', 'authorized'].every(k => typeof cl[k as 'pilot'] === 'boolean') || !amount(cl.minutes) || !amount(cl.monthly)) throw Error('Confira o planejamento do Vagon.');
  if (cl.activated && (!cl.pilot || !cl.regular || !cl.authorized)) throw Error('Registre o piloto, a regularidade e a ordem de ativação antes de informar a ativação comercial.');
  const ca = x.cancellation;
  const source=x.sourceBudget;
  if(source&&(!/^[\w-]{1,100}$/.test(source.id)||!Number.isSafeInteger(source.revision)||source.revision<1||!text(source.name,180)||!text(source.scope,6000)||!text(source.package,80)||!amount(source.revisions,100)||!amount(source.deliveryWeeks,520)||!amount(source.units,10000)||!amount(source.fee)||!Array.isArray(source.media)||source.media.length!==4||source.media.some(m=>!text(m.name,100)||!amount(m.quantity,10000))))throw Error('A referência do orçamento está inválida.');
  if (!ca || !amount(ca.thirdParty) || !amount(ca.advances) || !text(ca.thirdPartyEvidence)) throw Error('Confira os dados da compensação.');
  if (!Array.isArray(x.receipts) || x.receipts.length > Number(x.units)) throw Error('A lista de repasses ultrapassa os lotes do projeto.');
  const lotIds = new Set<string>(), ids = new Set<string>();
  for (const r of x.receipts) {
    if (!r || !text(r.id, 100) || !r.id || ids.has(r.id) || !text(r.lot, 80) || !r.lot.trim() || !r.entryDate || !validDate(r.entryDate) || !r.dueDate || !validDate(r.dueDate) || r.dueDate < r.entryDate || !validDate(r.paidDate) || !amount(r.fee) || !r.fee || !amount(r.received) || r.received === '' || Number(r.received) > Number(r.fee)) throw Error('Confira identificação, datas e valores do repasse.');
    if (Number(r.received) > 0 && (!r.paidDate || r.paidDate < r.entryDate)) throw Error('Informe a data do recebimento pelo Grupo MF, a partir da entrada do comprador.');
    const lot = r.lot.trim().replace(/\s+/g, ' ').toLocaleUpperCase('pt-BR');
    if (lotIds.has(lot)) throw Error('Este lote já está registrado. Edite seu repasse para evitar duplicidade.');
    lotIds.add(lot); ids.add(r.id);
  }
  return x;
}
export function calculateOperation(input: Operation, today: string) {
  const x = validateOperation(input);
  const pending: string[] = [];
  if (!x.base) pending.push('Definir a base de compensação com o cliente.');
  if (x.cancellation.thirdParty === '') pending.push('Apurar despesas de terceiros; informe zero se não houver.');
  if (x.cancellation.advances === '') pending.push('Apurar adiantamentos; informe zero se não houver.');
  if (Number(x.cancellation.thirdParty) > 0 && !x.cancellation.thirdPartyEvidence.trim()) pending.push('Registrar comprovação e autorização dos terceiros.');
  const stages = x.stages.map((s, i) => {
    if (s.progress === '') pending.push('Informar a execução: ' + stageDefinitions[i].name + '.');
    if (Number(s.progress) > 0 && (!s.authorized || !s.evidence.trim())) pending.push('Comprovar execução e autorização: ' + stageDefinitions[i].name + '.');
    return {...s, value: cents(Number(x.base) * stageDefinitions[i].weight / 100 * Number(s.progress) / 100), overCap: s.cap !== '' && Number(s.spent) > Number(s.cap)};
  });
  const earned = cents(x.receipts.reduce((sum, r) => sum + Number(r.fee), 0));
  const received = cents(x.receipts.reduce((sum, r) => sum + Number(r.received), 0));
  const due = cents(earned - received);
  const overdue = cents(x.receipts.reduce((sum, r) => sum + (r.dueDate < today ? Number(r.fee) - Number(r.received) : 0), 0));
  const executed = cents(stages.reduce((sum, s) => sum + s.value, 0));
  const compensation = pending.length ? null : cents(Math.max(0, executed + Number(x.cancellation.thirdParty) - received - Number(x.cancellation.advances) - due));
  return {stages, earned, received, due, overdue, executed, compensation, pending,
    spent: cents(stages.reduce((sum, s) => sum + Number(s.spent), 0)),
    potential: x.fee === '' ? null : Number(x.units) * Number(x.fee),
    cloudEnd: cloudEnd(x.cloud.activated)};
}
export function persistOperation(storage: Pick<Storage, 'getItem' | 'setItem'>, expected: string | null, value: Operation) {
  validateOperation(value);
  if (storage.getItem(operationKey) !== expected) throw Error('O acompanhamento mudou em outra aba. Exporte sua versão e recarregue antes de continuar.');
  const raw = JSON.stringify(value);
  storage.setItem(operationKey, raw);
  return raw;
}
