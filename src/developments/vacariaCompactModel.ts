import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {buildVacaria,VACARIA_BOUNDARY} from './vacariaModel';
import {finishVacariaExterior} from './vacariaExterior';
import {districtCars} from './vacariaCars';
import {vacariaWest,vacariaEast,vacariaNorth,vacariaDiagonal} from './vacariaYards';
import type {Obstacle} from './mWalking';

export const COMPACT={width:5.4,depth:7.8,area:42.12,units:27,price:170000,cost:3400,route:'/apresentar/residencial-vacaria?alternativa=compacta'};
export const COMPACT_UNITS=[
 ...Array.from({length:10},(_,i)=>({x:10.1+i*5.4,z:-6,rotation:Math.PI,block:'Superior'})),
 ...Array.from({length:3},(_,i)=>({x:5.1+i*5.4,z:11.2,rotation:0,block:'Central esquerdo'})),
 ...Array.from({length:6},(_,i)=>({x:28.5+i*5.4,z:11.2,rotation:0,block:'Central direito'})),
 ...Array.from({length:3},(_,i)=>({x:5.1+i*5.4,z:33.2,rotation:0,block:'Inferior esquerdo'})),
 ...Array.from({length:5},(_,i)=>({x:28.5+i*5.4,z:33.2,rotation:0,block:'Inferior direito'})),
].map((u,i)=>({...u,id:`C${String(i+1).padStart(2,'0')}`}));
export const COMPACT_ROADS=[
 {name:'Acesso e primeira rua C1',points:[[1.2,-43.2],[1.2,-41.2],[2.5,-23],[3,-12],[3.8,-4],[4.2,-1],[5,.7],[6.5,2.1],[8,2.6],[61.5,2.6]],width:4.8},
 {name:'Rua central C1',points:[[22.2,2.6],[22.2,46]],width:4.8},
 {name:'Segunda rua C1',points:[[3.8,24.6],[60.4,24.6]],width:4.8},
];

