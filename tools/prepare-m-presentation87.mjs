import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
export const assets87=['m-arrival-details-v28.glb','m-structure-details-v49.glb','m-rooftop-facade-v49.glb','m-crafted-details-v48.glb','m-reference-refinement-v49.glb','m-realism-v50.glb','m-editorial-v61.glb'];
let sourceBytes=0,packedBytes=0;
for(const name of assets87){const path='public/assets/m/model/'+name,source=readFileSync(path),packed=gzipSync(source,{level:9});writeFileSync(path+'.gz',packed);sourceBytes+=source.length;packedBytes+=packed.length;}
console.log(JSON.stringify({sourceBytes,packedBytes,savedPercent:Math.round((1-packedBytes/sourceBytes)*100)}));
