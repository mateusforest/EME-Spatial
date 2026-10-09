import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Object3D} from 'three';
import {
 applyFurnitureVariant,defaultFurniture,furnitureGroups,
 isFurnitureChoice,isFurnitureGroup,isFurnitureVariant,isLightTemperature,
} from '../src/botaniqueFurniture.ts';

// Exercise the current exported apartment, rather than hand-written mock models.
const expected={
 sofa:['contemporaneo','organico','modular'],
 chairs:['contemporaneo','organico','concha'],
 table:['contemporaneo','organico'],
 pendant:['contemporaneo','organico'],
 cabinetry:['contemporaneo','organico'],
 appliance:['contemporaneo','organico'],
};
const raw=readFileSync(new URL('../public/assets/botanique/apartamento.glb',import.meta.url));
assert.equal(raw.readUInt32LE(0),0x46546c67,'GLB magic');
assert.equal(raw.readUInt32LE(4),2,'glTF2 container');
assert.equal(raw.readUInt32LE(8),raw.length,'complete GLB, not a partially written export');
const jsonLength=raw.readUInt32LE(12);
const gltf=JSON.parse(raw.subarray(20,20+jsonLength).toString());
const binaryOffset=20+jsonLength+8;
const layout=JSON.parse(gltf.scenes[gltf.scene||0].extras.botanique_unit_layout);
const manifest=JSON.parse(readFileSync(new URL('../public/assets/botanique/manifest.json',import.meta.url)));
const exportedMeshes=gltf.nodes.filter(node=>node.mesh!==undefined);
const variantNodes=exportedMeshes.filter(node=>node.extras?.variantGroup);
const keyOf=node=>`${node.extras.variantGroup}/${node.extras.variantId}`;

function objectsFromExport(){
 return exportedMeshes.map((node,index)=>{
  const object=new Object3D();object.name=node.name;
  object.userData=structuredClone(node.extras||{});
  if(node.translation)object.position.fromArray(node.translation);
  if(node.rotation)object.quaternion.fromArray(node.rotation);
  if(node.scale)object.scale.fromArray(node.scale);
  // Include initially hidden architecture/context, as in a cutaway view.
  object.visible=object.userData.variantGroup?true:index%2===0;
  return object;
 });
}
function selectDefaults(objects){
 for(const group of furnitureGroups)assert.equal(applyFurnitureVariant(objects,group,defaultFurniture[group]),true);
}
function visibility(objects){return objects.map(object=>object.visible);}
function immutableState(objects){
 return objects.map(object=>({name:object.name,position:object.position.toArray(),
  quaternion:object.quaternion.toArray(),scale:object.scale.toArray(),data:structuredClone(object.userData)}));
}
function geometrySignature(nodes){
 const hashes=[];
 for(const node of nodes)for(const primitive of gltf.meshes[node.mesh].primitives){
  const hash=createHash('sha256');
  const compressed=primitive.extensions?.KHR_draco_mesh_compression;
  const views=compressed?[gltf.bufferViews[compressed.bufferView]]:
   [primitive.attributes.POSITION,primitive.indices].map(index=>gltf.bufferViews[gltf.accessors[index].bufferView]);
  for(const view of views){
   const offset=binaryOffset+(view.byteOffset||0);
   hash.update(raw.subarray(offset,offset+view.byteLength));
  }
  hashes.push(hash.digest('hex'));
 }
 return hashes.sort().join(':');
}

test('GLB, embedded contract, manifest and runtime agree on six groups and fourteen choices',()=>{
 assert.deepEqual([...furnitureGroups].sort(),Object.keys(expected).sort());
 assert.equal(layout.furniture_variants.revision,6);
 assert.equal(layout.finish_revision,6);
 const actual=new Set(variantNodes.map(keyOf));
 const expectedKeys=Object.entries(expected).flatMap(([group,choices])=>choices.map(choice=>`${group}/${choice}`));
 assert.equal(expectedKeys.length,14);
 assert.deepEqual([...actual].sort(),expectedKeys.sort());
 for(const [group,choices] of Object.entries(expected)){
  for(const contract of [layout.furniture_variants,manifest.scenes.apartamento.furnitureVariants]){
   assert.deepEqual(contract[group].options.map(option=>option.id),choices,`${group}: advertised choices must exist`);
   assert.equal(contract[group].default,defaultFurniture[group]);
  }
  assert.equal(defaultFurniture[group],'contemporaneo');
  for(const choice of choices)assert.ok(layout.furniture_variant_mesh_counts[group][choice]>0);
 }
});

test('every exported choice carries valid default metadata and real nonempty geometry',()=>{
 for(const node of variantNodes){
  const {variantGroup:group,variantId:choice,variantDefault}=node.extras;
  assert.ok(expected[group]?.includes(choice),`${node.name}: unknown choice`);
  assert.equal(variantDefault,'contemporaneo',`${node.name}: default metadata lost during batching`);
  assert.ok(node.name.endsWith(`_${group}_${choice}`),`${node.name}: group/choice batching boundary lost`);
  assert.notEqual(node.extras.collision,true,'alternative batches must not introduce another collider');
  const primitives=gltf.meshes[node.mesh].primitives;
  assert.ok(primitives.length>0,`${node.name}: empty mesh`);
  for(const primitive of primitives){
   assert.equal(primitive.mode??4,4,`${node.name}: expected triangles`);
   const positions=gltf.accessors[primitive.attributes.POSITION];
   assert.ok(positions.count>=3,`${node.name}: no vertices`);
   assert.ok(positions.min.every(Number.isFinite)&&positions.max.every(Number.isFinite),`${node.name}: invalid bounds`);
   assert.ok(gltf.accessors[primitive.indices].count>=3,`${node.name}: no triangles`);
   assert.ok(gltf.materials[primitive.material],`${node.name}: material missing`);
  }
 }
});