/** Independent concept. Reuse material/roof libraries, never change the V08 model or placements. */
export function buildCompactVacaria(){
 const model=buildVacaria();finishVacariaExterior(model);
 const own=<A extends {dispose:()=>void}>(r:A)=>{model.resources.add(r);return r};
 const material=(name:string,fallback:string)=>{
  let result:T.Material|undefined;model.district.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.name===name)result=m;});
  return result??own(new T.MeshStandardMaterial({color:fallback,roughness:.85}));
 };
 const paint=material('Reboco mineral marfim','#eee8dc'),grass=material('Gramado com variação natural','#72805c'),concrete=material('Concreto natural acetinado','#cbc6b9'),pavers=material('Pavimento intertravado cinza','#777a72'),dark=material('Esquadrias grafite acetinadas','#303b36'),metal=material('Telha metálica alumínio fosco','#aab4b3');
 const timber=own(new T.MeshStandardMaterial({color:'#aa8259',roughness:.8})),linen=own(new T.MeshStandardMaterial({color:'#a6af94',roughness:.95})),white=own(new T.MeshStandardMaterial({color:'#eee9dd',roughness:.6})),glass=own(new T.MeshPhysicalMaterial({color:'#8eaaa7',transparent:true,opacity:.28,roughness:.15})),rubber=own(new T.MeshStandardMaterial({color:'#b9845f',roughness:1})),warm=own(new T.MeshStandardMaterial({color:'#fff0cc',emissive:'#ffcd88',emissiveIntensity:1}));
 const roofLibrary=model.house.getObjectByName('Cobertura metálica V05')!.clone(true);
 const commonLibrary=model.district.getObjectByName('Praça e lazer V08');
 const oldPlay=commonLibrary?.children.filter(o=>/playground|torre|escorregador|balanço|balanços/i.test(o.name)).map(o=>o.clone(true))??[];
 // Keep the same site outline, entry opening and neighboring context only.
 const keep=new Set(['Muro perimetral completo','Limite de terreno interpretado da referência','Entorno paisagístico','Rua pública de referência','Volume vizinho de contexto','Cobertura vizinha','Acesso pela calçada pública']);
 for(const child of [...model.district.children])if(!keep.has(child.name))model.district.remove(child);
 model.district.name='Alternativa compacta C1';model.district.userData={roads:COMPACT_ROADS,boundary:VACARIA_BOUNDARY};
 model.single.clear();model.homes=[];model.obstacles=[];
 const cube=own(new T.BoxGeometry(1,1,1));
 function box(parent:T.Object3D,name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material){
  const mesh=new T.Mesh(cube,m);mesh.name=name;mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=mesh.receiveShadow=true;
  // Metric UVs on every finish: no stretched long-road textures.
  if([paint,grass,concrete,pavers].includes(m)){
   const g=own(cube.clone()),p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=[];const period=m===pavers?2.4:m===grass?2:1.2;
   for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));uv.push((nx>.5?p.getZ(i)*d:p.getX(i)*w)/period,(ny>.5?p.getZ(i)*d:p.getY(i)*h)/period);}g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));mesh.geometry=g;
  }parent.add(mesh);return mesh;
 }
 function surface(name:string,points:number[][],m:T.Material,y=-.045){
  const s=new T.Shape();points.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();const solid=m===concrete;const g=own(solid?new T.ExtrudeGeometry(s,{depth:.18,bevelEnabled:false}):new T.ShapeGeometry(s));g.rotateX(-Math.PI/2);const p=g.getAttribute('position'),uv=[];const period=m===pavers?2.4:2;
  for(let i=0;i<p.count;i++)uv.push(p.getX(i)/period,p.getZ(i)/period);g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  const mesh=new T.Mesh(g,m);mesh.name=name;mesh.position.y=solid?y-.18:y;mesh.receiveShadow=true;mesh.userData.polygon=points;model.district.add(mesh);return mesh;
 }
 const house=new T.Group();house.name='Casa compacta · 5,40 × 7,80 m';model.house=house;model.single.add(house);
 const arch=new T.Group(),roof=new T.Group(),furniture=new T.Group();arch.name='Paredes compactas';roof.name='Cobertura removível C1';furniture.name='Mobiliário de escala C1';house.add(arch,roof,furniture);model.roof=roof;
 const obstacles:Obstacle[]=[];
 function wall(name:string,x:number,z:number,w:number,d:number){box(arch,name,x,1.45,z,w,2.8,d,paint);obstacles.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});}
 function openingWall(z:number,openings:{a:number;b:number;bottom:number;top:number;door?:boolean}[]){
  let last=-2.7;for(const o of openings){if(o.a>last)wall('Parede fachada C1',(last+o.a)/2,z,o.a-last,.15);if(o.bottom)box(arch,'Peitoril C1',(o.a+o.b)/2,o.bottom/2+.05,z,o.b-o.a,o.bottom,.15,paint);box(arch,'Verga C1',(o.a+o.b)/2,(o.top+2.8)/2+.05,z,o.b-o.a,2.8-o.top,.15,paint);
   if(o.door){box(arch,'Porta aberta C1',o.b-.03,1.10,z+.44,.055,2.1,.88,dark);}else{
    box(arch,'Vidro C1',(o.a+o.b)/2,(o.bottom+o.top)/2+.05,z,o.b-o.a,o.top-o.bottom,.025,glass);
    for(const x of [o.a,o.b,(o.a+o.b)/2])box(arch,'Esquadria C1',x,(o.bottom+o.top)/2+.05,z,.045,o.top-o.bottom,.075,dark);
    for(const y of [o.bottom,o.top])box(arch,'Esquadria C1',(o.a+o.b)/2,y+.05,z,o.b-o.a,.045,.075,dark);
    obstacles.push({minX:o.a,maxX:o.b,minZ:z-.1,maxZ:z+.1});
   }last=o.b;
  }if(last<2.7)wall('Parede fachada C1',(last+2.7)/2,z,2.7-last,.15);
 }
 box(house,'Área construída 42,12 m²',0,-.035,3.9,5.4,.17,7.8,concrete);
 wall('Parede geminada C1',-2.625,3.9,.15,7.8);wall('Parede geminada C1',2.625,3.9,.15,7.8);
 openingWall(.075,[{a:-2.2,b:-.3,bottom:.9,top:2.15},{a:1.4,b:2.3,bottom:0,top:2.15,door:true}]);
 openingWall(7.725,[{a:-2.2,b:-.8,bottom:.9,top:2.15},{a:.25,b:1.15,bottom:1.2,top:2.15},{a:1.4,b:2.3,bottom:0,top:2.15,door:true}]);
 wall('Divisória quarto / banho',-1.325,3.075,2.45,.15);wall('Divisória banho / casal',-1.325,4.575,2.45,.15);
 let last=.15;for(const [a,b]of [[2.1,2.9],[3.35,4.15],[4.85,5.65]]){wall('Divisória longitudinal',-.025,(last+a)/2,.15,a-last);box(arch,'Verga porta interna',-.025,2.5,(a+b)/2,.15,.7,b-a,paint);last=b;}wall('Divisória longitudinal',-.025,(last+7.65)/2,.15,7.65-last);
 for(const x of [-2.625,2.625])box(roof,'Platibanda lateral C1',x,3.12,3.9,.15,.44,7.8,paint);
 for(const z of [.075,7.725])box(roof,'Platibanda C1',0,3.12,z,5.4,.44,.15,paint);
 box(roof,'Faixa contínua C1',0,2.8,-.06,5.4,.45,.25,paint);
 box(roof,'Forro leve — sistema a dimensionar',0,2.87,3.9,5.1,.035,7.5,white);
 roofLibrary.scale.set(.9,1,1.04);roof.add(roofLibrary);
 for(const z of [1.0,3.6,6.9])box(roof,'Terça de cobertura — pré-dimensionamento',0,2.98,z,5.1,.12,.08,metal);
 box(arch,'Arandela C1',2.43,1.95,-.04,.12,.23,.1,dark);box(arch,'Luz da fachada C1',2.43,1.82,-.04,.12,.015,.1,warm);
 function furnishing(name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,collide=true){const item=box(furniture,name,x,y,z,w,h,d,m);if(collide)obstacles.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});return item;}
 function bed(x:number,z:number,w:number){furnishing('Base cama',x,.23,z,w,.36,1.88,timber);box(furniture,'Colchão',x,.47,z,w,.16,1.88,white);box(furniture,'Manta',x,.565,z-.3,w,.025,.95,linen);box(furniture,'Travesseiro',x,.62,z+.62,w*.7,.10,.4,white);}
 bed(-2.05,1.35,.88);bed(-1.52,6.65,1.38);
 furnishing('Armário quarto 2',-.43,1.08,1.08,.60,2.06,1.1,white);furnishing('Armário casal',-1.6,1.08,4.94,1.7,2.06,.55,white);
 furnishing('Sofá de dois lugares',2.17,.38,1.60,.72,.65,1.6,linen);box(furniture,'Encosto sofá',2.45,.68,1.6,.14,.65,1.6,linen);
 furnishing('Rack',.29,.32,1.28,.4,.52,1.1,timber);box(furniture,'TV',.10,1.17,1.28,.04,.57,.95,dark);
 furnishing('Mesa compacta',1.45,.76,3.75,.75,.06,1.0,timber);for(const x of [1.15,1.75])for(const z of [3.35,4.15])box(furniture,'Pé mesa',x,.38,z,.04,.72,.04,dark);
 for(const z of [3.02,4.48]){box(furniture,'Cadeira',1.45,.45,z,.4,.07,.4,linen);box(furniture,'Encosto cadeira',1.45,.70,z+(z<3.5?-.18:.18),.4,.48,.055,timber);}
 furnishing('Cozinha junto ao núcleo hidráulico',.37,.48,6.55,.60,.86,2.05,white);box(furniture,'Tampo cozinha',.37,.93,6.55,.64,.05,2.1,concrete);box(furniture,'Cuba',.37,.97,7.15,.42,.02,.45,metal);box(furniture,'Cooktop',.37,.97,5.85,.45,.02,.52,dark);
 furnishing('Geladeira',2.19,.98,5.4,.65,1.85,.65,white);
 furnishing('Box banho',-2.05,.08,3.84,.9,.06,1.2,white);box(furniture,'Vidro box',-1.57,1.1,3.84,.025,2.1,1.2,glass);furnishing('Lavatório',-.45,.78,3.4,.55,.18,.38,white);furnishing('Vaso sanitário',-.52,.31,4.15,.4,.56,.55,white);
 const garden=new T.Group();garden.name='Frente e quintal compactos';house.add(garden);
 box(garden,'Frente permeável C1',0,-.1,-2.5,5.4,.12,5,grass);box(garden,'Quintal C1',0,-.1,8.8,5.4,.12,2,grass);
 for(const x of [-1.95,-.50])box(garden,'Faixa da vaga C1',x,-.025,-2.5,.55,.10,4.8,concrete);
 box(garden,'Acesso pedestre C1',1.85,-.025,-2.5,1,.10,5,concrete);box(garden,'Saída para quintal C1',1.85,-.025,8.3,1,.1,1,concrete);
 // Facade orientation matches the original references: one front window and one door.
 house.scale.x=-1;for(const o of obstacles){const a=o.minX;o.minX=-o.maxX;o.maxX=-a;}model.obstacles=obstacles;
 for(const unit of COMPACT_UNITS){const h=house.clone(true);h.name=unit.id;h.position.set(unit.x,0,unit.z);h.rotation.y=unit.rotation;h.userData={unitId:unit.id,block:unit.block};
  h.getObjectByName('Mobiliário de escala C1')?.clear();h.traverse(o=>{if(/Porta aberta|Divisória|Verga porta interna/.test(o.name))o.visible=false;});
  for(const z of [.12,7.68])box(h,'Porta fechada C1',1.85,1.1,z,.88,2.1,.04,dark);
  for(let i=0;i<12;i++)box(h,'Cortina frontal C1',-2.18+i*.155,1.53,.18,.15,1.35,.045,white);
  h.getObjectByName('Quintal C1')!.visible=false;model.district.add(h);model.homes.push(h);
 }
 // No parking overlaps the 1.20 m walks or the 4.80 m streets in this concept.
 function strip(name:string,a:number[],b:number[],width:number,m:T.Material,y=-.04){const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=dz/len*width/2,nz=-dx/len*width/2;return surface(name,[[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz],[a[0]-nx,a[1]-nz]],m,y);}
 for(const road of COMPACT_ROADS){for(let i=1;i<road.points.length;i++)strip(road.name,road.points[i-1],road.points[i],road.width,pavers);for(const [x,z]of road.points.slice(1,-1)){const g=own(new T.CircleGeometry(road.width/2,24));g.rotateX(-Math.PI/2);const o=new T.Mesh(g,pavers);o.position.set(x,-.038,z);o.receiveShadow=true;model.district.add(o);}}
 function walk(x1:number,x2:number,z1:number,z2:number){const m=surface('Calçada C1',[[x1,z1],[x2,z1],[x2,z2],[x1,z2]],concrete,.03);return m;}
 walk(7.4,61.5,-1,.2);for(const [z1,z2]of [[5,6.2],[21,22.2],[27,28.2]]){walk(2.4,19.8,z1,z2);walk(24.6,z1<10?61.5:60.4,z1,z2);}
 for(const [x1,x2]of [[18.6,19.8],[24.6,25.8]])for(const [z1,z2]of [[6.2,21],[28.2,46]])walk(x1,x2,z1,z2);
 walk(-23,-2.4,-44,-43.2);walk(4.8,77,-44,-43.2);
 const arrival=COMPACT_ROADS[0].points.slice(0,-1);
 function offset(points:number[][],distance:number){return points.map(([x,z],i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],len=Math.hypot(b[0]-a[0],b[1]-a[1]);return [x+(b[1]-a[1])/len*distance,z-(b[0]-a[0])/len*distance];});}
 for(const sign of [-1,1])surface('Calçada do acesso C1',[...offset(arrival,sign*2.4),...offset(arrival,sign*3.6).reverse()],concrete,.03);
 // Property boundary is used directly by edge lots. Deduplicate garden divisions.
 const fences=new Map<string,T.Mesh>();const yards=new T.Group();yards.name='Divisas únicas C1';model.district.add(yards);
 function fence(a:number[],b:number[],owner:string){const key=[a,b].map(p=>p.map(v=>v.toFixed(3)).join(',')).sort().join('|');if(fences.has(key)){fences.get(key)!.userData.owners.push(owner);return;}const length=Math.hypot(b[0]-a[0],b[1]-a[1]);const m=box(yards,'Divisa compartilhada C1',(a[0]+b[0])/2,.84,(a[1]+b[1])/2,.12,1.78,length,paint);m.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);m.userData={segment:[a,b],owners:[owner]};fences.set(key,m);}
 for(const [i,h]of model.homes.entries()){
  const a=h.position.x-2.7,b=h.position.x+2.7,z=h.position.z;
  if(i<10){const rear=z-7.8;const left=i===0?[7.59,-16.09]:[a,vacariaNorth(a)+.11];const right=i===9?[61.20,-17.39]:[b,vacariaNorth(b)+.11];const poly=[[a,rear],[b,rear],right,left];surface('Quintal '+h.name,poly,grass,-.055).userData.owner=h.name;fence([a,rear],left,h.name);if(i!==9)fence([b,rear],right,h.name);
   if(i===9)surface('Quintal lateral aberto C10',[[b,z],[vacariaEast(z)-.12,z],[61.20,-17.39],right],grass,-.055);
  }else{
   const rear=z+7.8,back=rear+2,isWest=i===10||i===19,isEast=i===18,isLast=i===26;
   const left=isWest?vacariaWest(back)+.12:a,right=isEast?vacariaEast(back)-.12:b;
   if(isLast){const poly=[[a,rear],[b,rear],[b,vacariaDiagonal(b)-.15],[a,vacariaDiagonal(a)-.15]];surface('Quintal '+h.name,poly,grass,-.055);fence([a,back],[a,vacariaDiagonal(a)-.15],h.name);surface('Quintal lateral C27',[[b,z],[vacariaEast(z)-.15,z],[64.75,35.95],[b,vacariaDiagonal(b)-.15]],grass,-.055);fence([b,z],[vacariaEast(z)-.15,z],h.name);
   }else{surface('Quintal '+h.name,[[a,rear],[b,rear],[b,back],[a,back]],grass,-.055);fence([left,back],[right,back],h.name);}
   if(!isWest)fence([a,rear],[a,back],h.name);if(!isEast&&!isLast)fence([b,rear],[b,back],h.name);
   if(isWest)surface('Quintal lateral '+h.name,[[vacariaWest(z)+.12,z],[a,z],[a,back],[vacariaWest(back)+.12,back]],grass,-.055);
   if(isEast){surface('Quintal lateral '+h.name,[[b,z],[vacariaEast(z)-.12,z],[right,back],[b,back]],grass,-.055);}
  }
 }
 yards.userData.uniqueSegments=fences.size;
 // Small common square: one play area, two benches, one picnic table; no pergola/building.
 const common=new T.Group();common.name='Praça econômica C1';model.district.add(common);
 surface('Piso amortecedor do playground C1',[[10.6,50.5],[21,50.5],[21,58.2],[10.6,58.2]],rubber,-.01);
 oldPlay.forEach(o=>common.add(o));
 strip('Caminho acessível do lazer C1',[22.2,46],[22.2,61],1.5,concrete,.03);strip('Caminho do banco C1',[22.2,49],[27,49],1.5,concrete,.03);strip('Caminho do playground C1',[21,54.3],[22.2,54.3],1.5,concrete,.03);
 function bench(x:number,z:number){for(const xx of [x-.68,x+.68])box(common,'Pé banco C1',xx,.23,z,.08,.46,.5,dark);for(let dz=-.2;dz<=.21;dz+=.105)box(common,'Assento banco C1',x,.47,z+dz,1.8,.05,.09,timber);for(const y of [.70,.86])box(common,'Encosto banco C1',x,y,z+.22,1.8,.12,.05,timber);}
 bench(24.7,48);bench(24.7,55.5);box(common,'Mesa piquenique C1',17,.77,63,1.6,.07,.85,timber);for(const x of [16.4,17.6])box(common,'Pé mesa C1',x,.39,63,.1,.75,.7,dark);for(const z of [62.2,63.8])bench(17,z);
 strip('Caminho da mesa C1',[22.2,61],[17,61],1.5,concrete,.03);strip('Caminho da mesa C1',[17,61],[17,62],1.5,concrete,.03);
 for(const [x,z]of [[-.8,-33],[.1,-20],[1,-8],[18.1,8],[26.3,8],[18.1,30],[26.3,30],[23.2,48],[23.2,58],[17,65]]){box(model.district,'Balizador C1',x,.44,z,.12,.88,.12,dark);box(model.district,'Difusor C1',x,.78,z,.14,.12,.14,warm);}
 // Context for the demonstration home, separate from district geometry.
 const context=new T.Group();context.name='Contexto da casa C1';model.single.add(context);
 box(context,'Solo da casa C1',0,-.24,1,20,.1,28,grass);box(context,'Rua da casa C1',0,-.08,-8.6,20,.08,4.8,pavers);box(context,'Calçada da casa C1',0,-.01,-5.6,20,.10,1.2,concrete);
 for(const x of [-5.4,5.4]){const h=model.homes[0].clone(true);h.position.set(x,0,0);h.rotation.y=0;context.add(h);}
 for(const x of [-2.65,2.65])box(context,'Divisa lateral do quintal C1',x,.85,8.8,.1,1.8,2,paint);box(context,'Muro de fundo da casa C1',0,1,9.9,5.4,2,.15,paint);
 // Obstruction lists are shared with the walking controller, including outdoor limits.
 obstacles.push({minX:.25,maxX:2.25,minZ:-4.8,maxZ:-.2});
 model.caps=new T.Group();model.single.add(model.caps);
 return {...model,context,nightMaterials:[warm],resources:model.resources};
}

