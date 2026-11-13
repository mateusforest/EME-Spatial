import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {asset} from './data';
import type {View} from './data';
import {findWalkPath,floorHeight,hallDestination,walkStart,walkStep,zoneAt} from './navigation';
import type {Point,WalkZone} from './navigation';

type Events={onReady:()=>void;onError:()=>void;onProgress:(percent:number)=>void;onWalk:(zone:WalkZone|null)=>void;onMoving:(moving:boolean)=>void};
export function createAmiciScene(host:HTMLDivElement,events:Events){
 let disposed=false,paused=false,dirty=true,frame=0,mode:View='facade',loaded=false;
 let transition:{start:number;from:T.Vector3;to:T.Vector3;fromTarget:T.Vector3;target:T.Vector3}|null=null;
 let walk:WalkZone|null=null,yaw=0,pitch=0,lastTime=0,doorAmount=0,evening=false,interiorBlend=-1;
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
 const hemi=new T.HemisphereLight('#d6e5f0','#b7ad96',.85);scene.add(hemi);
 const sun=new T.DirectionalLight('#fff1d7',3);sun.position.set(-28,45,48);sun.target.position.set(0,14,0);
 sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0003;sun.shadow.normalBias=.045;
 Object.assign(sun.shadow.camera,{left:-32,right:32,top:40,bottom:-32,near:1,far:160});scene.add(sun,sun.target);
 const fill=new T.DirectionalLight('#a8c9ee',.35);fill.position.set(35,25,25);scene.add(fill);
 for(const z of [8.5,12,15.5]){const light=new T.PointLight('#fff0d7',12,8,2);light.position.set(0,3.2,z);scene.add(light);}
 const hallLights:T.SpotLight[]=[];
 // Warm entrance lights matched to the approved V15 facade study.
 for(const x of [-2.15,0,2.15]){
  const light=new T.SpotLight('#ffd09a',32,9,.96,.75,2);
  light.position.set(x,6.29,18.12);light.target.position.set(x,5.46,17.76);
  scene.add(light,light.target);
 }
 for(const x of [-1.6,1.6]){
  const light=new T.PointLight('#ffc58d',13,5,2);light.position.set(x,2.55,15.5);scene.add(light);
 }

 for(const z of [10.2,14.5]){
  const light=new T.SpotLight('#ffe9cb',42,8,1.15,.65,2);light.position.set(2.3,3.42,z);light.target.position.set(2.5,.3,z);
  light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.bias=-.0002;light.shadow.normalBias=.018;
  scene.add(light,light.target);hallLights.push(light);
 }
 function adaptLight(){
  const blend=walk?T.MathUtils.smoothstep(18.7-camera.position.z,0,2.4):0;
  if(Math.abs(blend-interiorBlend)<.001)return;interiorBlend=blend;
  hemi.intensity=T.MathUtils.lerp(evening?.5:.85,evening?.18:.32,blend);
  fill.intensity=T.MathUtils.lerp(.35,.12,blend);
  scene.environmentIntensity=T.MathUtils.lerp(evening?.35:.45,.24,blend);
  renderer.toneMappingExposure=T.MathUtils.lerp(1.05,.98,blend);invalidate();
 }
 const marker=new T.Mesh(new T.RingGeometry(.24,.32,32),new T.MeshBasicMaterial({color:'#e3c28a',side:T.DoubleSide,depthWrite:false}));
 marker.rotation.x=-Math.PI/2;marker.visible=false;scene.add(marker);
 let environment:T.WebGLRenderTarget|undefined,sky:T.DataTexture|undefined;
 const pmrem=new T.PMREMGenerator(renderer);
 new HDRLoader().load(asset('daylight.hdr'),hdr=>{
  if(disposed){hdr.dispose();pmrem.dispose();return;}
  environment=pmrem.fromEquirectangular(hdr);scene.environment=environment.texture;interiorBlend=-1;adaptLight();
  sky=hdr;sky.mapping=T.EquirectangularReflectionMapping;scene.background=sky;scene.backgroundBlurriness=.025;scene.backgroundIntensity=evening?.30:.65;
  scene.backgroundRotation.y=.65;scene.environmentRotation.y=.65;pmrem.dispose();invalidate();
 },undefined,()=>pmrem.dispose());
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
  model.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;
   for(const m of Array.isArray(o.material)?o.material:[o.material]){
    if(m instanceof T.MeshStandardMaterial){
     if(m.name.toLowerCase().includes('vidro')){m.depthWrite=false;m.side=T.DoubleSide;o.castShadow=false;}
     if(m.map)m.map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
     if(m.alphaMap||m.name.includes('leaves')){m.alphaTest=.45;m.transparent=false;m.side=T.DoubleSide;}
    }
   }
  }});
  scene.add(model);loaded=true;renderer.shadowMap.needsUpdate=true;invalidate();events.onProgress(100);events.onReady();
 },progress=>{if(!disposed&&progress.total)events.onProgress(Math.min(98,Math.round(progress.loaded/progress.total*100)));},()=>{if(!disposed)events.onError();});
 function viewPosition(view:View){
  const narrow=camera.aspect<.8;
  if(view==='entrance')return{position:new T.Vector3(-8,5,17.4+(narrow?36:25)),target:new T.Vector3(0,3.4,17.4)};
  if(view==='aerial')return{position:new T.Vector3(-52,narrow?66:55,narrow?105:78),target:new T.Vector3(0,14,0)};
  return{position:new T.Vector3(narrow?-4:-7,10,17.4+Math.max(63,16/(Math.tan(T.MathUtils.degToRad(20))*camera.aspect))),target:new T.Vector3(0,18,15)};
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
 tick();
 return {
  view:(value:View)=>view(value),
  startWalk,
  enterHall:()=>{if(!walk)startWalk();goTo(hallDestination);},
  returnOutside:()=>{if(walk){yaw=Math.PI;pitch=0;camera.rotation.set(pitch,yaw,0);goTo(walkStart);}},
  stopMoving,
  hold:(key:string,value:boolean)=>{if(!walk||paused||!allowedKeys.has(key))return;if(value){stopMoving();keys.add(key);}else keys.delete(key);invalidate();},
  zoom:(factor:number)=>{if(walk)return;transition=null;camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);controls.update();invalidate();},
  lighting:(value:boolean)=>{evening=value;interiorBlend=-1;adaptLight();sun.intensity=evening?1.05:3;sun.color.set(evening?'#ffd2a1':'#fff1d7');sun.position.set(-28,evening?21:45,48);scene.background=sky??new T.Color(evening?'#73889d':'#a7bccc');scene.backgroundIntensity=evening?.30:.65;scene.fog!.color.set(evening?'#73889d':'#a7bccc');renderer.shadowMap.needsUpdate=true;invalidate();},
  pause:(value:boolean)=>{paused=value;clearInput();stopMoving();invalidate();},
  capture:()=>{if(!loaded)throw new Error('Model not ready');renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');},
  dispose:()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();draco.dispose();renderer.domElement.removeEventListener('webglcontextlost',onContextLost);renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',motion);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',blur);renderer.domElement.removeEventListener('keydown',keydown);renderer.domElement.removeEventListener('blur',blur);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);if(model)disposeModel(model);marker.geometry.dispose();marker.material.dispose();environment?.dispose();sky?.dispose();sun.shadow.dispose();hallLights.forEach(light=>light.shadow.dispose());renderer.dispose();renderer.domElement.remove();},
 };
}
export type AmiciScene=ReturnType<typeof createAmiciScene>;
