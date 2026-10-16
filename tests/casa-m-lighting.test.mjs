import test from 'node:test';
import assert from 'node:assert/strict';
import {CASA_LIGHT_DEFAULTS,casaSolar,casaCircuitGain,casaFixtureCircuit} from '../src/casa/CasaMLightState.ts';

test('electrical circuits keep their intensity across the entire solar path',()=>{
 for(const circuit of ['interior','facade','exterior'])for(let hour=7;hour<=20;hour+=.25){
  const settings={...CASA_LIGHT_DEFAULTS,hour,[circuit]:.65};
  assert.equal(casaCircuitGain(circuit,settings),.65);
 }
});

test('dimming one circuit never dims another and zero really switches it off',()=>{
 for(const off of ['interior','facade','exterior']){
  const settings={...CASA_LIGHT_DEFAULTS,[off]:0};
  for(const circuit of ['interior','facade','exterior'])assert.equal(casaCircuitGain(circuit,settings),circuit===off?0:1);
  assert.equal(casaCircuitGain('day',settings),casaCircuitGain('day',CASA_LIGHT_DEFAULTS));
 }
});

test('solar strength and azimuth are independent of the electrical circuits',()=>{
 const dark={...CASA_LIGHT_DEFAULTS,solar:0,azimuth:90};
 assert.equal(casaCircuitGain('day',dark),0);
 for(const c of ['interior','facade','exterior'])assert.equal(casaCircuitGain(c,dark),1);
 const a=casaSolar(14.5,0),b=casaSolar(14.5,90);
 assert.ok(Math.abs(a.direction.y-b.direction.y)<1e-12);
 assert.ok(Math.abs(a.direction.x+b.direction.z)<1e-12);
 assert.ok(Math.abs(a.direction.z-b.direction.x)<1e-12);
 assert.ok(Math.abs(a.direction.length()-1)<1e-12);
});

test('daylight fades continuously at sunset and is absent at night',()=>{
 assert.equal(casaSolar(20).day,0);assert.equal(casaSolar(12).day,1);
 let previous=casaSolar(17).day;
 for(let h=17.01;h<=20;h+=.01){const value=casaSolar(h).day;assert.ok(value<=previous+1e-12);assert.ok(previous-value<.035);previous=value;}
});

test('the sun stops casting direct light below the horizon while twilight can remain',()=>{
 assert.equal(casaSolar(19.25).sunlight,0);
 assert.ok(casaSolar(19.25).day>0);
 assert.equal(casaSolar(12).sunlight,1);
});

test('LED circuit ownership is fixed to the architecture',()=>{
 assert.equal(casaFixtureCircuit(12,-1.84),'facade');
 assert.equal(casaFixtureCircuit(23,-2.3),'exterior');
 assert.equal(casaFixtureCircuit(14,-13.74),'exterior');
 assert.equal(casaFixtureCircuit(16,-8),'interior');
});
import {BufferGeometry,Float32BufferAttribute,Matrix4,MeshPhysicalMaterial,ShaderChunk} from 'three';
import {casaIndirectChunk,casaIndirectMaterial} from '../src/casa/CasaMIndirect.ts';
import {casaLedGeometry} from '../src/casa/CasaMLed.ts';

test('indirect room fills do not create moving specular bulbs and preserve directional and spot lighting',()=>{
 const chunk=casaIndirectChunk();
 const point=chunk.slice(chunk.indexOf('#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )'),chunk.indexOf('#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )'));
 assert.ok(point.includes('BRDF_Lambert( material.diffuseColor )'));
 assert.ok(!point.includes('RE_Direct( directLight'));
 const marker='#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )';
 assert.equal(chunk.slice(chunk.indexOf(marker)),ShaderChunk.lights_fragment_begin.slice(ShaderChunk.lights_fragment_begin.indexOf(marker)));
});

test('furniture clones receive the indirect light shader, without stacking it on existing materials',()=>{
 const first=new MeshPhysicalMaterial();casaIndirectMaterial(first);const hook=first.onBeforeCompile;
 casaIndirectMaterial(first);assert.equal(first.onBeforeCompile,hook);
 const clone=first.clone();casaIndirectMaterial(clone);
 const shader={fragmentShader:'#include <lights_fragment_begin>'};clone.onBeforeCompile(shader,{});
 assert.ok(shader.fragmentShader.includes('BRDF_Lambert( material.diffuseColor )'));
 first.dispose();clone.dispose();
});

test('merged stair and entrance LEDs dim with their own circuits, including transformed meshes',()=>{
 const source=new BufferGeometry();source.setAttribute('position',new Float32BufferAttribute([
  0,0,-5, 1,0,-5, 0,1,-5,
  0,0,0, 1,0,0, 0,1,0,
  14,0,-5, 15,0,-5, 14,1,-5
 ],3));
 const geometry=casaLedGeometry(source,new Matrix4().makeTranslation(10,0,0));
 assert.deepEqual(geometry.groups.map(g=>[g.start,g.count,g.materialIndex]),[[0,3,0],[3,3,1],[6,3,2]]);
 assert.equal(source.index,null,'the shared export remains untouched');
 assert.equal(geometry.index.count,9,'all LED triangles survive the circuit split');
 source.dispose();geometry.dispose();
});
