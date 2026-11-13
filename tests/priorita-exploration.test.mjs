import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {createRoadNavigator} from '../src/priorita/navigation.ts';

async function load(file,replacements){
  let text=readFileSync(new URL(file,import.meta.url),'utf8');
  for(const [from,to] of replacements)text=text.replace(from,to);
  return import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(text)).toString('base64'));
}
const plan=JSON.parse(readFileSync(new URL('../src/priorita/plan-source.json',import.meta.url),'utf8'));
const model=await load('../src/priorita/model.ts',[["import source from './plan-source.json';",`const source=${JSON.stringify(plan)};`]]);
const commerce=await load('../src/priorita/commercial.ts',[["import data from './commercial-data.json';",'const data='+readFileSync(new URL('../src/priorita/commercial-data.json',import.meta.url),'utf8')+';']]);

test('click-to-walk routes across the four streets without crossing lot interiors',()=>{
  const nav=createRoadNavigator(plan.roads.map(r=>r.polygon),model.canWalk);
  const stops=[[1.3,-155],[1.3,128],...[-23,34,92].flatMap(z=>[[-50,z],[50,z]])];
  for(const from of stops)for(const to of stops){
    const route=nav.route(from,to);assert.ok(route.length,`${from} to ${to}`);
    assert.deepEqual(route.at(-1),to);let last=from;
    for(const next of route){
      const steps=Math.max(1,Math.ceil(Math.hypot(next[0]-last[0],next[1]-last[1])/.2));
      for(let i=0;i<=steps;i++){const t=i/steps;assert.ok(model.canWalk(last[0]+(next[0]-last[0])*t,last[1]+(next[1]-last[1])*t));}
      last=next;
    }
  }
  assert.deepEqual(nav.route(stops[0],model.lots[0].center),[]);
  assert.deepEqual(nav.route([500,500],stops[0]),[]);
});
test('all recreation and institutional areas have valid fixed viewing positions',()=>{
  assert.equal(model.areas.length,3);
  assert.equal(model.areas.filter(a=>a.kind==='Institucional').length,1);
  for(const area of model.areas)assert.ok(model.containsPoint(area.center,area.polygon));
});
test('commercial examples are explicitly illustrative and payment sums match price',()=>{
  for(const lot of model.lots){
    const terms=commerce.commercialTerms(lot.id,lot.area),payment=commerce.paymentExample(terms);
    assert.equal(terms.illustrative,true);assert.ok(terms.price>0);assert.equal(payment.installments,60);
    assert.ok(Math.abs(payment.downPayment+payment.installment*payment.installments-terms.price)<.01);
    assert.match(terms.paymentConditions,/sem validade de oferta/);
  }
  assert.equal(commerce.priceLabel({price:null,paymentConditions:''}),'Sob consulta');
  assert.equal(commerce.paymentExample({price:null,paymentConditions:''}),null);
});
