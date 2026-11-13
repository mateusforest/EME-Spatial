import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {asset} from './data';
import type {View} from './data';

type Events={onReady:()=>void;onError:()=>void;onProgress:(percent:number)=>void};
export function createAmiciScene(host:HTMLDivElement,events:Events){
 let disposed=false,paused=false,dirty=true,frame=0,mode:View='facade',loaded=false;
 let transition:{start:number;from:T.Vector3;to:T.Vector3;fromTarget:T.Vector3;target:T.Vector3}|null=null;
 const scene=new T.Scene();scene.background=new T.Color('#a7bccc');scene.fog=new T.Fog('#a7bccc',130,370);
 const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(max-width:700px)').matches?1.25:1.6));
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 renderer.domElement.setAttribute('aria-label','Modelo 3D do Amici. Arraste para girar; use os botões de vista para navegar.');
 renderer.domElement.tabIndex=0;host.append(renderer.domElement);
 const camera=new T.PerspectiveCamera(40,1,.15,550);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.09;
 controls.minDistance=7;controls.maxDistance=160;controls.maxPolarAngle=Math.PI*.495;
 controls.target.set(0,17,10);controls.screenSpacePanning=true;
 const invalidate=()=>{dirty=true;};controls.addEventListener('change',invalidate);
 controls.addEventListener('start',()=>{transition=null;});
 const hemi=new T.HemisphereLight('#d6e5f0','#b7ad96',1.25);scene.add(hemi);
 const sun=new T.DirectionalLight('#fff1d7',2.6);sun.position.set(-35,57,62);sun.target.position.set(0,14,0);
 sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0003;sun.shadow.normalBias=.045;
 Object.assign(sun.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:1,far:180});scene.add(sun,sun.target);
 const fill=new T.DirectionalLight('#a8c9ee',.55);fill.position.set(35,25,25);scene.add(fill);
 let environment:T.WebGLRenderTarget|undefined;
 const pmrem=new T.PMREMGenerator(renderer);
 new HDRLoader().load(asset('daylight.hdr'),hdr=>{
  if(disposed){hdr.dispose();pmrem.dispose();return;}
  environment=pmrem.fromEquirectangular(hdr);scene.environment=environment.texture;scene.environmentIntensity=.55;
  hdr.dispose();pmrem.dispose();invalidate();
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
 loader.load(asset('amici-v2.glb'),gltf=>{
  if(disposed){disposeModel(gltf.scene);return;}
  model=gltf.scene;
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
  return{position:new T.Vector3(narrow?-5:-12,18,17.4+Math.max(63,16/(Math.tan(T.MathUtils.degToRad(20))*camera.aspect))),target:new T.Vector3(0,18,15)};
 }
 function view(value:View,instant=false){
  mode=value;const p=viewPosition(value);
  if(instant||matchMedia('(prefers-reduced-motion: reduce)').matches){camera.position.copy(p.position);controls.target.copy(p.target);transition=null;controls.update();}
  else transition={start:performance.now(),from:camera.position.clone(),to:p.position,fromTarget:controls.target.clone(),target:p.target};
  invalidate();
 }
 function resize(){if(disposed)return;const {width,height}=host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();view(mode,true);}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 const onContextLost=(e:Event)=>{e.preventDefault();events.onError();};renderer.domElement.addEventListener('webglcontextlost',onContextLost);
 function tick(){
  if(disposed)return;frame=requestAnimationFrame(tick);if(paused||document.hidden)return;
  if(transition){const t=Math.min(1,(performance.now()-transition.start)/850),e=1-(1-t)**3;camera.position.lerpVectors(transition.from,transition.to,e);controls.target.lerpVectors(transition.fromTarget,transition.target,e);if(t===1)transition=null;dirty=true;}
  controls.update();if(dirty){renderer.render(scene,camera);dirty=false;}
 }
 tick();
 return {
  view:(value:View)=>view(value),
  zoom:(factor:number)=>{transition=null;camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);controls.update();invalidate();},
  lighting:(evening:boolean)=>{sun.intensity=evening?1.05:2.6;hemi.intensity=evening?.7:1.25;scene.environmentIntensity=evening?.35:.55;sun.color.set(evening?'#ffd2a1':'#fff1d7');sun.position.set(-35,evening?21:57,62);scene.background=new T.Color(evening?'#73889d':'#a7bccc');scene.fog!.color.copy(scene.background);renderer.shadowMap.needsUpdate=true;invalidate();},
  pause:(value:boolean)=>{paused=value;invalidate();},
  capture:()=>{if(!loaded)throw new Error('Model not ready');renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');},
  dispose:()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();draco.dispose();renderer.domElement.removeEventListener('webglcontextlost',onContextLost);if(model)disposeModel(model);environment?.dispose();sun.shadow.dispose();renderer.dispose();renderer.domElement.remove();},
 };
}
export type AmiciScene=ReturnType<typeof createAmiciScene>;
