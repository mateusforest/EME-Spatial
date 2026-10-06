import * as T from 'three';
import { VACARIA } from './vacaria';
import type { Obstacle } from './mWalking';
// V08 shifts the middle/lower blocks left and aligns all lower units with front parking.
// Metric placement is a coordination hypothesis, not a survey of the boundary.
export const VACARIA_UNITS=[
 ...Array.from({length:8},(_,i)=>({x:12+i*6,z:-6,rotation:Math.PI,block:'Superior'})),
 ...[5.5,11.5,17.5].map(x=>({x,z:11.2,rotation:0,block:'Central esquerdo'})),
 ...[30.8,36.8,42.8,48.8].map(x=>({x,z:11.2,rotation:0,block:'Central direito'})),
 ...[5.5,11.5,17.5].map(x=>({x,z:32.9,rotation:0,block:'Inferior esquerdo'})),
 ...[30.8,36.8,42.8,48.8].map(x=>({x,z:32.9,rotation:0,block:'Inferior direito'})),
 {x:54.8,z:11.2,rotation:0,block:'Central direito'},
 {x:54.8,z:32.9,rotation:0,block:'Inferior direito'},
].map((u,i)=>({...u,id:`V${String(i+1).padStart(2,'0')}`}));
export const VACARIA_BOUNDARY=[[-3.6,-43.2],[6,-43.2],[7.56,-16.2],[61.32,-17.52],[64.92,36],[4.92,80]];
export function buildVacaria(){
 const resources=new Set<{dispose:()=>void}>(); const own=<A extends {dispose:()=>void}>(a:A)=>{resources.add(a);return a};
 const mat=(color:string,roughness=.85)=>own(new T.MeshStandardMaterial({color,roughness}));
 const m={wall:mat('#e6e0d3'),trim:mat('#c7c0b1'),dark:mat('#303f3d'),wood:mat('#ad8760'),floor:mat('#d4cbbb'),white:mat('#f7f2e6'),cloth:mat('#b1bba4'),grass:mat('#80916a'),leaf:mat('#506d43'),road:mat('#80867e'),paving:mat('#c4c4b5'),glass:own(new T.MeshStandardMaterial({color:'#87aaad',roughness:.25,transparent:true,opacity:.45})),soil:mat('#a29d80'),accent:mat('#b7854f')};
 const cube=own(new T.BoxGeometry(1,1,1)),sphere=own(new T.IcosahedronGeometry(1,1));
 function box(g:T.Group,n:string,x:number,y:number,z:number,w:number,h:number,d:number,material:T.Material){const o=new T.Mesh(cube,material);o.name=n;o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
 const house=new T.Group();house.name='Casa-base 6 x 7.5 m';const architecture=new T.Group(),roof=new T.Group(),furniture=new T.Group();house.add(architecture,roof,furniture);furniture.name='Interiores da casa';roof.name='Cobertura removível';
 const obstacles:Obstacle[]=[];
 function wall(n:string,x:number,z:number,w:number,d:number){box(architecture,n,x,1.45,z,w,2.8,d,m.wall);obstacles.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});}
 function frontWall(z:number,openings:{a:number;b:number;bottom:number;top:number;door?:boolean}[]){let last=-3;for(const o of openings){if(o.a>last)wall('Parede fachada', (last+o.a)/2,z,o.a-last,.15);if(o.bottom>0)box(architecture,'Peitoril',(o.a+o.b)/2,o.bottom/2+.05,z,o.b-o.a,o.bottom,.15,m.wall);box(architecture,'Verga',(o.a+o.b)/2,(o.top+2.8)/2+.05,z,o.b-o.a,2.8-o.top,.15,m.wall);if(!o.door){box(architecture,'Vidro',(o.a+o.b)/2,(o.top+o.bottom)/2+.05,z,o.b-o.a,o.top-o.bottom,.035,m.glass);for(const x of [o.a,o.b,(o.a+o.b)/2])box(architecture,'Esquadria',x,(o.top+o.bottom)/2+.05,z,.045,o.top-o.bottom,.09,m.dark);for(const y of [o.bottom,o.top])box(architecture,'Esquadria',(o.a+o.b)/2,y+.05,z,o.b-o.a,.045,.09,m.dark);obstacles.push({minX:o.a,maxX:o.b,minZ:z-.1,maxZ:z+.1});}else{box(architecture,'Porta aberta',o.b-.03,1.1,z+.44,.06,2.1,.88,m.wood);}last=o.b;}if(last<3)wall('Parede fachada',(last+3)/2,z,3-last,.15);}
 box(house,'Área construída 45 m²',0,-.035,3.75,VACARIA.house.width,.17,VACARIA.house.depth,m.floor);
 wall('Lateral geminada esquerda',-2.925,3.75,.15,7.5);wall('Lateral geminada direita',2.925,3.75,.15,7.5);
 frontWall(.075,[{a:-2.5,b:-.25,bottom:.9,top:2.15},{a:1.75,b:2.65,bottom:0,top:2.15,door:true}]);
 frontWall(7.425,[{a:-2.4,b:-1,bottom:.9,top:2.15},{a:.35,b:1.4,bottom:1.2,top:2.15},{a:1.75,b:2.65,bottom:0,top:2.15,door:true}]);
 wall('Divisória quarto 2 / banho',-1.475,2.925,2.75,.15);wall('Divisória banho / casal',-1.475,4.425,2.75,.15);
 let last=.15;for(const [a,b] of [[2,2.8],[3.25,4.05],[4.65,5.45]]){wall('Divisória circulação',-.025,(last+a)/2,.15,a-last);box(architecture,'Verga porta interna',-.025,2.525,(a+b)/2,.15,.65,b-a,m.wall);last=b;}wall('Divisória circulação',-.025,(last+7.35)/2,.15,7.35-last);
 box(roof,'Laje cobertura',0,2.93,3.75,6,.16,7.5,m.trim);for(const x of [-2.925,2.925])box(roof,'Platibanda lateral',x,3.14,3.75,.15,.38,7.5,m.wall);for(const z of [.075,7.425])box(roof,'Platibanda frontal',0,3.14,z,6,.38,.15,m.wall);
 box(roof,'Faixa contínua da fachada',0,2.77,-.10,6,.45,.35,m.wall);
 box(architecture,'Rebaixo visual da entrada',1.60,1.12,.01,.14,2.18,.19,m.trim);
 for(const x of [-2.53,-.22])box(architecture,'Moldura janela',x,1.58,-.055,.07,1.32,.16,m.dark);
 const lamp=own(new T.MeshStandardMaterial({color:'#f4d5a0',emissive:'#e2ba76',emissiveIntensity:.35}));box(architecture,'Arandela entrada',2.80,1.95,-.06,.13,.25,.12,lamp);
 function furnishing(n:string,x:number,y:number,z:number,w:number,h:number,d:number,material:T.Material,collide=true){box(furniture,n,x,y,z,w,h,d,material);if(collide)obstacles.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});}
 function bed(x:number,z:number,w:number){furnishing('Base cama',x,.24,z,w,.38,1.88,m.wood);box(furniture,'Colchão',x,.49,z,w,.18,1.88,m.white);box(furniture,'Manta',x,.595,z-.38,w,.035,.92,m.cloth);box(furniture,'Travesseiro',x,.64,z+.65,w*.7,.13,.4,m.white);box(furniture,'Cabeceira',x,.75,z+.96,w,.95,.07,m.wood);}
 bed(-1.93,6.25,1.38);bed(-2.28,1.25,.88);
 furnishing('Armário casal',-.46,1.1,6.45,.6,2.1,1.7,m.wood);furnishing('Armário quarto 2',-.46,1.05,1.0,.6,2,1.25,m.white);
 furnishing('Sofá',2.40,.37,1.78,.75,.64,1.8,m.cloth);box(furniture,'Encosto sofá',2.73,.70,1.78,.16,.65,1.8,m.cloth);
 furnishing('Rack TV',.35,.30,1.1,.5,.5,1.25,m.wood);box(furniture,'TV',.14,1.17,1.1,.045,.65,1.05,m.dark);
 furnishing('Mesa jantar',1.45,.78,3.65,.85,.09,1.1,m.wood);for(const x of [1.04,1.86])for(const z of [3.3,4])box(furniture,'Pé mesa',x,.39,z,.055,.76,.055,m.dark);for(const z of [2.95,4.36]){box(furniture,'Cadeira',1.45,.46,z,.46,.08,.46,m.cloth);box(furniture,'Encosto cadeira',1.45,.72,z+(z<3?-.2:.2),.46,.48,.065,m.wood);}
 furnishing('Bancada cozinha',.36,.48,6.3,.6,.86,1.85,m.white);box(furniture,'Tampo cozinha',.36,.93,6.3,.64,.055,1.9,m.trim);box(furniture,'Cuba',.36,.965,6.9,.40,.025,.42,m.dark);box(furniture,'Cooktop',.36,.965,5.65,.44,.025,.5,m.dark);furnishing('Geladeira',2.48,.98,5.15,.7,1.85,.7,m.white);
 furnishing('Box banho',-2.3,.055,3.7,1.05,.05,1.15,m.white);box(furniture,'Vidro box',-1.75,1.1,3.65,.025,2.1,1.2,m.glass);furnishing('Lavatório',-.48,.79,3.15,.56,.18,.36,m.white);furnishing('Vaso sanitário',-.65,.30,4.01,.4,.55,.58,m.white);
 const caps=new T.Group();caps.name='Superfícies do corte';caps.visible=false;house.add(caps);architecture.children.forEach(o=>{const mesh=o as T.Mesh;if(mesh.material===m.wall&&o.position.y-o.scale.y/2<1.15&&o.position.y+o.scale.y/2>1.15)box(caps,'Corte de parede',o.position.x,1.145,o.position.z,o.scale.x,.01,o.scale.z,m.dark);});
 const garden=new T.Group();house.add(garden);garden.name='Frente e quintal';box(garden,'Frente de estudo',0,-.12,-2.5,6,.12,5,m.grass);box(garden,'Quintal de estudo',0,-.12,8.5,6,.12,2,m.grass);box(garden,'Serviço externo',2.05,-.04,8.05,1.4,.08,1,m.paving);for(const x of [-2,-.5])box(garden,'Faixa vaga',x,-.025,-2.5,.55,.10,4.8,m.paving);box(garden,'Acesso de pedestres',2.1,-.025,-2.5,.95,.10,5,m.paving);
 const car=new T.Group();car.name='Vaga 2.50 x 5 m — veículo de escala';garden.add(car);box(car,'Carroceria',-1.25,.48,-2.5,1.72,.58,3.9,m.trim);box(car,'Cabine',-1.25,.99,-2.45,1.5,.56,1.95,m.dark);box(car,'Teto carro',-1.25,1.3,-2.45,1.49,.07,1.6,m.trim);const wheelGeo=own(new T.CylinderGeometry(.29,.29,.18,12));for(const x of [-2.10,-.4])for(const z of [-3.8,-1.2]){const wheel=new T.Mesh(wheelGeo,m.dark);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.27,z);car.add(wheel);}for(const x of [-2.9,2.9])box(garden,'Faixa de vegetação baixa',x,.13,-2.8,.16,.25,3.8,m.leaf);
 // Facing the front from the street, negative world X is on the viewer's right.
 house.scale.x=-1;for(const o of obstacles){const a=o.minX;o.minX=-o.maxX;o.maxX=-a;}
 const single=new T.Group();single.name='Casa isolada para conferência';single.add(house);
 const district=new T.Group();district.name='Implantação V02 — disposição da referência';
 const poly=VACARIA_BOUNDARY;
 function surface(name:string,points:number[][],material:T.Material,y=-.15){const shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const solid=material===m.paving&&y>.01;const geo=own(solid?new T.ExtrudeGeometry(shape,{depth:.24,bevelEnabled:false}):new T.ShapeGeometry(shape));geo.rotateX(-Math.PI/2);const mesh=new T.Mesh(geo,material);mesh.name=name;mesh.position.y=solid?y-.24:y;mesh.receiveShadow=material!==m.road&&material!==m.paving;district.add(mesh);return mesh;}
 surface('Limite de terreno interpretado da referência',poly,m.grass);
 function road(name:string,points:number[][],width:number,material=m.road,y=-.04){const half=width/2;for(let i=1;i<points.length;i++){const [ax,az]=points[i-1],[bx,bz]=points[i],length=Math.hypot(bx-ax,bz-az),dx=(bz-az)/length*half,dz=-(bx-ax)/length*half;surface(name,[[ax+dx,az+dz],[bx+dx,bz+dz],[bx-dx,bz-dz],[ax-dx,az-dz]],material,y);}const disc=own(new T.CircleGeometry(half,24));disc.rotateX(-Math.PI/2);for(const [x,z] of points){const o=new T.Mesh(disc,material);o.position.set(x,y+.003,z);o.receiveShadow=false;district.add(o);}}
 // Coordinated study section: 5 m parking + 1.2 m sidewalk + 4.8 m street.
 const arrival=[[1.2,-43.2],[2.5,-23],[3,-12],[3.8,-4],[4.2,-1],[5,.7],[6.5,2.1],[8,2.6]];
 const roadPaths=[{name:'Entrada esquerda e primeira rua',points:[...arrival,[61.8,2.6]],squareEnd:true},{name:'Rua central',points:[[24.2,2.6],[24.2,44.5]],squareEnd:false},{name:'Segunda rua transversal',points:[[3.8,24.3],[60.4,24.3]],squareEnd:true}];
 for(const path of roadPaths){road(path.name,path.points,4.8);district.userData.roads??=[];district.userData.roads.push({...path,width:4.8});}
 // Remove the rounded start cap at the property frontage: the apron meets the public sidewalk.
 district.children.filter(o=>o instanceof T.Mesh&&o.geometry.type==='CircleGeometry'&&Math.abs(o.position.z+43.2)<.001).forEach(o=>district.remove(o));
 // Square terminal ends provide access to the added lots without caps crossing the boundary.
 district.children.filter(o=>o instanceof T.Mesh&&o.geometry.type==='CircleGeometry'&&((o.position.x===61.8&&o.position.z===2.6)||(o.position.x===60.4&&o.position.z===24.3))).forEach(o=>district.remove(o));
 surface('Acesso pela calçada pública',[[-2.4,-44],[4.8,-44],[4.8,-43.2],[-2.4,-43.2]],m.paving,-.04);
 function walkRect(x1:number,x2:number,z1:number,z2:number){surface('Calçada contínua',[[x1,z1],[x2,z1],[x2,z2],[x1,z2]],m.paving,.06);}
 walkRect(8,61.8,-1,.2);
 for(const [z1,z2] of [[5,6.2],[20.7,21.9],[26.7,27.9]]){walkRect(2.5,21.8,z1,z2);walkRect(26.6,z1===5?61.8:60.4,z1,z2);}
 for(const [x1,x2] of [[20.6,21.8],[26.6,27.8]])for(const [z1,z2]of [[6.2,20.7],[27.9,44.5]])walkRect(x1,x2,z1,z2);
 function offset(points:number[][],distance:number){return points.map(([x,z],i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];let dx=b[0]-a[0],dz=b[1]-a[1];const len=Math.hypot(dx,dz);dx/=len;dz/=len;return [x+dz*distance,z-dx*distance];});}
 for(const side of [-1,1])surface('Calçada do corredor',[...offset(arrival,side*2.4),...offset(arrival,side*3.6).reverse()],m.paving,.06);
 // Round-end walkways remain outside the vehicular carriageway.
 function roundedWalk(name:string,x:number,z:number,start:number){const points:number[][]=[];for(let i=0;i<=32;i++){const a=start+i/32*Math.PI;points.push([x+Math.cos(a)*3.6,z-Math.sin(a)*3.6]);}for(let i=32;i>=0;i--){const a=start+i/32*Math.PI;points.push([x+Math.cos(a)*2.4,z-Math.sin(a)*2.4]);}surface(name,points,m.paving,.06);}
 roundedWalk('Calçada no retorno do lazer',24.2,44.5,Math.PI);
 // Continuous boundary, with the only opening at the authorized street access.
 const perimeter=new T.Group();perimeter.name='Muro perimetral completo';district.add(perimeter);perimeter.userData.opening=[[-2.4,-43.2],[4.8,-43.2]];
 function boundaryWall(a:number[],b:number[]){const len=Math.hypot(b[0]-a[0],b[1]-a[1]);const w=box(perimeter,'Muro de divisa',(a[0]+b[0])/2,.93,(a[1]+b[1])/2,.20,2.4,len,m.wall);w.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);w.userData.segment=[a,b];const cap=box(perimeter,'Capa do muro',(a[0]+b[0])/2,2.145,(a[1]+b[1])/2,.24,.04,len,m.trim);cap.rotation.y=w.rotation.y;}
 for(let i=1;i<poly.length;i++)boundaryWall(poly[i],poly[(i+1)%poly.length]);boundaryWall(poly[0],[-2.4,-43.2]);boundaryWall([4.8,-43.2],poly[1]);
 // Posts and open gate leaves sit beside the passage, entirely inside the boundary.
 for(const x of [-2.55,4.95])box(perimeter,'Pilar do acesso',x,1.275,-42.98,.26,2.95,.36,m.wall);
 for(const x of [-2.85,5.45]){for(let z=-42.5;z<-40.1;z+=.15)box(perimeter,'Portão aberto recolhido',x,1.02,z,.06,2.1,.045,m.dark);}
 box(district,'Rua pública de referência',27,-.1,-48,100,.1,8,m.road);
 walkRect(-23,-2.4,-44,-43.2);walkRect(4.8,77,-44,-43.2);
 const homes:T.Group[]=[];for(const unit of VACARIA_UNITS){const g=house.clone(true);g.name=unit.id;g.userData.unitId=unit.id;g.userData.block=unit.block;const inside=g.getObjectByName('Interiores da casa');inside?.clear();g.traverse(o=>{if(/Divisória|Verga porta interna/.test(o.name))o.visible=false;});g.position.set(unit.x,0,unit.z);g.rotation.y=unit.rotation;district.add(g);homes.push(g);}
 function tree(x:number,z:number,size=1){box(district,'Tronco',x,.9*size,z,.18*size,1.8*size,.18*size,m.wood);const crown=new T.Mesh(sphere,m.leaf);crown.position.set(x,2.6*size,z);crown.scale.set(1.35*size,1.6*size,1.35*size);crown.castShadow=true;district.add(crown);}
 for(const [x,z] of [[7,48],[7,60],[21,67],[34,56],[35,47],[10,71]])tree(x,z,.8);
 // Neutral neighboring footprints locate the access notch without claiming a cadastral survey.
 const context=mat('#c6c9be');for(const [x,z,w,d] of [[15,-29,7,17],[25,-28,6,14],[36,-31,8,10],[51,-28,9,12],[-11,-20,8,15],[-12,7,10,21]]){box(district,'Volume vizinho de contexto',x,1.6,z,w,3.2,d,context);box(district,'Cobertura vizinha',x,3.23,z,w+.3,.15,d+.3,m.trim);}
 const edgeGeo=own(new T.BufferGeometry().setFromPoints([...poly,poly[0]].map(([x,z])=>new T.Vector3(x,.02,z))));district.add(new T.Line(edgeGeo,own(new T.LineBasicMaterial({color:'#e2c777'}))));
 return {single,district,house,roof,caps,homes,obstacles,resources,dispose:()=>resources.forEach(r=>r.dispose())};
}
