import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createInteriorSurfaces} from '../src/botaniqueInteriorSurfaces.ts';
import {createMaterialStudio} from '../src/botaniqueMaterials.ts';

test('physical upgrades preserve shared textures, geometry, tint and bindings on disposal',()=>{
 const root=new T.Group(),wood=new T.MeshStandardMaterial({color:'#cfbdab'}),map=new T.Texture();wood.name='B_WOOD';wood.map=map;
 const fabric=new T.MeshPhysicalMaterial();fabric.name='B_FABRIC';
 const a=new T.Mesh(new T.BoxGeometry(),wood),b=new T.Mesh(a.geometry,[wood,fabric]);root.add(a,b);
 const originalArray=b.material,originalGeometry=a.geometry;let borrowedDisposed=0,ownedDisposed=0;
 map.addEventListener('dispose',()=>borrowedDisposed++);
 const surfaces=createInteriorSurfaces(root),physical=a.material;
 physical.addEventListener('dispose',()=>ownedDisposed++);
 assert.ok(physical instanceof T.MeshPhysicalMaterial);assert.equal(physical,b.material[0]);assert.equal(b.material[1],fabric);
 assert.equal(physical.map,map);assert.ok(physical.color.equals(wood.color));assert.equal(a.geometry,originalGeometry);
 assert.equal(surfaces.count,1);assert.ok(Number.isFinite(physical.ior));
 surfaces.dispose();surfaces.dispose();assert.equal(a.material,wood);assert.equal(b.material,originalArray);
 assert.equal(borrowedDisposed,0);assert.equal(ownedDisposed,1);
});

test('finish changes reset coating and restore project material without affecting shader or tint',()=>{
 const root=new T.Group(),base=new T.MeshStandardMaterial({color:'#9f7757'});base.name='B_WOOD';
 const mesh=new T.Mesh(new T.BoxGeometry(),base);root.add(mesh);
 const surfaces=createInteriorSurfaces(root),wood=mesh.material,studio=createMaterialStudio(root);
 const key=wood.customProgramCacheKey(),tint=wood.color.clone(),coat=wood.clearcoat;
 studio.apply('wood','polished');assert.ok(wood.clearcoat>coat);
 studio.apply('wood','matte');assert.ok(wood.clearcoat<coat);
 studio.apply('wood','original');assert.equal(wood.clearcoat,coat);assert.ok(wood.color.equals(tint));assert.equal(wood.customProgramCacheKey(),key);
 studio.dispose();surfaces.dispose();assert.equal(mesh.material,base);
});
