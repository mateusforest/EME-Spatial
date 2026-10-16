import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {createBotaniqueNavigator} from '../botaniqueNavigation';
import {stepBotaniquePlayer} from '../botaniquePlayer';
import {createCasaMaterials} from './CasaMMaterials';
import {createCasaEnvironment} from './CasaMEnvironment';
import {createCasaLighting} from './CasaMLighting';
import {dampMotion,walkInput,routeSpeed} from './CasaMMotion';
import {createCasaReflections} from './CasaMReflections';
import {CASA_LIGHT_DEFAULTS} from './CasaMLightState';
import {CASA_LED_CIRCUITS,casaLedGeometry} from './CasaMLed';
import {createCasaFurniture,disposeCasaObject} from './CasaMFurniture';
import type {CasaApi,CasaManifest,CasaView,FurnitureGroup} from './CasaMTypes';

type Events={progress:(value:string)=>void;ready:()=>void;error:(message:string)=>void;view:(v:CasaView|string)=>void;pick:(group:FurnitureGroup)=>void;hint:(message:string)=>void};
export function createCasaEngine(mount:HTMLDivElement,manifest:CasaManifest,events:Events):CasaApi{
 const touch=matchMedia('(pointer:coarse)').matches;
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.info.autoReset=false;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
 // Keep one clipping uniform in every shader; opening the floor plan then only
 // moves the cut plane instead of compiling another complete lighting pipeline.
 const cutPlane=new T.Plane(new T.Vector3(0,-1,0),1000);renderer.clippingPlanes=[cutPlane];
 mount.append(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Casa M em 3D. Arraste para olhar; use W A S D ou as setas para caminhar.');
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(58,1,.06,600);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minDistance=4;controls.maxDistance=90;controls.maxPolarAngle=Math.PI*.48;
 const nav=createBotaniqueNavigator(manifest.navigation,{radius:.18,eyeHeight:1.65,bodyHeight:1.78,gridSize:.15,maxStep:.19,maxSlopeDegrees:38,maxExpandedNodes:40000,maxSearchMs:350});
 let disposed=false,loaded=false,frame=0,last=0,root:T.Group|undefined,walk=false,planFloor:number|null=null,yaw=0,pitch=0,targetYaw=0,targetPitch=0,quality='auto',selected='facade';
 const lightSettings={...CASA_LIGHT_DEFAULTS};
 let pointer:{id:number;x:number;y:number;lastX:number;lastY:number;dragged:boolean}|null=null;
 let route:T.Vector3[]=[],routeIndex=0;
 const player=new T.Vector3(),velocity={x:0,y:0};let speed=0;
 let reflections:ReturnType<typeof createCasaReflections>|undefined;
 const movement={x:0,y:0},keys=new Set<string>(),originals=new Map<FurnitureGroup,T.Object3D[]>(),alternatives=new Map<FurnitureGroup,T.Group>(),families=new Map<string,T.MeshStandardMaterial>(),finishes=new Map<string,T.MeshStandardMaterial[]>();
 const textures=new Set<T.Texture>(),materials=new Set<T.Material>(),geometry=new Set<T.BufferGeometry>();
 const library=createCasaMaterials(renderer,request),surroundings=createCasaEnvironment(scene,renderer,library,touch,request),lightRig=createCasaLighting(scene,renderer,touch);
 let composer:EffectComposer|undefined,ao:GTAOPass|undefined,bloom:UnrealBloomPass|undefined;
 if(!touch){const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:4});composer=new EffectComposer(renderer,target);composer.addPass(new RenderPass(scene,camera));ao=new GTAOPass(scene,camera,1,1);ao.blendIntensity=1;ao.updateGtaoMaterial({radius:.7,distanceExponent:1.5,thickness:.5,scale:1,samples:12});composer.addPass(ao);bloom=new UnrealBloomPass(new T.Vector2(1,1),.12,.3,1.8);composer.addPass(bloom);composer.addPass(new OutputPass());}
 function request(){if(disposed||frame||document.hidden||!loaded)return;frame=requestAnimationFrame(draw);}
 function lighting(){
  lightRig.set(lightSettings);surroundings.lighting(lightSettings.hour,lightSettings.azimuth,lightSettings.solar);
  reflections?.schedule();
  mount.dataset.hour=String(lightSettings.hour);mount.dataset.indoor=String(lightSettings.interior);mount.dataset.outdoor=String(lightSettings.exterior);mount.dataset.facade=String(lightSettings.facade);mount.dataset.solar=String(lightSettings.solar);mount.dataset.azimuth=String(lightSettings.azimuth);mount.dataset.lighting=JSON.stringify(lightRig.snapshot());request();
 }
 function look(target?:T.Vector3){
  if(target){const d=target.clone().sub(camera.position).normalize();targetYaw=yaw=Math.atan2(-d.x,-d.z);targetPitch=pitch=Math.asin(T.MathUtils.clamp(d.y,-1,1));}
  camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);
 }
 function stop(){movement.x=movement.y=velocity.x=velocity.y=speed=0;keys.clear();route=[];}
 function select(id:string){
  const v=manifest.views.find(v=>v.id===id);if(!v)return;stop();selected=id;planFloor=null;cutPlane.constant=1000;
  walk=v.walk;controls.enabled=!walk;scene.traverse(o=>{if(o.userData.planHidden){o.visible=true;delete o.userData.planHidden;}if(o.userData.planShadow){o.receiveShadow=true;delete o.userData.planShadow;}});
  // Stay on verified walk surfaces: camera framing from the authoring model may sit inside trim.
  const dest=new T.Vector3(...v.position);if(walk){let floor=nav.projectToFloor({x:dest.x,y:dest.y-1.65,z:dest.z},.3);
   if(!floor){for(let radius=.1;radius<1.25&&!floor;radius+=.1)for(let angle=0;angle<Math.PI*2&&!floor;angle+=Math.PI/8)floor=nav.projectToFloor({x:dest.x+Math.cos(angle)*radius,y:dest.y-1.65,z:dest.z+Math.sin(angle)*radius},.3);}
   if(floor)dest.copy(floor).y+=1.65;else events.hint('Vista de observação. Escolha outro ambiente para caminhar.');
  }
  camera.position.copy(dest);player.copy(dest);camera.fov=walk?62:48;camera.updateProjectionMatrix();controls.target.fromArray(v.target);if(walk)look(controls.target);else{camera.position.sub(controls.target).multiplyScalar(1/Math.min(1,camera.aspect)).add(controls.target);controls.update();}
  surroundings.plan(false);lightRig.mode(false);reflections?.enable(quality!=='light');
  mount.dataset.view=id;mount.dataset.mode=walk?'walk':'orbit';events.view(v);request();
 }
 function fitPlan(){if(planFloor===null)return;const distance=Math.max(46,36/(2*Math.tan(T.MathUtils.degToRad(24))*camera.aspect));controls.target.set(15,planFloor*4.02,-8);camera.position.copy(controls.target).add(new T.Vector3(0,.904,.428).multiplyScalar(distance));controls.update();}
 function size(){const w=Math.max(1,mount.clientWidth),h=Math.max(1,mount.clientHeight),low=quality==='light'||quality==='auto'&&touch,oldAspect=camera.aspect;renderer.setPixelRatio(Math.min(devicePixelRatio,low?1:1.5,Math.sqrt((low?900000:2100000)/(w*h))));renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(planFloor!==null)fitPlan();else if(loaded&&!walk){camera.position.sub(controls.target).multiplyScalar(Math.min(1,oldAspect)/Math.min(1,camera.aspect)).add(controls.target);controls.update();}composer?.setPixelRatio(renderer.getPixelRatio());composer?.setSize(w,h);request();}
 const resize=new ResizeObserver(size);resize.observe(mount);size();
 function draw(now:number){
  frame=0;if(disposed||!loaded)return;const dt=Math.min(.05,(now-last)/1000||.016);last=now;
  if(walk){
   const x=movement.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),y=movement.y+(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
   const desired=walkInput(x,y);velocity.x=dampMotion(velocity.x,desired.x,dt,x?7:14);velocity.y=dampMotion(velocity.y,desired.y,dt,y?7:14);
   if(x||y)route=[];
   if(Math.hypot(velocity.x,velocity.y)>.05)player.copy(stepBotaniquePlayer(nav,player,yaw,velocity,dt,1.55));
   if(route.length){const distanceToEnd=player.distanceTo(route[route.length-1]);speed=dampMotion(speed,routeSpeed(distanceToEnd),dt,6);let remaining=dt*speed;while(remaining>0&&routeIndex<route.length){const next=route[routeIndex],distance=player.distanceTo(next);if(distance<=remaining+.008){player.copy(next);routeIndex++;remaining-=distance;}else{player.lerp(next,remaining/distance);remaining=0;}}if(routeIndex>=route.length){route=[];speed=0;}}
   camera.position.x=player.x;camera.position.z=player.z;camera.position.y=dampMotion(camera.position.y,player.y,dt,15);
   yaw=dampMotion(yaw,targetYaw,dt,24);pitch=dampMotion(pitch,targetPitch,dt,24);
   look();
  }
  const animate=surroundings.animate(now/1000,camera);renderer.info.reset();
  if(composer){if(ao)ao.enabled=quality!=='light'&&planFloor===null;if(bloom)bloom.enabled=quality!=='light';composer.render();}else renderer.render(scene,camera);
  mount.dataset.position=camera.position.toArray().map(x=>x.toFixed(3)).join(',');mount.dataset.drawCalls=String(renderer.info.render.calls);mount.dataset.triangles=String(renderer.info.render.triangles);
  mount.dataset.motionSpeed=Math.hypot(velocity.x,velocity.y).toFixed(3);mount.dataset.reflectionFrames=String(surroundings.reflectionFrames);
  if(keys.size||movement.x||movement.y||route.length||Math.hypot(velocity.x,velocity.y)>.05||Math.abs(yaw-targetYaw)+Math.abs(pitch-targetPitch)>.0002||Math.abs(player.y-camera.position.y)>.001&&walk||animate)request();
 }
 const draco=new DRACOLoader();draco.setDecoderPath('/assets/draco/');const loader=new GLTFLoader();loader.setDRACOLoader(draco);
 loader.load(manifest.model,async gltf=>{
  if(disposed){disposeCasaObject(gltf.scene);return;}
  root=gltf.scene;scene.add(root);root.updateMatrixWorld(true);
  // Keep the entrance open for an uninterrupted walk from the arrival steps.
  const entrance=new T.Group();entrance.position.set(9.55,0,-1.97);root.add(entrance);entrance.updateMatrixWorld(true);
  const leaves:T.Object3D[]=[];root.traverse(o=>{if(o.userData.door==='entry')leaves.push(o);});
  leaves.forEach(o=>entrance.attach(o));entrance.rotation.y=Math.PI/2;root.updateMatrixWorld(true);
  const upgraded=new Map<T.Material,T.Material>(),circuitLeds=new Map<string,T.Material>();
  root.traverse(o=>{
   if(o.parent?.userData.vegetation)o.userData.vegetation=true;
   if(o instanceof T.Mesh){geometry.add(o.geometry);const source=Array.isArray(o.material)?o.material:[o.material];
    let list=source.map(m=>{if(!upgraded.has(m)){materials.add(m);upgraded.set(m,m instanceof T.MeshStandardMaterial?library.upgrade(m):m);}return upgraded.get(m)!;});
    if(list.length===1&&list[0].userData.casaLed){
     const led=list[0];o.geometry=casaLedGeometry(o.geometry,o.matrixWorld);geometry.add(o.geometry);
     list=CASA_LED_CIRCUITS.map(circuit=>{const key=led.uuid+':'+circuit;if(!circuitLeds.has(key)){const clone=led.clone();clone.userData={...led.userData,casaCircuit:circuit};circuitLeds.set(key,clone);}return circuitLeds.get(key)!;});
    }
    o.material=list.length>1||Array.isArray(o.material)?list:list[0];
    list.forEach(m=>{materials.add(m);if(m instanceof T.MeshStandardMaterial){
     for(const value of Object.values(m))if(value instanceof T.Texture){value.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.add(value);}
     const f=m.userData.finish as string|undefined;if(f){families.set(f,m);if(!finishes.has(f))finishes.set(f,[]);if(!finishes.get(f)!.includes(m))finishes.get(f)!.push(m);}
     const transparent=m.transparent||m.name.toLowerCase().includes('vidro');if(transparent){m.depthWrite=false;}
    }});
    o.castShadow=!list.some(m=>m.transparent||m.userData.finish==='grass');o.receiveShadow=true;
   }
   const group=o.userData.furnitureGroup as FurnitureGroup|undefined;if(group){if(!originals.has(group))originals.set(group,[]);originals.get(group)!.push(o);}
  });
  surroundings.populate(root);lightRig.register(materials);
  scene.traverse(o=>{if(o instanceof T.Mesh)lightRig.register(Array.isArray(o.material)?o.material:[o.material]);});
  // Identical foliage meshes share one draw call per material, rather than one per plant.
  const instances=new Map<string,T.Mesh[]>();root.traverse(o=>{if(o instanceof T.Mesh&&o.userData.vegetation){const p=o.getWorldPosition(new T.Vector3());const key=o.geometry.uuid+':'+(Array.isArray(o.material)?o.material.map(m=>m.uuid).join():o.material.uuid)+':'+Math.floor(p.x/12)+':'+Math.floor(p.z/12);if(!instances.has(key))instances.set(key,[]);instances.get(key)!.push(o);}});
  for(const list of instances.values())if(list.length>1){const instanced=new T.InstancedMesh(list[0].geometry,list[0].material,list.length);list.forEach((o,i)=>{instanced.setMatrixAt(i,o.matrixWorld);o.removeFromParent();});instanced.castShadow=instanced.receiveShadow=true;instanced.userData.vegetation=true;scene.add(instanced);}
  events.progress('Preparando luz, reflexos e materiais…');await Promise.all([library.ready(),surroundings.ready]);if(disposed)return;lighting();
  camera.position.fromArray(manifest.views[0].position);camera.lookAt(...manifest.views[0].target);
  const previousTarget=renderer.getRenderTarget();
  try{if(composer)renderer.setRenderTarget(composer.readBuffer);await renderer.compileAsync(scene,camera);}catch{/* Render below reports unsupported GPU shaders in the browser. */}finally{renderer.setRenderTarget(previousTarget);}
  if(disposed)return;loaded=true;reflections=createCasaReflections(scene,renderer,upgraded.values(),request,touch);mount.dataset.ready='true';mount.dataset.revision='3';select('facade');reflections.schedule();events.ready();request();
 },e=>events.progress(e.total?`Carregando a casa · ${Math.round(e.loaded/e.total*100)}%`:'Carregando a casa…'),()=>{if(!disposed)events.error('Não foi possível carregar a Casa M. Atualize a página para tentar novamente.');});

 const ray=new T.Raycaster();
 function pick(e:PointerEvent){if(!root||planFloor!==null)return;const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.x)/r.width*2-1,-(e.clientY-r.y)/r.height*2+1),camera);
  const hit=ray.intersectObjects([root,...alternatives.values()],true).find(h=>{let o:T.Object3D|null=h.object;while(o){if(!o.visible)return false;o=o.parent;}const mesh=h.object as T.Mesh;return !(mesh.material instanceof T.Material&&mesh.material.transparent&&mesh.material.opacity<.5);});
  if(!hit)return;
  const group=hit.object.userData.furnitureGroup as FurnitureGroup|undefined;if(group){stop();events.pick(group);return;}
  if(!walk||!hit.face||hit.face.normal.clone().transformDirection(hit.object.matrixWorld).y<.7)return;
  const floor=nav.projectToFloor(hit.point,.22);if(!floor){events.hint('Escolha uma área livre do piso.');return;}
  const result=nav.planRoute(player,floor);if(!result.ok){events.hint('A passagem está bloqueada. Escolha um ponto mais próximo.');return;}
  route=result.points;routeIndex=0;speed=0;request();
 }
 function down(e:PointerEvent){if(e.button!==0||pointer)return;renderer.domElement.focus({preventScroll:true});pointer={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,dragged:false};if(walk)renderer.domElement.setPointerCapture(e.pointerId);}
 function move(e:PointerEvent){if(!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.lastX,dy=e.clientY-pointer.lastY;pointer.lastX=e.clientX;pointer.lastY=e.clientY;if(Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>5)pointer.dragged=true;if(walk&&pointer.dragged){targetYaw-=dx*.0026;targetPitch=T.MathUtils.clamp(targetPitch-dy*.0026,-1.15,1.15);request();}}
 function up(e:PointerEvent){if(pointer?.id!==e.pointerId)return;const clicked=!pointer.dragged;pointer=null;if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);if(clicked)pick(e);}
 function cancel(){pointer=null;stop();}
 function keydown(e:KeyboardEvent){if(!walk||!(e.target instanceof HTMLElement)||e.target.closest('input,select,textarea,button'))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code);request();}}
 function keyup(e:KeyboardEvent){keys.delete(e.code);}
 function visibility(){cancel();if(!document.hidden)request();}
 function lost(e:Event){e.preventDefault();events.error('A visualização 3D foi interrompida pelo dispositivo. Reabra a visita para continuar.');}
 controls.addEventListener('change',request);renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',cancel);renderer.domElement.addEventListener('webglcontextlost',lost);
 window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',visibility);
 const finishBase=new WeakMap<T.MeshStandardMaterial,{map:T.Texture|null;normal:T.Texture|null;rough:T.Texture|null;color:T.Color;roughness:number}>();
 function finish(family:string,id:string){
  const fs=[...(finishes.get(family)||[])];alternatives.forEach(obj=>obj.traverse(o=>{if(o instanceof T.Mesh){for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof T.MeshStandardMaterial&&m.userData.finish===family&&!fs.includes(m))fs.push(m);}}));if(!fs.length)return;
  const choices:Record<string,{color?:string;file?:string;normal?:string;rough?:string;repeat?:number;roughness?:number}>={
   'velvet:olive':{},'velvet:sand':{color:'#e5d5bd',file:'/assets/botanique/materials/linen-cream-color.png',repeat:6},'velvet:clay':{color:'#b97450',file:'/assets/botanique/materials/linen-cream-color.png',repeat:6},
   'marble:green':{},'marble:light':{color:'#e0cbb0',file:'/assets/botanique/materials/v6/honed-limestone-color.png',normal:'/assets/botanique/materials/v6/honed-limestone-normal.png',rough:'/assets/botanique/materials/v6/honed-limestone-roughness.png',roughness:.48},'marble:graphite':{color:'#484b49',file:'/assets/botanique/materials/v6/honed-limestone-color.png',normal:'/assets/botanique/materials/v6/honed-limestone-normal.png',roughness:.3},
   'walnut:walnut':{},'walnut:oak':{color:'#dac9ac',file:'/assets/botanique/materials/oak-veneer-color.png'},'walnut:smoked':{color:'#645447'},
  };
  const c=choices[family+':'+id];if(!c)return;
  for(const m of fs){if(!finishBase.has(m))finishBase.set(m,(!materials.has(m)&&finishBase.get(fs[0]))||{map:m.map,normal:m.normalMap,rough:m.roughnessMap,color:m.color.clone(),roughness:m.roughness});const original=finishBase.get(m)!;
   m.color.copy(original.color);if(c.color)m.color.set(c.color);m.roughness=c.roughness??original.roughness;m.map=original.map;m.normalMap=original.normal;m.roughnessMap=original.rough;
   if(c.file)m.map=library.texture(c.file,true,c.repeat??1);
   if(c.normal)m.normalMap=library.texture(c.normal,false,c.repeat??1);
   if(c.rough)m.roughnessMap=library.texture(c.rough,false,c.repeat??1);
   m.needsUpdate=true;
  }mount.dataset[family]=id;reflections?.schedule();request();
 }
 return {
  view:select,
  plan(floor){stop();walk=false;planFloor=floor;controls.enabled=true;scene.traverse(o=>{if(o.userData.vegetation&&o.visible){o.visible=false;o.userData.planHidden=true;}if(o.receiveShadow){o.receiveShadow=false;o.userData.planShadow=true;}});camera.fov=48;camera.updateProjectionMatrix();fitPlan();surroundings.plan(true);lightRig.mode(true);reflections?.enable(false);cutPlane.constant=floor*4.02+1.4;mount.dataset.mode='plan';events.view(floor?'Planta do superior':'Planta do térreo');request();},
  sun(value){lightSettings.hour=T.MathUtils.clamp(value,7,20);lighting();},lights(value){lightSettings.interior=T.MathUtils.clamp(value,0,1.5);lighting();},
  outdoorLights(value){lightSettings.exterior=T.MathUtils.clamp(value,0,1.5);lighting();},facadeLights(value){lightSettings.facade=T.MathUtils.clamp(value,0,1.5);lighting();},
  solarIntensity(value){lightSettings.solar=T.MathUtils.clamp(value,0,1.5);lighting();},solarDirection(value){lightSettings.azimuth=T.MathUtils.clamp(value,-180,180);lighting();},
  move(x,y){movement.x=x;movement.y=y;request();},finish,
  furniture(group,id){
   const old=alternatives.get(group);if(old){scene.remove(old);disposeCasaObject(old);alternatives.delete(group);}
   originals.get(group)?.forEach(o=>o.visible=id==='original');
   if(id!=='original'){const obj=createCasaFurniture(group,id,families);obj.position.set(group==='sofa'?15.9:13.5,0,group==='sofa'?-3.15:-7.38);obj.traverse(o=>{o.userData.furnitureGroup=group;if(o instanceof T.Mesh)lightRig.register(Array.isArray(o.material)?o.material:[o.material]);});scene.add(obj);alternatives.set(group,obj);}
   renderer.shadowMap.needsUpdate=true;reflections?.schedule();mount.dataset[group]=id;request();
  },
  quality(value){quality=value;surroundings.quality(value!=='light');reflections?.enable(value!=='light'&&planFloor===null);size();},reset(){select(selected);},
  dispose(){
   disposed=true;cancelAnimationFrame(frame);resize.disconnect();controls.dispose();draco.dispose();
   window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',visibility);
   renderer.domElement.removeEventListener('webglcontextlost',lost);renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',cancel);
   reflections?.dispose();surroundings.dispose();lightRig.dispose();library.dispose();alternatives.forEach(disposeCasaObject);textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometry.forEach(g=>g.dispose());composer?.passes.forEach(p=>p.dispose());composer?.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
  }
 };
}
