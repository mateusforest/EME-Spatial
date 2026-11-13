import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {filterLots,projection,presentationAssets} from '../src/priorita/presentation-model.ts';
const {lots}=JSON.parse(readFileSync(new URL('../src/priorita/plan-source.json',import.meta.url),'utf8'));
const stock=Object.fromEntries(lots.map(l=>[l.id,'available']));
stock['B-01']='reserved';stock['C-03']='unavailable';
test('availability, block, search and favorites share one intersecting selection',()=>{
 assert.equal(filterLots(lots,stock,'available','Todas','',[],false).length,94);
 assert.deepEqual(filterLots(lots,stock,'reserved','Todas','',[],false).map(l=>l.id),['B-01']);
 assert.equal(filterLots(lots,stock,'reserved','C','',[],false).length,0);
 assert.deepEqual(filterLots(lots,stock,'all','B',' b-01 ',['B-01'],true).map(l=>l.id),['B-01']);
 assert.equal(filterLots(lots,stock,'available','B','B-01',['B-01'],true).length,0);
 assert.deepEqual(filterLots(lots,stock,'unavailable','Todas','',[],false).map(l=>l.id),['C-03']);
});
test('hypothetical projection compounds positive, zero and negative rates',()=>{
 assert.equal(projection(200000,0,10),200000);
 assert.ok(Math.abs(projection(200000,5,2)-220500)<.001);
 assert.equal(projection(200000,-10,2),162000);
 assert.equal(projection(200000,-100,3),0);
 for(const values of [[-1,5,2],[1,Infinity,2],[1,5,-2],[1,-101,2]])assert.equal(projection(...values),null);
});
test('published demo library references actual files and has no remote embeds',()=>{
 for(const asset of presentationAssets){
  assert.ok(asset.url.startsWith('/assets/priorita/presentation/'));
  assert.ok(readFileSync(new URL('../public'+asset.url,import.meta.url)).length>0);
 }
});
