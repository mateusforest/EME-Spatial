import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';import {gunzipSync,gzipSync} from 'node:zlib';
import {fetchMAsset87} from '../src/developments/mAsset87.ts';

test('compressed presentation geometry is byte-for-byte identical to its original',()=>{
 const folder='public/assets/m/model/',assets=readdirSync(folder).filter(f=>f.endsWith('.glb.gz'));assert.equal(assets.length,7);
 let original=0,compressed=0;for(const name of assets){const raw=readFileSync(folder+name.slice(0,-3)),packed=readFileSync(folder+name);assert.deepEqual(gunzipSync(packed),raw);original+=raw.length;compressed+=packed.length;}
 assert(compressed<original*.4);
});

test('asset transport handles raw hosting, compression, decoded responses, failure and cancellation',async()=>{
 const fetchBefore=globalThis.fetch,locationBefore=globalThis.location;
 const raw=new Uint8Array([103,108,84,70,2,0,0,0]),packed=gzipSync(raw),calls=[];
 try{
  globalThis.location={search:''};globalThis.fetch=async url=>{calls.push(url);return new Response(raw);};
  assert.deepEqual(new Uint8Array(await(await fetchMAsset87('/scene.glb')).arrayBuffer()),raw);assert.deepEqual(calls,['/scene.glb']);
  globalThis.location={search:'?apresentacao=1'};
  for(const data of [packed,raw]){calls.length=0;globalThis.fetch=async url=>{calls.push(url);return new Response(data);};assert.deepEqual(new Uint8Array(await(await fetchMAsset87('/scene.glb')).arrayBuffer()),raw);assert.deepEqual(calls,['/scene.glb.gz']);}
  calls.length=0;globalThis.fetch=async url=>{calls.push(url);return new Response(url.endsWith('.gz')?'invalid gzip':raw);};assert.deepEqual(new Uint8Array(await(await fetchMAsset87('/scene.glb')).arrayBuffer()),raw);assert.deepEqual(calls,['/scene.glb.gz','/scene.glb']);
  const controller=new AbortController();controller.abort();calls.length=0;globalThis.fetch=async url=>{calls.push(url);throw new DOMException('Aborted','AbortError');};await assert.rejects(fetchMAsset87('/scene.glb',{signal:controller.signal}),{name:'AbortError'});assert.equal(calls.length,1);
 }finally{globalThis.fetch=fetchBefore;if(locationBefore===undefined)delete globalThis.location;else globalThis.location=locationBefore;}
});
