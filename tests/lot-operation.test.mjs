import test from 'node:test';
import assert from 'node:assert/strict';
import {newOperation, validateOperation, calculateOperation, addBusinessDays, cloudEnd, persistOperation} from '../shared/lot-operation.ts';
const receipt = (changes = {}) => ({id: '1', lot: 'A 01', entryDate: '2026-11-06', dueDate: '2026-11-13', fee: '2000', received: '0', paidDate: '', ...changes});
function fixture() {
  const x = newOperation(); x.base = '40000'; x.fee = '2000'; x.cancellation.thirdParty = '0';
  for (const s of x.stages.slice(0, 2)) Object.assign(s, {authorized: '2026-11-01', progress: '100', accepted: true, evidence: 'Medição e aceite assinados'});
  return x;
}
test('cenário do contrato: 45% executado, 6 mil recebidos, 2 mil exigíveis, 10 mil adicionais', () => {
  const x = fixture();
  x.receipts = [receipt({received: '2000', paidDate: '2026-11-10'}), receipt({id: '2', lot: 'A 02', received: '2000', paidDate: '2026-11-10'}), receipt({id: '3', lot: 'A 03', received: '2000', paidDate: '2026-11-10'}), receipt({id: '4', lot: 'A 04'})];
  const r = calculateOperation(x, '2026-11-14');
  assert.equal(r.executed, 18000); assert.equal(r.received, 6000); assert.equal(r.due, 2000); assert.equal(r.compensation, 10000); assert.equal(r.overdue, 2000);
});
test('sem entradas, nenhuma dívida de venda; compensação é apenas simulação separada', () => {
  const r = calculateOperation(fixture(), '2026-11-13');
  assert.equal(r.earned, 0); assert.equal(r.due, 0); assert.equal(r.compensation, 18000); assert.equal(r.potential, 192000);
});
test('desconhecidos impedem compensação e não se confundem com zero', () => {
  assert.equal(calculateOperation(newOperation(), '2026-11-13').compensation, null);
  const x = fixture(); x.cancellation.thirdParty = '2000';
  assert.equal(calculateOperation(x, '2026-11-13').compensation, null);
  x.cancellation.thirdPartyEvidence = 'Fornecedor e autorização';
  assert.equal(calculateOperation(x, '2026-11-13').compensation, 20000);
});
test('execução não comprovada não produz valor cobrável', () => {
  const x = fixture(); x.stages[2].progress = '50';
  assert.equal(calculateOperation(x, '2026-11-13').compensation, null);
});
test('adiantamentos abatem compensação sem produzir saldo negativo', () => {
  const x = fixture(); x.cancellation.advances = '25000';
  assert.equal(calculateOperation(x, '2026-11-13').compensation, 0);
});
test('aceite, sequência e dados inválidos são rejeitados', () => {
  for (const change of [x => x.stages[0].accepted = true, x => x.stages[1].authorized = '2026-11-01', x => x.stages[0].progress = '101', x => x.cloud.activated = '2026-11-01', x => x.units = '0', x => x.base = '-1', x => x.cloud.planned = '2026-02-30']) {
    const x = newOperation(); change(x); assert.throws(() => validateOperation(x));
  }
});
test('lote duplicado, pagamento acima da remuneração e falta de data são rejeitados', () => {
  const x = fixture(); x.receipts = [receipt(), receipt({id: '2', lot: ' a   01 '})]; assert.throws(() => validateOperation(x), /já está/);
  x.receipts = [receipt({received: '2500', paidDate: '2026-11-10'})]; assert.throws(() => validateOperation(x));
  x.receipts = [receipt({received: '1000'})]; assert.throws(() => validateOperation(x), /data/);
});
test('atraso só depois do vencimento; pagamento parcial deixa apenas o saldo', () => {
  const x = fixture(); x.receipts = [receipt({received: '700', paidDate: '2026-11-10'})];
  assert.equal(calculateOperation(x, '2026-11-13').overdue, 0);
  assert.equal(calculateOperation(x, '2026-11-14').overdue, 1300);
});
test('datas: cinco dias úteis, mudança de ano e 24 meses com ano bissexto', () => {
  assert.equal(addBusinessDays('2026-11-06'), '2026-11-13');
  assert.equal(addBusinessDays('2026-12-30'), '2027-01-06'); // Sem calendário de feriados.
  assert.equal(cloudEnd('2026-11-13'), '2028-11-13');
  assert.equal(cloudEnd('2028-02-29'), '2030-02-28');
  assert.equal(cloudEnd(''), '');
});
test('persistência preserva outra aba e falhas de armazenamento', () => {
  let stored = null; const storage = {getItem: () => stored, setItem: (_, value) => {stored = value;}};
  const raw = persistOperation(storage, null, fixture()); assert.equal(raw, stored);
  assert.throws(() => persistOperation(storage, null, fixture()), /outra aba/);
  assert.throws(() => persistOperation({getItem: () => null, setItem: () => {throw Error('Sem espaço');}}, null, fixture()), /Sem espaço/);
});
