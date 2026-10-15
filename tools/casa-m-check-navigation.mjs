import {readFileSync,writeFileSync} from 'node:fs';
import {createBotaniqueNavigator} from '../src/botaniqueNavigation.ts';
const file='public/assets/casa-m/manifest.json',manifest=JSON.parse(readFileSync(file,'utf8'));
const nav=createBotaniqueNavigator(manifest.navigation,{radius:.18,eyeHeight:1.65,bodyHeight:1.78,gridSize:.15,maxStep:.19,maxSlopeDegrees:38,maxExpandedNodes:40000,maxSearchMs:2500});
const results=[];
for(const v of manifest.views.filter(v=>v.walk)){
 const p={x:v.position[0],y:v.position[1]-1.65,z:v.position[2]};let floor=nav.projectToFloor(p,.3),distance=0;
 for(let r=.1;r<=1.25&&!floor;r+=.1)for(let a=0;a<Math.PI*2&&!floor;a+=Math.PI/8){floor=nav.projectToFloor({x:p.x+Math.cos(a)*r,y:p.y,z:p.z+Math.sin(a)*r},.3);if(floor)distance=r;}
 results.push({id:v.id,valid:!!floor,moved:distance,position:floor?.toArray(),original:v.position});
 if(floor&&process.argv.includes('--adjust'))v.position=[floor.x,floor.y+1.65,floor.z];
}
if(process.argv.includes('--adjust'))writeFileSync(file,JSON.stringify(manifest,null,2));
console.log(JSON.stringify(results,null,2));
const stairs=[[9.48,0,-4.65],[9.48,0,-5],[9.48,2.01,-8.08],[9.48,2.01,-8.55],[10.82,2.01,-8.55],[10.82,2.01,-8.08],[10.82,4.02,-5],[10.82,4.02,-4.65]];
for(let i=0;i<stairs.length;i++){
 const [x,y,z]=stairs[i],point={x,y,z};let result=nav.canStand(point);
 if(i){const [x0,y0,z0]=stairs[i-1];result=result&&nav.canTraverse({x:x0,y:y0,z:z0},point);}
 console.log('stair',i,result);
}
