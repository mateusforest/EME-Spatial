import * as T from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {temperatureColor} from './botaniqueFurniture';
import type {LightTemperature} from './botaniqueFurniture';
let areaLightsReady=false;
export type BotaniqueLightFixture={id:string;type:'spot'|'area'|'point';position:[number,number,number];target:[number,number,number];color:string;power:number;range?:number;width?:number;height?:number;angle?:number;penumbra?:number};

/** Visual solar study only: surveyed orientation/date are not supplied. */
export function botaniqueSun(hour:number){
 const h=T.MathUtils.clamp(hour,7,20),phase=(h-7)/12;
 const elevation=58*Math.sin(Math.PI*phase),azimuth=T.MathUtils.degToRad(138-(h-7)*14);
 const e=T.MathUtils.degToRad(elevation),day=T.MathUtils.smoothstep(elevation,-5,12),gold=1-T.MathUtils.smoothstep(elevation,4,30);
 return {hour:h,elevation,day,gold,direction:new T.Vector3(Math.cos(e)*Math.sin(azimuth),Math.sin(e),Math.cos(e)*Math.cos(azimuth))};
}
export const formatSolarHour=(hour:number)=>`${Math.floor(hour).toString().padStart(2,'0')}:${Math.round((hour%1)*60).toString().padStart(2,'0')}`;

