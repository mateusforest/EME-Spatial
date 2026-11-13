import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {walkLocations,walkStep} from './navigation';
import type {Obstacle,WalkZone} from './navigation';
import {studyLevels} from './data';

type Events={onSelect:(id:number)=>void;onError:()=>void;onReady:()=>void;onWalk:(zone:WalkZone|null)=>void;onProgress:(value:number)=>void};
export function createApogeuScene(host:HTMLDivElement,events:Events){
 const scene=new T.Scene();scene.background=new T.Color('#bbcbd2');scene.fog=new T.Fog('#c1cdd0',110,260);
 const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(max-width:700px)').matches?1.25:1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 const canvas=renderer.domElement;canvas.setAttribute('aria-label','Modelo do Apogeu exportado do Blender. Arraste para olhar. Use os botões para visitar os ambientes.');canvas.tabIndex=0;host.append(canvas);
 const camera=new T.PerspectiveCamera(43,1,.08,500),controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.minDistance=5;controls.maxDistance=110;controls.maxPolarAngle=Math.PI*.49;
 const sun=new T.DirectionalLight('#ffedcf',3.4);sun.position.set(-25,45,38);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-38,right:38,top:48,bottom:-48,near:1,far:130});sun.shadow.normalBias=.12;sun.shadow.bias=-.0003;scene.add(sun,sun.target,new T.HemisphereLight('#d7e5eb','#aaa18b',1.6));
 let environment:T.WebGLRenderTarget|undefined;
 let model:T.Group|undefined,obstacles:Partial<Record<WalkZone,Obstacle[]>>={},disposed=false,paused=false,frame=0,dirty=true,lastTime=0,walk:WalkZone|null=null,yaw=0,pitch=0,cutaway=false;
 const pmrem=new T.PMREMGenerator(renderer);new HDRLoader().load('/assets/m/materials/daylight-1k.hdr',hdr=>{if(disposed){hdr.dispose();pmrem.dispose();return;}environment=pmrem.fromEquirectangular(hdr);scene.environment=environment.texture;scene.environmentIntensity=.45;hdr.dispose();pmrem.dispose();invalidate();},undefined,()=>pmrem.dispose());
 const draco=new DRACOLoader().setDecoderPath('/assets/priorita/draco/').setWorkerLimit(2),loader=new GLTFLoader().setDRACOLoader(draco);
 const meshes:T.Mesh[]=[],keys=new Set<string>(),ray=new T.Raycaster(),pointer=new T.Vector2();let drag:{id:number;x:number;y:number;startX:number;startY:number}|null=null;
 let transition:{from:T.Vector3;to:T.Vector3;targetFrom:T.Vector3;targetTo:T.Vector3;start:number}|null=null;
 const marker=new T.Box3Helper(new T.Box3(),new T.Color('#d5a956'));marker.visible=false;scene.add(marker);
 function invalidate(){dirty=true;if(!frame&&!disposed&&!paused&&!document.hidden)frame=requestAnimationFrame(render);}
 function render(now:number){
  frame=0;if(disposed||paused||document.hidden)return;const dt=Math.min(.04,(now-(lastTime||now))/1000);lastTime=now;let moving=false;
  if(transition){const t=Math.min(1,(now-transition.start)/800),e=1-(1-t)**3;camera.position.lerpVectors(transition.from,transition.to,e);controls.target.lerpVectors(transition.targetFrom,transition.targetTo,e);if(t===1)transition=null;moving=true;}
  if(walk&&keys.size){let forward=Number(keys.has('w')||keys.has('ArrowUp'))-Number(keys.has('s')||keys.has('ArrowDown'));let side=Number(keys.has('d')||keys.has('ArrowRight'))-Number(keys.has('a')||keys.has('ArrowLeft'));const len=Math.hypot(forward,side)||1;forward/=len;side/=len;const speed=keys.has('Shift')?3.2:1.65;const next=walkStep(camera.position.x,camera.position.z,(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed*dt,(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed*dt,walk,obstacles[walk]||[]);camera.position.x=next.x;camera.position.z=next.z;moving=true;}
  const changed=walk?false:controls.update();if(dirty||moving||changed){renderer.render(scene,camera);dirty=false;}if(moving||changed)invalidate();
 }
 function exitWalk(){walk=null;keys.clear();controls.enabled=true;events.onWalk(null);}
 function move(to:T.Vector3,target:T.Vector3){exitWalk();if(matchMedia('(prefers-reduced-motion: reduce)').matches){camera.position.copy(to);controls.target.copy(target);}else transition={from:camera.position.clone(),to,targetFrom:controls.target.clone(),targetTo:target,start:performance.now()};invalidate();}
 function showComplete(){cutaway=false;meshes.forEach(m=>m.visible=true);marker.visible=false;renderer.shadowMap.needsUpdate=true;}
 function overview(){showComplete();move(new T.Vector3(host.clientWidth<700?30:28,23,host.clientWidth<700?57:49),new T.Vector3(0,11,0));}
 function select(id:number){const level=studyLevels.find(l=>l.id===id);if(!level)return;showComplete();marker.box.set(new T.Vector3(-5.95,level.height,-9.95),new T.Vector3(5.95,level.height+3.2,9.95));marker.visible=true;move(new T.Vector3(21,level.height+9,32),new T.Vector3(0,level.height+1.4,0));}
 function enter(zone:WalkZone){if(!model)return;showComplete();transition=null;keys.clear();walk=zone;controls.enabled=false;const loc=walkLocations[zone];camera.position.fromArray(loc.position);const delta=new T.Vector3().fromArray(loc.target).sub(camera.position);yaw=Math.atan2(-delta.x,-delta.z);pitch=0;camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);events.onWalk(zone);canvas.focus({preventScroll:true});invalidate();}
 function plan(){showComplete();cutaway=true;meshes.forEach(m=>{const s=String(m.userData.section||'');m.visible=(s==='interior'||s==='floor_01');});renderer.shadowMap.needsUpdate=true;move(new T.Vector3(14,25,17),new T.Vector3(0,3.85,0));}
 function point(e:PointerEvent){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(meshes.filter(m=>m.visible),false)[0];}
 function down(e:PointerEvent){if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY};if(walk)canvas.setPointerCapture(e.pointerId);}
 function motion(e:PointerEvent){if(!walk||!drag||drag.id!==e.pointerId)return;yaw-=(e.clientX-drag.x)*.004;pitch=T.MathUtils.clamp(pitch-(e.clientY-drag.y)*.0035,-1.25,1.25);drag.x=e.clientX;drag.y=e.clientY;camera.rotation.set(pitch,yaw,0);invalidate();}
 function up(e:PointerEvent){if(!drag||e.pointerId!==drag.id)return;const clicked=Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<6;drag=null;if(!walk&&clicked&&!cutaway){const hit=point(e),id=Number(hit?.object.userData.floor);if(id)events.onSelect(id);}}
 function keydown(e:KeyboardEvent){if(!walk||paused||e.target!==canvas)return;if(e.key==='Escape'){overview();return;}const key=e.key.length===1?e.key.toLowerCase():e.key;if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Shift'].includes(key)){e.preventDefault();keys.add(key);invalidate();}}
 function keyup(e:KeyboardEvent){keys.delete(e.key.length===1?e.key.toLowerCase():e.key);}
 const clearKeys=()=>{keys.clear();drag=null;};
 const onVisibility=()=>{clearKeys();lastTime=0;invalidate();};
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();invalidate();};
 const observer=new ResizeObserver(resize);observer.observe(host);controls.addEventListener('change',invalidate);controls.addEventListener('start',()=>{transition=null;});
 const lost=(e:Event)=>{e.preventDefault();paused=true;clearKeys();events.onError();};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',motion);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',clearKeys);canvas.addEventListener('keydown',keydown);canvas.addEventListener('webglcontextlost',lost);window.addEventListener('keyup',keyup);window.addEventListener('blur',clearKeys);document.addEventListener('visibilitychange',onVisibility);
 const abort=new AbortController();
 Promise.all([loader.loadAsync('/assets/apogeu/model-v2/apogeu.glb',e=>{if(!disposed&&e.total)events.onProgress(Math.round(e.loaded/e.total*100));}),fetch('/assets/apogeu/model-v2/manifest.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error('Model metadata');return r.json();})]).then(([gltf,manifest])=>{
  if(disposed){disposeTree(gltf.scene);return;}model=gltf.scene;obstacles=manifest.zoneObstacles;scene.add(model);model.traverse(o=>{if(o instanceof T.Mesh){meshes.push(o);o.castShadow=!o.name.includes('Vidro');o.receiveShadow=true;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(m instanceof T.MeshStandardMaterial){if(m.name.includes('Folha'))m.side=T.DoubleSide;if(m.transparent)m.depthWrite=false;}}}});renderer.shadowMap.needsUpdate=true;events.onReady();invalidate();
 }).catch(e=>{if(!disposed&&e.name!=='AbortError'){console.error('Apogeu asset load',e);events.onError();}});
 resize();camera.position.set(28,23,49);controls.target.set(0,11,0);overview();
 return {select,overview,enter,plan,clear(){marker.visible=false;invalidate();},view(kind:'front'|'aerial'|'garden'|'site'){showComplete();if(kind==='front')move(new T.Vector3(0,12,54),new T.Vector3(0,11,0));else if(kind==='garden')move(new T.Vector3(25,19,-48),new T.Vector3(0,2,-28));else if(kind==='site')move(new T.Vector3(35,75,24),new T.Vector3(5,0,-13));else overview();},lighting(hour:number){const a=(hour-6)/12*Math.PI;sun.position.set(Math.cos(a)*40,Math.max(3,Math.sin(a)*50),28);sun.intensity=hour>17?1.6:3.4;sun.color.set(hour>16?'#ffc58a':'#ffedcf');renderer.shadowMap.needsUpdate=true;invalidate();},hold(key:string,value:boolean){if(value)keys.add(key);else keys.delete(key);invalidate();},zoom(factor:number){if(walk)return;transition=null;camera.position.sub(controls.target).multiplyScalar(factor).clampLength(5,110).add(controls.target);invalidate();},pause(value:boolean){paused=value;clearKeys();lastTime=0;if(!value)invalidate();},capture(){renderer.render(scene,camera);return canvas.toDataURL('image/png');},dispose(){disposed=true;abort.abort();cancelAnimationFrame(frame);observer.disconnect();controls.dispose();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',motion);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',clearKeys);canvas.removeEventListener('keydown',keydown);canvas.removeEventListener('webglcontextlost',lost);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',clearKeys);document.removeEventListener('visibilitychange',onVisibility);disposeTree(scene);sun.shadow.dispose();environment?.dispose();draco.dispose();renderer.dispose();canvas.remove();}};
}
function disposeTree(root:T.Object3D){const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>(),ts=new Set<T.Texture>();root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){gs.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach((m:T.Material)=>{ms.add(m);Object.values(m).forEach(v=>{if(v instanceof T.Texture)ts.add(v);});});}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());}
export type ApogeuScene=ReturnType<typeof createApogeuScene>;