test('choices within each group use distinct mesh geometry, not only recolored copies',()=>{
 for(const [group,choices] of Object.entries(expected)){
  const signatures=choices.map(choice=>geometrySignature(variantNodes.filter(n=>keyOf(n)===`${group}/${choice}`)));
  assert.equal(new Set(signatures).size,choices.length,`${group}: duplicated model geometry`);
 }
});

test('default initialization leaves exactly one complete option per group',()=>{
 const objects=objectsFromExport(),before=visibility(objects);selectDefaults(objects);
 for(const [index,object] of objects.entries()){
  const group=object.userData.variantGroup;
  assert.equal(object.visible,group?object.userData.variantId===defaultFurniture[group]:before[index]);
 }
 for(const group of furnitureGroups)assert.ok(objects.some(o=>o.userData.variantGroup===group&&o.visible));
});

for(const [group,choices] of Object.entries(expected))for(const choice of choices){
 test(`${group}/${choice} toggles all material batches and preserves every other group and structural state`,()=>{
  const objects=objectsFromExport();selectDefaults(objects);
  // Use non-default selections in all other groups to catch a global reset.
  for(const other of furnitureGroups)if(other!==group)applyFurnitureVariant(objects,other,expected[other].at(-1));
  const before=visibility(objects),immutable=immutableState(objects),length=objects.length;
  assert.equal(applyFurnitureVariant(objects,group,choice),true);
  let visibleMembers=0;
  for(const [index,object] of objects.entries()){
   const member=object.userData.variantGroup===group;
   assert.equal(object.visible,member?object.userData.variantId===choice:before[index],object.name);
   if(member&&object.visible)visibleMembers++;
  }
  assert.equal(visibleMembers,variantNodes.filter(node=>keyOf(node)===`${group}/${choice}`).length);
  assert.ok(visibleMembers>0,'a selection must not leave the group empty');
  assert.equal(objects.length,length,'switching must not create/append copies');
  assert.deepEqual(immutableState(objects),immutable,'transforms, identity and metadata must remain unchanged');
  const selected=visibility(objects);
  assert.equal(applyFurnitureVariant(objects,group,choice),true);
  assert.deepEqual(visibility(objects),selected,'repeated selection must be idempotent');
  assert.equal(applyFurnitureVariant(objects,group,defaultFurniture[group]),true);
  assert.equal(applyFurnitureVariant(objects,group,choice),true);
  assert.deepEqual(visibility(objects),selected,'round-trip must not resurrect a previous option');
 });
}

test('cross-group, unknown and malformed preferences are rejected without hiding current furniture',()=>{
 const objects=objectsFromExport();selectDefaults(objects);
 const union=['contemporaneo','organico','modular','concha'];
 for(const [group,choices] of Object.entries(expected)){
  for(const choice of union)assert.equal(isFurnitureChoice(group,choice),choices.includes(choice),`${group}/${choice}`);
  for(const bad of [...union.filter(choice=>!choices.includes(choice)),'missing','',null,undefined,0,{},['organico']]){
   const before=visibility(objects);
   assert.equal(applyFurnitureVariant(objects,group,bad),false,`${group}/${String(bad)}`);
   assert.deepEqual(visibility(objects),before);
  }
 }
});

test('invalid group names cannot become valid through valid choice names or forged asset extras',()=>{
 for(const bad of ['missing','__proto__','constructor','',null,undefined,17,{}]){
  assert.equal(isFurnitureGroup(bad),false);
  assert.equal(isFurnitureChoice(bad,'contemporaneo'),false);
  assert.equal(isFurnitureChoice(bad,'organico'),false);
  const rogue=new Object3D();rogue.userData={variantGroup:bad,variantId:'organico'};rogue.visible=false;
  assert.equal(applyFurnitureVariant([rogue],bad,'organico'),false);
  assert.equal(rogue.visible,false);
 }
});

test('a missing exported option fails atomically for every group, without changing other models',()=>{
 for(const group of furnitureGroups){
  const target=expected[group].at(-1);
  const objects=objectsFromExport().filter(o=>!(o.userData.variantGroup===group&&o.userData.variantId===target));
  selectDefaults(objects);const before=visibility(objects);
  assert.equal(applyFurnitureVariant(objects,group,target),false);
  assert.deepEqual(visibility(objects),before,`${group}: incomplete asset cannot clear the furnishing`);
 }
 assert.equal(applyFurnitureVariant([],'sofa','contemporaneo'),false);
});

test('preference guards accept only the offered variants and three numeric temperatures',()=>{
 for(const choice of ['contemporaneo','organico','modular','concha'])assert.equal(isFurnitureVariant(choice),true);
 for(const bad of ['Organico','missing','',null,undefined,0,{},['modular']])assert.equal(isFurnitureVariant(bad),false);
 for(const value of [3000,4000,6000])assert.equal(isLightTemperature(value),true);
 for(const value of [0,3500,'3000',null,undefined,NaN,Infinity,{},[3000]])assert.equal(isLightTemperature(value),false);
});
