import test from 'node:test';
import assert from 'node:assert/strict';
import {DocumentStore,collectLegacy,validatePayload,validateAccountBackup,archiveLegacy} from '../shared/portal-documents.ts';
import {initialSpatialProject} from '../shared/spatial-studio.mjs';
import {newBudget} from '../shared/commercial-budget.ts';
const project=()=>initialSpatialProject();
function server(){
 const rows=new Map();
 return {rows,transport:{async save(kind,id,payload,version){const old=rows.get(kind+':'+id);if((old?.version||0)!==version)throw Error('STALE_VERSION');const row={kind,document_id:id,payload:structuredClone(payload),version:version+1,updated_at:new Date().toISOString()};rows.set(kind+':'+id,row);return row;}}};
}
test('create, reload on another computer, update and reject stale edits',async()=>{
 const remote=server(),a=new DocumentStore(remote.transport),b=new DocumentStore(remote.transport);
 a.attach('owner',[]);await a.save('studio','project',project(),0);
 b.attach('owner',[...remote.rows.values()]);
 await a.save('studio','project',{...project(),name:'Updated'},1);
 await assert.rejects(b.save('studio','project',{...project(),name:'Stale'},1),/STALE_VERSION/);
 assert.equal(b.get('studio','project').version,1);
 b.attach('owner',[...remote.rows.values()]);assert.equal(b.get('studio','project').payload.name,'Updated');
});
test('network failure preserves the last acknowledged version',async()=>{
 const store=new DocumentStore({async save(){throw Error('offline');}});store.attach('owner',[]);
 await assert.rejects(store.save('studio','draft',project(),0),/offline/);assert.equal(store.get('studio','draft'),null);
});
test('late responses from a previous login never enter another account',async()=>{
 let resolve;const store=new DocumentStore({save:()=>new Promise(r=>resolve=r)});store.attach('a',[]);
 const pending=store.save('studio','draft',project(),0);store.clear();store.attach('b',[]);
 resolve({kind:'studio',document_id:'draft',payload:project(),version:1,updated_at:new Date().toISOString()});
 await assert.rejects(pending,/sessão mudou/);assert.equal(store.list('studio').length,0);
});
test('unauthenticated writes and invalid payloads are rejected before transport',async()=>{
 const store=new DocumentStore({async save(){assert.fail('must not call transport');}});
 await assert.rejects(store.save('studio','draft',project(),0),/Entre novamente/);
 store.attach('a',[]);await assert.rejects(store.save('studio','../bad',project(),0),/Identificação/);
 await assert.rejects(store.save('studio','draft',{...project(),margin:1},0));
 assert.throws(()=>validatePayload('unknown',[]),/desconhecido/);
});
test('legacy import only reads sources and reports damaged files',()=>{
 const data=new Map([['eme-spatial:commercial-budget:v1',JSON.stringify(newBudget())],['eme-spatial:studio:v1',JSON.stringify([{id:'old',project:project()}])],['eme-spatial:lot-operation:v1','broken']]);
 const before=JSON.stringify([...data]);const legacy=collectLegacy({getItem:key=>data.get(key)??null});
 assert.equal(legacy.documents.length,2);assert.equal(legacy.errors.length,1);assert.equal(JSON.stringify([...data]),before);
});
test('two saves of the same version do not silently overwrite',async()=>{
 const remote=server(),store=new DocumentStore(remote.transport);store.attach('a',[]);
 const outcome=await Promise.allSettled([store.save('studio','draft',project(),0),store.save('studio','draft',project(),0)]);
 assert.equal(outcome.filter(r=>r.status==='fulfilled').length,1);assert.equal(store.get('studio','draft').version,1);
});
test('singleton snapshots and returned copies cannot mutate cached data',async()=>{
 const remote=server(),store=new DocumentStore(remote.transport);store.attach('a',[]);
 const key='eme-spatial:commercial-budget:v1';await store.saveRaw(key,newBudget(),null);
 const copy=store.get('budget');copy.payload.name='tampered';assert.notEqual(store.get('budget').payload.name,'tampered');
 await assert.rejects(store.saveRaw(key,newBudget(),null),/mudou/);
});
test('account restore validates the whole backup before any write',()=>{
 const row={kind:'studio',document_id:'one',payload:project()};
 assert.equal(validateAccountBackup({schema:'eme-spatial-cloud-backup/1',documents:[row]}).length,1);
 assert.throws(()=>validateAccountBackup({schema:'other',documents:[row]}));
 assert.throws(()=>validateAccountBackup({schema:'eme-spatial-cloud-backup/1',documents:[row,row]}),/duplicado/);
 assert.throws(()=>validateAccountBackup({schema:'eme-spatial-cloud-backup/1',documents:[row,{...row,document_id:'../bad'}]}),/inválido/);
});

test('local archive preserves raw damaged drafts and never exports the Auth session',()=>{
 const data=new Map([['eme-spatial:lot-operation:v1','broken'],['eme-spatial:auth:v1','private-token']]);
 const result=archiveLegacy({getItem:key=>data.get(key)??null});
 assert.deepEqual(result.data,{'eme-spatial:lot-operation:v1':'broken'});
});
