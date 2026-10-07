import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {decodeScene71} from '../src/developments/mSceneAsset71.ts';
import {sceneKey71} from '../src/developments/mSceneNavigation71.ts';

const bytes=readFileSync(new URL('../public/assets/m/apartment71/floor14.json.gz',import.meta.url));
const manifest=JSON.parse(readFileSync(new URL('../public/assets/m/apartment71/manifest.json',import.meta.url)));
assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.sha256,'Snapshot changed without updating source manifest');
const raw=await decodeScene71(new Response(bytes));
const decoded=await decodeScene71(new Response(gunzipSync(bytes),{headers:{'Content-Encoding':'gzip'}}));
assert.deepEqual(raw,decoded,'Both static hosting behaviors must load the same floor');
assert.equal(raw.geometries.length,manifest.geometries);
assert.equal(raw.materials.length,manifest.materials);
assert.equal(raw.textures.length,manifest.textures);
const names=new Set(),finishes=new Set();
function walk(o){if(o.name)names.add(o.name);if(o.userData?.finish70)finishes.add(o.userData.finish70);for(const c of o.children||[])walk(c);}
walk(raw.object);
assert(names.has('Reference mineral structure'),'Full authored slab missing');
assert(names.has('Reference timber screens'),'Authored facade missing');
assert(finishes.size>=4,'Personalization tags must survive serialization');
for(const image of raw.images){const urls=Array.isArray(image.url)?image.url:[image.url];for(const url of urls){if(typeof url!=='string')continue;if(url.startsWith('data:image/'))continue;assert(url.startsWith('/assets/m/'),'Temporary or third party image URL');assert(existsSync(new URL('../public'+url,import.meta.url)),url);}}
assert.equal(sceneKey71('?apartamento=14&personalizar=1'),'apartment14');
for(const query of ['', '?vista=fachada','?apartamento=13','?apartamento=NaN'])assert.equal(sceneKey71(query),'exterior');
await assert.rejects(()=>decodeScene71(new Response('missing',{status:404})));
console.log('PASS immutable full floor, configuration tags, portable assets, gzip hosting and scene routing');
