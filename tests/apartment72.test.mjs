import fs from 'node:fs';import zlib from 'node:zlib';import assert from 'node:assert/strict';import * as T from 'three';import {tier72,lodDistance72,apartmentQuality72} from '../src/developments/mApartmentQuality72.ts';
const a=JSON.parse(zlib.gunzipSync(fs.readFileSync('public/assets/m/apartment71/floor14.json.gz'))),b=JSON.parse(zlib.gunzipSync(fs.readFileSync('public/assets/m/apartment72/floor14.json.gz')));
assert.deepEqual(b.object,a.object,'Full floor layout, object transforms and configurator tags must be identical');
const before=new T.ObjectLoader().parseGeometries(a.geometries),after=new T.ObjectLoader().parseGeometries(b.geometries);let reduced=0;
for(const [uuid,g]of Object.entries(before)){
 const h=after[uuid];assert(h,uuid);const count=g.index?.count??g.attributes.position.count;assert.equal(h.index?.count??h.attributes.position.count,count,'Original triangles retained at close range');
 for(const name of Object.keys(g.attributes)){const x=g.getAttribute(name),y=h.getAttribute(name);for(let i=0;i<count;i++){const p=g.index?g.index.getX(i):i,q=h.index?h.index.getX(i):i;for(let k=0;k<x.itemSize;k++)assert(Math.abs(x.getComponent(p,k)-y.getComponent(q,k))<1e-6,'Changed near geometry '+name);}}
 reduced+=g.attributes.position.count-h.attributes.position.count;
}
assert(reduced>20000,'Expected meaningful vertex sharing');
for(const [uuid,lod] of Object.entries(b.lods72)){assert(lod.error<=.00301);assert(lod.indices.every(i=>i>=0&&i<after[uuid].attributes.position.count));assert(lod.triangles<lod.sourceTriangles*.9);}
assert(lodDistance72.light<lodDistance72.high);assert.equal(tier72('light'),'light');assert.equal(tier72('high'),'detail');
for(const image of b.images)assert(!image.url.startsWith('data:'),'Textures must be external and cacheable');
for(const t of b.textures)for(const tier of ['light','detail'])assert(fs.existsSync('public'+t.userData.profiles72[tier]));
for(const m of b.materials)if(m.metalness===0)assert(!m.metalnessMap,'Unused texture sampler');
console.log('PASS exact full-floor triangles/transforms/UVs, shared vertices, bounded distant LODs and both texture tiers');

// Distance hysteresis switches only the index buffer; approaching restores the original mesh.
const id=Object.keys(b.lods72)[0],high=after[id],mesh=new T.Mesh(high,new T.MeshBasicMaterial()),root=new T.Group(),scene=new T.Scene(),camera=new T.PerspectiveCamera(),owned=[];
root.add(mesh);scene.add(root);const quality=apartmentQuality72(scene,new Set(),b.lods72,x=>(owned.push(x),x),'high',()=>{});
camera.position.set(0,200,0);assert(quality.update(camera,'high',root));assert.notEqual(mesh.geometry,high);assert.equal(mesh.geometry.attributes.position,high.attributes.position);
const low=mesh.geometry;camera.position.copy(high.boundingSphere.center);assert(quality.update(camera,'high',root));assert.equal(mesh.geometry,high);assert.equal(scene.userData.lodCount72,0);
camera.position.set(0,200,0);quality.update(camera,'high',root);assert.equal(mesh.geometry,low,'Reuse existing low geometry');quality.dispose();owned.forEach(x=>x.dispose());
