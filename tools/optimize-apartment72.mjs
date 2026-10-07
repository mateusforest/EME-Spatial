// Rebuild the optimized asset from the immutable full-floor snapshot. Architecture is not remodeled.
import fs from 'node:fs';import zlib from 'node:zlib';import * as T from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {MeshoptSimplifier} from 'three/addons/libs/meshopt_simplifier.module.js';
const source=JSON.parse(zlib.gunzipSync(fs.readFileSync('public/assets/m/apartment71/floor14.json.gz')));
const geometries=new T.ObjectLoader().parseGeometries(source.geometries),names=new Map();
function visit(o){if(o.geometry)names.set(o.geometry,o.name||'');for(const c of o.children||[])visit(c);}visit(source.object);
await MeshoptSimplifier.ready;const lods={},stats=[];
source.geometries=source.geometries.map(item=>{const g=geometries[item.uuid];if(!g?.attributes.position)return item;
 const high=mergeVertices(g,1e-7);high.uuid=item.uuid;const before=g.attributes.position.count,after=high.attributes.position.count;
 const name=names.get(item.uuid)||'';
 if(name.startsWith('M48_Balcony')&&high.index?.count>900){
  const ix=new Uint32Array(high.index.array),pos=high.attributes.position;
  const [indices,error]=MeshoptSimplifier.simplify(ix,pos.array,3,Math.floor(ix.length*.5/3)*3,.003,['LockBorder']);
  if(indices.length<ix.length*.9){lods[item.uuid]={indices:Array.from(indices),error,sourceTriangles:ix.length/3,triangles:indices.length/3};}
 }
 stats.push({name,beforeVertices:before,afterVertices:after});return high.toJSON();
});source.lods72=lods;fs.mkdirSync('conteudos/optimization72',{recursive:true});fs.writeFileSync('conteudos/optimization72/geometry.json',JSON.stringify(source));fs.writeFileSync('conteudos/optimization72/geometry-stats.json',JSON.stringify(stats,null,2));console.log(JSON.stringify({verticesBefore:stats.reduce((n,s)=>n+s.beforeVertices,0),verticesAfter:stats.reduce((n,s)=>n+s.afterVertices,0),lods:Object.values(lods).map(l=>({from:l.sourceTriangles,to:l.triangles,error:l.error}))}));
