import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {createHorizonSky} from '../priorita/horizon';
import {openingHour,solarPosition} from './solar';
import {asset} from './data';
import type {View} from './data';
import {findWalkPath,floorHeight,hallDestination,walkStart,walkStep,zoneAt} from './navigation';
import type {Point,WalkZone} from './navigation';

type Events={onReady:()=>void;onError:()=>void;onProgress:(percent:number)=>void;onWalk:(zone:WalkZone|null)=>void;onMoving:(moving:boolean)=>void};
export function createAmiciScene(host:HTMLDivElement,events:Events){
 let disposed=false,paused=false,dirty=true,frame=0,mode:View='facade',loaded=false;
 let transition:{start:number;from:T.Vector3;to:T.Vector3;fromTarget:T.Vector3;target:T.Vector3}|null=null;
 let walk:WalkZone|null=null,yaw=0,pitch=0,lastTime=0,doorAmount=0,interiorBlend=-1;
 let daylight=1,gold=0,solarHour=openingHour,solarDate=new Date().toLocaleDateString('en-CA'),environmentKey='';
 let drag:{id:number;x:number;y:number;startX:number;startY:number}|null=null;
 let route:Point[]=[];const keys=new Set<string>(),doors:{object:T.Object3D;sign:number;origin:number}[]=[];
 const scene=new T.Scene();scene.background=new T.Color('#a7bccc');scene.fog=new T.Fog('#a7bccc',130,370);
 const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(max-width:700px)').matches?1.25:1.6));
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
 renderer.domElement.setAttribute('aria-label','Modelo 3D do Amici. No passeio, arraste para olhar e use WASD ou as setas para caminhar.');
 renderer.domElement.tabIndex=0;host.append(renderer.domElement);
 const camera=new T.PerspectiveCamera(40,1,.15,550);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.09;
 controls.minDistance=7;controls.maxDistance=160;controls.maxPolarAngle=Math.PI*.495;
 controls.target.set(0,17,10);controls.screenSpacePanning=true;
 const invalidate=()=>{dirty=true;};controls.addEventListener('change',invalidate);
 controls.addEventListener('start',()=>{transition=null;});
 const hemi=new T.HemisphereLight('#b2cee8','#766c59',.38);scene.add(hemi);
 const sun=new T.DirectionalLight('#fff1d7',3);sun.position.set(-28,45,48);sun.target.position.set(0,14,0);
 sun.castShadow=true;sun.shadow.mapSize.set(matchMedia('(max-width:700px)').matches?2048:4096,matchMedia('(max-width:700px)').matches?2048:4096);sun.shadow.bias=-.00008;sun.shadow.normalBias=.018;
 Object.assign(sun.shadow.camera,{left:-30,right:30,top:32,bottom:-32,near:1,far:180});scene.add(sun,sun.target);
 const fill=new T.DirectionalLight('#a8c9ee',.35);fill.position.set(35,25,25);scene.add(fill);
 for(const z of [8.5,12,15.5]){const light=new T.PointLight('#fff0d7',12,8,2);light.position.set(0,3.2,z);scene.add(light);}
 const hallLights:T.SpotLight[]=[];
 const facadeLights:T.Light[]=[];
 const luminousMaterials=new Map<T.MeshStandardMaterial,number>();
 // Warm entrance lights matched to the approved V15 facade study.
 for(const x of [-2.15,0,2.15]){
  const light=new T.SpotLight('#ffd09a',32,9,.96,.75,2);
  light.position.set(x,6.29,18.12);light.target.position.set(x,5.46,17.76);
  scene.add(light,light.target);facadeLights.push(light);
 }
 for(const x of [-1.6,1.6]){
  const light=new T.PointLight('#ffc58d',13,5,2);light.position.set(x,2.55,15.5);scene.add(light);
 }
 // Reproduce the light in the six recessed bays shown in the approved facade.
 for(const [floor,x] of [[2,1.35],[3,-1.35],[4,-1.35],[6,1.35],[7,1.35],[9,-1.35]]){
  const light=new T.PointLight('#ffc082',8,4.3,2);
  light.position.set(x,6.5+(floor-1)*3.23+2.65,15.5);scene.add(light);facadeLights.push(light);
 }

 for(const z of [10.2,14.5]){
  const light=new T.SpotLight('#ffe9cb',42,8,1.15,.65,2);light.position.set(2.3,3.42,z);light.target.position.set(2.5,.3,z);
  light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.bias=-.0002;light.shadow.normalBias=.018;
  scene.add(light,light.target);hallLights.push(light);
 }
 function adaptLight(){
  const blend=walk?T.MathUtils.smoothstep(18.7-camera.position.z,0,2.4):0;
  if(Math.abs(blend-interiorBlend)<.001)return;interiorBlend=blend;
  hemi.intensity=T.MathUtils.lerp(.28+daylight*.32,.12+daylight*.14,blend);
  fill.intensity=T.MathUtils.lerp(.04+daylight*.14,.05,blend);
  scene.environmentIntensity=T.MathUtils.lerp(.20+daylight*.75,.25,blend);
  renderer.toneMappingExposure=T.MathUtils.lerp(.96,.98,blend);invalidate();
 }
 const marker=new T.Mesh(new T.RingGeometry(.24,.32,32),new T.MeshBasicMaterial({color:'#e3c28a',side:T.DoubleSide,depthWrite:false}));
 marker.rotation.x=-Math.PI/2;marker.visible=false;scene.add(marker);
 let environment:T.WebGLRenderTarget|undefined;
 const pmrem=new T.PMREMGenerator(renderer);
 const sky=createHorizonSky();sky.scale.setScalar(.012);scene.add(sky);
 const reflectionScene=new T.Scene(),reflectionSky=sky.clone();reflectionScene.add(reflectionSky);
 const solarPath=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:'#eac887',transparent:true,opacity:.7,depthTest:false}));
 const sunMarker=new T.Mesh(new T.SphereGeometry(.65,16,8),new T.MeshBasicMaterial({color:'#ffe2a4',depthTest:false}));
 const solarGuide=new T.Group();solarGuide.add(solarPath,sunMarker);solarGuide.visible=false;scene.add(solarGuide);
 const sunCenter=new T.Vector3(0,18,0);
 function lighting(hour:number,date:string){
  solarHour=hour;solarDate=date;
  const position=solarPosition(hour,date),dir=new T.Vector3(...position.direction);
  daylight=T.MathUtils.smoothstep(position.elevation,-7,16);gold=1-T.MathUtils.smoothstep(position.elevation,5,45);
  sun.position.copy(sun.target.position).addScaledVector(dir,90);
  sun.intensity=(3.5-.35*gold)*T.MathUtils.smoothstep(position.elevation,-1,8);
  sun.color.set('#fff7ed').lerp(new T.Color('#ffca8e'),gold*.78);
  const haze=new T.Color('#6e8da5').lerp(new T.Color('#b29881'),gold*.25).lerp(new T.Color('#172a44'),1-daylight);
  scene.fog!.color.copy(haze);(scene.fog as T.Fog).near=180;(scene.fog as T.Fog).far=450;
  sky.material.uniforms.bottomColor.value.copy(haze);
  sky.material.uniforms.topColor.value.set('#1d547f').lerp(new T.Color('#355579'),gold*.18).lerp(new T.Color('#071426'),1-daylight);
  sky.material.uniforms.cloudColor.value.set('#d0dce5').lerp(new T.Color('#dcb398'),gold*.5).lerp(new T.Color('#24374b'),1-daylight);
  sky.material.uniforms.sunDirection.value.copy(dir);
  sky.material.uniforms.sunColor.value.set('#fff1d0').lerp(new T.Color('#ffb46c'),gold);
  sky.material.uniforms.daylight.value=T.MathUtils.smoothstep(position.elevation,-1,3);
  sunMarker.position.copy(sunCenter).addScaledVector(dir,48);
  const points=Array.from({length:65},(_,i)=>new T.Vector3(...solarPosition(6+i*.25,date).direction).multiplyScalar(48).add(sunCenter));
  solarPath.geometry.dispose();solarPath.geometry=new T.BufferGeometry().setFromPoints(points);
  facadeLights.forEach(light=>light.intensity=(light instanceof T.SpotLight?22:8)*(1.45-daylight*.65));
  luminousMaterials.forEach((base,mat)=>mat.emissiveIntensity=base*(1.6-daylight*.8));
  const key=`${date}/${Math.round(hour*2)}`;
  if(key!==environmentKey){environmentKey=key;const old=environment;environment=pmrem.fromScene(reflectionScene,.03,.1,550);scene.environment=environment.texture;old?.dispose();}
  interiorBlend=-1;adaptLight();renderer.shadowMap.needsUpdate=true;invalidate();
  host.dataset.solar=JSON.stringify({hour,date,elevation:position.elevation,azimuth:position.azimuth,direction:position.direction,intensity:sun.intensity,approximateNorth:true});
 }
 const draco=new DRACOLoader().setDecoderPath('/assets/draco/').setWorkerLimit(2);
 const loader=new GLTFLoader().setDRACOLoader(draco);
 const disposeModel=(model:T.Object3D)=>{
  const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();
  model.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
  materials.forEach(m=>{Object.values(m).forEach(v=>{if(v instanceof T.Texture)textures.add(v);});m.dispose();});
  textures.forEach(t=>t.dispose());geometries.forEach(g=>g.dispose());
 };
 let model:T.Group|undefined;
 loader.load(asset('amici-walk-v15.glb'),gltf=>{
  if(disposed){disposeModel(gltf.scene);return;}
  model=gltf.scene;
  model.traverse(o=>{if(o.userData.walkDoor)doors.push({object:o,sign:Number(o.userData.walkDoor),origin:o.position.x});});
  const tuned=new Set<T.MeshStandardMaterial>();
  model.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;
   for(const m of Array.isArray(o.material)?o.material:[o.material]){
    if(m instanceof T.MeshStandardMaterial){
     if(m.name.toLowerCase().includes('vidro')){m.depthWrite=false;m.side=T.DoubleSide;o.castShadow=false;}
     if(m.map)m.map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
     if(m.alphaMap||m.name.includes('leaves')){m.alphaTest=.45;m.transparent=false;m.side=T.DoubleSide;}
     if(!tuned.has(m)){
      tuned.add(m);const name=m.name.toLowerCase();
      if(name.includes('vidro')){
       const entrance=name.includes('hall')||name.includes('vitrine');
       m.color.set(entrance?'#b4ced3':'#719bbd');m.opacity=entrance?.19:.62;m.roughness=entrance?.09:.065;m.metalness=entrance?.08:.32;m.envMapIntensity=entrance?1.2:2.2;
      }
      if(name.includes('tijolo')){m.color.set(name.includes('portal')?'#fff1e2':'#eed5c4');m.normalScale.setScalar(.85);m.roughness=.78;}
      if(name.includes('reboco branco'))m.color.set('#e9edf0');
      if(name.includes('reboco cinza'))m.color.set('#c0cbd5');
      if(name.includes('reboco quente')){m.color.set('#f0d6bb');m.emissive.set('#e68d45');m.emissiveIntensity=.10;luminousMaterials.set(m,.10);}
      if(name.includes('folha')||name.includes('folhagem')||name.includes('leaves')){m.roughness=.74;m.envMapIntensity=.8;m.emissive.set('#244322');m.emissiveIntensity=.035;}
      if(name.includes('asfalto')){m.color.multiplyScalar(.73);m.roughness=.66;}
      if(name.includes('luz quente')||name.includes('luz indireta')){m.emissive.set('#ffd09a');luminousMaterials.set(m,2.4);}
      m.needsUpdate=true;
     }
    }
   }
  }});
  scene.add(model);loaded=true;lighting(solarHour,solarDate);renderer.shadowMap.needsUpdate=true;invalidate();events.onProgress(100);events.onReady();
 },progress=>{if(!disposed&&progress.total)events.onProgress(Math.min(98,Math.round(progress.loaded/progress.total*100)));},()=>{if(!disposed)events.onError();});
 function viewPosition(view:View){
  const narrow=camera.aspect<.8;
  if(view==='entrance')return{position:new T.Vector3(-8,5,17.4+(narrow?36:25)),target:new T.Vector3(0,3.4,17.4)};
  if(view==='aerial')return{position:new T.Vector3(-52,narrow?66:55,narrow?105:78),target:new T.Vector3(0,14,0)};
  return{position:new T.Vector3(0,20,17.4+Math.max(62,10/(Math.tan(T.MathUtils.degToRad(20))*camera.aspect))),target:new T.Vector3(0,20,17.4)};
 }
 function view(value:View,instant=false){
  exitWalk();camera.fov=40;camera.updateProjectionMatrix();
  mode=value;const p=viewPosition(value);
  if(instant||matchMedia('(prefers-reduced-motion: reduce)').matches){camera.position.copy(p.position);controls.target.copy(p.target);transition=null;controls.update();}
  else transition={start:performance.now(),from:camera.position.clone(),to:p.position,fromTarget:controls.target.clone(),target:p.target};
  invalidate();
 }
 function resize(){if(disposed)return;const {width,height}=host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();if(!walk)view(mode,true);invalidate();}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 const onContextLost=(e:Event)=>{e.preventDefault();events.onError();};renderer.domElement.addEventListener('webglcontextlost',onContextLost);
 function clearInput(){keys.clear();drag=null;lastTime=0;}
 function stopMoving(){route=[];marker.visible=false;events.onMoving(false);invalidate();}
 function exitWalk(){if(!walk)return;walk=null;clearInput();stopMoving();controls.enabled=true;events.onWalk(null);}
 function startWalk(){
  if(!loaded)return;
  transition=null;clearInput();stopMoving();walk='outside';controls.enabled=false;
  camera.fov=62;camera.updateProjectionMatrix();camera.position.set(walkStart.x,floorHeight(walkStart.z)+1.64,walkStart.z);
  yaw=0;pitch=.03;camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);
  events.onWalk(walk);renderer.domElement.focus({preventScroll:true});invalidate();
 }
 function goTo(target:Point){
  if(!walk)return;
  const path=findWalkPath({x:camera.position.x,z:camera.position.z},target);
  if(!path.length)return;
  route=path;keys.clear();marker.position.set(target.x,floorHeight(target.z)+.025,target.z);marker.visible=true;
  events.onMoving(true);renderer.domElement.focus({preventScroll:true});invalidate();
 }
 const ray=new T.Raycaster(),pointer=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),-.24),hit=new T.Vector3();
 function down(e:PointerEvent){if(!walk||paused||e.button!==0)return;renderer.domElement.focus({preventScroll:true});drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);}
 function motion(e:PointerEvent){if(!walk||paused||!drag||e.pointerId!==drag.id)return;yaw-=(e.clientX-drag.x)*.004;pitch=T.MathUtils.clamp(pitch-(e.clientY-drag.y)*.0035,-1.28,1.28);drag.x=e.clientX;drag.y=e.clientY;camera.rotation.set(pitch,yaw,0);invalidate();}
 function up(e:PointerEvent){
  if(!walk||!drag||e.pointerId!==drag.id)return;const click=Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<6;drag=null;
  if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);
  if(click&&!paused){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);if(ray.ray.intersectPlane(plane,hit))goTo({x:hit.x,z:hit.z});}
 }
 const allowedKeys=new Set(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Shift']);
 const keyName=(key:string)=>key.length===1?key.toLowerCase():key;
 function keydown(e:KeyboardEvent){if(!walk||paused||e.target!==renderer.domElement)return;if(e.key==='Escape'){view('facade');return;}const key=keyName(e.key);if(allowedKeys.has(key)){e.preventDefault();stopMoving();keys.add(key);}}
 function keyup(e:KeyboardEvent){keys.delete(keyName(e.key));}
 function blur(){clearInput();stopMoving();}
 function visibility(){if(document.hidden)blur();else{lastTime=0;invalidate();}}
 renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',motion);renderer.domElement.addEventListener('pointerup',up);
 renderer.domElement.addEventListener('pointercancel',blur);renderer.domElement.addEventListener('keydown',keydown);renderer.domElement.addEventListener('blur',blur);
 window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
 function tick(now=performance.now()){
  if(disposed)return;frame=requestAnimationFrame(tick);if(paused||document.hidden){lastTime=0;return;}
  const dt=Math.min(.05,(now-(lastTime||now))/1000);lastTime=now;
  const wantDoor=walk&&Math.abs(camera.position.x)<3.2&&Math.abs(camera.position.z-17.65)<3.9?1:0;
  if(Math.abs(doorAmount-wantDoor)>.001){doorAmount=T.MathUtils.damp(doorAmount,wantDoor,5,dt);for(const d of doors)d.object.position.x=d.origin+d.sign*1.19*doorAmount;renderer.shadowMap.needsUpdate=true;dirty=true;}
  if(walk){
   let dx=0,dz=0;
   if(route.length){const p=route[0],vx=p.x-camera.position.x,vz=p.z-camera.position.z,len=Math.hypot(vx,vz);if(len<.10){route.shift();if(!route.length)stopMoving();}else{const step=Math.min(len,2.05*dt);dx=vx/len*step;dz=vz/len*step;}}
   else if(keys.size){let f=Number(keys.has('w')||keys.has('ArrowUp'))-Number(keys.has('s')||keys.has('ArrowDown')),s=Number(keys.has('d')||keys.has('ArrowRight'))-Number(keys.has('a')||keys.has('ArrowLeft'));const len=Math.hypot(f,s)||1;f/=len;s/=len;const speed=keys.has('Shift')?3:2;dx=(-Math.sin(yaw)*f+Math.cos(yaw)*s)*speed*dt;dz=(-Math.cos(yaw)*f-Math.sin(yaw)*s)*speed*dt;}
   if(dx||dz){const p=walkStep(camera.position.x,camera.position.z,dx,dz,doorAmount>.72);camera.position.set(p.x,floorHeight(p.z)+1.64,p.z);const zone=zoneAt(p.z);if(zone!==walk){walk=zone;events.onWalk(zone);}dirty=true;}
  }
  if(transition){const t=Math.min(1,(performance.now()-transition.start)/850),e=1-(1-t)**3;camera.position.lerpVectors(transition.from,transition.to,e);controls.target.lerpVectors(transition.fromTarget,transition.target,e);if(t===1)transition=null;dirty=true;}
  if(!walk)controls.update();adaptLight();if(dirty){renderer.render(scene,camera);dirty=false;}
 }
 lighting(solarHour,solarDate);tick();
 return {
  view:(value:View)=>view(value),
  startWalk,
  enterHall:()=>{if(!walk)startWalk();goTo(hallDestination);},
  returnOutside:()=>{if(walk){yaw=Math.PI;pitch=0;camera.rotation.set(pitch,yaw,0);goTo(walkStart);}},
  stopMoving,
  hold:(key:string,value:boolean)=>{if(!walk||paused||!allowedKeys.has(key))return;if(value){stopMoving();keys.add(key);}else keys.delete(key);invalidate();},
  zoom:(factor:number)=>{if(walk)return;transition=null;camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);controls.update();invalidate();},
  lighting,
  setSolarTrajectory:(value:boolean)=>{solarGuide.visible=value;invalidate();},
  pause:(value:boolean)=>{paused=value;clearInput();stopMoving();invalidate();},
  capture:()=>{if(!loaded)throw new Error('Model not ready');renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');},
  dispose:()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();draco.dispose();renderer.domElement.removeEventListener('webglcontextlost',onContextLost);renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',motion);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',blur);renderer.domElement.removeEventListener('keydown',keydown);renderer.domElement.removeEventListener('blur',blur);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);if(model)disposeModel(model);marker.geometry.dispose();marker.material.dispose();environment?.dispose();pmrem.dispose();sky.geometry.dispose();sky.material.dispose();solarPath.geometry.dispose();solarPath.material.dispose();sunMarker.geometry.dispose();sunMarker.material.dispose();sun.shadow.dispose();hallLights.forEach(light=>light.shadow.dispose());renderer.dispose();renderer.domElement.remove();},
 };
}
export type AmiciScene=ReturnType<typeof createAmiciScene>;