export function createBotaniqueLighting(scene:T.Scene,renderer:T.WebGLRenderer,apartment:boolean,draw:()=>void,modeledLights?:BotaniqueLightFixture[]){
 const dome=new Sky();dome.scale.setScalar(apartment?180:500);dome.material.uniforms.turbidity.value=2.8;dome.material.uniforms.rayleigh.value=1.6;dome.material.uniforms.mieCoefficient.value=.003;dome.material.uniforms.mieDirectionalG.value=.82;dome.material.uniforms.showSunDisc.value=true;dome.material.fragmentShader=dome.material.fragmentShader.replace('vec4( texColor, 1.0 )','vec4( texColor * 0.18, 1.0 )');dome.frustumCulled=false;scene.add(dome);
 const moon=new T.DirectionalLight('#a9c9ed',0);moon.position.set(-35,70,70);scene.add(moon);
 const sun=new T.DirectionalLight('#fff0dc',3.5),sky=new T.HemisphereLight('#e4effb','#a69882',.65);
 sun.castShadow=true;sun.shadow.bias=-.00005;sun.shadow.normalBias=apartment?.008:.018;sun.shadow.radius=2;
 scene.add(sun,sun.target,sky);
 const environmentScene=new T.Scene(),environmentSky=new Sky(),pmrem=new T.PMREMGenerator(renderer);environmentSky.scale.setScalar(20);environmentScene.add(environmentSky);environmentSky.material.uniforms.showSunDisc.value=false;
 let environment:T.WebGLRenderTarget|undefined,timer:ReturnType<typeof setTimeout>|undefined,disposed=false,hour=16.5,indoor=.65,temperature:LightTemperature=3000;
 const center=apartment?new T.Vector3(3.6,1.5,-3.9):new T.Vector3(0,24,-16);
 const anchor=center.clone();let span=apartment?7:85,planMode=false;
 const probeTarget=apartment?new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType,generateMipmaps:false,minFilter:T.LinearFilter}):undefined;
 const probeCamera=probeTarget?new T.CubeCamera(.06,120,probeTarget):undefined;
 const probePosition=new T.Vector3(5.7,1.55,-4.3);
 let interiorEnvironment:T.WebGLRenderTarget|undefined,interiorReady=false,probeEnabled=true,probeTimer:ReturnType<typeof setTimeout>|undefined;
 let probeIdle:number|undefined,probeRevision=0,probeRunning=false,probeYieldResolve:(()=>void)|undefined;
 const shadowSpots:T.SpotLight[]=[];let activeShadow:T.SpotLight|undefined;
 const fixtures:T.Light[]=[],windowFills:T.RectAreaLight[]=[],lampTargets:T.Object3D[]=[];
 if(!areaLightsReady){RectAreaLightUniformsLib.init();areaLightsReady=true;}
 const fallback:BotaniqueLightFixture[]=apartment?[[5.65,2.42,-4.35,13,4],[5.7,2.4,-6.3,10,3.5],[1.7,2.3,-2,8,3.5],[1.7,2.3,-6.3,8,3.5]].map(([x,y,z,power,range],i)=>({id:'fallback-'+i,type:'spot',position:[x,y,z],target:[x,.2,z],color:'#ffdfbb',power,range,angle:1.18,penumbra:1})):[[0,2.4,18.5,120,22],[-27,2.8,10,90,22],[20,3,-78,100,24]].map(([x,y,z,power,range],i)=>({id:'site-'+i,type:'point',position:[x,y,z],target:[x,0,z],color:'#ffdab0',power,range}));
 const practicals=modeledLights?.length?modeledLights:fallback;
 for(const f of practicals){
  const lamp=f.type==='area'?new T.RectAreaLight(f.color,f.power,f.width||.6,f.height||.08):f.type==='point'?new T.PointLight(f.color,f.power,f.range||8,2):new T.SpotLight(f.color,f.power,f.range||4,f.angle||1.12,f.penumbra??1,2);
  lamp.name=f.id;lamp.position.fromArray(f.position);lamp.userData.power=f.power*(apartment?(f.type==='area'?7:1.65):1);
  if(lamp instanceof T.SpotLight){if(apartment&&f.id.startsWith('downlight-')){lamp.shadow.mapSize.set(1024,1024);lamp.shadow.bias=-.00015;lamp.shadow.normalBias=.008;lamp.shadow.radius=2;shadowSpots.push(lamp);}lamp.target.position.fromArray(f.target);lampTargets.push(lamp.target);scene.add(lamp.target);}else if(lamp instanceof T.RectAreaLight){lamp.up.set(0,0,-1);lamp.lookAt(...f.target);}
  fixtures.push(lamp);scene.add(lamp);
 }
 if(!apartment){for(const z of [-.5,-8.5]){const water=new T.PointLight('#92e7d7',18,11,2);water.position.set(-26,.46,z);water.userData.power=18;fixtures.push(water);scene.add(water);}}
 if(apartment){
  // Low-energy room bounce approximates indirect illumination on the ceiling.
  for(const [x,z,w,h] of [[5.7,-3.7,1.5,3.4],[1.7,-1.8,1.8,2.2],[1.7,-6.2,1.8,1.8]]){const bounce=new T.RectAreaLight(temperatureColor[temperature],1.9,w,h);bounce.position.set(x,1.2,z);bounce.up.set(0,0,-1);bounce.lookAt(x,2.7,z);bounce.userData.power=1.9;fixtures.push(bounce);scene.add(bounce);}
  // Broad, local window fills soften daylight without adding a second sun.
  for(const [x,y,z,tx,tz,w,h] of [[5.75,1.5,-.3,5.75,-4.5,1.65,2],[.08,1.5,-1.6,2.5,-1.6,1.25,1.2],[.08,1.5,-6.2,2.5,-6.2,1.25,1.2]]){const light=new T.RectAreaLight('#fff3e1',2.8,w,h);light.position.set(x,y,z);light.lookAt(tx,1.25,tz);windowFills.push(light);scene.add(light);}
 }
 function useEnvironment(){
  const interior=apartment&&interiorReady&&!planMode&&probeEnabled&&interiorEnvironment;
  scene.environment=interior?interior.texture:environment?.texture||null;
  scene.environmentIntensity=interior?.34:apartment?.007+.045*botaniqueSun(hour).day:.025+.115*botaniqueSun(hour).day;
 }
 function cancelQueuedProbe(){
  if(probeTimer){clearTimeout(probeTimer);probeTimer=undefined;}
  if(probeIdle!==undefined){window.cancelIdleCallback(probeIdle);probeIdle=undefined;}
  const resume=probeYieldResolve;probeYieldResolve=undefined;resume?.();
 }
 const canProbe=()=>apartment&&interiorReady&&!disposed&&!planMode&&probeEnabled&&!document.hidden&&!!probeCamera&&!!probeTarget;
 function scheduleProbe(callback:()=>void){
  // Let pending input and the main view paint before doing optional reflection work.
  if(typeof window.requestIdleCallback==='function')probeIdle=window.requestIdleCallback(()=>{probeIdle=undefined;callback();},{timeout:1600});
  else probeTimer=setTimeout(()=>{probeTimer=undefined;callback();},80);
 }
 async function prepareProbe(){
  if(!canProbe()||probeRunning||!probeCamera||!probeTarget)return;
  // Without parallel compilation, keep the inexpensive sky reflection rather than
  // forcing a cold shader link synchronously during an interaction.
  if(!renderer.extensions.has('KHR_parallel_shader_compile')){renderer.domElement.dataset.interiorReflections='fallback';return;}
  probeRunning=true;const revision=probeRevision,start=performance.now(),warmObjects=new T.Group(),warmMaterials:T.Material[]=[];
  renderer.domElement.dataset.interiorReflections='preparing';
  try{
   // compileAsync polls material.currentProgram. Using temporary materials keeps
   // the main viewer's renders from changing the program being polled mid-compile.
   // Geometry and textures stay borrowed, and are never changed or disposed here.
   scene.traverseVisible(object=>{
    if(!(object instanceof T.Mesh))return;
    const clone=object.clone(false),copy=(material:T.Material)=>{const next=material.clone();next.onBeforeCompile=material.onBeforeCompile;next.customProgramCacheKey=material.customProgramCacheKey;warmMaterials.push(next);return next;};
    clone.material=Array.isArray(object.material)?object.material.map(copy):copy(object.material);warmObjects.add(clone);
   });
   probeCamera.position.copy(probePosition);probeCamera.updateMatrixWorld(true);
   if(probeCamera.coordinateSystem!==renderer.coordinateSystem){probeCamera.coordinateSystem=renderer.coordinateSystem;probeCamera.updateCoordinateSystem();}
   const before=scene.environment,beforeIntensity=scene.environmentIntensity,target=renderer.getRenderTarget(),face=renderer.getActiveCubeFace(),level=renderer.getActiveMipmapLevel();
   let compilation:Promise<unknown>;
   const dispatchStart=performance.now();
   try{
    scene.environment=environment?.texture||null;scene.environmentIntensity=.025;
    renderer.setRenderTarget(probeTarget,0);pmrem.compileCubemapShader();
    compilation=renderer.compileAsync(warmObjects,probeCamera.children[0] as T.Camera,scene);
   }finally{
    // Never leave global scene/renderer state changed across an await.
    scene.environment=before;scene.environmentIntensity=beforeIntensity;renderer.setRenderTarget(target,face,level);
   }
   renderer.domElement.dataset.reflectionCompileDispatchMs=String(Math.round(performance.now()-dispatchStart));
   await compilation;
   if(!canProbe()||revision!==probeRevision)return;
   renderer.domElement.dataset.reflectionCompileMs=String(Math.round(performance.now()-start));
   await new Promise<void>(resolve=>{probeYieldResolve=resolve;scheduleProbe(()=>{probeYieldResolve=undefined;resolve();});});
   if(!canProbe()||revision!==probeRevision)return;
   const previous=scene.environment,previousIntensity=scene.environmentIntensity,shadowAuto=renderer.shadowMap.autoUpdate,shadowDirty=renderer.shadowMap.needsUpdate,captureStart=performance.now();
   const captureTarget=renderer.getRenderTarget(),captureFace=renderer.getActiveCubeFace(),captureLevel=renderer.getActiveMipmapLevel(),xrEnabled=renderer.xr.enabled;
   try{
    // Reuse the main view's shadow maps for all six faces. Recapturing shadows
    // cannot improve this stationary room probe and would add redundant passes.
    scene.environment=environment?.texture||null;scene.environmentIntensity=.025;
    renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;
    probeCamera.position.copy(probePosition);probeCamera.update(renderer,scene);
    const next=pmrem.fromCubemap(probeTarget.texture),old=interiorEnvironment;interiorEnvironment=next;old?.dispose();
    useEnvironment();renderer.domElement.dataset.interiorReflections='ready';renderer.domElement.dataset.reflectionCaptureMs=String(Math.round(performance.now()-captureStart));draw();
   }catch{
    scene.environment=previous;scene.environmentIntensity=previousIntensity;throw Error('Interior reflection capture unavailable');
   }finally{renderer.shadowMap.autoUpdate=shadowAuto;renderer.shadowMap.needsUpdate=shadowDirty;renderer.xr.enabled=xrEnabled;renderer.setRenderTarget(captureTarget,captureFace,captureLevel);}
  }catch{if(!disposed)renderer.domElement.dataset.interiorReflections='fallback';}
  finally{
   warmObjects.clear();warmMaterials.forEach(material=>material.dispose());probeRunning=false;
   if(revision!==probeRevision&&canProbe())refreshInterior();
  }
 }
 function refreshInterior(){
  probeRevision++;cancelQueuedProbe();
  if(!canProbe()||probeRunning)return;
  probeTimer=setTimeout(()=>{probeTimer=undefined;scheduleProbe(()=>{void prepareProbe();});},500);
 }
 const probeVisibility=()=>{if(!document.hidden)refreshInterior();};
 if(apartment)document.addEventListener('visibilitychange',probeVisibility);
 function apply(){
  const value=botaniqueSun(hour),warm=new T.Color('#ffc58f'),neutral=new T.Color('#fff3df');
  sun.color.copy(neutral.lerp(warm,value.gold*.75));sun.intensity=3.65*value.day*(1-.34*value.gold);moon.intensity=apartment?0:.55*(1-value.day);
  sun.target.position.copy(anchor);sun.target.updateMatrixWorld();sun.position.copy(anchor).addScaledVector(value.direction,180);
  Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span,near:Math.max(.1,180-span*2),far:180+span*2});sun.shadow.camera.updateProjectionMatrix();
  sky.color.set(apartment?'#f2eee3':'#d4e3f0').lerp(new T.Color('#dcae92'),value.gold*.38);sky.intensity=apartment?((!planMode?.14:.42)+.24*value.day+(!planMode?.10*indoor*(1-value.day):0)):.34+.64*value.day;sky.groundColor.set(apartment&&!planMode?'#c2b096':'#a59b87');
  if(apartment&&!planMode)sky.color.lerp(new T.Color(temperatureColor[temperature]),(1-value.day)*.85);
  useEnvironment();
  renderer.toneMappingExposure=apartment?.94:.92;
  dome.material.uniforms.sunPosition.value.copy(value.direction);dome.visible=value.elevation>-3;
  scene.background=new T.Color('#152635');
  if(scene.fog instanceof T.Fog)scene.fog.color.set('#c7d6da').lerp(new T.Color('#d5af91'),value.gold*.4).lerp(new T.Color('#152635'),1-value.day);
  fixtures.forEach(l=>{l.intensity=planMode?0:l.userData.power*(apartment?indoor*(.65+.35*(1-value.day)):.015+1.05*(1-value.day));if(apartment)l.color.set(temperatureColor[temperature]);});
  windowFills.forEach(l=>{l.intensity=planMode?0:2.8*value.day;l.color.set('#fff3e1').lerp(new T.Color('#ffd5a8'),value.gold*.4);});
  renderer.shadowMap.needsUpdate=true;draw();
  if(timer)clearTimeout(timer);
  timer=setTimeout(()=>{if(disposed)return;environmentSky.material.uniforms.sunPosition.value.copy(value.direction);environmentSky.material.uniforms.turbidity.value=2.8;environmentSky.material.uniforms.rayleigh.value=1.6;const next=pmrem.fromScene(environmentScene,.03,.1,100,{size:apartment?128:64});const old=environment;environment=next;useEnvironment();old?.dispose();refreshInterior();draw();},180);
 }
 return {sun,fixtures,refreshInterior,setInteriorReady(){interiorReady=true;refreshInterior();},setQuality(low:boolean){probeEnabled=!low;if(low){probeRevision++;cancelQueuedProbe();}useEnvironment();if(!low)refreshInterior();},setHour(value:number){hour=value;apply();},setTemperature(value:LightTemperature){temperature=value;apply();},setIndoor(value:number){indoor=value;apply();},setPlanContext(value:{center:T.Vector3;span:number}|null){planMode=!!value;anchor.copy(value?.center||center);span=value?.span||(apartment?7:85);apply();},focus(position:T.Vector3,walking:boolean){if(apartment){if(!planMode&&walking){const nearest=shadowSpots.reduce<T.SpotLight|undefined>((best,lamp)=>!best||lamp.position.distanceToSquared(position)<best.position.distanceToSquared(position)?lamp:best,undefined);if(nearest!==activeShadow){if(activeShadow)activeShadow.castShadow=false;activeShadow=nearest;if(nearest)nearest.castShadow=true;renderer.shadowMap.needsUpdate=true;}if(probePosition.distanceTo(position)>2.4){probePosition.copy(position);refreshInterior();}}return;}const close=walking||position.y<12;const next=close?new T.Vector3(position.x,8,position.z):center;const nextSpan=close?32:85;if(anchor.distanceTo(next)>1.5||nextSpan!==span){anchor.copy(next);span=nextSpan;const d=botaniqueSun(hour).direction;sun.target.position.copy(anchor);sun.target.updateMatrixWorld();sun.position.copy(anchor).addScaledVector(d,180);Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span,near:180-span*2,far:180+span*2});sun.shadow.camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;}},dispose(){disposed=true;probeRevision++;if(timer)clearTimeout(timer);cancelQueuedProbe();document.removeEventListener('visibilitychange',probeVisibility);interiorEnvironment?.dispose();probeTarget?.dispose();shadowSpots.forEach(l=>l.shadow.dispose());environment?.dispose();pmrem.dispose();sun.shadow.dispose();dome.geometry.dispose();dome.material.dispose();environmentSky.geometry.dispose();environmentSky.material.dispose();scene.remove(dome,sun,sun.target,sky,moon,...fixtures,...windowFills,...lampTargets);}};
}
