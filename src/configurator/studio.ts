import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {contactShadow} from '../developments/mSurfaces';
import type {Design,Surface} from './design';
import {finishes} from './design';

export function createStudio(host:HTMLElement,onPick:(s:Surface)=>void,onReady:()=>void,onError:()=>void){
 const resources=new Set<{dispose:()=>void}>();const own=<A extends {dispose:()=>void}>(v:A)=>{resources.add(v);return v};let dead=false,frame=0,visible=true,design:Design|undefined;
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false});const modest=(navigator.hardwareConcurrency||4)<=4||((navigator as Navigator&{deviceMemory?:number}).deviceMemory??8)<=4;renderer.setPixelRatio(Math.min(devicePixelRatio,modest?1:1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=!modest;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
 host.appendChild(renderer.domElement);const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','Cozinha em 3D. Arraste para girar, use a roda para aproximar e clique em uma superfície para editar.');
 const scene=new T.Scene();scene.background=new T.Color('#e9e6dd');const camera=new T.PerspectiveCamera(43,1,.1,80);camera.position.set(14,8,13);
 const controls=new OrbitControls(camera,canvas);controls.target.set(6,1,0);controls.enableDamping=true;controls.dampingFactor=.12;controls.minDistance=4;controls.maxDistance=23;controls.maxPolarAngle=Math.PI*.485;controls.minPolarAngle=.25;controls.enablePan=false;
 const pm=new T.PMREMGenerator(renderer),room=new RoomEnvironment();const env=own(pm.fromScene(room,.04));scene.environment=env.texture;scene.environmentIntensity=.5;room.dispose();pm.dispose();
 const hemi=new T.HemisphereLight('#f6f4e8','#b8aa91',1.6);scene.add(hemi);
 const sun=new T.DirectionalLight('#fff0d6',3);sun.position.set(2,9,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-10;sun.shadow.camera.right=10;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;sun.shadow.camera.near=.1;sun.shadow.camera.far=40;sun.shadow.normalBias=.025;sun.target.position.set(6,0,0);scene.add(sun,sun.target);
 RectAreaLightUniformsLib.init();const practical=new T.RectAreaLight('#ffd5a0',3,4,2);practical.position.set(8,3.15,-1);practical.lookAt(8,0,0);scene.add(practical);
 const bounce=new T.RectAreaLight('#d8e5ff',1.2,8,3);bounce.position.set(6,2,4.8);bounce.lookAt(6,1,0);scene.add(bounce);
 const group=new T.Group();scene.add(group);const materials=new Map<string,T.MeshStandardMaterial>();const loader=new T.TextureLoader();const pending:Promise<unknown>[]=[];
 const texture=(url:string,color=false)=>{let resolve!:(v?:unknown)=>void,reject!:(e:unknown)=>void;pending.push(new Promise((a,b)=>{resolve=a;reject=b}));const map=own(loader.load(url,resolve,undefined,reject));map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;if(color)map.colorSpace=T.SRGBColorSpace;return map};
 const wood=texture('/assets/m/configurator65/oak-color.webp',true),woodNormal=texture('/assets/m/configurator65/oak-normal.webp');
 const stone=texture('/assets/m/configurator65/stone-color.webp',true),stoneNormal=texture('/assets/m/configurator65/stone-normal.webp');
 const fabric=texture('/assets/m/configurator65/linen-normal.webp');
 const parts=new Map<string,T.Group>();const shadow=contactShadow(own);shadow(group,3.6,.0,4.6,2.7,.327);shadow(group,3.2,1.55,2,2,.327);
 const draco=new DRACOLoader().setDecoderPath('/assets/draco/');draco.setWorkerLimit(1);const gltfLoader=new GLTFLoader().setDRACOLoader(draco);
 let targetEye:T.Vector3|undefined,targetLook:T.Vector3|undefined;
 function request(){if(!frame&&!dead&&visible&&!document.hidden)frame=requestAnimationFrame(draw)}
 function draw(){frame=0;if(dead||!visible||document.hidden)return;let motion=false;if(targetEye&&targetLook){camera.position.lerp(targetEye,.12);controls.target.lerp(targetLook,.12);motion=camera.position.distanceTo(targetEye)>.01;if(!motion){camera.position.copy(targetEye);controls.target.copy(targetLook);targetEye=targetLook=undefined;}}const moved=controls.update();renderer.render(scene,camera);host.dataset.triangles=String(renderer.info.render.triangles);host.dataset.calls=String(renderer.info.render.calls);host.dataset.frames=String(Number(host.dataset.frames||0)+1);if(motion||moved)request()}
 controls.addEventListener('change',request);controls.addEventListener('start',()=>{targetEye=targetLook=undefined;request()});
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();request()};const observer=new ResizeObserver(resize);observer.observe(host);
 const intersection=new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible)request();else{cancelAnimationFrame(frame);frame=0}});intersection.observe(host);
 const visibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0}else request()};document.addEventListener('visibilitychange',visibility);
 const ray=new T.Raycaster();let downX=0,downY=0;const down=(e:PointerEvent)=>{downX=e.clientX;downY=e.clientY};const up=(e:PointerEvent)=>{if(Math.hypot(e.clientX-downX,e.clientY-downY)>5)return;const b=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),camera);const hit=ray.intersectObject(group,true).find(h=>{for(let o:T.Object3D|null=h.object;o;o=o.parent)if(!o.visible)return false;return true});if(hit){let s=hit.object.userData.surface;if(s==='green')s='counter';if(s==='olive')s='fabric';if(['cabinet','counter','floor','fabric'].includes(s))onPick(s)}};canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerup',up);
 const ready=gltfLoader.loadAsync('/assets/m/configurator65/kitchen65.glb').then(gltf=>{
  const cleanup=new Set<{dispose:()=>void}>();gltf.scene.traverse(o=>{if(o instanceof T.Mesh){cleanup.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])cleanup.add(m)}});
  if(dead){cleanup.forEach(r=>r.dispose());return;}cleanup.forEach(r=>own(r));
  gltf.scene.updateMatrixWorld(true);const meshes:T.Mesh[]=[];gltf.scene.traverse(o=>{if(o instanceof T.Mesh)meshes.push(o)});
  for(const o of meshes){const part=o.userData.part as string,surface=o.userData.surface as string;let root=parts.get(part);if(!root){root=new T.Group();root.name=part;parts.set(part,root);group.add(root)}
   const world=o.matrixWorld.clone();o.removeFromParent();o.matrixAutoUpdate=true;world.decompose(o.position,o.quaternion,o.scale);root.add(o);o.castShadow=o.receiveShadow=true;
   let m=materials.get(surface);if(!m){const old=(Array.isArray(o.material)?o.material[0]:o.material) as T.MeshStandardMaterial;m=own(old.clone());materials.set(surface,m);if(['wood','cabinet'].includes(surface)){m.map=wood;m.normalMap=woodNormal;m.normalScale.set(.16,.16)}if(['stone','counter','floor','green'].includes(surface)){m.map=stone;m.normalMap=stoneNormal;m.normalScale.set(.10,.10)}if(['fabric','olive','rug'].includes(surface)){m.normalMap=fabric;m.normalScale.set(.1,.1)}if(surface==='foliage')m.side=T.DoubleSide;if(surface==='light'){m.emissive.set('#ffd6a3');m.emissiveIntensity=2}m.needsUpdate=true;}o.material=m;
  }
  // Rotate the authored dining set into the front zone, with space between it and each kitchen module.
  const dining=parts.get('dining');if(dining){const pivot=new T.Matrix4().makeTranslation(8,0,2.25).multiply(new T.Matrix4().makeRotationY(Math.PI/2)).multiply(new T.Matrix4().makeTranslation(-8,0,-.15));dining.applyMatrix4(pivot)}
  if(design)apply(design);return Promise.all(pending);
 }).then(()=>{if(!dead){host.dataset.ready='true';onReady();renderer.shadowMap.needsUpdate=true;request()}}).catch(e=>{if(!dead){console.error('Configurator load failed',e);onError()}}).finally(()=>draco.dispose());void ready;
 function apply(next:Design){design=next;for(const k of ['island','peninsula','lshape']){const p=parts.get(k);if(p)p.visible=k===next.layout}host.dataset.layout=next.layout;host.dataset.design=JSON.stringify(next);
  for(const surface of ['cabinet','counter','floor','fabric'] as Surface[]){const m=materials.get(surface);if(!m)continue;m.color.set(finishes[surface][next[surface]].color);if(surface==='cabinet'){m.map=next.cabinet<2?wood:null;m.normalMap=next.cabinet<2?woodNormal:null;m.roughness=next.cabinet<2?.6:.8}if(surface==='counter'){m.roughness=next.counter===2?.35:.28}m.needsUpdate=true;}
  const green=materials.get('green');if(green){green.color.set(finishes.counter[next.counter].color);green.roughness=.3}const accent=materials.get('olive');if(accent)accent.color.set(finishes.fabric[next.fabric].color).multiplyScalar(.65);const t=next.day/100;scene.environmentIntensity=T.MathUtils.lerp(.5,.18,t);scene.background=new T.Color('#e9e6dd').lerp(new T.Color('#172430'),t);sun.intensity=T.MathUtils.lerp(3,.12,t);sun.color.set('#fff0d6').lerp(new T.Color('#8ba2d1'),t);hemi.intensity=T.MathUtils.lerp(1.6,.35,t);bounce.intensity=T.MathUtils.lerp(1.2,.15,t);practical.intensity=next.lights?T.MathUtils.lerp(2,5,t):0;const light=materials.get('light');if(light)light.emissiveIntensity=next.lights?2.5:0;renderer.shadowMap.needsUpdate=true;request();
 }
 function view(name:string){const v=name==='kitchen'?{eye:[12,5,5],look:[8,1,-1.3]}:name==='dining'?{eye:[11.5,4,8.5],look:[7,1,1.5]}:{eye:[14,8,13],look:[6,1,0]};targetEye=new T.Vector3(...v.eye);targetLook=new T.Vector3(...v.look);request()}
 function capture(){renderer.render(scene,camera);const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height+64;const ctx=c.getContext('2d')!;ctx.fillStyle='#f4f0e7';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(canvas,0,0);ctx.fillStyle='#163c32';ctx.font='18px Arial';ctx.fillText('EME SPATIAL  /  Apartamento 14 — estudo de cozinha e jantar',24,c.height-25);return c;}
 return {apply,view,download:()=>new Promise<Blob|null>(r=>capture().toBlob(r,'image/png')),thumbnail:()=>{const src=capture(),c=document.createElement('canvas');c.width=360;c.height=Math.round(360*src.height/src.width);c.getContext('2d')!.drawImage(src,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.7)},dispose:()=>{dead=true;cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointerup',up);controls.dispose();draco.dispose();resources.forEach(r=>r.dispose());sun.shadow.map?.dispose();renderer.dispose();canvas.remove()}};
}
