import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createMaterialStudio,materialLibrary,materialPixels,isMaterialChoice} from '../src/botaniqueMaterials.ts';

function fixture(){
 const root=new T.Group(),materials={};
 for(const name of ['B_FABRIC','B_FABRIC_cream','B_FABRIC_sheer','B_FABRIC_rug_cream','B_STONE','B_STONE_dark','B_FLOOR','B_WALL','B_WOOD']){
  const m=new T.MeshPhysicalMaterial({color:'#cabcaa',roughness:.82});m.name=name;m.map=new T.Texture();m.normalMap=new T.Texture();m.normalScale.set(.2,.3);materials[name]=m;root.add(new T.Mesh(new T.BoxGeometry(),m));
 }
 return {root,materials};
}
test('surface changes preserve tint and isolate curtains, rugs and floors',()=>{
 const {root,materials:m}=fixture(),studio=createMaterialStudio(root);
 const untouched=['B_FABRIC_sheer','B_FABRIC_rug_cream','B_FLOOR'].map(n=>[m[n],m[n].map]);
 m.B_FABRIC.color.set('#68745b');const tint=m.B_FABRIC.color.clone(),original=m.B_FABRIC.map;
 assert.equal(studio.apply('upholstery','boucle'),true);
 assert.ok(m.B_FABRIC.color.equals(tint));assert.notEqual(m.B_FABRIC.map,original);
 for(const [mat,map] of untouched)assert.equal(mat.map,map);
 studio.apply('upholstery','original');assert.equal(m.B_FABRIC.map,original);assert.ok(m.B_FABRIC.color.equals(tint));studio.dispose();
});
test('all material options apply, invalid saved preferences cannot mutate the scene',()=>{
 const {root,materials:m}=fixture(),studio=createMaterialStudio(root);
 for(const [category,options] of Object.entries(materialLibrary))for(const option of options){assert.equal(studio.apply(category,option.id),true);assert.equal(studio.selections[category],option.id);}
 const map=m.B_STONE.map;for(const [category,id] of [['stone','missing'],['__proto__','original'],['wood',null],['constructor','original']]){assert.equal(isMaterialChoice(category,id),false);assert.equal(studio.apply(category,id),false);}assert.equal(m.B_STONE.map,map);studio.dispose();
});
test('stones account for UV scale, cache textures, and dispose only owned maps',()=>{
 const {root,materials:m}=fixture(),studio=createMaterialStudio(root),borrowed=m.B_STONE.map;let freed=0,originalFreed=0;
 borrowed.addEventListener('dispose',()=>originalFreed++);studio.apply('stone','marble');const owned=m.B_STONE.map;owned.addEventListener('dispose',()=>freed++);
 assert.equal(owned.repeat.x,1);assert.ok(Math.abs(m.B_STONE_dark.map.repeat.x-.375)<1e-6);
 studio.apply('stone','travertine');studio.apply('stone','marble');assert.equal(m.B_STONE.map,owned);
 studio.dispose();assert.equal(freed,1);assert.equal(originalFreed,0);assert.equal(m.B_STONE.map,borrowed);studio.dispose();assert.equal(freed,1);
});
test('fabrics use distinct normal and roughness maps, velvet changes sheen',()=>{
 const hashes=new Set();for(const id of ['linen','boucle','velvet','chenille','twill']){const p=materialPixels(id);hashes.add(Buffer.from(p.normal).toString('base64'));assert.equal(p.color.length,256*256*4);assert.ok(p.rough.some(v=>v<255));}assert.equal(hashes.size,5);
 const {root,materials:m}=fixture(),studio=createMaterialStudio(root);studio.apply('upholstery','velvet');assert.equal(m.B_FABRIC.sheen,1);assert.equal(m.B_FABRIC.sheenRoughness,.4);studio.apply('upholstery','original');assert.equal(m.B_FABRIC.sheen,0);studio.dispose();
});
