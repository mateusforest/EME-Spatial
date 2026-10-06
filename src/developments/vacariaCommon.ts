import * as T from 'three';
import type {buildVacaria} from './vacariaModel';

/** Human-scale common garden: connected paths, play, shaded seating and picnic lawn. */
export function buildVacariaCommon(model:ReturnType<typeof buildVacaria>,m:{paint:T.Material;concrete:T.Material;grass:T.Material;dark:T.Material;warm:T.MeshStandardMaterial}){
 const own=<A extends {dispose:()=>void}>(r:A)=>{model.resources.add(r);return r;};
 const root=new T.Group();root.name='Praça e lazer V08';model.district.add(root);
 const mat=(name:string,color:string,roughness=.8)=>{const a=own(new T.MeshStandardMaterial({color,roughness}));a.name=name;return a;};
 const wood=mat('Madeira tratada do pergolado','#94714d'),steel=mat('Estrutura metálica do lazer','#3b4842',.46),rubber=mat('Piso drenante terracota','#b98863'),sage=mat('Piso lúdico verde sálvia','#789780'),sand=mat('Piso lúdico areia','#d2ba8b'),slide=mat('Escorregador azul petróleo','#477a86',.37);
 const cube=own(new T.BoxGeometry(1,1,1));
 const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,material:T.Material,parent:T.Object3D=root)=>{const a=new T.Mesh(cube,material);a.name=name;a.position.set(x,y,z);a.scale.set(w,h,d);a.castShadow=a.receiveShadow=true;parent.add(a);return a;};
 function tube(name:string,a:number[],b:number[],radius:number,material:T.Material){const av=new T.Vector3(...a as [number,number,number]),bv=new T.Vector3(...b as [number,number,number]),delta=bv.clone().sub(av);const mesh=new T.Mesh(own(new T.CylinderGeometry(radius,radius,delta.length(),10)),material);mesh.name=name;mesh.position.copy(av).add(bv).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());mesh.castShadow=true;root.add(mesh);return mesh;}
 function disc(name:string,x:number,z:number,r:number,material:T.Material,y=.015){const geo=own(new T.CylinderGeometry(r,r,.22,64));const mesh=new T.Mesh(geo,material);mesh.name=name;mesh.position.set(x,y-.11,z);mesh.receiveShadow=true;root.add(mesh);return mesh;}
 function path(points:number[][],width=1.6){const curve=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,-.02,z)));const samples=curve.getPoints(80),vertices:number[]=[],indices:number[]=[];samples.forEach((v,i)=>{const before=samples[Math.max(0,i-1)],after=samples[Math.min(samples.length-1,i+1)],dir=after.clone().sub(before).normalize(),nx=dir.z*width/2,nz=-dir.x*width/2;vertices.push(v.x+nx,v.y,v.z+nz,v.x-nx,v.y,v.z-nz);if(i)indices.push(i*2-2,i*2-1,i*2,i*2-1,i*2+1,i*2);});const topCount=vertices.length/3;for(let i=2;i<topCount;i+=2)for(const side of [0,1]){const a=(i-2+side)*3,b=(i+side)*3,k=vertices.length/3;vertices.push(vertices[a],-.02,vertices[a+2],vertices[b],-.02,vertices[b+2],vertices[b],-.20,vertices[b+2],vertices[a],-.20,vertices[a+2]);if(side===0)indices.push(k,k+1,k+2,k,k+2,k+3);else indices.push(k,k+2,k+1,k,k+3,k+2);}const geo=own(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();const mesh=new T.Mesh(geo,m.concrete);mesh.name='Caminho contínuo do jardim';mesh.receiveShadow=true;root.add(mesh);}
 // Continuous entrance from the south sidewalk; no isolated floating path segments.
 path([[24.2,47.3],[24.2,49],[24,54],[23,59],[19,63],[12,63],[8.5,59],[8.5,52],[12,47],[18,46.5],[24.2,49]],1.65);
 path([[24.2,49],[27.5,49],[31,49]],1.65);path([[19,63],[17,66],[12,67]],1.5);
 // Playground lies within a generous soft surface, outside the common path.
 disc('Área de brincar com piso amortecedor',16,54.3,5.25,rubber);
 disc('Ilha de cor do escorregador',14.1,53.4,2.35,sand,.021);disc('Ilha de cor dos balanços',18.6,55.6,2.05,sage,.025);
 // Timber tower, guarded platform, stair treads and a smooth slide with side rails.
 for(const x of [12.6,14.2])for(const z of [51.8,53.4])box('Poste playground',x,1.30,z,.12,2.65,.12,wood);
 for(let x=12.55;x<14.3;x+=.145)box('Deck da torre',x,1.0,52.6,.13,.10,1.8,wood);
 for(const z of [51.8,53.4]){tube('Guarda-corpo da torre',[12.6,1.8,z],[14.2,1.8,z],.045,wood);for(let x=12.8;x<14.1;x+=.24)tube('Balaústre playground',[x,1.05,z],[x,1.8,z],.025,steel);}
 for(let i=0;i<5;i++)box('Degrau playground',12.35-i*.28,.9-i*.18,52.6,.32,.10,.75,wood);
 tube('Corrimão escada',[10.95,.75,52.15],[12.7,1.8,52.15],.035,steel);tube('Corrimão escada',[10.95,.75,53.05],[12.7,1.8,53.05],.035,steel);
 const canopy=new T.Mesh(own(new T.ConeGeometry(1.42,.75,4)),wood);canopy.name='Cobertura da torre';canopy.position.set(13.4,2.68,52.6);canopy.rotation.y=Math.PI/4;canopy.castShadow=true;root.add(canopy);
 const slidePath=new T.CatmullRomCurve3([new T.Vector3(14.2,1.04,52.6),new T.Vector3(14.7,.95,52.6),new T.Vector3(15.5,.3,52.6),new T.Vector3(16.35,.12,52.6)]),samples=slidePath.getPoints(28),verts:number[]=[],ix:number[]=[];
 samples.forEach((v,i)=>{verts.push(v.x,v.y,v.z-.34,v.x,v.y,v.z+.34);if(i)ix.push(i*2-2,i*2-1,i*2,i*2-1,i*2+1,i*2);});const slideGeo=own(new T.BufferGeometry());slideGeo.setAttribute('position',new T.Float32BufferAttribute(verts,3));slideGeo.setIndex(ix);slideGeo.computeVertexNormals();(slide as T.MeshStandardMaterial).side=T.DoubleSide;const bed=new T.Mesh(slideGeo,slide);bed.name='Calha curva do escorregador';bed.castShadow=true;root.add(bed);
 for(const side of [-.34,.34]){const curve=new T.CatmullRomCurve3(samples.map(v=>new T.Vector3(v.x,v.y+.10,v.z+side)));const rail=new T.Mesh(own(new T.TubeGeometry(curve,28,.08,8,false)),slide);rail.name='Proteção lateral escorregador';root.add(rail);}
 // Two independent swing seats with actual hangers and A-frames.
 for(const x of [17.15,20.25]){tube('Balanço apoio A',[x,.05,54.3],[x,2.45,55.65],.065,wood);tube('Balanço apoio A',[x,.05,57],[x,2.45,55.65],.065,wood);}
 tube('Travessa dos balanços',[16.95,2.45,55.65],[20.45,2.45,55.65],.085,wood);
 for(const x of [18,19.4]){for(const dx of [-.24,.24])tube('Suspensão balanço',[x+dx,2.4,55.65],[x+dx,.47,55.65],.014,steel);box('Assento balanço',x,.44,55.65,.62,.08,.33,steel);}
 // Pergola with a generous shaded dining/seating platform.
 box('Praça do pergolado',30,-.07,49.5,7,.26,6,m.concrete);
 for(const x of [27,33])for(const z of [47,52])box('Pilar pergolado',x,1.4,z,.18,2.8,.18,wood);
 for(const x of [27,33])box('Viga pergolado',x,2.78,49.5,.18,.24,5.6,wood);
 for(let z=46.8;z<=52.2;z+=.28)box('Brise de sombra',30,2.95,z,6.5,.15,.095,wood);
 function bench(x:number,z:number,angle=0){const g=new T.Group();g.name='Banco com encosto';g.position.set(x,0,z);g.rotation.y=angle;root.add(g);for(const xx of [-.72,.72]){box('Pé do banco',xx,.23,0,.085,.46,.52,steel,g);box('Suporte do encosto',xx,.64,.2,.065,.75,.065,steel,g);}for(let zz=-.23;zz<=.24;zz+=.115)box('Régua assento',0,.47,zz,1.9,.055,.095,wood,g);for(const yy of [.68,.82,.96])box('Régua encosto',0,yy,.22,1.9,.10,.06,wood,g);}
 bench(27.7,49.5,-Math.PI/2);bench(32.4,49.5,Math.PI/2);bench(10.2,49.7,-.65);bench(10.1,59.3,-2.5);bench(23.7,58.2,Math.PI/2);
 function picnic(x:number,z:number){const group=new T.Group();group.name='Mesa de convivência';root.add(group);for(let xx=-.8;xx<=.8;xx+=.14)box('Tábua da mesa',x+xx,.77,z,.12,.07,.86,wood,group);for(const xx of [-.64,.64]){tube('Cavalete mesa',[x+xx,.05,z-.52],[x+xx,.74,z+.30],.055,steel);tube('Cavalete mesa',[x+xx,.05,z+.52],[x+xx,.74,z-.30],.055,steel);}for(const zz of [-.77,.77]){box('Banco da mesa',x,.45,z+zz,1.85,.09,.31,wood,group);for(const xx of [-.6,.6])box('Pé do assento',x+xx,.22,z+zz,.08,.44,.28,steel,group);}}
 picnic(30,49.5);disc('Base da mesa no gramado',13.5,66,2.15,m.concrete,-.005);picnic(13.5,66);
 // Small useful amenities beside the plaza, kept off the walking line.
 for(let x=29;x<=31.5;x+=.65){const curve=new T.CatmullRomCurve3([[x,0,53.5],[x,.75,53.5],[x,.83,54.1],[x,0,54.1]].map(v=>new T.Vector3(...v as [number,number,number])));const rack=new T.Mesh(own(new T.TubeGeometry(curve,16,.025,8,false)),steel);rack.name='Bicicletário';root.add(rack);}
 box('Bebedouro',26.9,.48,53.5,.35,.96,.35,m.concrete);box('Cuba bebedouro',26.9,.98,53.5,.38,.065,.38,steel);
 for(const x of [31.6,32.2]){const bin=new T.Mesh(own(new T.CylinderGeometry(.22,.22,.7,20)),steel);bin.name='Coleta seletiva';bin.position.set(x,.35,53.7);root.add(bin);box('Tampa lixeira',x,.74,53.7,.48,.08,.48,wood);}
 const glow=own(new T.MeshStandardMaterial({color:'#fff0d2',emissive:'#ffd49a',emissiveIntensity:1.1}));glow.name='Luz âmbar da praça';
 for(const [x,z] of [[22.8,48],[25.6,52],[24.6,59],[19,64.5],[9,64],[7.1,54],[11,45.8],[33.7,52.5]]){box('Balizador da praça',x,.46,z,.13,.92,.13,steel);box('Difusor da praça',x,.81,z,.15,.13,.15,glow);}
 for(const x of [28.3,31.7]){tube('Cabo pendente',[x,2.9,49.5],[x,2.35,49.5],.012,steel);const lamp=new T.Mesh(own(new T.SphereGeometry(.15,16,10)),glow);lamp.name='Pendente do pergolado';lamp.position.set(x,2.3,49.5);root.add(lamp);}
 root.userData.program=['Playground com piso amortecedor','Pergolado e convivência','Mesas de piquenique','Bancos com encosto','Bicicletário','Bebedouro','Caminhos e iluminação'];
 return {root,nightMaterials:[glow]};
}
