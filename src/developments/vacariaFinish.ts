import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {districtCars} from './vacariaCars';
import type {buildVacaria} from './vacariaModel';
/** One detailed demonstration home. Reference images guide finishes, never replace geometry. */
export function finishVacariaHome(model:ReturnType<typeof buildVacaria>,redraw:()=>void){
 const own=<A extends {dispose:()=>void}>(r:A)=>{model.resources.add(r);return r};let active=true;
 const tex=(file:string,repeat:number,color=false)=>{const t=own(new T.TextureLoader().load('/assets/m/materials/'+file,()=>{if(active)redraw()}));t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeat,repeat);if(color)t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;};
 const wood=own(new T.MeshStandardMaterial({color:'#e2d3b8',map:tex('realism50/oak-color.webp',1,true),roughness:.64}));
 const linen=own(new T.MeshStandardMaterial({color:'#b4bea7',normalMap:tex('linen-normal.webp',3),normalScale:new T.Vector2(.16,.16),roughness:.94}));
 const noiseCanvas=document.createElement('canvas');noiseCanvas.width=noiseCanvas.height=128;const ctx=noiseCanvas.getContext('2d')!;const pixels=ctx.createImageData(128,128);let seed=73;for(let i=0;i<pixels.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const n=110+(seed%36);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=n;pixels.data[i+3]=255;}ctx.putImageData(pixels,0,0);const noise=own(new T.CanvasTexture(noiseCanvas));noise.wrapS=noise.wrapT=T.RepeatWrapping;noise.repeat.set(8,8);
 const mineral=own(new T.MeshStandardMaterial({color:'#e8e2d6',bumpMap:noise,bumpScale:.008,roughness:.88}));
 const ceramic=own(new T.MeshStandardMaterial({color:'#eeeae1',roughness:.25}));
 const bronze=own(new T.MeshStandardMaterial({color:'#3d4240',metalness:.68,roughness:.32}));
 const warm=own(new T.MeshStandardMaterial({color:'#fff0d2',emissive:'#ffc47c',emissiveIntensity:1.1}));
 const glass=own(new T.MeshPhysicalMaterial({color:'#d2e2df',roughness:.12,metalness:.1,transparent:true,opacity:.20,envMapIntensity:.8}));
 const green=own(new T.MeshStandardMaterial({color:'#527444',roughness:.9}));
 const dark=own(new T.MeshStandardMaterial({color:'#262d29',roughness:.55}));
 const detail=new T.Group();detail.name='Acabamentos exclusivos casa demonstrativa';model.house.add(detail);
 function rounded(name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,r=.025){const g=own(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3))),o=new T.Mesh(g,m);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;detail.add(o);return o;}
 // Apply finishes only to the selected house: district clones retain simple context materials.
 model.house.traverse(o=>{if(!(o instanceof T.Mesh))return;const n=o.name; if(/Base cama|Cabeceira|Armário|Rack|Mesa jantar|Tampo cozinha/.test(n))o.material=wood;else if(/Sofá|Encosto sofá|Manta|Cadeira/.test(n))o.material=linen;else if(/Colchão|Travesseiro|Lavatório|Vaso sanitário/.test(n))o.material=ceramic;else if(/Esquadria|Moldura|Cooktop/.test(n))o.material=bronze;else if(/Parede|Lateral geminada|Divisória|Platibanda|Faixa contínua/.test(n))o.material=mineral;
 if(/Carroceria|Cabine|Colchão|Travesseiro|Sofá|Encosto sofá|Armário|Base cama|Rack TV|Mesa jantar/.test(n)){const dims=o.scale.clone();o.geometry=own(new RoundedBoxGeometry(dims.x,dims.y,dims.z,3,Math.min(.045,dims.y/3)));o.scale.set(1,1,1);}
 if(n==='Porta aberta')o.material=bronze;if(n==='Vidro')o.material=glass;
 });
 // Ceramic floor modules and fine joints; furniture remains in the original footprint.
 for(let x=-2.85;x<2.84;x+=.6)for(let z=.15;z<7.34;z+=.6){const w=Math.min(.594,2.85-x),d=Math.min(.594,7.35-z);rounded('Porcelanato acetinado',x+w/2,.057,z+d/2,w,.018,d,ceramic,.004);}
 for(const x of [-2.82,2.82])rounded('Rodapé lateral',x,.13,3.75,.04,.14,7.2,ceramic,.005);
 // Lounge: seat cushions, rug, millwork and a framed print.
 for(const z of [1.25,1.85,2.45])rounded('Almofada sofá',2.36,.735,z,.6,.12,.55,linen,.05);
 rounded('Tapete da sala',1.35,.078,1.15,1.10,.018,1.75,linen,.03);
 rounded('Painel do estar',.10,1.22,1.08,.035,1.8,1.38,wood,.006);
 const print=rounded('Quadro abstrato',2.825,1.72,3.1,.045,.75,.57,wood,.005);print.castShadow=false;rounded('Fundo quadro',2.79,1.72,3.1,.018,.63,.45,ceramic,.004);
 // Kitchen cabinetry, backsplash, faucet and suspended cupboards.
 for(const z of [5.66,6.28,6.90]){rounded('Frente armário cozinha',.68,.48,z,.035,.72,.57,wood,.012);rounded('Puxador cozinha',.708,.80,z,.026,.025,.23,bronze,.008);}
 rounded('Revestimento cozinha',.083,1.28,6.25,.03,.65,1.88,mineral,.005);
 rounded('Armário aéreo',.27,2.12,5.78,.42,.68,.94,wood,.018);rounded('Armário aéreo',.27,2.12,6.77,.42,.68,.94,wood,.018);
 const faucet=own(new T.TorusGeometry(.095,.015,8,20,Math.PI));const tap=new T.Mesh(faucet,bronze);tap.rotation.y=Math.PI/2;tap.position.set(.33,1.16,6.95);detail.add(tap);rounded('Torneira base',.33,1.06,7.045,.03,.2,.03,bronze,.005);
 // Lamps have visible diffusers; lighting is supplied separately, without per-lamp shadows.
 for(const [x,z] of [[1.5,1.5],[1.5,5.4],[-1.4,1.4],[-1.4,5.8],[-1.4,3.7]]){rounded('Plafon',x,2.82,z,.32,.055,.32,warm,.035);}
 for(const z of [2.95,4.36])for(const dx of [-.17,.17])for(const dz of [-.17,.17])rounded('Pé cadeira',1.45+dx,.24,z+dz,.04,.42,.04,wood,.01);
 const shadeGeo=own(new T.CylinderGeometry(.18,.29,.22,24));const shade=new T.Mesh(shadeGeo,wood);shade.position.set(1.45,2.22,3.65);detail.add(shade);rounded('Pendente cabo',1.45,2.57,3.65,.012,.5,.012,bronze,.003);
 // Bedroom details and curtains placed behind external windows only.
 rounded('Mesa de cabeceira',-2.64,.37,6.88,.38,.56,.45,wood);rounded('Roupa de cama dobrada',-1.93,.62,5.82,1.35,.055,.70,linen,.035);
 const curtain=own(new T.MeshStandardMaterial({color:'#e2d6bf',roughness:1,side:T.DoubleSide}));for(const z of [.19,7.27])for(const base of [-2.39,-1.23])for(let i=0;i<6;i++)rounded('Prega de cortina',base+i*.04,1.48,z,.033,1.72,.055,curtain,.012);
 // Private gardens use the botanical meshes loaded from the existing library.
 // Neighbor exteriors anchor the demonstration home in a terrace; never offer their interiors.
 const context=new T.Group();context.name='Vizinhas — contexto externo';model.single.add(context);for(const x of [-6,6]){const neighbor=model.homes[0].clone(true);neighbor.name='Casa vizinha não navegável';neighbor.position.set(x,0,0);neighbor.rotation.set(0,0,0);neighbor.userData={};context.add(neighbor);}
 const ground=rounded('Solo de contexto',0,-.24,1,24,.12,25,green,.01);model.house.remove(ground);model.single.add(ground);
 const road=rounded('Rua em frente à casa',0,-.10,-8.6,24,.1,4.8,dark,.01);model.house.remove(road);model.single.add(road);
 const sidewalk=rounded('Passeio público',0,0,-5.6,24,.12,1.2,mineral,.01);model.house.remove(sidewalk);model.single.add(sidewalk);
 // CC0 vehicle by tyrant monkey, prepared in Blender using a uniform scale only.
 const cars=new T.Group();cars.name='Veículos de apresentação';context.add(cars);
 new GLTFLoader().load('/assets/vacaria/veiculo-realista-v6.glb',gltf=>{const source=gltf.scene,loaded=new Set<{dispose:()=>void}>();source.traverse(o=>{if(!(o instanceof T.Mesh))return;loaded.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){loaded.add(m);for(const v of Object.values(m))if(v instanceof T.Texture)loaded.add(v);const p=m as T.MeshPhysicalMaterial;if(/Paint 1/.test(m.name)){p.color.set('#b5b9b7');p.metalness=.4;p.roughness=.38;p.clearcoat=1;}if(/Glass/.test(m.name)){p.transmission=0;p.transparent=false;p.color.set('#23332f');p.roughness=.15;}}o.castShadow=true;o.receiveShadow=true;});if(!active){loaded.forEach(r=>r.dispose());return;}loaded.forEach(own);source.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(source),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());const normalized=new T.Group();source.position.sub(new T.Vector3(center.x,bounds.min.y,center.z));normalized.add(source);normalized.userData.dimensions=size.toArray();districtCars(normalized,model);for(const x of [-6,0,6]){const car=normalized.clone(true);car.position.set(x+1.25,.025,-2.5);cars.add(car);}model.single.traverse(o=>{if(o.name==='Vaga 2.50 x 5 m — veículo de escala')o.visible=false;});redraw();},undefined,()=>{/* Keep lightweight vehicles if the optional detailed asset fails. */});
 // Context is hidden for cutaway and interior viewing.
 return {context,ground,road,sidewalk,detail,dispose:()=>{active=false}};
}
