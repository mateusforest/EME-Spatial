import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {createBotaniqueNavigator} from '../botaniqueNavigation';
import {stepBotaniquePlayer} from '../botaniquePlayer';
import {botaniqueSun,botaniqueAtmosphere} from '../botaniqueLighting';
import {createCasaFurniture,disposeCasaObject} from './CasaMFurniture';
import type {CasaApi,CasaManifest,CasaView,FurnitureGroup} from './CasaMTypes';

type Events={progress:(value:string)=>void;ready:()=>void;error:(message:string)=>void;view:(v:CasaView|string)=>void;pick:(group:FurnitureGroup)=>void;hint:(message:string)=>void};
export function createCasaEngine(mount:HTMLDivElement,manifest:CasaManifest,events:Events):CasaApi{
 const touch=matchMedia('(pointer:coarse)').matches;
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.info.autoReset=false;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 mount.append(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Casa M em 3D. Arraste para olhar; use W A S D ou as setas para caminhar.');
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(58,1,.06,600);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minDistance=4;controls.maxDistance=90;controls.maxPolarAngle=Math.PI*.48;
 const nav=createBotaniqueNavigator(manifest.navigation,{radius:.18,eyeHeight:1.65,bodyHeight:1.78,gridSize:.15,maxStep:.19,maxSlopeDegrees:38,maxExpandedNodes:40000,maxSearchMs:350});
 let disposed=false,loaded=false,frame=0,last=0,root:T.Group|undefined,walk=false,planFloor:number|null=null,hour=16,indoor=.65,yaw=0,pitch=0,quality='auto',selected='facade';
 let pointer:{id:number;x:number;y:number;lastX:number;lastY:number;dragged:boolean}|null=null;
 let route:T.Vector3[]=[],routeIndex=0;
 const movement={x:0,y:0},keys=new Set<string>(),originals=new Map<FurnitureGroup,T.Object3D[]>(),alternatives=new Map<FurnitureGroup,T.Group>(),families=new Map<string,T.MeshStandardMaterial>(),finishes=new Map<string,T.MeshStandardMaterial[]>();
 const textures=new Set<T.Texture>(),materials=new Set<T.Material>(),geometry=new Set<T.BufferGeometry>();
 const sun=new T.DirectionalLight('#ffefdc',3);sun.castShadow=true;sun.shadow.mapSize.setScalar(touch?1024:2048);sun.shadow.normalBias=.025;sun.shadow.bias=-.00012;sun.shadow.camera.near=.5;sun.shadow.camera.far=140;
 sun.shadow.camera.left=-24;sun.shadow.camera.right=24;sun.shadow.camera.top=24;sun.shadow.camera.bottom=-24;scene.add(sun,sun.target);
 const hemi=new T.HemisphereLight('#e2ecf2','#a49880',1.25);scene.add(hemi);
 const practicals:T.PointLight[]=[];
 for(const [x,y,z] of [[15,3,-5],[16,3,-10],[5,3,-4],[5,3,-8],[10.1,3,-7.5],[5,6.8,-4],[6,6.8,-9],[16,6.8,-4],[15,6.8,-8],[16,6.8,-11],[25,5.7,-15],[22,2.5,-4]]){
  const light=new T.PointLight('#ffdbab',25,8,2);light.position.set(x,y,z);scene.add(light);practicals.push(light);
 }
 RectAreaLightUniformsLib.init();const windows:T.RectAreaLight[]=[];
 for(const [x,y,z,tx,tz,w,h] of [[15.8,1.9,-2.1,15.8,-7,5,2.7],[5.2,1.8,-2.1,5.2,-5,3,2.7],[15.7,1.8,-12.1,15.7,-8,4,2.7],[5.4,5.8,-2.1,5.4,-6,3.3,2.6],[15.8,5.8,-2.1,15.8,-6,4.6,2.6],[14,5.8,-12.1,14,-9,5,2.5],[28.7,2.8,-14.5,23,-14.5,5,4]]){
  const light=new T.RectAreaLight('#e9f0f6',2.5,w,h);light.position.set(x,y,z);light.lookAt(tx,y-.2,tz);scene.add(light);windows.push(light);
 }
 const pmrem=new T.PMREMGenerator(renderer),roomEnvironment=new RoomEnvironment(),environment=pmrem.fromScene(roomEnvironment,.04);
 scene.environment=environment.texture;scene.environmentIntensity=.55;roomEnvironment.dispose();pmrem.dispose();
 // A continuous colour gradient also covers below the horizon; there is no white ground band.
 const skyMaterial=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,toneMapped:false,uniforms:{top:{value:new T.Color('#93bed6')},horizon:{value:new T.Color('#d3d6c8')}},vertexShader:'varying vec3 vWorld; void main(){vWorld=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vWorld;uniform vec3 top;uniform vec3 horizon;void main(){float h=normalize(vWorld).y;vec3 c=mix(horizon,top,smoothstep(-.06,.65,h));gl_FragColor=vec4(c,1.);#include <colorspace_fragment>\n}'});
 // Shader chunks must start on their own line.
 skyMaterial.fragmentShader=skyMaterial.fragmentShader.replace(';#include',';\n#include');
 const sky=new T.Mesh(new T.SphereGeometry(280,24,12),skyMaterial);sky.frustumCulled=false;scene.add(sky);
 const groundMaterial=new T.MeshStandardMaterial({color:'#66714e',roughness:1}),ground=new T.Mesh(new T.PlaneGeometry(500,500),groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=-.54;ground.receiveShadow=true;scene.add(ground);
 let composer:EffectComposer|undefined,ao:GTAOPass|undefined;
 if(!touch){composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));ao=new GTAOPass(scene,camera,1,1);ao.blendIntensity=1;ao.updateGtaoMaterial({radius:.65,distanceExponent:1,thickness:.6,scale:1,samples:12});composer.addPass(ao);composer.addPass(new OutputPass());}
 function request(){if(disposed||frame||document.hidden||!loaded)return;frame=requestAnimationFrame(draw);}
 function lighting(){
  const solar=botaniqueSun(hour),atmosphere=botaniqueAtmosphere(hour),night=1-solar.day;
  sun.position.copy(new T.Vector3(14,2,-8)).addScaledVector(solar.direction,80);sun.target.position.set(14,2,-8);sun.intensity=solar.day*(2.1+.6*(1-solar.gold));sun.color.set(solar.gold>.5?'#ffdbad':'#fff3df');
  hemi.intensity=.07+solar.day*.34;scene.environmentIntensity=.10+solar.day*.18;windows.forEach(l=>l.intensity=solar.day*2.5);
  skyMaterial.uniforms.horizon.value.copy(atmosphere.horizon).lerp(new T.Color('#c6d4d5'),solar.day*.65);
  skyMaterial.uniforms.top.value.copy(new T.Color('#89b4cf')).lerp(new T.Color('#101c30'),night);
  scene.fog=new T.Fog(skyMaterial.uniforms.horizon.value,85,220);
  practicals.forEach(l=>l.intensity=indoor*(23+night*35));
  materials.forEach(m=>{if(m instanceof T.MeshStandardMaterial&&m.userData.baseEmission!==undefined)m.emissiveIntensity=m.userData.baseEmission*indoor;});
  renderer.shadowMap.needsUpdate=true;mount.dataset.hour=String(hour);mount.dataset.indoor=String(indoor);request();
 }
 function look(target?:T.Vector3){
  if(target){const d=target.clone().sub(camera.position).normalize();yaw=Math.atan2(-d.x,-d.z);pitch=Math.asin(T.MathUtils.clamp(d.y,-1,1));}
  camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);
 }
 function stop(){movement.x=movement.y=0;keys.clear();route=[];}
 function select(id:string){
  const v=manifest.views.find(v=>v.id===id);if(!v)return;stop();selected=id;planFloor=null;renderer.clippingPlanes=[];
  walk=v.walk;controls.enabled=!walk;scene.traverse(o=>{if(o.userData.planHidden){o.visible=true;delete o.userData.planHidden;}});
  // Stay on verified walk surfaces: camera framing from the authoring model may sit inside trim.
  const dest=new T.Vector3(...v.position);if(walk){let floor=nav.projectToFloor({x:dest.x,y:dest.y-1.65,z:dest.z},.3);
   if(!floor){for(let radius=.1;radius<1.25&&!floor;radius+=.1)for(let angle=0;angle<Math.PI*2&&!floor;angle+=Math.PI/8)floor=nav.projectToFloor({x:dest.x+Math.cos(angle)*radius,y:dest.y-1.65,z:dest.z+Math.sin(angle)*radius},.3);}
   if(floor)dest.copy(floor).y+=1.65;else events.hint('Vista de observação. Escolha outro ambiente para caminhar.');
  }
  camera.position.copy(dest);camera.fov=walk?65:48;camera.updateProjectionMatrix();controls.target.fromArray(v.target);if(walk)look(controls.target);else controls.update();
  mount.dataset.view=id;mount.dataset.mode=walk?'walk':'orbit';events.view(v);request();
 }
 function size(){const w=Math.max(1,mount.clientWidth),h=Math.max(1,mount.clientHeight),low=quality==='light'||quality==='auto'&&touch;renderer.setPixelRatio(Math.min(devicePixelRatio,low?1:1.5,Math.sqrt((low?900000:2100000)/(w*h))));renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();composer?.setPixelRatio(renderer.getPixelRatio());composer?.setSize(w,h);request();}
 const resize=new ResizeObserver(size);resize.observe(mount);size();
 function draw(now:number){
  frame=0;if(disposed||!loaded)return;const dt=Math.min(.05,(now-last)/1000||.016);last=now;
  if(walk){
   const x=movement.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),y=movement.y+(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
   if(x||y){route=[];camera.position.copy(stepBotaniquePlayer(nav,camera.position,yaw,{x,y},dt,1.6));}
   if(route.length){let remaining=dt*1.6;while(remaining>0&&routeIndex<route.length){const next=route[routeIndex],distance=camera.position.distanceTo(next);if(distance<=remaining){camera.position.copy(next);routeIndex++;remaining-=distance;}else{camera.position.lerp(next,remaining/distance);remaining=0;}}if(routeIndex>=route.length)route=[];}
   look();
  }
  sky.position.copy(camera.position);renderer.info.reset();
  if(composer&&quality!=='light'&&planFloor===null)composer.render();else renderer.render(scene,camera);
  mount.dataset.position=camera.position.toArray().map(x=>x.toFixed(3)).join(',');mount.dataset.drawCalls=String(renderer.info.render.calls);mount.dataset.triangles=String(renderer.info.render.triangles);
  if(keys.size||movement.x||movement.y||route.length)request();
 }
 const draco=new DRACOLoader();draco.setDecoderPath('/assets/draco/');const loader=new GLTFLoader();loader.setDRACOLoader(draco);
 loader.load(manifest.model,async gltf=>{
  if(disposed){disposeCasaObject(gltf.scene);return;}
  root=gltf.scene;scene.add(root);root.updateMatrixWorld(true);
  // Keep the entrance open for an uninterrupted walk from the arrival steps.
  const entrance=new T.Group();entrance.position.set(9.55,0,-1.97);root.add(entrance);entrance.updateMatrixWorld(true);
  const leaves:T.Object3D[]=[];root.traverse(o=>{if(o.userData.door==='entry')leaves.push(o);});
  leaves.forEach(o=>entrance.attach(o));entrance.rotation.y=Math.PI/2;root.updateMatrixWorld(true);
  root.traverse(o=>{
   if(o.parent?.userData.vegetation)o.userData.vegetation=true;
   if(o instanceof T.Mesh){geometry.add(o.geometry);const list=Array.isArray(o.material)?o.material:[o.material];
    list.forEach(m=>{materials.add(m);if(m instanceof T.MeshStandardMaterial){
     for(const value of Object.values(m))if(value instanceof T.Texture){value.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.add(value);}
     const f=m.userData.finish as string|undefined;if(f){families.set(f,m);if(!finishes.has(f))finishes.set(f,[]);if(!finishes.get(f)!.includes(m))finishes.get(f)!.push(m);}
     if(m.emissiveIntensity>0){m.userData.baseEmission=m.emissiveIntensity;}
     const transparent=m.transparent||m.name.toLowerCase().includes('vidro');if(transparent){m.depthWrite=false;}
     if(m.name.toLowerCase().includes('vidro')){m.opacity=.035;m.roughness=.18;m.envMapIntensity=.35;}
     if(m.name.includes('integrado')){m.side=T.DoubleSide;m.alphaTest=.4;m.transparent=false;m.depthWrite=true;m.needsUpdate=true;}
    }});
    o.castShadow=!list.some(m=>m.transparent);o.receiveShadow=true;
   }
   const group=o.userData.furnitureGroup as FurnitureGroup|undefined;if(group){if(!originals.has(group))originals.set(group,[]);originals.get(group)!.push(o);}
  });
  // Identical foliage meshes share one draw call per material, rather than one per plant.
  const instances=new Map<string,T.Mesh[]>();root.traverse(o=>{if(o instanceof T.Mesh&&o.userData.vegetation){const key=o.geometry.uuid+':'+(Array.isArray(o.material)?o.material.map(m=>m.uuid).join():o.material.uuid);if(!instances.has(key))instances.set(key,[]);instances.get(key)!.push(o);}});
  for(const list of instances.values())if(list.length>1){const instanced=new T.InstancedMesh(list[0].geometry,list[0].material,list.length);list.forEach((o,i)=>{instanced.setMatrixAt(i,o.matrixWorld);o.removeFromParent();});instanced.castShadow=instanced.receiveShadow=true;instanced.userData.vegetation=true;scene.add(instanced);}
  lighting();events.progress('Preparando luz e materiais…');
  camera.position.fromArray(manifest.views[0].position);camera.lookAt(...manifest.views[0].target);
  try{await renderer.compileAsync(scene,camera);renderer.clippingPlanes=[new T.Plane(new T.Vector3(0,-1,0),1.4)];await renderer.compileAsync(scene,camera);}catch{/* Render below reports unsupported GPU shaders in the browser. */}finally{renderer.clippingPlanes=[];}
  if(disposed)return;loaded=true;mount.dataset.ready='true';select('facade');events.ready();request();
 },e=>events.progress(e.total?`Carregando a casa · ${Math.round(e.loaded/e.total*100)}%`:'Carregando a casa…'),()=>{if(!disposed)events.error('Não foi possível carregar a Casa M. Atualize a página para tentar novamente.');});

 const ray=new T.Raycaster();
 function pick(e:PointerEvent){if(!root||planFloor!==null)return;const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.x)/r.width*2-1,-(e.clientY-r.y)/r.height*2+1),camera);
  const hit=ray.intersectObjects([root,...alternatives.values()],true).find(h=>{let o:T.Object3D|null=h.object;while(o){if(!o.visible)return false;o=o.parent;}const mesh=h.object as T.Mesh;return !(mesh.material instanceof T.Material&&mesh.material.transparent&&mesh.material.opacity<.5);});
  if(!hit)return;
  const group=hit.object.userData.furnitureGroup as FurnitureGroup|undefined;if(group){stop();events.pick(group);return;}
  if(!walk||!hit.face||hit.face.normal.clone().transformDirection(hit.object.matrixWorld).y<.7)return;
  const floor=nav.projectToFloor(hit.point,.22);if(!floor){events.hint('Escolha uma área livre do piso.');return;}
  const result=nav.planRoute(camera.position,floor);if(!result.ok){events.hint('A passagem está bloqueada. Escolha um ponto mais próximo.');return;}
  route=result.points;routeIndex=0;request();
 }
 function down(e:PointerEvent){if(e.button!==0||pointer)return;renderer.domElement.focus({preventScroll:true});pointer={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,dragged:false};if(walk)renderer.domElement.setPointerCapture(e.pointerId);}
 function move(e:PointerEvent){if(!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.lastX,dy=e.clientY-pointer.lastY;pointer.lastX=e.clientX;pointer.lastY=e.clientY;if(Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>5)pointer.dragged=true;if(walk&&pointer.dragged){yaw-=dx*.003;pitch=T.MathUtils.clamp(pitch-dy*.003,-1.25,1.25);look();request();}}
 function up(e:PointerEvent){if(pointer?.id!==e.pointerId)return;const clicked=!pointer.dragged;pointer=null;if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);if(clicked)pick(e);}
 function cancel(){pointer=null;stop();}
 function keydown(e:KeyboardEvent){if(!walk||!(e.target instanceof HTMLElement)||e.target.closest('input,select,textarea,button'))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code);request();}}
 function keyup(e:KeyboardEvent){keys.delete(e.code);}
 function visibility(){cancel();if(!document.hidden)request();}
 function lost(e:Event){e.preventDefault();events.error('A visualização 3D foi interrompida pelo dispositivo. Reabra a visita para continuar.');}
 controls.addEventListener('change',request);renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',cancel);renderer.domElement.addEventListener('webglcontextlost',lost);
 window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',visibility);
 const textureLoader=new T.TextureLoader(),loadedTextures=new Map<string,T.Texture>();
 function finish(family:string,id:string){
  const fs=[...(finishes.get(family)||[])];alternatives.forEach(obj=>obj.traverse(o=>{if(o instanceof T.Mesh){for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof T.MeshStandardMaterial&&m.userData.finish===family&&!fs.includes(m))fs.push(m);}}));if(!fs.length)return;
  const choices:Record<string,{color:string;file?:string;roughness?:number}>={
   'velvet:olive':{color:'#ffffff'},'velvet:sand':{color:'#d8cbb8',file:'/assets/casa-m/materials/linen-color.png'},'velvet:clay':{color:'#c2825d',file:'/assets/casa-m/materials/linen-color.png'},
   'marble:green':{color:'#ffffff'},'marble:light':{color:'#ffffff',file:'/assets/casa-m/materials/travertine-color.png',roughness:.38},'marble:graphite':{color:'#484b49',file:'/assets/casa-m/materials/travertine-color.png',roughness:.3},
   'walnut:walnut':{color:'#ffffff'},'walnut:oak':{color:'#ffffff',file:'/assets/botanique/materials/oak-veneer-color.png'},'walnut:smoked':{color:'#84786b'},
  };
  const c=choices[family+':'+id];if(!c)return;
  for(const m of fs){if(!m.userData.originalMap){m.userData.originalMap=m.map;m.userData.originalRoughness=m.roughness;}m.color.set(c.color);m.roughness=c.roughness??m.userData.originalRoughness;m.map=m.userData.originalMap;
   if(c.file){let t=loadedTextures.get(c.file);if(!t){t=textureLoader.load(c.file,()=>request());t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;loadedTextures.set(c.file,t);textures.add(t);}m.map=t;}m.needsUpdate=true;
  }mount.dataset[family]=id;request();
 }
 return {
  view:select,
  plan(floor){stop();walk=false;planFloor=floor;controls.enabled=true;scene.traverse(o=>{if(o.userData.vegetation&&o.visible){o.visible=false;o.userData.planHidden=true;}});camera.fov=48;camera.position.set(15,42+floor*4,12);controls.target.set(15,floor*4.02,-8);camera.updateProjectionMatrix();controls.update();renderer.clippingPlanes=[new T.Plane(new T.Vector3(0,-1,0),floor*4.02+1.4)];mount.dataset.mode='plan';events.view(floor?'Planta do superior':'Planta do térreo');request();},
  sun(value){hour=T.MathUtils.clamp(value,7,20);lighting();},lights(value){indoor=T.MathUtils.clamp(value,0,1);lighting();},
  move(x,y){movement.x=x;movement.y=y;request();},finish,
  furniture(group,id){
   const old=alternatives.get(group);if(old){scene.remove(old);disposeCasaObject(old);alternatives.delete(group);}
   originals.get(group)?.forEach(o=>o.visible=id==='original');
   if(id!=='original'){const obj=createCasaFurniture(group,id,families);obj.position.set(group==='sofa'?15.9:13.5,0,group==='sofa'?-3.15:-7.38);obj.traverse(o=>o.userData.furnitureGroup=group);scene.add(obj);alternatives.set(group,obj);}
   renderer.shadowMap.needsUpdate=true;mount.dataset[group]=id;request();
  },
  quality(value){quality=value;size();},reset(){select(selected);},
  dispose(){
   disposed=true;cancelAnimationFrame(frame);resize.disconnect();controls.dispose();draco.dispose();
   window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',visibility);
   renderer.domElement.removeEventListener('webglcontextlost',lost);renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',cancel);
   alternatives.forEach(disposeCasaObject);textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometry.forEach(g=>g.dispose());sky.geometry.dispose();skyMaterial.dispose();ground.geometry.dispose();groundMaterial.dispose();environment.dispose();composer?.passes.forEach(p=>p.dispose());composer?.dispose();sun.shadow.map?.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
  }
 };
}
