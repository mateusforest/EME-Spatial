import assert from 'node:assert/strict';
import {test} from 'node:test';
import {MeshStandardMaterial} from 'three';
import {createSurfaceFinish} from '../src/priorita/surface-finish.ts';
import {createStreetLighting} from '../src/priorita/street-lighting.ts';

test('contact shading stays local and can be rebuilt without accumulation',()=>{
  const finish=createSurfaceFinish(),data=finish.texture.image.data;
  const points=[{x:0,z:0,radius:3,strength:.8}];
  finish.contacts(points);
  assert.equal(data.byteLength,1024*1024);
  assert.equal(data[0],255);
  const center=(256*512+256)*4;
  assert.ok(data[center]<100);
  const first=data.slice();finish.contacts(points);
  assert.deepEqual(data,first);
  finish.contacts([]);assert.ok(data.every(v=>v===255));
  finish.texture.dispose();
});

test('surface detail preserves street lighting and existing shader hooks',()=>{
  const finish=createSurfaceFinish(),lighting=createStreetLighting([],()=>0);
  const material=new MeshStandardMaterial();material.name='Asfalto';
  let calls=0;material.onBeforeCompile=()=>calls++;
  lighting.apply(material);finish.apply(material);finish.apply(material);
  const shader={uniforms:{},vertexShader:'#include <fog_vertex>',fragmentShader:'#include <map_fragment>\n#include <roughnessmap_fragment>\n#include <lights_fragment_end>\n#include <opaque_fragment>'};
  material.onBeforeCompile(shader,{});
  assert.equal(calls,1);
  assert.equal(shader.uniforms.prContactMap.value,finish.texture);
  assert.equal(shader.uniforms.prStreetMap.value,lighting.texture);
  lighting.setSun(-8);assert.equal(shader.uniforms.prStreetStrength.value,1);
  assert.match(shader.fragmentShader,/roughnessFactor=clamp/);
  assert.match(shader.fragmentShader,/outgoingLight\*=mix/);
  finish.texture.dispose();lighting.texture.dispose();material.dispose();
});
