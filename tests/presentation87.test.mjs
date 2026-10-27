import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {batchPresentation87,presentationBudget87} from '../src/developments/mPresentation87.ts';
import {readRegistry,publicProjects} from '../tools/delivery-config.ts';

test('batching preserves world bounds, visibility boundaries and single-instance transforms',()=>{
 const scene=new T.Scene(),floor=new T.Group(),hidden=new T.Group(),owned=[];
 floor.position.set(5,10,3);hidden.visible=false;scene.add(floor,hidden);
 const geometry=new T.BoxGeometry(),material=new T.MeshStandardMaterial();
 const a=new T.Mesh(geometry,material),b=new T.InstancedMesh(geometry,material,1);
 a.position.set(2,3,4);b.position.set(-3,0,2);b.setMatrixAt(0,new T.Matrix4().makeTranslation(0,7,0));floor.add(a,b);
 const invisibleFloor=new T.Mesh(geometry,material);hidden.add(invisibleFloor);
 const before=new T.Box3().setFromObject(floor);
 assert.equal(batchPresentation87(scene,x=>(owned.push(x),x)),1);
 const after=new T.Box3().setFromObject(floor);
 assert(before.min.distanceTo(after.min)<1e-6);assert(before.max.distanceTo(after.max)<1e-6);
 assert.equal(floor.children.length,1);assert.equal(invisibleFloor.parent,hidden);assert.equal(hidden.visible,false);
 assert.equal(geometry.index.count,36,'Original geometry remains reusable');
 owned.forEach(x=>x.dispose());geometry.dispose();material.dispose();b.dispose();
});

test('transparent meshes and apartment configurator targets keep their identities',()=>{
 const scene=new T.Scene(),protectedFloor=new T.Group(),other=new T.Group();scene.add(protectedFloor,other);
 const opaque=new T.MeshStandardMaterial(),transparent=new T.MeshStandardMaterial({transparent:true}),geometry=new T.BoxGeometry(),owned=[];
 for(const group of [protectedFloor,other])for(let i=0;i<2;i++){const mesh=new T.Mesh(geometry,opaque);mesh.userData.finish70='wood';group.add(mesh);}
 const panes=[new T.Mesh(geometry,transparent),new T.Mesh(geometry,transparent)];protectedFloor.add(...panes);
 assert.equal(batchPresentation87(scene,x=>(owned.push(x),x),protectedFloor),1);
 assert.equal(protectedFloor.children.length,4);assert.equal(other.children.length,1);assert(panes.every(p=>p.parent===protectedFloor));
 owned.forEach(x=>x.dispose());geometry.dispose();opaque.dispose();transparent.dispose();
});

test('exterior budget caps active point lights and restores full foliage on high quality',()=>{
 const scene=new T.Scene(),floor=new T.Group(),camera=new T.PerspectiveCamera(),owned=[];scene.add(floor);
 const originalLights=Array.from({length:9},(_,i)=>{const light=new T.PointLight(0xffffff,i+1);light.position.x=i;scene.add(light);return light;});
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(Array.from({length:108},(_,i)=>i%3),3));geometry.setIndex(Array.from({length:36},(_,i)=>i));
 const water=new T.MeshPhysicalMaterial({transmission:.7});scene.add(new T.Mesh(new T.PlaneGeometry(),water));
 const material=new T.MeshStandardMaterial();material.name='M51 layered botanical canopy';const foliage=new T.Mesh(geometry,material);scene.add(foliage);
 const budget=presentationBudget87(scene,x=>(owned.push(x),x),floor);budget.update(camera,'balanced');
 assert.equal(scene.children.filter(o=>o.isPointLight).length,4);assert(originalLights.every(l=>l.parent===null));assert.equal(foliage.geometry.index.count,12);
 assert.equal(water.transmission,0,'Presentation must not trigger a second full-campus transmission pass');assert.equal(water.transparent,true);assert(water.opacity>0&&water.opacity<1);
 originalLights.forEach(l=>l.intensity=0);budget.update(camera,'high');assert.equal(foliage.geometry,geometry);assert(scene.children.filter(o=>o.isPointLight).every(l=>l.intensity===0));
 budget.dispose();assert.equal(scene.children.filter(o=>o.isPointLight).length,0);owned.forEach(x=>x.dispose());geometry.dispose();material.dispose();
});

test('meeting link is unlisted and defaults to the isolated apartment',()=>{
 const registry=readRegistry(),project=registry.projects.find(p=>p.slug==='torre-m-apresentacao');
 assert.equal(project.status,'unlisted');assert(!publicProjects(registry).some(p=>p.slug===project.slug));
 const entry=new URL(project.experience,'https://example.com');assert.equal(entry.searchParams.get('apartamento'),'14');assert.equal(entry.searchParams.get('apresentacao'),'1');
 assert(project.entries.every(e=>new URL(e.experience,'https://example.com').searchParams.get('apresentacao')==='1'));
});
