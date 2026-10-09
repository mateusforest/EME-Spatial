import fs from 'node:fs';
import {Vector3} from 'three';
import {createBotaniqueNavigator} from '../src/botaniqueNavigation.ts';

const manifest=JSON.parse(fs.readFileSync(new URL('../public/assets/botanique/manifest.json',import.meta.url),'utf8'));
const checks=[];
for(const [kind,scene] of Object.entries(manifest.scenes)){
 const nav=createBotaniqueNavigator(scene.navigation,{radius:kind==='apartamento'?.22:.35,gridSize:kind==='apartamento'?.08:.35,maxSearchMs:6000,maxExpandedNodes:140000});
 const entries=scene.walkEntries||[];
 for(const e of entries){const floor=new Vector3(...e.position);floor.y-=nav.eyeHeight;checks.push({kind,type:'standing',id:e.id,passed:nav.canStand(floor)});}
 for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
  const start=new Vector3(...entries[i].position),goal=new Vector3(...entries[j].position);goal.y-=nav.eyeHeight;
  const route=nav.planRoute(start,goal);checks.push({kind,type:'route',from:entries[i].id,to:entries[j].id,passed:route.ok,reason:route.reason||null,distance:route.distance});
 }
}
const result={version:manifest.version,passed:checks.every(c=>c.passed),checks};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2));
console.log(JSON.stringify({passed:result.passed,total:checks.length,failures:checks.filter(c=>!c.passed)},null,2));
if(!result.passed)process.exitCode=1;
