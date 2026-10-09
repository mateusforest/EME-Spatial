import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {Group,Mesh,Box3,Vector3,Vector2,PerspectiveCamera,Plane,Raycaster} from 'three';
import {createBotaniquePlanContext} from '../src/botaniquePlanContext.ts';

const layout=JSON.parse(await readFile(new URL('../tools/botanique-unit-layout.json',import.meta.url),'utf8'));
const vec=(x,z,y=.035)=>({x,y,z});
const meshes=group=>{const list=[];group.traverse(o=>{if(o instanceof Mesh)list.push(o);});return list;};

test('commercial floor is registered on the existing Final 1 without scaling or copying its scene',()=>{
  const plan=createBotaniquePlanContext();
  assert.equal(plan.group.visible,false);
  assert.deepEqual(plan.unitBounds.min.toArray(),[0,0,-7.8]);
  assert.deepEqual(plan.unitBounds.max.toArray(),[7.2,2.72,0]);
  assert.deepEqual(plan.unitFootprint,[[0,-7.8],[7.2,-7.8],[7.2,0],[0,0]]);
  assert.equal(plan.units.length,8);
  assert.deepEqual(plan.units.map(u=>u.marketedArea),[55.55,51.45,51.45,55.55,50.5,51.45,51.45,50.5]);
  assert.equal(plan.units.filter(u=>u.active).length,1);
  const active=plan.units.find(u=>u.active),activeBounds=new Box3().setFromPoints(active.polygon.map(([x,z])=>new Vector3(x,0,z)));
  assert.ok(activeBounds.min.distanceTo(new Vector3(0,0,-7.8))<1e-10);
  assert.ok(activeBounds.max.distanceTo(new Vector3(7.2,0,0))<1e-10);
  for(const unit of plan.units.filter(u=>!u.active)){
    const box=new Box3().setFromPoints(unit.polygon.map(([x,z])=>new Vector3(x,0,z)));
    assert.equal(box.intersectsBox(activeBounds),false,`${unit.label} overlaps the model envelope`);
  }
  assert.ok(plan.floorBounds.getSize(new Vector3()).x>37 && plan.floorBounds.getSize(new Vector3()).x<38);
  assert.match(plan.sourceLabel,/cotas estimadas/);
  assert.equal(plan.floorContext.levelsBelow,0,'a selected physical floor must not be invented');
  assert.equal(plan.group.getObjectByName('B_PLAN_LOWER_STRUCTURE').children.length,0);
  plan.dispose();
});

test('every real room and each L-shaped suite region agrees with the current unit contract',()=>{
  const plan=createBotaniquePlanContext();plan.setVisible(true);
  for(const room of layout.rooms){
    for(const [x0,y0,x1,y1] of room.floor_regions||[room.bounds]){
      assert.equal(plan.pickRoom(vec((x0+x1)/2,-(y0+y1)/2))?.id,room.id);
    }
  }
  assert.equal(plan.pickRoom(vec(3.8,-1.6))?.id,'ensuite','bathroom is outside the L-shaped suite');
  assert.equal(plan.pickRoom(vec(3.8,-3.1))?.id,'suite','suite vestibule is part of the L');
  assert.equal(plan.pickRoom(vec(6.1,-.6))?.id,'balcony');
  plan.dispose();
});

test('room entry is impossible outside Final 1, below the cut, or while context is hidden',()=>{
  const plan=createBotaniquePlanContext();assert.equal(plan.pickRoom(vec(5.5,-3)),undefined);
  plan.setVisible(true);
  for(const point of [vec(17,-8),vec(-1,-3),vec(7.21,-4),vec(5.5,-3,-2.8),vec(5.5,-3,5),vec(NaN,-3)])assert.equal(plan.pickRoom(point),undefined);
  for(const unit of plan.units.filter(u=>!u.active))assert.equal(plan.pickRoom(vec(unit.labelPosition[0],unit.labelPosition[2])),undefined);
  plan.setVisible(false);assert.equal(plan.pickRoom(vec(5.5,-3)),undefined);
  plan.dispose();
});

