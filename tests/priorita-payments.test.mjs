import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultPayment,simulatePayment} from '../src/priorita/payment-simulation.ts';
import {demoStatus} from '../src/priorita/demo-stock.ts';
const simulate=(p={})=>simulatePayment(200000,{...defaultPayment,...p});
test('zero interest settles the principal including cent rounding',()=>{
 const r=simulate();assert.equal(r.down,40000);assert.equal(r.total,200000);assert.equal(r.rows.at(-1).balance,0);assert.equal(r.rows.length,60);
});
test('Price payments reconcile the discounted flows to the financed balance',()=>{
 const r=simulate({interest:1,balloon:5000});assert.ok(!r.error);assert.equal(r.balloonCount,5);assert.equal(r.rows[11].balloon,5000);
 const pv=r.rows.reduce((s,v)=>s+v.total/(1.01**v.month),0);assert.ok(Math.abs(pv-r.principal)<.15);assert.equal(r.rows.at(-1).balance,0);
});
test('balloons reduce regular installments rather than adding to principal',()=>{
 const r=simulate({balloon:8000});assert.equal(r.balloonTotal,40000);assert.equal(r.regular,2000);assert.equal(r.total,200000);
});
test('hypothetical correction compounds payments and balloons from month one',()=>{
 const base=simulate({balloon:5000}),indexed=simulate({balloon:5000,index:'cub',correction:.5});
 assert.equal(indexed.first,Math.round(base.first*1.005*100)/100);assert.equal(indexed.rows[11].balloon,Math.round(5000*1.005**12*100)/100);assert.ok(indexed.total>base.total);assert.equal(indexed.rows.at(-1).balance,0);
 assert.equal(simulate({correction:2,index:'none'}).total,200000);
});
test('cash and no down payment are valid; invalid fields and excess balloons are rejected',()=>{
 assert.equal(simulate({downPercent:100}).total,200000);assert.equal(simulate({downPercent:0}).principal,200000);
 for(const bad of [{months:0},{months:2.5},{interest:NaN},{downPercent:101},{downPercent:-1},{balloon:50000},{downPercent:100,balloon:5000},{index:'cub',correction:4}])assert.ok(simulate(bad).error);
});
test('short terms without a due balloon do not charge an extra payment',()=>{
 const r=simulate({months:5,balloon:5000});assert.equal(r.balloonCount,0);assert.equal(r.balloonTotal,0);assert.equal(r.total,200000);
});
test('demonstration availability covers all three states without changing unknown lots',()=>{
 assert.equal(demoStatus('A-01'),'available');assert.equal(demoStatus('A-03'),'reserved');assert.equal(demoStatus('B-02'),'unavailable');
});
