import {patioPoint53} from './mPatioLayout53';
import {context52} from './mContext52';
import {buildMCondominium42} from './mCondominium42';
import {grassSurface51} from './mGround51';
import {canopy51} from './mCanopy51';
import {enrichMNeighborhood} from './mNeighborhood37';
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Own,mSurfaces } from './mSurfaces';
import { M_SITE } from './mSiteLayout';

/** Park scenery is separate from the architectural model and never enters a floor cut. */
export function buildMLandscape(scene:T.Scene,own:Own,surfaces:ReturnType<typeof mSurfaces>) {
 const group=new T.Group();group.name='M_Parque_e_lago';scene.add(group);
 let seed=260930;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const material=(color:string,roughness=1,metalness=0)=>own(new T.MeshStandardMaterial({color,roughness,metalness}));
 const meadow=grassSurface51(own),fairway=grassSurface51(own,'#587e44'),green=grassSurface51(own,'#638d4e');
 const sand=material('#c3bda8'),pathMaterial=material('#bbb8ac'),shoreMaterial=material('#82925e');
 const timber=material('#8c7b62',.88),bark=material('#696458'),metal=material('#575e58',.76,.2);
 const water=own(new T.MeshPhysicalMaterial({color:'#34696a',roughness:.12,metalness:.02,clearcoat:.85,clearcoatRoughness:.13,envMapIntensity:1.1}));
 const dummy=new T.Object3D();
 const geometry=<A extends T.BufferGeometry>(value:A)=>own(value);
 // A quiet distant ground hides the edge of the detailed site in aerial viewpoints.
 const groundShape=new T.Shape([new T.Vector2(-6000,-6000),new T.Vector2(6000,-6000),new T.Vector2(6000,6000),new T.Vector2(-6000,6000)]);
 const garage=M_SITE.garage;
 groundShape.holes.push(new T.Path([[garage.x-garage.width/2,8],[garage.x+garage.width/2,8],[garage.x+garage.width/2,-43],[garage.x-garage.width/2,-43]].map(p=>new T.Vector2(...p))));
 groundShape.holes.push(new T.Path([[32,20],[62,20],[62,27],[72,27],[72,-31],[62,-31],[62,-22],[32,-22]].map(p=>new T.Vector2(...p))));
 const horizon=new T.Mesh(geometry(new T.ShapeGeometry(groundShape)),grassSurface51(own));
 horizon.name='M51 continuous grass horizon';horizon.rotation.x=-Math.PI/2;horizon.position.y=.055;horizon.receiveShadow=true;group.add(horizon);
 const terrainY=(x:number,z:number)=>{
  if(x>=-165&&x<=215&&z>=69&&z<=210)return .06;
  const c=M_SITE.campus,edge=T.MathUtils.smoothstep(Math.max(c.minX-x,x-c.maxX,c.minZ-z,z-c.maxZ),0,30);
  const outer=1-T.MathUtils.smoothstep(Math.max(Math.abs(x)-196,-z-191,z-28),0,44);
  return .06+outer*Math.max(0,edge*(.9+Math.sin(x*.028+z*.014)*.85+Math.cos(z*.043-x*.008)*.55+Math.sin(x*.05-z*.022)*.24));
 };
 const lakeCentre=new T.Vector2(...M_SITE.lake.center);
 const lakePoints=Array.from({length:72},(_,i)=>{
  const angle=i/72*Math.PI*2,irregular=1+.095*Math.sin(angle*3+.7)+.055*Math.sin(angle*5+1.2);
  return new T.Vector2(lakeCentre.x+Math.cos(angle)*M_SITE.lake.radius[0]*irregular,lakeCentre.y+Math.sin(angle)*M_SITE.lake.radius[1]*irregular);
 });
 const bankOuter=lakePoints.map(p=>p.clone().sub(lakeCentre).multiplyScalar(1.1).add(lakeCentre));
 function meshFrom(positions:number[],indices:number[],m:T.Material,colors?:number[]) {
  const g=geometry(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);
  const uvs:number[]=[];for(let i=0;i<positions.length;i+=3)uvs.push(positions[i]/8,positions[i+2]/8);g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  if(colors)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();
  const mesh=new T.Mesh(g,m);mesh.receiveShadow=true;group.add(mesh);return mesh;
 }
 // A low-contrast grain supplies ground detail without a tiled grass photograph.
 const grainCanvas=document.createElement('canvas');grainCanvas.width=grainCanvas.height=128;
 const grainContext=grainCanvas.getContext('2d')!,grainData=grainContext.createImageData(128,128);
 for(let i=0;i<grainData.data.length;i+=4){const v=180+random()*64;grainData.data[i]=grainData.data[i+1]=grainData.data[i+2]=v;grainData.data[i+3]=255;}
 grainContext.putImageData(grainData,0,0);
 const grain=own(new T.CanvasTexture(grainCanvas));grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.anisotropy=4;
 for(const m of [sand,pathMaterial,shoreMaterial]){m.bumpMap=grain;m.bumpScale=m===sand?.07:.045;}
 /** Subdivide interiors too: a perimeter-only polygon cuts through undulating ground. */
 function drapedShape(shape:T.Shape,m:T.Material,elevation:(x:number,z:number)=>number,maxEdge=2.2) {
  const source=new T.ShapeGeometry(shape),p=source.getAttribute('position'),sourceIndex=source.index!;
  const pending:[T.Vector2,T.Vector2,T.Vector2][]=[];
  for(let i=0;i<sourceIndex.count;i+=3){const a=sourceIndex.getX(i),b=sourceIndex.getX(i+1),c=sourceIndex.getX(i+2);pending.push([new T.Vector2(p.getX(a),p.getY(a)),new T.Vector2(p.getX(b),p.getY(b)),new T.Vector2(p.getX(c),p.getY(c))]);}
  source.dispose();
  const positions:number[]=[],indices:number[]=[],colors:number[]=[],vertices=new Map<string,number>();
  const vertex=(point:T.Vector2)=>{
   const key=point.x.toFixed(5)+','+point.y.toFixed(5),existing=vertices.get(key);if(existing!==undefined)return existing;
   const index=positions.length/3;positions.push(point.x,elevation(point.x,point.y),point.y);vertices.set(key,index);
   if(m===meadow){const v=.95+.026*Math.sin(point.x*.017+point.y*.029)+.015*Math.sin(point.x*.39+point.y*.52);colors.push(v,v,v);}return index;
  };
  while(pending.length){
   const [a,b,c]=pending.pop()!,edges=[a.distanceToSquared(b),b.distanceToSquared(c),c.distanceToSquared(a)],longest=Math.max(...edges);
   if(longest<=maxEdge*maxEdge){indices.push(vertex(a),vertex(c),vertex(b));continue;}
   const edge=edges.indexOf(longest);
   if(edge===0){const mid=a.clone().add(b).multiplyScalar(.5);pending.push([a,mid,c],[mid,b,c]);}
   else if(edge===1){const mid=b.clone().add(c).multiplyScalar(.5);pending.push([a,b,mid],[a,mid,c]);}
   else {const mid=c.clone().add(a).multiplyScalar(.5);pending.push([a,b,mid],[mid,b,c]);}
  }
  return meshFrom(positions,indices,m,m===meadow?colors:undefined);
 }
 const c=M_SITE.campus;
 const terrainShape=new T.Shape([new T.Vector2(-240,-235),new T.Vector2(240,-235),new T.Vector2(240,59),new T.Vector2(c.maxX,59),new T.Vector2(c.maxX,c.minZ),new T.Vector2(c.minX,c.minZ),new T.Vector2(c.minX,59),new T.Vector2(-240,59)]);
 terrainShape.holes.push(new T.Path(bankOuter));
 drapedShape(terrainShape,meadow,terrainY,6);
 const polygon=(points:T.Vector2[],m:T.Material,elevation:(x:number,z:number)=>number,maxEdge=2.2)=>drapedShape(new T.Shape(points),m,elevation,maxEdge);
 polygon(lakePoints,water,()=>.28,200);
 // Sloped banks avoid the perfect flat ring around an artificial pond.
 const bankPositions:number[]=[],bankIndices:number[]=[];
 for(let i=0;i<=lakePoints.length;i++){
  const p=lakePoints[i%lakePoints.length],out=bankOuter[i%lakePoints.length];
  bankPositions.push(p.x,.3,p.y,out.x,terrainY(out.x,out.y)+.025,out.y);
  if(i<lakePoints.length){const a=i*2;bankIndices.push(a,a+2,a+1,a+1,a+2,a+3);}
 }
 meshFrom(bankPositions,bankIndices,shoreMaterial);
 const rippleCanvas=document.createElement('canvas');rippleCanvas.width=rippleCanvas.height=128;
 const rippleContext=rippleCanvas.getContext('2d')!,rippleData=rippleContext.createImageData(128,128);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const i=(y*128+x)*4,v=128+Math.sin(y*.52+Math.sin(x*.16)*1.8)*38+Math.sin(x*.37+y*.7)*8;
  rippleData.data[i]=rippleData.data[i+1]=rippleData.data[i+2]=v;rippleData.data[i+3]=255;
 }rippleContext.putImageData(rippleData,0,0);
 const ripples=own(new T.CanvasTexture(rippleCanvas));ripples.wrapS=ripples.wrapT=T.RepeatWrapping;water.bumpMap=ripples;water.bumpScale=.13;
 function ribbon(points:T.Vector2[],width:number,m:T.Material,endRounded=false) {
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p.x,0,p.y))),positions:number[]=[],indices:number[]=[],samples=96,crossSections=Math.max(1,Math.ceil(width/2.5));
  for(let i=0;i<=samples;i++){
   const t=i/samples,p=curve.getPoint(t),tangent=curve.getTangent(t),normal=new T.Vector2(-tangent.z,tangent.x).normalize();
   const half=width*.5*(endRounded?Math.pow(Math.sin(Math.PI*t),.33):1)*(1+.06*Math.sin(t*17));
   for(let j=0;j<=crossSections;j++){const sign=j/crossSections*2-1,x=p.x+normal.x*half*sign,z=p.z+normal.y*half*sign;positions.push(x,terrainY(x,z)+(m===pathMaterial?.16:.09),z);}
   if(i<samples)for(let j=0;j<crossSections;j++){const a=i*(crossSections+1)+j,b=a+crossSections+1;indices.push(a,a+1,b,a+1,b+1,b);}
  }return meshFrom(positions,indices,m);
 }
 function organic(cx:number,cz:number,rx:number,rz:number,phase=0) {
  return Array.from({length:48},(_,i)=>{const angle=i/48*Math.PI*2,r=1+.09*Math.sin(angle*3+phase)+.055*Math.sin(angle*5-.4);return new T.Vector2(cx+Math.cos(angle)*rx*r,cz+Math.sin(angle)*rz*r);});
 }
 // Three compact practice fairways describe a golf setting, rather than a regulation course.
 const holes=M_SITE.golf;
 const cube=geometry(new T.BoxGeometry(1,1,1)),cylinder=geometry(new T.CylinderGeometry(1,1,1,7));
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material)=>{const mesh=new T.Mesh(cube,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;};
 const flagGeometry=geometry(new T.PlaneGeometry(.9,.52));const flagMaterial=own(new T.MeshStandardMaterial({color:'#ddd6c5',roughness:1,side:T.DoubleSide}));
 for(const hole of holes){
  ribbon(hole.points.map(p=>new T.Vector2(p[0],p[1])),hole.width,fairway,true);
  const [gx,gz]=hole.green;polygon(organic(gx,gz,12.5,9.5,gx),green,(x,z)=>terrainY(x,z)+.145);
  const [tx,tz]=hole.tee;polygon(organic(tx,tz,4.6,3,tx),fairway,(x,z)=>terrainY(x,z)+.12);
  for(const [x,z,rx,rz] of hole.bunkers)polygon(organic(x,z,rx,rz,x),sand,(a,b)=>terrainY(a,b)+.135);
  const pole=new T.Mesh(cylinder,metal);pole.scale.set(.035,2.1,.035);pole.position.set(gx,terrainY(gx,gz)+1.05,gz);group.add(pole);
  const flag=new T.Mesh(flagGeometry,flagMaterial);flag.position.set(gx+.42,terrainY(gx,gz)+1.84,gz);flag.rotation.y=.65;group.add(flag);
  for(const dx of [-1.3,1.3])box(tx+dx,terrainY(tx+dx,tz)+.12,tz,.18,.18,.22,timber);
 }
 // Paths connect the existing garden perimeter to both scenic destinations.
 const promenade=bankOuter.map(p=>p.clone().sub(lakeCentre).multiplyScalar(1.06).add(lakeCentre));promenade.push(promenade[0].clone());ribbon(promenade,2.8,pathMaterial);
 ribbon([[-41,38],[-54,18],[-57,-45],[-39,-94],[-62,-160],[-109,-191],[-185,-169],[-194,-62],[-181,26]].map(p=>new T.Vector2(...p)),2.4,pathMaterial);
 ribbon([[116,-48],[146,-59],[196,-90],[198,-153],[148,-181],[72,-182],[-12,-174],[-62,-160]].map(p=>new T.Vector2(...p)),2.4,pathMaterial);
 // A sheltered timber viewing deck faces the water; details use one material batch.
 const [deckX,deckZ]=M_SITE.lake.deck,deckY=terrainY(deckX,deckZ)+.25;
 box(deckX,deckY,deckZ,13,.22,7,timber);
 for(let x=deckX-6.3;x<deckX+6.4;x+=.29)box(x,deckY+.119,deckZ,.016,.012,6.9,metal);
 for(const x of [deckX-5.9,deckX+5.9])for(const z of [deckZ-3,deckZ+3])box(x,deckY*.5,z,.2,deckY,.2,timber);
 for(const x of [deckX-5.8,deckX+5.8]){box(x,deckY+1.1,deckZ,.075,.09,6.3,metal);for(const z of [deckZ-3,deckZ,deckZ+3])box(x,deckY+.53,z,.07,1.05,.07,metal);}
 for(const x of [deckX-2.5,deckX+2.5]){box(x,deckY+.56,deckZ+1,3.4,.12,.65,timber);box(x,deckY+.81,deckZ+1.3,3.4,.45,.1,timber);for(const dx of [-1.3,1.3])box(x+dx,deckY+.3,deckZ+1,.06,.6,.55,metal);}
 ribbon([new T.Vector2(62,-50),new T.Vector2(62,-60),new T.Vector2(deckX,deckZ+2.8)],2.6,pathMaterial);
 // Water-edge grasses have a thin silhouette, not solid green blobs.
 const reedGeometry=geometry(new T.PlaneGeometry(.065,1)),reedMaterial=own(new T.MeshStandardMaterial({color:'#7e8869',roughness:1,side:T.DoubleSide}));
 const reeds=own(new T.InstancedMesh(reedGeometry,reedMaterial,700));reeds.name='Lago_vegetacao_ribeirinha';
 for(let i=0;i<700;i++){
  const index=Math.floor(random()*lakePoints.length),p=lakePoints[index],out=bankOuter[index],offset=p.clone().sub(lakeCentre).normalize().multiplyScalar(random()*1.7);
  const x=p.x+offset.x,z=p.y+offset.y,h=.45+random()*.72,bankHeight=.3+(terrainY(out.x,out.y)+.025-.3)*offset.length()/p.distanceTo(out);
  dummy.position.set(x,bankHeight+h*.5,z);dummy.scale.set(1,h,1);dummy.rotation.set((random()-.5)*.25,random()*Math.PI,(random()-.5)*.35);dummy.updateMatrix();reeds.setMatrixAt(i,dummy.matrix);
 }reeds.receiveShadow=true;group.add(reeds);
 const trees:{x:number;z:number;h:number}[]=[];
 for(let i=0;i<26;i++){
  const a=i/26*Math.PI*2;trees.push({x:lakeCentre.x+Math.cos(a)*(M_SITE.lake.radius[0]*1.32+random()*6),z:lakeCentre.y+Math.sin(a)*(M_SITE.lake.radius[1]*1.32+random()*6),h:7+random()*7});
 }
 for(let i=0;i<25;i++)trees.push({x:57+random()*153,z:-181-random()*25,h:8+random()*9});
 for(let i=0;i<28;i++)trees.push({x:-230+random()*420,z:-209-random()*20,h:10+random()*8});
 for(let i=0;i<14;i++)trees.push({x:202+random()*18,z:-12-i*10,h:8+random()*7});
 for(let i=0;i<13;i++)trees.push({x:-49-random()*6,z:-35-i*7.5,h:6+random()*8});
 for(const x of [-18,24,65,108])trees.push({x,z:47,h:6.5});
 // The front block now contains the Pátio housing community.
 polygon([[-235,70],[238,70],[238,205],[-235,205]].map(p=>new T.Vector2(...p)),meadow,terrainY,8);
 for(let x=-150;x<207;x+=24)for(const z of [76,201]){
  if(z===76&&Math.abs(x)<20)continue;
  trees.push({x,z,h:5.5});
 }
 for(const x of [-152,202])for(const z of [104,135,175])trees.push({x,z,h:7});
 for(const x of [-105,-70,-40,74,115,151,175])trees.push({x,z:137,h:5.5});
 // Irregular background groves soften the horizon without occupying the paths or golf holes.
 for(let i=0;i<150;i++){
  const a=i*2.39996,r=250+random()*60;
  trees.push({x:Math.cos(a)*r,z:Math.sin(a)*r-20,h:8+random()*10});
 }
 for(let i=trees.length-1;i>=0;i--){const t=trees[i];if(t.z>=73&&t.z<=205&&t.x>=-152&&t.x<=202){const p=patioPoint53(t.x,t.z);t.x=p.x;t.z=p.z;}else if(t.z>70&&t.z<330&&t.x>-205&&t.x<275)trees.splice(i,1);}
 for(let i=trees.length-1;i>=0;i--)if(trees[i].x>124&&trees[i].x<193&&trees[i].z>-42&&trees[i].z<39)trees.splice(i,1);
 const trunkGeometry=geometry(new T.CylinderGeometry(.52,1,1,7)),trunks=own(new T.InstancedMesh(trunkGeometry,bark,trees.length*4));
 const botanical=canopy51(own),canopies=own(new T.InstancedMesh(botanical.geometry,botanical.material,trees.length*10));
 let trunkIndex=0,canopyIndex=0;
 for(const [treeNumber,tree] of trees.entries()){
  const base=terrainY(tree.x,tree.z),radius=tree.h*.033,kind=treeNumber%3;
  dummy.position.set(tree.x,base+tree.h*.32,tree.z);dummy.scale.set(radius,tree.h*.64,radius);dummy.rotation.set(0,random()*Math.PI,0);dummy.updateMatrix();trunks.setMatrixAt(trunkIndex++,dummy.matrix);
  for(let b=0;b<3;b++){
   const a=b/3*Math.PI*2+.5,end=new T.Vector3(tree.x+Math.cos(a)*tree.h*.2,base+tree.h*.78,tree.z+Math.sin(a)*tree.h*.2),start=new T.Vector3(tree.x,base+tree.h*.4,tree.z);
   dummy.position.copy(start).add(end).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.clone().sub(start).normalize());dummy.scale.set(radius*.45,start.distanceTo(end),radius*.45);dummy.updateMatrix();trunks.setMatrixAt(trunkIndex++,dummy.matrix);
  }
  for(let c=0;c<10;c++){
   const a=c*2.39996,r=tree.h*(.08+random()*.15),s=tree.h*(.43+random()*.18);
   dummy.position.set(tree.x+Math.cos(a)*r,base+tree.h*(.65+random()*(kind===1?.45:.25)),tree.z+Math.sin(a)*r);dummy.scale.set(s*(kind===0?1.28:kind===1?.68:1),s*(kind===1?1.22:.7),s*(kind===0?1.13:kind===1?.68:1));dummy.rotation.set((random()-.5)*.35,a,(random()-.5)*.15);dummy.updateMatrix();canopies.setMatrixAt(canopyIndex,dummy.matrix);
   canopies.setColorAt(canopyIndex++,new T.Color(["#cad7a6","#91b49c","#c3bd83"][kind]).multiplyScalar(.86+random()*.14));
  }
 }
 trunks.castShadow=true;trunks.receiveShadow=true;canopies.receiveShadow=true;group.add(trunks,canopies);
 context52(group,own);
 enrichMNeighborhood(group,own,terrainY);
 buildMCondominium42(group,own,surfaces);
 // Merge fixed deck, poles and flags by material; plants and skyline remain instanced.
 const batches=new Map<T.Material,T.Mesh[]>();
 for(const child of [...group.children])if(child instanceof T.Mesh&&!(child instanceof T.InstancedMesh)&&!Array.isArray(child.material)){
  const list=batches.get(child.material)||[];list.push(child);batches.set(child.material,list);
 }
 for(const [m,meshes] of batches){
  if(meshes.length<2)continue;
  const parts=meshes.map(mesh=>{mesh.updateMatrix();const g=mesh.geometry.clone().applyMatrix4(mesh.matrix);if(m!==meadow)g.deleteAttribute('color');if(g.index){const flat=g.toNonIndexed();g.dispose();return flat;}return g;});
  const combined=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());
  if(combined){const merged=new T.Mesh(geometry(combined),m);merged.receiveShadow=true;merged.castShadow=m===timber||m===metal;group.add(merged);meshes.forEach(mesh=>group.remove(mesh));}
 }
 group.userData.landscape='Parque, lago e prática de golfe — cenário conceitual';
 return {group,deckY};
}

