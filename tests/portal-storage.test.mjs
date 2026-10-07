import test from 'node:test';
import assert from 'node:assert/strict';
import {api} from '../src/portal/api.ts';
import {initialSpatialProject} from '../shared/spatial-studio.mjs';
const data=new Map();
globalThis.localStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
test('workspace local: salvar, recuperar, editar e impedir sobrescrita de outra aba',async()=>{
 data.clear();
 const created=await api('/spatial-studio','POST',{project:initialSpatialProject()});
 assert.equal(created.version,1);
 const snapshot=await api('/spatial-studio');
 assert.equal(snapshot.projects[0].id,created.id);
 assert.equal(snapshot.aiReady,false);
 const changed=await api('/spatial-studio/'+created.id,'PATCH',{version:1,project:{...created.project,name:'Projeto de teste'}});
 assert.equal(changed.version,2);
 await assert.rejects(api('/spatial-studio/'+created.id,'PATCH',{version:1,project:created.project}),/outra aba/);
 assert.equal((await api('/spatial-studio')).projects[0].project.name,'Projeto de teste');
});
test('dados inválidos e falhas de armazenamento não resultam em confirmação falsa',async()=>{
 await assert.rejects(api('/spatial-studio','POST',{project:{...initialSpatialProject(),margin:1}}));
 const set=localStorage.setItem;localStorage.setItem=()=>{throw Error('quota');};
 await assert.rejects(api('/spatial-studio','POST',{project:initialSpatialProject()}),/Não foi possível salvar/);
 localStorage.setItem=set;
 data.set('eme-spatial:studio:v1','broken');
 await assert.rejects(api('/spatial-studio'),/Não foi possível ler/);
});
