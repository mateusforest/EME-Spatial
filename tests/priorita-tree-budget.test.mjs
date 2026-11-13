import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('photographic tree keeps two bounded LODs, embedded textures and usable foliage UVs',()=>{
 const bytes=readFileSync(new URL('../public/assets/priorita/production-v16/trees.glb',import.meta.url));
 assert.ok(bytes.length<2.5*1024*1024);
 const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 for(const level of ['near','far']){
  const nodes=gltf.nodes.filter(n=>n.extras?.detail_level===level);assert.equal(nodes.length,2);
  const primitives=nodes.flatMap(n=>gltf.meshes[n.mesh].primitives);
  const triangles=primitives.reduce((sum,p)=>sum+gltf.accessors[p.indices].count/3,0);
  assert.ok(triangles<(level==='near'?18000:7000),`${level}: ${triangles}`);
  assert.ok(primitives.every(p=>p.attributes.TEXCOORD_0!==undefined));
 }
 assert.ok(gltf.images.every(i=>i.bufferView!==undefined));
 assert.ok(gltf.materials.some(m=>m.name.includes('Photographic leaves')&&m.pbrMetallicRoughness.baseColorTexture));
});
