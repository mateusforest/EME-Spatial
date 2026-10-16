import {readFileSync,writeFileSync} from 'node:fs';
const file='public/assets/casa-m/manifest.json',m=JSON.parse(readFileSync(file,'utf8'));
// Exact top-face bounds of the three native 'Deck piscina descoberta' meshes.
// They were missed by the original floor-name filter; never bridge the water.
const decks=[['pool-deck-west',4.95,6.55,-17.1,-12.2],['pool-deck-north',6.55,9.95,-13.4,-12.2],['pool-deck-south',6.55,9.95,-17.3,-16.2]];
for(const [id,minX,maxX,minZ,maxZ] of decks){
 m.navigation.areas=m.navigation.areas.filter(a=>a.id!==id);
 m.navigation.areas.push({id,y:0,rect:{minX,maxX,minZ,maxZ}});
}
if(!m.views.some(v=>v.id==='pool-deck'))m.views.splice(m.views.findIndex(v=>v.id==='pool')+1,0,{id:'pool-deck',label:'Deck externo da piscina',level:'Lazer',position:[5.72,1.65,-14.8],target:[14,1.1,-14.8],walk:true});
m.version=5;
writeFileSync(file,JSON.stringify(m,null,2)+'\n');
