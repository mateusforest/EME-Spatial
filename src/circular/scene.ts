import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {loadUrbanContext} from './context';

export type View='aerial'|'front'|'living'|'kitchen'|'bedroom'|'balcony'|'roof';
const views:Record<View,{position:number[];target:number[];inside?:boolean}>={
 aerial:{position:[43,44,64],target:[0,18,0]},
 front:{position:[0,20,70],target:[0,18,0]},
 living:{position:[.4,12.69,2.2],target:[-3.6,12.09,5.7],inside:true},
 kitchen:{position:[-1.5,12.74,6.3],target:[-5.4,12.19,1.8],inside:true},
 bedroom:{position:[5.1,12.69,5.7],target:[3.65,11.89,3.4],inside:true},
 balcony:{position:[-6.1,12.69,6.3],target:[-.6,12.49,8.5],inside:true},
 roof:{position:[18,48,23],target:[0,36.8,0]}
};
export function createCircularScene(host:HTMLDivElement,onReady:()=>void,onError:(message:string)=>void){
 const mobile=host.clientWidth<700,scene=new T.Scene();
 const renderer=new T.WebGLRenderer({antialias:!mobile,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.35:1.75));
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.shadowMap.autoUpdate=false;
 const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','EME Circular em 3D. Arraste para girar ou olhar o ambiente.');host.append(canvas);
 const camera=new T.PerspectiveCamera(44,1,.08,600),controls=new OrbitControls(camera,canvas);
 controls.enableDamping=true;controls.enablePan=false;controls.minDistance=16;controls.maxDistance=115;
 controls.maxPolarAngle=Math.PI*.49;controls.rotateSpeed=.5;
 const skyMaterial=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{sunDirection:{value:new T.Vector3(0,1,0)},warmth:{value:0}},vertexShader:`varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 direction;uniform vec3 sunDirection;uniform float warmth;void main(){vec3 d=normalize(direction);float h=clamp(d.y,0.,1.);vec3 horizon=mix(vec3(.69,.81,.87),vec3(.91,.68,.46),warmth);vec3 color=mix(horizon,vec3(.18,.43,.68),pow(h,.45));float glow=pow(max(dot(d,normalize(sunDirection)),0.),48.);color+=vec3(.29,.22,.12)*glow;gl_FragColor=vec4(color,1.);
}`,toneMapped:false});
 const sky=new T.Mesh(new T.SphereGeometry(450,24,12),skyMaterial);scene.add(sky);
 const sun=new T.DirectionalLight('#fff0da',2.5);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);
 Object.assign(sun.shadow.camera,{left:-50,right:50,top:55,bottom:-40,near:1,far:190});sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;
 sun.target.position.set(0,17,0);scene.add(sun,sun.target);
 const ambient=new T.HemisphereLight('#d7e8fa','#77745e',.65);scene.add(ambient);
 const apartmentLight=new T.PointLight('#ffe3bc',12,10,2);apartmentLight.position.set(-2.5,13.5,3.5);scene.add(apartmentLight);
 const ground=new T.Mesh(new T.PlaneGeometry(1600,1600),new T.MeshStandardMaterial({color:'#d1d5bc',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.28;ground.receiveShadow=true;scene.add(ground);
 scene.fog=new T.Fog(new T.Color().setRGB(.69,.81,.87,T.SRGBColorSpace),150,370);
 let disposed=false,paused=false,frame=0,inside=false,yaw=0,pitch=0,current:View='aerial',environment:T.WebGLRenderTarget|undefined;
 let drag:{id:number;x:number;y:number}|null=null;
 const textures=new Set<T.Texture>();
 const draco=new DRACOLoader().setDecoderPath('/assets/priorita/draco/').setWorkerLimit(1);
 const loader=new GLTFLoader().setDRACOLoader(draco);
 let apartmentPromise:Promise<void>|undefined;
 const textureLoader=new T.TextureLoader();
 const wood=textureLoader.load('/assets/m/materials/oak-color.webp',invalidate);wood.colorSpace=T.SRGBColorSpace;wood.wrapS=wood.wrapT=T.RepeatWrapping;wood.repeat.set(1,2);textures.add(wood);
 const pmrem=new T.PMREMGenerator(renderer);
 new HDRLoader().load('/assets/m/materials/daylight-1k.hdr',hdr=>{
  if(disposed){hdr.dispose();pmrem.dispose();return;}
  environment=pmrem.fromEquirectangular(hdr);scene.environment=environment.texture;scene.environmentIntensity=.4;hdr.dispose();pmrem.dispose();invalidate();
 },undefined,()=>pmrem.dispose());
 function prepare(root:T.Group){
  root.traverse(o=>{if(!(o instanceof T.Mesh))return;
   o.castShadow=true;o.receiveShadow=true;
   for(const mat of Array.isArray(o.material)?o.material:[o.material]){
    if(!(mat instanceof T.MeshStandardMaterial))continue;
    if(mat.name.includes('Folha')){mat.side=T.DoubleSide;mat.roughness=.8;}
    if(mat.name.includes('Vidro')){mat.depthWrite=false;mat.envMapIntensity=1.3;o.castShadow=false;}
    if(/Carvalho|Nogueira/.test(mat.name)){mat.map=wood;mat.color.set(mat.name.includes('Nogueira')?'#a28c70':'#dbbd94');}
    if(mat.name.includes('Mineral'))mat.color.set('#e4ddce');
    if(mat.name.includes('Linho'))mat.color.set('#e8dfcd');
   }
  });scene.add(root);renderer.shadowMap.needsUpdate=true;invalidate();
 }
 function release(root:T.Object3D){const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();root.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
 function apartment(){if(!apartmentPromise)apartmentPromise=loader.loadAsync('/assets/eme-circular/apartment.glb').then(g=>{if(disposed){release(g.scene);return;}prepare(g.scene);}).catch(e=>{apartmentPromise=undefined;throw e;});return apartmentPromise;}
 const ready=Promise.all([loader.loadAsync('/assets/eme-circular/tower-v2.glb'),loadUrbanContext(loader,textures)]).then(([g,context])=>{if(disposed){release(g.scene);release(context.root);textures.forEach(t=>t.dispose());return;}prepare(g.scene);scene.add(context.root);const lawn=context.grass.clone();lawn.repeat.set(220,220);textures.add(lawn);ground.material.map=lawn;ground.material.needsUpdate=true;renderer.shadowMap.needsUpdate=true;invalidate();onReady();}).catch(()=>{if(!disposed)onError('Não foi possível carregar o edifício. Tente novamente.');});
 function invalidate(){if(!frame&&!disposed&&!paused&&!document.hidden)frame=requestAnimationFrame(render);}
 function render(){frame=0;if(disposed||paused||document.hidden)return;const moving=!inside&&controls.update();sky.position.copy(camera.position);renderer.render(scene,camera);if(moving)invalidate();}
 function look(){camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);invalidate();}
 function position(view:View){
  current=view;const v=views[view];inside=!!v.inside;controls.enabled=!inside;
  camera.fov=inside?68:mobile?52:44;camera.updateProjectionMatrix();
  camera.position.fromArray(v.position);controls.target.fromArray(v.target);
  if(inside){const d=new T.Vector3().fromArray(v.target).sub(camera.position);yaw=Math.atan2(-d.x,-d.z);pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));look();}
  else{camera.rotation.order='XYZ';controls.update();}invalidate();
 }
 async function view(v:View){await ready;if(views[v].inside)await apartment();if(!disposed)position(v);}
 function hour(h:number){
  const a=(h-6)/12*Math.PI,alt=Math.max(.03,Math.sin(a));
  sun.position.set(Math.cos(a)*65,alt*65+6,30);sun.intensity=1.5+alt*1.3;
  sun.color.set(alt<.35?'#ffbd7b':'#fff1d9');skyMaterial.uniforms.sunDirection.value.copy(sun.position).normalize();skyMaterial.uniforms.warmth.value=Math.max(0,.35-alt)*2;
  const warmth=skyMaterial.uniforms.warmth.value;
  (scene.fog as T.Fog).color.setRGB(T.MathUtils.lerp(.69,.91,warmth),T.MathUtils.lerp(.81,.68,warmth),T.MathUtils.lerp(.87,.46,warmth),T.SRGBColorSpace);
  ambient.intensity=.5+alt*.15;renderer.shadowMap.needsUpdate=true;invalidate();
 }
 function down(e:PointerEvent){if(!inside)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}
 function motion(e:PointerEvent){if(!inside||!drag||e.pointerId!==drag.id)return;yaw-=(e.clientX-drag.x)*.004;pitch=T.MathUtils.clamp(pitch-(e.clientY-drag.y)*.0035,-1.2,1.2);drag.x=e.clientX;drag.y=e.clientY;look();}
 function up(){drag=null;}
 function wheel(e:WheelEvent){if(!inside)return;e.preventDefault();camera.fov=T.MathUtils.clamp(camera.fov+e.deltaY*.025,45,85);camera.updateProjectionMatrix();invalidate();}
 function zoom(delta:number){if(inside){camera.fov=T.MathUtils.clamp(camera.fov+delta*5,45,85);camera.updateProjectionMatrix();}else{const d=camera.position.clone().sub(controls.target);d.multiplyScalar(delta>0?1.12:.88).clampLength(controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(d);controls.update();}invalidate();}
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();invalidate();};
 const observer=new ResizeObserver(resize);observer.observe(host);controls.addEventListener('change',invalidate);
 const visibility=()=>invalidate();document.addEventListener('visibilitychange',visibility);
 const lost=(e:Event)=>{e.preventDefault();paused=true;onError('A exibição 3D foi interrompida. Reabra para continuar.');};
 canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',motion);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',wheel,{passive:false});
 position('aerial');hour(15);resize();
 return {view,hour,zoom,reset(){position(current);},pause(value:boolean){paused=value;if(!value)invalidate();},
  dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',motion);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('wheel',wheel);draco.dispose();environment?.dispose();textures.forEach(t=>t.dispose());release(scene);renderer.dispose();canvas.remove();}
 };
}
