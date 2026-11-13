import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {createApartmentModel} from './apartment-model';
import {canStand,move,pathTo,roomAt,rooms,start} from './apartment-layout';
import type {ApartmentRoom} from './apartment-layout';
type Events={ready:()=>void;error:()=>void;position:(p:{x:number;z:number;yaw:number})=>void;room:(r:ApartmentRoom)=>void;moving:(v:boolean)=>void};
export function createApartmentScene(host:HTMLDivElement,events:Events){
 let disposed=false,paused=false,dirty=true,frame=0,last=0,lastReport=0,yaw=0,pitch=0,room:ApartmentRoom='living';
 let route:{x:number;z:number}[]=[],destination:typeof rooms[number]|undefined;
 const keys=new Set<string>();let drag:{id:number;x:number;y:number;sx:number;sy:number}|null=null;
 const scene=new T.Scene();scene.background=new T.Color('#b8c9d3');
 const camera=new T.PerspectiveCamera(67,1,.035,120);camera.position.set(start.x,1.62,start.z);camera.rotation.order='YXZ';
 const renderer=new T.WebGLRenderer({antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(max-width:700px)').matches?1.15:1.5));
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Interior do apartamento Final 03. Arraste para olhar, use as setas ou WASD para caminhar.');host.append(renderer.domElement);
 const model=createApartmentModel(()=>{if(disposed)return;dirty=true;renderer.shadowMap.needsUpdate=true;});scene.add(model.group);
 const hemi=new T.HemisphereLight('#dbe9f4','#b7a48c',1.3);scene.add(hemi);
 const sun=new T.DirectionalLight('#fff0d3',3.2);sun.position.set(-2,7,-5);sun.target.position.set(5,0,3);sun.castShadow=true;
 sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-9,right:9,top:7,bottom:-7,near:.1,far:30});sun.shadow.bias=-.0002;sun.shadow.normalBias=.012;scene.add(sun,sun.target);
 // Window bounce and localized fixtures; shadowed fixtures avoid bleeding across partitions.
 const lights:T.SpotLight[]=[];
 for(const [x,z,power] of [[6.9,1.6,12],[8.9,3.5,12],[1.35,1.8,9],[4.2,1.6,9],[1.6,5.35,5],[4.35,5.35,5]]){
  const l=new T.SpotLight('#ffe3bc',power,6,1.25,.85,2);l.position.set(x,2.58,z);l.target.position.set(x,.15,z);l.castShadow=true;l.shadow.mapSize.set(512,512);l.shadow.bias=-.0001;l.shadow.normalBias=.012;scene.add(l,l.target);lights.push(l);
 }
 for(const [x,z] of [[7.7,5.12],[9.45,2.7]]){const l=new T.PointLight('#ffdfae',3,3,2);l.position.set(x,1.8,z);scene.add(l);}
 const pmrem=new T.PMREMGenerator(renderer);let environment:T.WebGLRenderTarget|undefined;
 new HDRLoader().load('/assets/amici/daylight.hdr',hdr=>{if(disposed){hdr.dispose();return;}environment=pmrem.fromEquirectangular(hdr);scene.environment=environment.texture;scene.environmentIntensity=.35;hdr.dispose();dirty=true;},undefined,()=>{dirty=true;});
 const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:Math.min(renderer.capabilities.maxSamples,matchMedia('(max-width:700px)').matches?2:4)});
 const composer=new EffectComposer(renderer,target);
 const ao=new SSAOPass(scene,camera,1,1,16);ao.kernelRadius=.28;ao.minDistance=.002;ao.maxDistance=.12;
 composer.addPass(new RenderPass(scene,camera));composer.addPass(ao);composer.addPass(new OutputPass());
 const mark=new T.Mesh(new T.RingGeometry(.10,.14,32),new T.MeshBasicMaterial({color:'#be8f50',transparent:true,opacity:.8,depthWrite:false}));mark.rotation.x=-Math.PI/2;mark.visible=false;scene.add(mark);
 const ray=new T.Raycaster(),mouse=new T.Vector2();
 function stop(){route=[];destination=undefined;mark.visible=false;events.moving(false);dirty=true;}
 function go(x:number,z:number,target?:typeof rooms[number]){const p=pathTo({x:camera.position.x,z:camera.position.z},{x,z});if(!p.length)return;route=p;destination=target;keys.clear();mark.position.set(x,.025,z);mark.visible=true;events.moving(true);dirty=true;renderer.domElement.focus({preventScroll:true});}
 function turn(target:number,dt:number){const difference=Math.atan2(Math.sin(target-yaw),Math.cos(target-yaw));yaw+=difference*Math.min(1,dt*5);}
 function clear(){keys.clear();drag=null;last=0;stop();}
 function down(e:PointerEvent){if(paused||e.button!==0)return;stop();renderer.domElement.focus({preventScroll:true});renderer.domElement.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY};}
 function motion(e:PointerEvent){if(!drag||e.pointerId!==drag.id||paused)return;yaw-=(e.clientX-drag.x)*.0035;pitch=T.MathUtils.clamp(pitch-(e.clientY-drag.y)*.003,-1.1,1.1);drag.x=e.clientX;drag.y=e.clientY;dirty=true;}
 function up(e:PointerEvent){if(!drag||drag.id!==e.pointerId)return;const click=Math.hypot(drag.sx-e.clientX,drag.sy-e.clientY)<6;drag=null;if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);if(!click||paused)return;const b=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);ray.setFromCamera(mouse,camera);const hit=ray.intersectObject(model.group,true)[0];if(hit&&hit.point.y<.05&&canStand(hit.point.x,hit.point.z))go(hit.point.x,hit.point.z);}
 const allowed=new Set(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
 const key=(s:string)=>s.length===1?s.toLowerCase():s;
 function keydown(e:KeyboardEvent){if(paused||e.target!==renderer.domElement)return;if(e.key==='Escape'){stop();return;}const k=key(e.key);if(allowed.has(k)){e.preventDefault();stop();keys.add(k);}}
 function keyup(e:KeyboardEvent){keys.delete(key(e.key));}
 function hidden(){if(document.hidden)clear();else{last=0;dirty=true;}}
 function lost(e:Event){e.preventDefault();events.error();}
 renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',motion);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',clear);renderer.domElement.addEventListener('keydown',keydown);renderer.domElement.addEventListener('blur',clear);renderer.domElement.addEventListener('webglcontextlost',lost);
 window.addEventListener('keyup',keyup);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',hidden);
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);composer.setSize(w,h);camera.aspect=w/h;camera.fov=w/h<.8?79:67;camera.updateProjectionMatrix();dirty=true;}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function tick(now:number){
  if(disposed)return;frame=requestAnimationFrame(tick);if(paused||document.hidden){last=0;return;}
  const dt=Math.min(.04,(now-(last||now))/1000);last=now;
  let dx=0,dz=0;
  if(route.length){const p=route[0],vx=p.x-camera.position.x,vz=p.z-camera.position.z,len=Math.hypot(vx,vz);if(len<.065){route.shift();if(!route.length){mark.visible=false;events.moving(false);}}else{const step=Math.min(len,1.45*dt);dx=vx/len*step;dz=vz/len*step;turn(Math.atan2(-vx,-vz),dt);pitch=T.MathUtils.damp(pitch,0,5,dt);}}
  else if(destination){turn(Math.atan2(-(destination.lookX-camera.position.x),-(destination.lookZ-camera.position.z)),dt);pitch=T.MathUtils.damp(pitch,0,5,dt);if(Math.abs(Math.atan2(Math.sin(Math.atan2(-(destination.lookX-camera.position.x),-(destination.lookZ-camera.position.z))-yaw),Math.cos(Math.atan2(-(destination.lookX-camera.position.x),-(destination.lookZ-camera.position.z))-yaw)))<.01)destination=undefined;dirty=true;}
  if(keys.size){let f=Number(keys.has('w')||keys.has('ArrowUp'))-Number(keys.has('s')||keys.has('ArrowDown')),s=Number(keys.has('d')||keys.has('ArrowRight'))-Number(keys.has('a')||keys.has('ArrowLeft'));const len=Math.hypot(f,s)||1;f/=len;s/=len;dx=(-Math.sin(yaw)*f+Math.cos(yaw)*s)*1.55*dt;dz=(-Math.cos(yaw)*f-Math.sin(yaw)*s)*1.55*dt;}
  if(dx||dz){const next=move(camera.position.x,camera.position.z,dx,dz);camera.position.set(next.x,1.62,next.z);dirty=true;}
  camera.rotation.set(pitch,yaw,0);
  if(dirty){composer.render();dirty=false;}
  if(now-lastReport>100){lastReport=now;const p={x:camera.position.x,z:camera.position.z,yaw};events.position(p);const next=roomAt(p.x,p.z);if(next!==room){room=next;events.room(room);}host.dataset.visit=JSON.stringify({...p,room,moving:route.length>0});}
 }
 frame=requestAnimationFrame(tick);renderer.shadowMap.needsUpdate=true;events.room(room);events.ready();
 return{goTo:(id:ApartmentRoom)=>{const r=rooms.find(r=>r.id===id);if(r)go(r.x,r.z,r);},stop,
  hold:(k:string,pressed:boolean)=>{if(paused)return;if(pressed){stop();keys.add(k);}else keys.delete(k);},
  pause:(value:boolean)=>{paused=value;clear();dirty=true;},
  reset:()=>{clear();camera.position.set(start.x,1.62,start.z);yaw=pitch=0;dirty=true;},
  dispose:()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',motion);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',clear);renderer.domElement.removeEventListener('keydown',keydown);renderer.domElement.removeEventListener('blur',clear);renderer.domElement.removeEventListener('webglcontextlost',lost);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',hidden);model.dispose();mark.geometry.dispose();mark.material.dispose();sun.shadow.dispose();lights.forEach(l=>l.shadow.dispose());ao.dispose();composer.dispose();pmrem.dispose();environment?.dispose();renderer.dispose();renderer.domElement.remove();},
 };
}
export type ApartmentScene=ReturnType<typeof createApartmentScene>;
