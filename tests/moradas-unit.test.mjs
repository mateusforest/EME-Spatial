import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveUnitPlan} from '../src/developments/moradas-unit-plan.ts';
import {moradasUnits} from '../src/developments/moradas-stock.ts';

test('an individual plan requires an explicit matching unit and tower', () => {
  const plans=[{id:'type4',imageUrl:'/plan4.jpg'},{id:'other',imageUrl:'/other.jpg'}];
  const config={plans,units:[{tower:'b',label:'604',planId:'other'},{tower:'a',label:'Apto. 604',planId:'type4'}]};
  assert.equal(resolveUnitPlan(config,604),plans[0]);
  assert.equal(resolveUnitPlan(config,704),undefined);
  assert.equal(resolveUnitPlan({...config,units:[{tower:'a',label:'604',planId:'missing'}]},604),undefined);
  assert.equal(resolveUnitPlan({...config,units:[{tower:'b',label:'604',planId:'type4'}]},604),undefined);
});

test('the sales snapshot preserves the ten offered units and orange exceptions', () => {
  assert.equal(moradasUnits.length,32);
  assert.deepEqual(moradasUnits.filter(u=>u.status==='available').map(u=>u.number).sort((a,b)=>a-b),[101,201,202,203,204,302,304,604,704,804]);
  assert.deepEqual(moradasUnits.filter(u=>['reserved','negotiation'].includes(u.status)).map(u=>u.number).sort((a,b)=>a-b),[104,303,404,701]);
  assert.equal(moradasUnits.find(u=>u.number===604).price,331749);
});