test('hotspots use safe supplied room cameras without moving or mutating the apartment',()=>{
  const views=[{id:'living',label:'Sala',position:[6.45,1.635,-1.35],target:[4.9,1.3,-6.3]},{id:'suite',label:'Suíte',position:[50,1.6,50],target:[1,1,-1]}];
  const original=JSON.stringify(views),plan=createBotaniquePlanContext({rooms:views});plan.setVisible(true);
  const living=plan.roomHotspots.find(r=>r.id==='living'),suite=plan.roomHotspots.find(r=>r.id==='suite');
  assert.deepEqual(living.position,[6.45,.16,-1.35]);
  assert.deepEqual(living.camera, {position:views[0].position,target:views[0].target});
  assert.equal(plan.pickRoom(vec(suite.position[0],suite.position[2]))?.id,'suite','out-of-room framing cameras must not place a marker outside its room');
  assert.deepEqual(plan.roomHotspots.filter(r=>r.primary).map(r=>r.id),['living','kitchen','balcony']);
  living.camera.position[0]=4;
  assert.equal(JSON.stringify(views),original,'caller cameras are not modified');
  assert.equal(plan.group.scale.x,1);assert.equal(plan.group.position.length(),0);
  plan.dispose();
});

test('context is batched and lightweight, with independent overview and unit cameras',()=>{
  const plan=createBotaniquePlanContext();const all=meshes(plan.group);
  assert.ok(all.length<=20,`default context has ${all.length} draw calls`);
  let triangles=0;
  for(const mesh of all){
    triangles+=(mesh.geometry.index?.count||mesh.geometry.getAttribute('position').count)/3;
    assert.equal(mesh.castShadow,false,'context must not add shadow-casting overhead');
    assert.equal(mesh.userData.contextOnly,true);
    assert.equal(mesh.material.map,null,'no texture downloads');
    const box=mesh.geometry.boundingBox;assert.ok(box&&!box.isEmpty());
    assert.ok([...box.min.toArray(),...box.max.toArray()].every(Number.isFinite));
  }
  assert.ok(triangles<32000,`${triangles} triangles exceed the lightweight context budget`);
  assert.ok(plan.camera.position[1]>plan.unitCamera.position[1]);
  assert.ok(plan.unitBounds.containsPoint(new Vector3(...plan.unitCamera.target)));
  plan.dispose();
});

test('changing explicit lower levels releases old geometries and disposal never touches the unit scene',()=>{
  const plan=createBotaniquePlanContext(),scene=new Group(),unit=new Group();scene.add(unit,plan.group);
  let oldDisposed=0;const oldLandscape=meshes(plan.group.getObjectByName('B_PLAN_DISTANT_LANDSCAPE'));
  oldLandscape.forEach(m=>m.geometry.addEventListener('dispose',()=>oldDisposed++));
  plan.setFloorContext({id:'identified-floor',label:'Pavimento identificado',levelsBelow:2});
  assert.equal(oldDisposed,oldLandscape.length);
  assert.equal(plan.floorContext.levelsBelow,2);
  assert.ok(plan.group.getObjectByName('B_PLAN_LOWER_STRUCTURE').children.length>0);
  assert.ok(plan.bounds.min.y<-6);
  const activeGeometry=new Set(meshes(plan.group).map(m=>m.geometry)),activeMaterials=new Set(meshes(plan.group).map(m=>m.material));
  let geometryDisposed=0,materialDisposed=0;
  activeGeometry.forEach(g=>g.addEventListener('dispose',()=>geometryDisposed++));activeMaterials.forEach(m=>m.addEventListener('dispose',()=>materialDisposed++));
  plan.dispose();plan.dispose();
  assert.equal(geometryDisposed,activeGeometry.size);assert.equal(materialDisposed,activeMaterials.size);
  assert.equal(scene.children.length,1);assert.equal(scene.children[0],unit);
  plan.setVisible(true);assert.equal(plan.group.visible,false);assert.equal(plan.pickRoom(vec(5,-3)),undefined);
});

