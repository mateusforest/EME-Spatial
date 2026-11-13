import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {MeshStandardMaterial} from 'three';
import {createStreetLighting,streetLampLayout,streetLightLevel} from '../src/priorita/street-lighting.ts';

const plan=JSON.parse(readFileSync(new URL('../src/priorita/plan-source.json',import.meta.url),'utf8'));
test('street lights follow twilight smoothly in both directions',()=>{
  assert.equal(streetLightLevel(30),0);
  assert.equal(streetLightLevel(5),0);
  assert.equal(streetLightLevel(.5),.5);
  assert.equal(streetLightLevel(-4),1);
  assert.equal(streetLightLevel(-30),1);
  let previous=0;
  for(let elevation=8;elevation>=-8;elevation-=.1){
    const level=streetLightLevel(elevation);
    assert.ok(level>=previous&&level-previous<.02,'no sudden switching');previous=level;
  }
});
test('each street has lighting and repeated fixtures remain bounded',()=>{
  const lamps=streetLampLayout(plan.roads);
  assert.ok(lamps.length>16&&lamps.length<70);
  assert.equal(new Set(lamps.map(p=>`${p.x},${p.z}`)).size,lamps.length);
  for(const road of plan.roads.slice(1)){
    const zs=road.polygon.map(p=>p[1]);
    const fixtures=lamps.filter(p=>p.z>=Math.min(...zs)&&p.z<=Math.max(...zs));
    assert.ok(fixtures.length>=8,road.name);
  }
});
test('ground lighting is shared, bounded and composes existing material shaders',()=>{
  const lighting=createStreetLighting(streetLampLayout(plan.roads),()=>0);
  assert.ok(lighting.texture.image.data.byteLength<1024*1024);
  const data=lighting.texture.image.data;
  assert.ok(data.some((v,i)=>i%4===0&&v>0),'non-empty irradiance');
  assert.equal(data[0],0,'outer landscape remains unlit');
  const material=new MeshStandardMaterial();let previousCalls=0;
  material.onBeforeCompile=()=>{previousCalls++;};
  lighting.apply(material);lighting.apply(material);
  const shader={uniforms:{},vertexShader:'#include <fog_vertex>',fragmentShader:'#include <lights_fragment_end>'};
  material.onBeforeCompile(shader,{});
  assert.equal(previousCalls,1);
  assert.equal(shader.uniforms.prStreetMap.value,lighting.texture);
  lighting.setSun(-5);assert.equal(shader.uniforms.prStreetStrength.value,1);
  lighting.setSun(25);assert.equal(shader.uniforms.prStreetStrength.value,0);
  lighting.texture.dispose();material.dispose();
});
