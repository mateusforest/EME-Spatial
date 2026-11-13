import test from 'node:test';
import assert from 'node:assert/strict';
import {newBudget} from '../shared/commercial-budget.ts';
import {newOperation,validateOperation} from '../shared/lot-operation.ts';
import {operationFromBudget,copyOperationPlan} from '../shared/commercial-links.ts';
test('contract working copy retains the chosen budget revision and public scope only',()=>{
 const b=newBudget(),op=operationFromBudget(b,'budget-a',3);b.commercial.price='2000';b.scope='changed';
 assert.equal(op.fee,'1500');assert.equal(op.sourceBudget.revision,3);assert.notEqual(op.sourceBudget.scope,b.scope);assert.equal(op.sourceBudget.media[0].quantity,'12');assert.equal('tierCosts' in op.sourceBudget,false);assert.equal(op.base,'');assert.equal(op.cloud.activated,'');
});
test('an active operation cannot be silently replaced by another budget',()=>{
 const op=newOperation();op.stages[0].authorized='2026-11-13';assert.throws(()=>operationFromBudget(newBudget(),'a',1,op),/execução ou repasses/);
});
test('only a defined per-lot single-payment proposal can feed the lot operation',()=>{
 for(const values of [{mode:'percent'},{installments:'2'},{price:''},{price:'0'}]){const b=newBudget();Object.assign(b.commercial,values);assert.throws(()=>operationFromBudget(b,'a',1));}
});
test('copying a plan never duplicates income, expenditure, acceptance or cloud activation',()=>{
 const op=operationFromBudget(newBudget(),'a',1);op.stages[0]={...op.stages[0],authorized:'2026-11-13',progress:'100',spent:'1000',evidence:'Test',accepted:true};op.receipts=[{id:'one',lot:'A1',entryDate:'2026-11-13',dueDate:'2026-11-20',fee:'1500',received:'1500',paidDate:'2026-11-13'}];op.cloud={...op.cloud,activated:'2026-11-13',pilot:true,regular:true,authorized:true};
 const copy=copyOperationPlan(op);assert.equal(copy.receipts.length,0);assert.equal(copy.stages[0].spent,'0');assert.equal(copy.stages[0].accepted,false);assert.equal(copy.cloud.activated,'');assert.equal(copy.fee,'1500');validateOperation(copy);
});