test('switching plan and room modes reuses every resource and clustered trees stay outside the apartment',()=>{
  const plan=createBotaniquePlanContext({floor:{label:'Corte ilustrativo',levelsBelow:2}});
  const initial=meshes(plan.group).map(m=>m.geometry);let disposed=0;
  initial.forEach(g=>g.addEventListener('dispose',()=>disposed++));
  for(let cycle=0;cycle<100;cycle++){
    plan.setVisible(true);assert.equal(plan.pickRoom(vec(5.44,-2.94))?.id,'living');
    plan.setVisible(false);assert.equal(plan.pickRoom(vec(5.44,-2.94)),undefined);
  }
  assert.equal(disposed,0);assert.deepEqual(meshes(plan.group).map(m=>m.geometry),initial);
  const foliage=meshes(plan.group).filter(m=>m.material.name.startsWith('B_PLAN_tree_'));
  assert.equal(foliage.length,3,'clustered crowns must remain three batches, not one mesh per lobe');
  for(const mesh of foliage){
    assert.equal(mesh.material.vertexColors,true);assert.equal(mesh.material.transparent,false);
    assert.ok(mesh.geometry.getAttribute('color'));
    assert.ok(mesh.geometry.boundingBox.max.y<0,'trees on lower illustrative terrain must not float above the cut');
  }
  plan.dispose();assert.equal(disposed,initial.length);
});

test('illustrative lower facades have separate recessed windows and solid piers',()=>{
  const plan=createBotaniquePlanContext({floor:{label:'Corte ilustrativo',levelsBelow:2}});plan.setVisible(true);plan.group.updateMatrixWorld(true);
  const below=plan.group.getObjectByName('B_PLAN_LOWER_STRUCTURE');
  assert.equal(below.getObjectByName('B_PLAN_core'),undefined,'no continuous dark facade ribbon');
  const ray=new Raycaster();
  ray.set(new Vector3(1.5,-2.86+1.55,2),new Vector3(0,0,-1));
  assert.equal(ray.intersectObject(below,true)[0]?.object.material.name,'B_PLAN_lower_windows');
  ray.set(new Vector3(2.4,-2.86+1.55,2),new Vector3(0,0,-1));
  assert.equal(ray.intersectObject(below,true)[0]?.object.material.name,'B_PLAN_cut_wall');
  assert.equal(plan.pickRoom(vec(1.2,0,-2.86+1.55)),undefined,'lower floors cannot become room entries');
  plan.dispose();
});

test('near-vertical detail keeps every wall corner in frame and floor clicks select the correct room',()=>{
  const plan=createBotaniquePlanContext();plan.setVisible(true);
  const target=new Vector3(...plan.unitCamera.target),position=new Vector3(...plan.unitCamera.position);
  const slope=Math.hypot(position.x-target.x,position.z-target.z)/(position.y-target.y);
  assert.ok(slope*2.72<.4,'full-height walls should cause less than 40 cm of plan parallax');
  for(const aspect of [1236/720,354/760,284/760]){
    const camera=new PerspectiveCamera(52,aspect,.06,160);camera.position.copy(position);
    if(aspect<.95)camera.position.sub(target).multiplyScalar(Math.sqrt(.95/aspect)).add(target);
    camera.lookAt(target);camera.updateMatrixWorld();
    for(const x of [0,7.2])for(const y of [0,2.72])for(const z of [-7.8,0]){
      const ndc=new Vector3(x,y,z).project(camera);
      assert.ok(Math.abs(ndc.x)<.97&&Math.abs(ndc.y)<.97,`unit corner cropped at aspect ${aspect}: ${ndc.toArray()}`);
    }
    for(const room of plan.roomHotspots){
      const floor=new Vector3(room.position[0],.035,room.position[2]),ndc=floor.clone().project(camera),ray=new Raycaster(),hit=new Vector3();
      ray.setFromCamera(new Vector2(ndc.x,ndc.y),camera);ray.ray.intersectPlane(new Plane(new Vector3(0,1,0),-.035),hit);
      assert.equal(plan.pickRoom(hit)?.id,room.id,`floor projection selected another room at aspect ${aspect}`);
    }
  }
  plan.dispose();
});
