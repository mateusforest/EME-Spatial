import * as T from 'three';
import type {Own} from './mSurfaces';

/** Small shared plant geometry; floor-owned instances follow apartment sectioning. */
export function finishMPlanting(site:T.Group,floors:T.Group[],own:Own,finishStone:(m:T.MeshStandardMaterial)=>void){
 const pot=own(new T.CylinderGeometry(.58,.48,.65,16));
 const trunk=own(new T.CylinderGeometry(.055,.085,1,7));
 // Five curved leaves per sprig: a broken silhouette instead of solid spherical crowns.
 const vertices:number[]=[],indices:number[]=[];
 for(let k=0;k<5;k++){
  const a=k*2.399,c=Math.cos(a),s=Math.sin(a),base=vertices.length/3;
  for(const [x,y,z] of [[0,0,0],[-.32,.12,.52],[0,.34,.57],[.32,.12,.52],[0,.06,1.24]])vertices.push(x*c+z*s,y+(k%2)*.1,z*c-x*s);
  indices.push(base,base+1,base+2,base,base+2,base+3,base+1,base+4,base+2,base+2,base+4,base+3);
 }
 const leaf=own(new T.BufferGeometry());leaf.setAttribute('position',new T.Float32BufferAttribute(vertices,3));leaf.setIndex(indices);leaf.computeVertexNormals();
 const bed=own(new T.BoxGeometry(1,1,1));
 const mineral=own(new T.MeshStandardMaterial({color:'#c9c3b2',roughness:.92}));finishStone(mineral);
 const bark=own(new T.MeshStandardMaterial({color:'#796951',roughness:1}));
 const foliage=own(new T.MeshStandardMaterial({color:'#c5cfb4',roughness:.96,side:T.DoubleSide}));
 const dummy=new T.Object3D(),color=new T.Color();
 type Placement={p:number[];s:number[];r?:number[];c?:string};
 function instances(parent:T.Group,g:T.BufferGeometry,m:T.Material,items:Placement[],name:string){
  if(!items.length)return;const mesh=own(new T.InstancedMesh(g,m,items.length));mesh.name=name;mesh.userData.finishOnly=true;
  items.forEach((v,i)=>{dummy.position.fromArray(v.p);dummy.scale.fromArray(v.s);dummy.rotation.set(...(v.r||[0,0,0]) as [number,number,number]);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(v.c)mesh.setColorAt(i,color.set(v.c));});mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();parent.add(mesh);
 }
 function garden(parent:T.Group,name:string,trees:number[][],shrubs:number[][],trails:number[][]=[]){
  const root=new T.Group();root.name=name;root.userData.finishOnly=true;parent.add(root);
  const pots:Placement[]=[],stems:Placement[]=[],leaves:Placement[]=[],beds:Placement[]=[];
  // x, surface height, z, plant size, container flag. Open crowns keep views between stems.
  trees.forEach(([x,y,z,s,container=1],index)=>{
   const base=y+(container?.65*s:0);
   if(container)pots.push({p:[x,y+.325*s,z],s:[s,s,s]});
   stems.push({p:[x,base+.68*s,z],s:[s,1.36*s,s]});
   for(let branch=0;branch<3;branch++){
    const a=branch*2.1+index;stems.push({p:[x+Math.cos(a)*.18*s,base+1.12*s,z+Math.sin(a)*.18*s],s:[.6*s,.70*s,.6*s],r:[Math.sin(a)*.5,0,-Math.cos(a)*.5]});
   }
   for(let k=0;k<28;k++){
    const a=k*2.399+index,r=Math.sqrt((k+.5)/28)*.85*s;
    leaves.push({p:[x+Math.cos(a)*r,base+(1.45+Math.sin(k*1.7)*.26+(1-r/s)*.45)*s,z+Math.sin(a)*r],s:[.38*s,.21*s,.32*s],r:[k*.12,a,.15],c:['#849175','#667b5d','#758768'][k%3]});
   }
  });
  shrubs.forEach(([x,y,z,s,container=0],i)=>{if(container){beds.push({p:[x,y+.16,z],s:[s,.32,s*.8]});y+=.32;}for(let k=0;k<9;k++){const a=k*2.399+i,r=.32*s*Math.sqrt(k/9);leaves.push({p:[x+Math.cos(a)*r,y+(.17+Math.sin(k*1.8)*.07)*s,z+Math.sin(a)*r],s:[.28*s,.18*s,.26*s],c:k%2?'#718764':'#889775'});}});
  // Cascades stay against planter edges, leaving the centre of every balcony open.
  trails.forEach(([x,y,z,s],i)=>{for(let k=0;k<8;k++)leaves.push({p:[x+Math.sin(k*.9+i)*.09,y-k*.105*s,z+Math.cos(k)*.035],s:[.14*s,.13*s,.10*s],c:k%2?'#71805c':'#8b9875'});});
  instances(root,pot,mineral,pots,'M planting containers');instances(root,trunk,bark,stems,'M planting trunks');instances(root,leaf,foliage,leaves,'M planting crowns');
  instances(root,bed,mineral,beds,'M roof planting beds');
  return root;
 }
 floors.forEach((floor,i)=>{
  if(floor.userData.envelope.penthouseUpper)return;
  const notch=floor.userData.envelope.notch,trees:number[][]=[],shrubs:number[][]=[],trails:number[][]=[];
  for(const side of [-1,1]){
   // Narrow lateral planters fit between glazing x=12 and perimeter x=13.75.
   for(const z of [-8.7,-.5]){trees.push([side*13.05,.51,z,.58,1]);}
   for(const dx of [-1.2,-.4,.4,1.2])shrubs.push([side*10.7+dx,1.14,-13.25,1.25]);
   for(const dx of [-.9,0,.9])trails.push([side*10.7+dx,1.15,-13.88,.85]);
   if(notch!==2&&notch!==side){
    for(const dx of [-1,0,1])trails.push([side*11.2+dx,1.15,9.40,.85]);
    if(i%3===0)trees.push([side*11.2,1.14,8.7,.68,0]);
   }
  }
  if(i===20)for(const side of [-1,1]){trees.push([side*11.2,1.14,8.65,1.7,0]);for(const dx of [-1.15,-.55,.55,1.15])shrubs.push([side*11.2+dx,1.14,8.7,1.4]);}
  garden(floor,'M planted balconies web31',trees,shrubs,trails);
 });
 // Podium roofs: all trees outside the tower footprint; unequal heights follow each wing.
 const roofTrees=[[-21,10.25,-8,1.30],[-22,10.25,1,1.35],[-18,10.25,7.5,1.2],
  [23,10.25,-8,1.3],[24,10.25,1,1.4],[23,10.25,10,1.3],[17,10.25,11.5,1.2]];
 const roofBeds:number[][]=[];
 for(const [x,y,z] of roofTrees)for(const dx of [-1.65,1.65])roofBeds.push([x+dx,y,z,1.6,1]);
 garden(site,'M roof gardens web31',roofTrees,roofBeds);
 // Entry and gallery planting is off the door, stair, garage and reception axes.
 garden(site,'M arrival gardens web31',[
  [-22,.825,7,1.1],[23,.825,10,1.1],[-3.65,.825,5.6,.8],[3.6,.825,5.6,.8],
  [-21,5.1,6, .95],[24,5.1,9,.95],[-19,.35,22,1.65],[25,.35,23,1.7],
 ],[[-12,.32,21,2.4],[-14,.32,22,2.1],[13,.32,23,2.1],[15,.32,24,2.3]]);
 // Dry leisure perimeter. Pool, sport runoffs and pavilion openings remain unobstructed.
 garden(site,'M leisure gardens web31',[
  [28,.35,-34,1.9,0],[76,.35,-37,2,0],[79,.35,34,1.8,0],[33,.35,36,1.65,0],
  [114,.35,-42,1.9,0],[116,.35,44,1.8,0],[-22,.35,-22,1.8,0],[22,.35,-23,1.9,0],
 ],[[27,.35,-25,2],[27,.35,-20,2.2],[78,.35,21,2.2],[78,.35,26,2],
  [38,.35,37,2],[42,.35,37,2.2],[67,.35,-52,2.2],[62,.35,-52,2],[-20,.35,-22,2],[20,.35,-23,2]]);
}


