import * as T from 'three';
import {finishVacariaYards} from './vacariaYards';
import {buildVacariaCommon} from './vacariaCommon';
import type {buildVacaria} from './vacariaModel';

/** Exterior finishes follow the reference; the coordinated V06 site provides separate parking, sidewalks and streets. */
export function finishVacariaExterior(model:ReturnType<typeof buildVacaria>){
 const own=<A extends {dispose:()=>void}>(r:A)=>{model.resources.add(r);return r};
 let seed=5105;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
 function texture(kind:'grass'|'paver'|'concrete'|'plaster'){
  const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d')!;
  ctx.fillStyle=kind==='grass'?'#647446':kind==='paver'?'#676a64':kind==='concrete'?'#cbc6b9':'#d9d5cc';ctx.fillRect(0,0,512,512);
  if(kind==='paver')for(let row=-1;row<24;row++)for(let col=-1;col<13;col++){const shade=112+Math.floor(random()*28);ctx.fillStyle=`rgb(${shade+4},${shade+3},${shade})`;ctx.fillRect(col*43+(row%2)*21.5+1,row*22+1,41,20);ctx.fillStyle='#b7b6ab55';ctx.fillRect(col*43+(row%2)*21.5+2,row*22+2,39,1);}
  for(let i=0;i<(kind==='grass'?48000:35000);i++){const x=random()*512,y=random()*512,n=random();ctx.fillStyle=kind==='grass'?(n>.5?'#a7a56655':'#273c2455'):`rgba(${n>.5?'255,255,255':'40,35,28'},${kind==='plaster'?.09:.10})`;ctx.fillRect(x,y,kind==='grass'?1:2,kind==='grass'?2+random()*5:1);}
  const t=own(new T.CanvasTexture(c));t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t;
 }
 const grassTex=texture('grass'),paverTex=texture('paver'),concreteTex=texture('concrete'),plasterTex=texture('plaster');
 const material=(name:string,p:T.MeshStandardMaterialParameters)=>{const m=own(new T.MeshStandardMaterial(p));m.name=name;return m};
 const paint=material('Reboco mineral marfim',{color:'#f1ede2',map:plasterTex,bumpMap:plasterTex,bumpScale:.012,roughness:.89});
 const concrete=material('Concreto natural acetinado',{map:concreteTex,bumpMap:concreteTex,bumpScale:.012,roughness:.86});
 const pavers=material('Pavimento intertravado cinza',{map:paverTex,bumpMap:paverTex,bumpScale:.018,roughness:.88});
 const grass=material('Gramado com variação natural',{map:grassTex,bumpMap:grassTex,bumpScale:.015,roughness:1});
 const metal=material('Telha metálica alumínio fosco',{color:'#aeb9bc',metalness:.65,roughness:.38});
 const dark=material('Esquadrias grafite acetinadas',{color:'#262a28',metalness:.5,roughness:.33});
 const trim=material('Rebaixo areia',{color:'#bfb5a3',map:plasterTex,roughness:.9});
 const soil=material('Canteiro de casca e terra',{color:'#534934',map:plasterTex,roughness:1});
 const leaf=material('Folhagem verde oliva',{color:'#ffffff',side:T.DoubleSide,roughness:.86});
 const trunk=material('Madeira natural dos troncos',{color:'#62523d',roughness:1});
 const warm=material('Difusor âmbar',{color:'#fff0d8',emissive:'#ffb75b',emissiveIntensity:1.4,roughness:.5});
 const curtain=material('Cortina de linho das fachadas',{color:'#d4c7af',roughness:1});
 const glass=own(new T.MeshPhysicalMaterial({color:'#adbdba',metalness:.18,roughness:.15,transparent:true,opacity:.30,envMapIntensity:1.2}));
 const nightMaterials=[warm];
 const cube=own(new T.BoxGeometry(1,1,1));
 function box(g:T.Object3D,n:string,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material){const o=new T.Mesh(cube,m);o.name=n;o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=o.receiveShadow=true;g.add(o);return o;}
 // World-sized UVs avoid stretching the pavers along long streets or narrow paths.
 function metricUV(o:T.Mesh,period:number){const g=own(o.geometry.clone()),p=g.getAttribute('position'),norm=g.getAttribute('normal'),uv=[];for(let i=0;i<p.count;i++){const x=p.getX(i)*o.scale.x,y=p.getY(i)*o.scale.y,z=p.getZ(i)*o.scale.z;const nx=Math.abs(norm.getX(i)),ny=Math.abs(norm.getY(i));uv.push((ny>.5?x:nx>.5?z:x)/period,(ny>.5?z:y)/period);}g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));o.geometry=g;}
 const apply=(root:T.Object3D)=>root.traverse(o=>{if(!(o instanceof T.Mesh))return;const n=o.name;
  if(/Parede fachada|Peitoril|Verga$|Lateral geminada|Platibanda|Faixa contínua|Muro de divisa|Pilar do acesso/.test(n)){o.material=paint;metricUV(o,1);}
  else if(/Frente de estudo|Quintal de estudo|Limite de terreno|Solo de contexto/.test(n)){o.material=grass;metricUV(o,2);}
  else if(/Faixa vaga|Acesso de pedestres|Serviço externo|Passeio|Calçada|Caminho lateral|Capa do muro|Acesso pela calçada/.test(n)){o.material=concrete;metricUV(o,1.2);}
  else if(/Entrada esquerda e primeira rua|Rua central|Segunda rua transversal|Rua pública|Rua em frente/.test(n)){o.material=pavers;metricUV(o,2.4);}
  else if(/Esquadria|Moldura janela|Porta aberta/.test(n))o.material=dark;
  else if(n==='Rebaixo visual da entrada')o.material=trim;
  else if(n==='Arandela entrada')o.material=dark;
  else if(n==='Vidro')o.material=glass;
  if(n==='Faixa de vegetação baixa')o.visible=false;
  if(o.material===pavers||o.material===concrete)o.receiveShadow=true;
 });apply(model.single);apply(model.district);
 // The circular joints in the original road share the same material as each strip.
 model.district.children.forEach(o=>{if(o instanceof T.Mesh&&o.geometry.type==='CircleGeometry'&&!o.name&&Math.abs(o.position.y+.025)>.0005){const road=o.position.y<-.035;o.material=road&&o.position.y>-.06?pavers:concrete;metricUV(o,road?2.4:1.2);o.receiveShadow=true;}});
 const details=new T.Group();details.name='Exterior V05 — fachadas e jardins';
 // Flashings, recessed frames, open parking and discreet warm wall lights.
 for(const [a,b] of [[-2.5,-.25]]){box(details,'Peitoril de pedra', (a+b)/2,.927,-.04,b-a+.10,.045,.26,concrete);for(const y of [.94,2.19])box(details,'Perfil horizontal de alumínio',(a+b)/2,y,-.035,b-a+.08,.04,.14,dark);}
 box(details,'Puxador vertical',2.64,1.1,.28,.032,.48,.035,metal);
 for(const y of [1.825,2.075])box(details,'Lente da arandela',2.8,y,-.07,.12,.012,.1,warm);
 box(details,'Revestimento do acesso',1.22,1.26,-.011,.88,2.42,.025,trim);box(details,'Jambagem do acesso',2.81,1.26,-.011,.32,2.42,.025,trim);
 box(details,'Soleira de entrada',2.18,.055,-.19,1.06,.035,.44,concrete);
 // Plants are many small curved leaves, instanced to keep the 22-house scene light.
 const leafGeo=own(new T.BufferGeometry());const lp=[0,0,.075],li:number[]=[];for(let i=0;i<10;i++){const a=i/10*Math.PI*2;lp.push(Math.sin(a)*.26,Math.cos(a)*.5,0);li.push(0,i+1,(i+1)%10+1);}leafGeo.setAttribute('position',new T.Float32BufferAttribute(lp,3));leafGeo.setIndex(li);leafGeo.computeVertexNormals();
 const dummy=new T.Object3D(),tint=new T.Color();
 function foliage(parent:T.Object3D,centers:number[][],count:number,tree=false){const inst=own(new T.InstancedMesh(leafGeo,leaf,centers.length*count));inst.name=tree?'Copas com folhas individuais':'Arbustos de fachada';let index=0;for(const [x,y,z,r]of centers)for(let i=0;i<count;i++){const angle=random()*Math.PI*2,height=(random()-.5)*2*r*(tree?1:.45),radius=Math.sqrt(random())*r*Math.sqrt(Math.max(.03,1-Math.pow(height/(r*(tree?1:.45)),2)));dummy.position.set(x+Math.cos(angle)*radius,y+height,z+Math.sin(angle)*radius);dummy.rotation.set(random()*Math.PI,random()*6.28,random()*6.28);const s=(tree?(r>1.8?.32:.15):.11)+random()*(tree?.16:.09);dummy.scale.set(s,s*(tree?1.35:1.9),s);dummy.updateMatrix();inst.setMatrixAt(index,dummy.matrix);tint.setHSL(.21+random()*.045,.26+random()*.18,.20+random()*.13);inst.setColorAt(index++,tint);}inst.castShadow=inst.receiveShadow=true;parent.add(inst);}
 for(const [x,z,r] of [[-2.55,-.6,.35],[-.22,-.6,.42],[.62,-.6,.42],[2.78,-.65,.22],[2.78,-2.5,.22]])box(details,'Canteiro junto à fachada',x,-.05,z,r*1.7,.02,r*1.6,soil);
 // Separate roof kit: the existing removable roof continues to control cutaway views.
 const roofKit=new T.Group();roofKit.name='Cobertura metálica V05';
 const vertices:number[]=[],indices:number[]=[];const pitch=.19,profile=[0,.28,.37,.63,.72,1];
 let v=0;for(let k=0;k<30;k++){for(const q of profile){const x=-2.85+(k+q)*pitch,rise=(q>=.37&&q<=.63)?.027:0;vertices.push(x,3.20+rise,.28,x,3.055+rise,7.17);if(v>0)indices.push(v-2,v-1,v,v,v-1,v+1);v+=2;}}
 const roofGeo=own(new T.BufferGeometry());roofGeo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));roofGeo.setIndex(indices);roofGeo.computeVertexNormals();const sheet=new T.Mesh(roofGeo,metal);sheet.name='Telhas trapezoidais com caimento';sheet.castShadow=sheet.receiveShadow=true;roofKit.add(sheet);
 for(const x of [-2.925,2.925])box(roofKit,'Rufo superior da platibanda',x,3.343,3.75,.148,.028,7.145,concrete);
 for(const z of [.075,7.425])box(roofKit,'Pingadeira de coroamento',0,3.343,z,6,.028,.205,concrete);
 box(roofKit,'Calha posterior',0,3.06,7.24,5.7,.075,.15,metal);
 function lawn(parent:T.Object3D,points:number[][],name:string){const shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const g=own(new T.ShapeGeometry(shape));g.rotateX(-Math.PI/2);const o=new T.Mesh(g,grass);o.name=name;o.position.y=-.059;o.receiveShadow=true;parent.add(o);metricUV(o,2);return o;}
 const homes=[model.house,...model.homes];model.single.getObjectByName('Vizinhas — contexto externo')?.children.forEach(o=>{if(o.name==='Casa vizinha não navegável')homes.push(o as T.Group)});
 for(const h of homes){const facadeDetails=details.clone(true);h.add(facadeDetails);h.getObjectByName('Cobertura removível')?.add(roofKit.clone(true));if(h!==model.house){h.traverse(o=>{if(o.name==='Porta aberta')o.visible=false;});const facade=new T.Group();facade.name='Acabamentos externos sem visita interna';h.add(facade);box(facade,'Porta de serviço fechada',2.20,1.1,7.40,.88,2.1,.045,dark);box(facade,'Porta de entrada fechada',2.20,1.1,.13,.88,2.1,.045,dark);box(facade,'Puxador da entrada',1.89,1.10,.085,.025,.48,.035,metal);for(const [x,w]of [[-1.375,2.25]]){for(let i=0;i<10;i++)box(facade,'Prega da cortina externa',x-w/2+(i+.5)*w/10,1.52,.24,w/10*.94,1.48,.06,curtain);}}
  if(model.homes.includes(h))continue;
  const back=new T.Group();back.name='Quintal privativo';h.add(back);
  const first=h===model.house||h.userData.block==='Superior';
  if(first){
   const origin=h===model.house?12:h.position.x;
   const depth=(x:number)=>10.2+(origin+x-7.56)*1.32/53.76;
   const old=h.getObjectByName('Quintal de estudo');if(old)old.visible=false;
   lawn(back,[[-3,7.5],[3,7.5],[3,depth(3)],[ -3,depth(-3)]],'Quintal até a divisa do condomínio');
   for(const x of [-2.925,2.925]){if(h.name==='V08'&&x>0)continue;const d=depth(x)-7.5;box(back,'Divisa lateral até o muro do condomínio',x,.84,7.5+d/2,.12,1.78,d,paint);}
   // The isolated visit shows the same perimeter segment; district units use the existing shared wall.
   if(h===model.house){const a=depth(-3),b=depth(3),wall=box(back,'Muro do condomínio — fundo da V01',0,.93,(a+b)/2,6,2.4,.20,paint);wall.rotation.y=-Math.atan2(b-a,6);}
  }else{for(const x of [-2.925,2.925])box(back,'Divisa de quintal',x,.84,8.5,.12,1.78,2,paint);box(back,'Fechamento posterior',0,.84,9.45,6,1.78,.12,paint);box(back,'Capa do muro posterior',0,1.75,9.45,6,.035,.16,concrete);}
 }
 finishVacariaYards(model,{paint,concrete,grass});
 const common=buildVacariaCommon(model,{paint,concrete,grass,dark,warm});
 nightMaterials.push(...common.nightMaterials);
 // Replace the placeholder crowns and trunks at the same landscape locations.
 const treeSites:number[][]=[];model.district.children.forEach(o=>{if(o instanceof T.Mesh&&o.geometry.type==='IcosahedronGeometry'){treeSites.push([o.position.x,o.position.z,o.scale.x/1.35]);o.visible=false;}if(o.name==='Tronco')o.visible=false;});
 const landscape=new T.Group();landscape.name='Paisagismo V05';model.district.add(landscape);
 const cylinder=own(new T.CylinderGeometry(1,1,1,7));
 function branch(parent:T.Object3D,a:T.Vector3,b:T.Vector3,r:number){const delta=b.clone().sub(a),o=new T.Mesh(cylinder,trunk);o.position.copy(a).add(b).multiplyScalar(.5);o.scale.set(r,delta.length(),r*.85);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());o.castShadow=true;parent.add(o);}
 function trees(parent:T.Object3D,sites:number[][]){const crowns:number[][]=[];for(const [x,z,s] of sites){branch(parent,new T.Vector3(x,-.15,z),new T.Vector3(x+.12*s,2.7*s,z),.065*s);for(let i=0;i<5;i++){const a=i*2.4;branch(parent,new T.Vector3(x,1.6*s,z),new T.Vector3(x+Math.cos(a)*.85*s,2.85*s,z+Math.sin(a)*.85*s),.025*s);}crowns.push([x,3.05*s,z,1.22*s]);}foliage(parent,crowns,sites.length>25?650:1800,true);}
 trees(landscape,treeSites.map(([x,z,s])=>[x,z,s*1.3]));
 const streetGarden=new T.Group();streetGarden.name='Jardins da rua demonstrativa';model.single.getObjectByName('Vizinhas — contexto externo')?.add(streetGarden);// No trees inside the private house gardens.
 // Narrow edge stones follow the existing streets; openings are kept at junctions.
 const edges=new T.Group();edges.name='Guias de concreto e iluminação';model.district.add(edges);
 const edge=(a:number[],b:number[])=>{const dx=b[0]-a[0],dz=b[1]-a[1];const o=box(edges,'Meio-fio',(a[0]+b[0])/2,.005,(a[1]+b[1])/2,.12,.07,Math.hypot(dx,dz),concrete);o.rotation.y=Math.atan2(dx,dz);};
 for(const [z,gaps] of [[.2,false],[5,true],[21.9,true],[26.7,true]] as [number,boolean][]){if(gaps){edge([z<10?2.5:3.8,z],[21.8,z]);edge([26.6,z],[z<10?61.8:60.4,z]);}else edge([8,z],[61.8,z]);}
 for(const x of [21.8,26.6]){edge([x,5],[x,21.9]);edge([x,26.7],[x,44.5]);}
 // Corridor curbs follow the actual road path, never the property boundary.
 const corridor=model.district.userData.roads[0].points.slice(0,-1) as number[][];
 for(const sign of [-1,1])for(let i=1;i<corridor.length;i++){const a=corridor[i-1],b=corridor[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);const dx=(b[1]-a[1])/len*2.4*sign,dz=-(b[0]-a[0])/len*2.4*sign;edge([a[0]+dx,a[1]+dz],[b[0]+dx,b[1]+dz]);}
 const fixtures=new T.Group();fixtures.name='Balizadores V05';model.district.add(fixtures);
 for(const [x,z] of [[-.9,-33],[-.2,-20],[.9,-8],[20.2,6.5],[28.2,6.5],[20.2,28.2],[28.2,28.2]]){box(fixtures,'Balizador grafite',x,.43,z,.13,.86,.13,dark);box(fixtures,'Luz de percurso',x,.75,z,.142,.13,.142,warm);}
 for(const x of [-9,9])box(streetGarden,'Meio-fio da casa',x,-.005,-6.16,6,.14,.13,concrete);box(streetGarden,'Meio-fio da casa',0,-.005,-6.16,12,.14,.13,concrete);
 // A soft green base anchors the site; surrounding volumes remain explicitly contextual.
 const ground=box(model.district,'Entorno paisagístico',28,-.31,12,230,.12,230,grass);metricUV(ground,2);
 const distant:number[][]=[];for(let i=0;i<44;i++){const angle=i/44*Math.PI*2;distant.push([28+Math.cos(angle)*(84+random()*15),15+Math.sin(angle)*(90+random()*13),1.8+random()*.7]);}trees(landscape,distant);
 model.single.traverse(o=>{if(o instanceof T.InstancedMesh)own(o)});model.district.traverse(o=>{if(o instanceof T.InstancedMesh)own(o)});
 return {nightMaterials};
}
