import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as T from 'three';
import {contextHeight,createContextGeometry,createDistantGroves,horizonRings} from '../src/priorita/horizon.ts';

const height=(x,z)=>2.3*Math.sin(x*.012)+3.1*Math.sin(z*.011)+1.15*Math.cos((x+z)*.018)+z*.008;

test('context stays outside the authored site and joins its height field without a gap',()=>{
  const geometry=createContextGeometry(height),p=geometry.getAttribute('position'),n=geometry.getAttribute('normal');
  assert.equal(horizonRings[0],500);
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),extent=Math.max(Math.abs(x),Math.abs(z));
    assert.ok(Number.isFinite(y));assert.ok(extent>=499.99,'context must not cover parcels or streets');
    assert.ok(n.getY(i)>0,'terrain triangles face upward');
    if(i<640)assert.ok(Math.abs(y-(height(x,z)-.14))<.00001);
  }
  for(const [x,z] of [[500,0],[-500,40],[40,500],[0,-500]])
    assert.ok(Math.abs(contextHeight(x,z,height)-height(x,z)+.14)<1e-10);
  geometry.dispose();
});

test('seam keeps the Blender boundary colour, height, normal and UV',()=>{
  const source=new T.BufferGeometry();
  source.setAttribute('position',new T.Float32BufferAttribute([-500,4,-500],3));
  source.setAttribute('color',new T.Float32BufferAttribute([.7,.8,.6],3));
  source.setAttribute('normal',new T.Float32BufferAttribute([0,1,0],3));
  source.setAttribute('uv',new T.Float32BufferAttribute([3,7],2));
  const geometry=createContextGeometry(height,[source]);
  assert.equal(geometry.getAttribute('position').getY(0),4);
  assert.ok(Math.abs(geometry.getAttribute('color').getX(0)-.7)<1e-6);
  assert.equal(geometry.getAttribute('uv').getX(0),3);
  assert.equal(geometry.getAttribute('uv').getY(0),7);
  geometry.dispose();source.dispose();
});

test('entire new landscape is bounded under 60k triangles, two draw calls and no new textures',()=>{
  const geometry=createContextGeometry(height),groves=createDistantGroves(height);
  const triangles=geometry.index.count/3+groves.geometry.index.count/3*groves.count;
  assert.ok(triangles<60_000,`${triangles} triangles`);
  assert.equal(groves.castShadow,false);assert.equal(groves.receiveShadow,false);
  assert.equal(groves.material.map,null);
  assert.ok(groves.boundingSphere.radius<3500);
  geometry.dispose();groves.geometry.dispose();groves.material.dispose();
});