/** Licensed project assets; vehicle scale stays uniform, plants stay outside walking strips. */
export async function loadCompactAssets(model:ReturnType<typeof buildCompactVacaria>,draw:()=>void,closed:()=>boolean){
 const own=(scene:T.Object3D)=>{scene.traverse(o=>{if(o instanceof T.Mesh){model.resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){model.resources.add(m);for(const value of Object.values(m))if(value instanceof T.Texture)model.resources.add(value);}}});};
 const loader=new GLTFLoader();
 const results=await Promise.allSettled([
  loader.loadAsync('/assets/vacaria/veiculo-realista-v6.glb').then(asset=>{
   own(asset.scene);if(closed())return;asset.scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(asset.scene),center=bounds.getCenter(new T.Vector3());asset.scene.position.sub(new T.Vector3(center.x,bounds.min.y,center.z));const car=new T.Group();car.add(asset.scene);
   asset.scene.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(/Glass/.test(m.name)){const glass=m as T.MeshPhysicalMaterial;glass.transmission=0;glass.transparent=false;glass.color.set('#283833');}if(/Paint 1/.test(m.name)){const paint=m as T.MeshPhysicalMaterial;paint.color.set('#aeb7b0');paint.metalness=.35;paint.roughness=.4;paint.clearcoat=.6;}}}});
   districtCars(car,model);const demo=car.clone(true);demo.position.set(1.25,.025,-2.5);model.context.add(demo);draw();
  }),
  loader.loadAsync('/assets/vacaria/arbustos-biblioteca-v7.glb').then(asset=>{
   own(asset.scene);if(closed())return;asset.scene.updateMatrixWorld(true);const source:T.Mesh[]=[];
   asset.scene.traverse(o=>{if(o instanceof T.Mesh&&!o.name.startsWith('Grama_')){const g=o.geometry.clone().applyMatrix4(o.matrixWorld);model.resources.add(g);g.computeBoundingBox();const b=g.boundingBox!,center=b.getCenter(new T.Vector3());g.translate(-center.x,-b.min.y,-center.z);const m=new T.Mesh(g,o.material);for(const material of Array.isArray(m.material)?m.material:[m.material]){material.side=T.DoubleSide;material.transparent=false;material.alphaTest=.35;}source.push(m);}});
   const group=new T.Group();group.name='Arbustos da biblioteca C1';model.district.add(group);
   const sites:T.Vector3[]=[];for(const h of model.homes){h.updateMatrixWorld(true);for(const x of [-2.48,.55])sites.push(h.localToWorld(new T.Vector3(x,-.04,-.50)));}for(const [x,z]of [[9,50],[9,57],[23.5,60],[18,66]])sites.push(new T.Vector3(x,-.04,z));
   const dummy=new T.Object3D();source.forEach((s,index)=>{const selected=sites.filter((_,i)=>i%source.length===index);const m=new T.InstancedMesh(s.geometry,s.material,selected.length);model.resources.add(m);selected.forEach((p,i)=>{dummy.position.copy(p);dummy.scale.setScalar(.4);dummy.rotation.y=i*1.7;dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);});m.castShadow=m.receiveShadow=true;group.add(m);});
   for(const x of [-2.48,.55]){if(!source.length)break;const shrub=source[0].clone();shrub.position.set(-x,-.04,-.5);shrub.scale.setScalar(.4);model.context.add(shrub);}draw();
  })
 ]);
 if(closed()){model.resources.forEach(r=>r.dispose());return;}model.district.userData.assetsReady=true;draw();
 if(results.some(r=>r.status==='rejected'))throw new Error('Parte da biblioteca de veículos ou vegetação não carregou.');
}
