import {facadeFloor68,facadeRequest68} from './mFacade68';
import {buildMApartment69} from './mApartment69';
import {profiles58,initialQuality58,pixelRatio58,governor58,type Quality58} from './mPerformance58';
import {lightRig53} from './mLightRig53';
import {garageExperience55} from './mGarageExperience55';
import {garageAssets55} from './mGarageAssets55';
import {createDroneStudio56,type DroneStudio56,type DroneState56} from './mDroneStudio56';
import MDronePanel56 from './MDronePanel56';
import {buildTower54,TOWER_B54,towerBUnit54} from './mTower54';
import {promenade54} from './mPromenade54';
import {NAV_GROUPS54,COMMON_VISITS54,facadeDestination54,facadeShift54,type CommonVisit54} from './mNavigation54';
import {waterReflections53} from './mWaterReflections53';
import {commonFinish53} from './mCommonFinish53';
import {interiorStyle53} from './mInteriorStyles53';
import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildMExterior } from './mPublishedExterior';
import { buildMInterior, PILOT_FLOOR, EYE_HEIGHT } from './mInterior';
import { buildMLandscape } from './mLandscape';
import { walkStep, type WalkPoint } from './mWalking';
import {walkingPath63,type WalkSpace63} from './mClickWalk63';
import { M_LEVELS, M_STEP, unitForFloor, unitFloorLabel, areaLabel, type MUnit } from './mUnits';
import {M_SITE,M_SITE_VIEWS,mViewDirection,type MDestination} from './mSiteLayout';
import MSiteGuide from './MSiteGuide';
import {M_REFERENCE} from './mReferenceArchitecture';
import {createMAtmosphere51,timeOfDay51} from './mAtmosphere51';
import {installMLighting51} from './mLighting51';
const M_BASE=M_REFERENCE.base;
import './m-residence.css';

type Destination=MDestination;
type Model=ReturnType<typeof buildMInterior>;
type ExperienceApi={quality:(mode:Quality58)=>void;time:(n:number)=>void;go:(name:Destination)=>void;floor:(n:number)=>void;scan:(n:number)=>void;walk:()=>void;zoom:(n:number)=>void;visit:(name:string,unit?:MUnit)=>void;move:(direction:string,active:boolean)=>void;pinSelection:()=>void;clearSelection:()=>void};

export default function MResidence(){
 const host=useRef<HTMLDivElement>(null),api=useRef<ExperienceApi|undefined>(undefined);
 const droneApi=useRef<DroneStudio56|undefined>(undefined),[droneState,setDroneState]=useState<DroneState56|null>(null);
 const marker=useRef<HTMLButtonElement>(null);
 const clickEnabled=useRef(true),[clickWalk,setClickWalk]=useState(true),[walkMessage,setWalkMessage]=useState('Clique no piso para caminhar.');
 const [tower,setTower]=useState<'m'|'b'>('m'),[commonWalk,setCommonWalk]=useState(false),[scanFloor,setScanFloor]=useState(8),[journey,setJourney]=useState(false),[cardOpen,setCardOpen]=useState(false);
 const [room,setRoom]=useState<string|null>(null),[rooms,setRooms]=useState<string[]>([]);
 const [apartmentLoading,setApartmentLoading]=useState(false);
 const [ready,setReady]=useState(false),[error,setError]=useState(false),[place,setPlace]=useState<Destination>('Edifício');
 const [floor,setFloor]=useState(0),[reference,setReference]=useState(false),[activeUnit,setActiveUnit]=useState(unitForFloor(PILOT_FLOOR));
 const [inspected,setInspected]=useState<MUnit|null>(null),[information,setInformation]=useState<MUnit|null>(null);
 const [siteGuide,setSiteGuide]=useState(false),[direction,setDirection]=useState('');
 const [quality,setQuality]=useState<Quality58>('auto'),[effectiveQuality,setEffectiveQuality]=useState('Equilibrada');
 const [panelOpen,setPanelOpen]=useState(false);
 const [dayTime,setDayTime]=useState(0);const period=timeOfDay51(dayTime);
 useEffect(()=>{
  const mount=host.current!;let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({antialias:true});}catch{setError(true);return;}
  let qualityMode:Quality58='auto',qualityLevel=initialQuality58(navigator.hardwareConcurrency||4,(navigator as Navigator&{deviceMemory?:number}).deviceMemory);
  const governor=governor58(qualityLevel);
  let preparing=true,disposed=false,pendingFrame=0,pendingTimer:ReturnType<typeof setTimeout>|undefined,offscreen=false,lastDraw=0,drawFrame:(now:number)=>void=()=>{};
  const requestRender=()=>{if(disposed||offscreen||document.hidden||pendingFrame||pendingTimer!==undefined)return;
   pendingTimer=setTimeout(()=>{pendingTimer=undefined;if(disposed||offscreen||document.hidden)return;pendingFrame=requestAnimationFrame(now=>{pendingFrame=0;if(disposed||offscreen||document.hidden)return;lastDraw=now;drawFrame(now);});},Math.max(0,1000/profiles58[qualityLevel].fps-(performance.now()-lastDraw)));
  };
  const suspendRender=()=>{cancelAnimationFrame(pendingFrame);pendingFrame=0;if(pendingTimer!==undefined)clearTimeout(pendingTimer);pendingTimer=undefined;};
  const resources=new Set<{dispose:()=>void}>(),own=<A extends {dispose:()=>void}>(a:A)=>{resources.add(a);return a;};
  renderer.setPixelRatio(pixelRatio58(qualityLevel,mount.clientWidth,mount.clientHeight,devicePixelRatio));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  mount.appendChild(renderer.domElement);const canvas=renderer.domElement;canvas.tabIndex=0;
  canvas.setAttribute('aria-label','Empreendimento M. Arraste para girar. Passe o mouse ou toque em um andar para conhecer a residência.');
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,1,.2,3000),controls=new OrbitControls(camera,canvas);
  controls.enableDamping=true;controls.minDistance=5;controls.maxDistance=700;controls.maxPolarAngle=Math.PI*.49;
  const ambient=new T.HemisphereLight(0xf3f6ff,0x797c65,.8);scene.add(ambient);
  const sun=new T.DirectionalLight(0xfff8ed,2.1);sun.position.set(80,115,100);sun.castShadow=true;
  sun.shadow.mapSize.set(profiles58[qualityLevel].shadow,profiles58[qualityLevel].shadow);sun.shadow.bias=-.00008;sun.shadow.normalBias=.025;
  Object.assign(sun.shadow.camera,{left:-90,right:90,top:110,bottom:-90,far:320});scene.add(sun);
  const exterior=buildMExterior(scene,renderer,own),{floors,crown}=exterior;const landscape=buildMLandscape(scene,own,exterior.surfaces);
  let towerB:ReturnType<typeof buildTower54>|undefined,promenade:ReturnType<typeof promenade54>|undefined,selectedTower:'m'|'b'='m',currentPlace:Destination='Duas torres',common:CommonVisit54|undefined;
  let flight:{from:T.Vector3;to:T.Vector3;q0:T.Quaternion;q1:T.Quaternion;t:number;duration:number}|null=null;
  const towerSpec=()=>selectedTower==='b'?TOWER_B54:{x:0,z:0,base:M_BASE,step:M_STEP,levels:M_LEVELS,width:M_REFERENCE.width,depth:M_REFERENCE.depth};
  const currentUnit=(n:number)=>selectedTower==='b'?towerBUnit54(n):unitForFloor(n);
  const waterReflections=waterReflections53(scene,own);
  const atmosphere=createMAtmosphere51(scene,renderer,sun,ambient,own,requestRender);
  const outdoorFog=scene.fog,moonLight=scene.children.find(o=>o instanceof T.DirectionalLight&&o!==sun) as T.DirectionalLight|undefined;let garageFinish:ReturnType<typeof garageExperience55>,parkedCars:T.Object3D|undefined;
  let lighting:ReturnType<typeof installMLighting51>|undefined,lightRig:ReturnType<typeof lightRig53>|undefined,timeValue=0;
  let insideEnvironment:T.WebGLRenderTarget|undefined;
  function roomLighting(){if(!insideEnvironment){const pm=new T.PMREMGenerator(renderer),environment=new RoomEnvironment();insideEnvironment=own(pm.fromScene(environment));environment.dispose();pm.dispose();}return insideEnvironment.texture;}
  const interiors=new Map<string,Model>();
  let unit=unitForFloor(PILOT_FLOOR),interior:Model|undefined,baseY=M_BASE+(unit.startFloor-1)*M_STEP,walkElevation=0;
  function modelFor(next:MUnit){
   const refined=next.id==='m-14';const key=(refined?'apartment69:':'')+next.kind+':'+(next.projection||'none')+':'+interiorStyle53(next).index;let model=interiors.get(key);
   if(!model){preparing=true;if(refined)setApartmentLoading(true);model=refined?buildMApartment69(own,next,floors[13]):buildMInterior(own,Math.min(renderer.capabilities.getMaxAnisotropy(),8),next,exterior.surfaces);const roomLights:T.Light[]=[];model.group.traverse(o=>{if(o instanceof T.Light)roomLights.push(o);});roomLights.forEach(o=>o.removeFromParent());model.group.visible=false;scene.add(model.group);interiors.set(key,model);model.ready.then(async()=>{if(!disposed){lighting?.refresh();await renderer.compileAsync(model!.group,camera,scene);if(!disposed){preparing=false;setApartmentLoading(false);requestRender();}}}).catch(()=>{if(!disposed){setApartmentLoading(false);setError(true);}});}
   return model;
  }
  exterior.ready.then(async()=>{if(!disposed){commonFinish53(scene,own,exterior.surfaces,landscape.deckY);promenade=promenade54(scene,own,exterior.surfaces);lightRig=lightRig53(scene,crown);const detailedCars=await garageAssets55(scene,own,()=>disposed);if(disposed)return;mount.dataset.garageDetailedCars=String(detailedCars??0);garageFinish=garageExperience55(scene,renderer,own);parkedCars=scene.getObjectByName('Garage55 detailed vehicles');lighting=installMLighting51(scene,floors,crown,own);renderer.shadowMap.needsUpdate=true;await renderer.compileAsync(scene,camera);if(!disposed){preparing=false;setReady(true);if(new URLSearchParams(location.search).get('apartamento')==='14')visit('Living',unitForFloor(14));requestRender();}}}).catch(e=>{console.error('EME scene loading',e);if(!disposed)setError(true);});
  let inside=false,yaw=0,pitch=0,desired:T.Vector3|null=null,target:T.Vector3|null=null,currentRoom:string|null=null,drone:DroneStudio56|undefined;
  const pressed=new Set<string>();let pointer:number|null=null,previousX=0,previousY=0;
  const clearMovement=()=>{pressed.clear();pointer=null;stopClick();};
  const look=()=>{camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);};
  const highlight=own(new T.Box3Helper(new T.Box3(),0xbe9a58));highlight.visible=false;scene.add(highlight);own(highlight.geometry);own(highlight.material as T.Material);
  const hm=highlight.material as T.LineBasicMaterial;hm.transparent=true;hm.opacity=.5;
  const pickGeometry=own(new T.BoxGeometry(1,1,1)),pickMaterial=own(new T.MeshBasicMaterial());
  // Detached picking volumes never draw or survive as orphan objects in a cut.
  const picks:T.Mesh[]=[];
  const pickVolume=(floor:number,x:number,z:number,width:number,depth:number,tower:'m'|'b'='m')=>{const spec=tower==='b'?TOWER_B54:{base:M_BASE,step:M_STEP};const mesh=new T.Mesh(pickGeometry,pickMaterial);mesh.position.set(x,spec.base+(floor-.5)*spec.step,z);mesh.scale.set(width,spec.step,depth);mesh.userData={floor,tower};mesh.updateMatrixWorld();picks.push(mesh);};
  for(let n=1;n<=M_LEVELS;n++){pickVolume(n,0,-2.3,M_REFERENCE.width,M_REFERENCE.depth);const duplex=M_REFERENCE.duplexes.find(d=>n>=d.floor&&n<=d.floor+1);if(duplex)pickVolume(n,duplex.side*16.1,6.3,4.2,6.8);}
  const raycaster=new T.Raycaster(),mouse=new T.Vector2();let dragStart:{x:number;y:number}|null=null,cardPinned=false;
  let inspectedUnit:MUnit|null=null,inspectedFloor=0;
  function inspect(n:number,pinned=false){n=facadeRequest68(n,towerSpec().levels);const next=currentUnit(n);inspectedUnit=next;inspectedFloor=n;setInspected(next);setScanFloor(n);cardPinned=pinned;if(pinned)setCardOpen(true);const s=towerSpec();highlight.box.set(new T.Vector3(s.x-s.width/2,s.base+(next.startFloor-1)*s.step,s.z-s.depth/2),new T.Vector3(s.x+s.width/2,s.base+next.endFloor*s.step,s.z+s.depth/2));highlight.visible=pinned;requestRender();}
  const floorAt=(e:PointerEvent)=>{const rect=canvas.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(mouse,camera);const hit=raycaster.intersectObjects(picks,false)[0]?.object;if(hit){selectedTower=hit.userData.tower;setTower(selectedTower);}return hit?.userData.floor as number|undefined;};
  const clickRay=new T.Raycaster(undefined,undefined,0,40);let clickRoute:WalkPoint[]=[];let clickOrigin=new T.Vector3();let clickSpace:WalkSpace63|undefined;
  const destinationRing=new T.Mesh(own(new T.RingGeometry(.15,.21,40)),own(new T.MeshBasicMaterial({color:'#b8dca9',side:T.DoubleSide,depthWrite:false})));destinationRing.rotation.x=-Math.PI/2;destinationRing.visible=false;scene.add(destinationRing);
  function stopClick(message?:string){const moving=clickRoute.length>0;clickRoute=[];destinationRing.visible=false;if(message)setWalkMessage(message);else if(moving)setWalkMessage('Caminhada interrompida. Clique no piso para continuar.');}
  function clickDestination(e:PointerEvent){
   if(!clickEnabled.current||!inside||flight||drone?.isOpen)return;
   const rect=canvas.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);clickRay.setFromCamera(mouse,camera);
   const hit=clickRay.intersectObjects(common?scene.children:interior?[interior.group]:[],true).find(h=>{if(h.object===destinationRing||!(h.object instanceof T.Mesh))return false;for(let p:T.Object3D|null=h.object;p;p=p.parent)if(!p.visible)return false;return true;});
   const floorY=camera.position.y-1.65;
   if(!hit?.face||hit.distance>40||Math.abs(hit.point.y-floorY)>.22||hit.face.normal.clone().transformDirection(hit.object.matrixWorld).y<.75){stopClick('Escolha um ponto livre no piso deste pavimento.');requestRender();return;}
   if(common){clickOrigin.set(0,0,0);clickSpace={obstacles:common.obstacles,bounds:common.bounds,areas:common.areas,exclusions:common.exclusions};}
   else if(interior){const level=interior.levels.reduce((a,b)=>Math.abs(a.elevation-walkElevation)<Math.abs(b.elevation-walkElevation)?a:b);const origin=towerSpec();clickOrigin.set(origin.x,0,origin.z);clickSpace={obstacles:level.obstacles,bounds:level.bounds,areas:level.walkAreas};}
   else return;
   const from={x:camera.position.x-clickOrigin.x,z:camera.position.z-clickOrigin.z},to={x:hit.point.x-clickOrigin.x,z:hit.point.z-clickOrigin.z};
   clickRoute=walkingPath63(from,to,clickSpace);
   if(!clickRoute.length){stopClick('Não há passagem livre até esse ponto. Escolha outro local.');requestRender();return;}
   destinationRing.position.set(hit.point.x,hit.point.y+.025,hit.point.z);destinationRing.visible=true;setWalkMessage('Caminhando… Arraste ou use as setas para interromper.');requestRender();
  }
  const pickMove=(e:PointerEvent)=>{if(drone?.isOpen||inside||interior?.group.visible||dragStart||camera.position.y<0)return;const n=floorAt(e);canvas.style.cursor=n?'pointer':'grab';if(n&&!cardPinned&&!facadeDestination54(currentPlace)&&!desired)inspect(n);};
  const down=(e:PointerEvent)=>{if(drone?.isOpen||e.button!==0)return;dragStart={x:e.clientX,y:e.clientY};if(flight)return;if(!inside)return;canvas.focus();pointer=e.pointerId;previousX=e.clientX;previousY=e.clientY;canvas.setPointerCapture(e.pointerId);};
  const drag=(e:PointerEvent)=>{if(drone?.isOpen||!inside||pointer!==e.pointerId)return;if(dragStart&&Math.hypot(e.clientX-dragStart.x,e.clientY-dragStart.y)>6)stopClick();yaw-=(e.clientX-previousX)*.004;pitch=T.MathUtils.clamp(pitch-(e.clientY-previousY)*.004,-1.1,1.1);previousX=e.clientX;previousY=e.clientY;look();requestRender();};
  const release=(e:PointerEvent)=>{if(pointer===e.pointerId)pointer=null;if(inside&&dragStart&&Math.hypot(e.clientX-dragStart.x,e.clientY-dragStart.y)<6)clickDestination(e);if(!drone?.isOpen&&!inside&&camera.position.y>=0&&!interior?.group.visible&&dragStart&&Math.hypot(e.clientX-dragStart.x,e.clientY-dragStart.y)<6){const n=floorAt(e);if(n)inspect(n,true);}dragStart=null;};
  const cancel=()=>{pointer=null;dragStart=null;};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',drag);canvas.addEventListener('pointermove',pickMove);canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);
  window.addEventListener('blur',clearMovement);document.addEventListener('visibilitychange',clearMovement);canvas.addEventListener('blur',clearMovement);
  const keyMap:Record<string,string>={w:'forward',s:'back',a:'left',d:'right',ArrowUp:'forward',ArrowDown:'back',ArrowLeft:'left',ArrowRight:'right'};
  const up=(e:KeyboardEvent)=>{const direction=keyMap[e.key]||keyMap[e.key.toLowerCase()];if(direction)pressed.delete(direction);};window.addEventListener('keyup',up);
  const stop=()=>{desired=null;target=null;};controls.addEventListener('start',stop);
  controls.addEventListener('change',requestRender);
  const exteriorControls=()=>{
   common=undefined;currentRoom=null;setCommonWalk(false);flight=null;setJourney(false);
   clearMovement();controls.enabled=true;inside=false;canvas.style.cursor='grab';sun.intensity=2.1;sun.position.set(80,115,100);sun.target.position.set(0,0,0);sun.target.updateMatrixWorld();
   Object.assign(sun.shadow.camera,{left:-90,right:90,top:110,bottom:-90});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.025;renderer.shadowMap.needsUpdate=true;
   ambient.intensity=.8;scene.environment=exterior.environment();scene.environmentIntensity=.38;camera.fov=40;camera.updateProjectionMatrix();
   controls.minDistance=5;controls.maxDistance=850;controls.minPolarAngle=0;controls.maxPolarAngle=Math.PI*.49;controls.enablePan=true;controls.screenSpacePanning=true;controls.enableZoom=true;interiors.forEach(m=>m.group.visible=false);floors.forEach(f=>f.visible=true);crown.visible=true;towerB?.floors.forEach(f=>f.visible=true);if(towerB)towerB.crown.visible=true;
  };
  const go=(name:Destination)=>{
   if(name==='Duas torres'||name.includes('Torre Lago'))name='Edifício';
   setPanelOpen(false);currentPlace=name;selectedTower=name.includes('Lago')&&name!=='Parque e lago'?'b':'m';setTower(selectedTower);setCardOpen(false);inspectedUnit=null;
   exteriorControls();setRoom(null);setFloor(0);setPlace(name);setInspected(null);cardPinned=false;floors.forEach(f=>f.visible=true);crown.visible=true;highlight.visible=false;
   if(name==='Rooftop'){
    // Reuse the same shadow map, concentrating its texels on the roof when inspected.
    sun.position.set(80,200,100);sun.target.position.set(0,94,0);sun.target.updateMatrixWorld();
    Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.01;
   }
   if(name==='Galeria e lobby'||name==='Entrada do lobby'){
    sun.target.position.set(0,4,8);sun.target.updateMatrixWorld();
    Object.assign(sun.shadow.camera,{left:-38,right:38,top:38,bottom:-38});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.012;
   }
   if(['Interior da garagem','Elevadores do subsolo','Vagas e recarga'].includes(name)){controls.minDistance=1;controls.maxDistance=48;controls.maxPolarAngle=Math.PI;camera.fov=68;camera.updateProjectionMatrix();}
   if(['Condomínio Pátio','Casas e lotes','Clube do condomínio','Entrada do Pátio','Casa em detalhe'].includes(name)){
    const v=M_SITE_VIEWS[name],size=name==='Condomínio Pátio'?270:60;sun.target.position.set(v[3],0,v[5]);sun.target.updateMatrixWorld();
    Object.assign(sun.shadow.camera,{left:-size,right:size,top:size,bottom:-size,far:650});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=name==='Condomínio Pátio'?.18:.035;
   }
   const v=M_SITE_VIEWS[name];desired=new T.Vector3(v[0],v[1],v[2]);target=new T.Vector3(v[3],v[4],v[5]);if(name==='Edifício'&&camera.aspect<1)desired.multiplyScalar(1.5);
   if(name==='Implantação'){sun.target.position.set(74,30,0);sun.target.updateMatrixWorld();Object.assign(sun.shadow.camera,{left:-135,right:135,top:135,bottom:-135,far:650});sun.shadow.camera.updateProjectionMatrix();if(camera.aspect<1)desired.sub(target).multiplyScalar(1.35).add(target);}
   if(selectedTower==='b'){sun.target.position.set(153,25,-3);sun.target.updateMatrixWorld();Object.assign(sun.shadow.camera,{left:-43,right:43,top:58,bottom:-58,far:650});sun.shadow.camera.updateProjectionMatrix();}
   if(facadeDestination54(name)){const s=towerSpec();inspect(Math.max(1,Math.min(s.levels,Math.round((v[4]-s.base)/s.step+.5))));}
   if(name==='Galeria e lobby'&&camera.aspect<1)desired.sub(target).multiplyScalar(Math.max(1,1.2/camera.aspect)).add(target);
   if((name==='Rooftop'||name==='Fundos')&&camera.aspect<1)desired.sub(target).multiplyScalar(name==='Rooftop'?Math.max(1,1.05/camera.aspect):1.75).add(target);
   requestRender();
  };
  const visit=(name:string,next=unit)=>{
   requestRender();
   const from=camera.position.clone(),q0=camera.quaternion.clone(),wasInside=inside;
   exteriorControls();selectedTower=next.id.startsWith('b-')?'b':'m';setTower(selectedTower);const s=towerSpec();unit=next;interior=modelFor(unit);baseY=s.base+(unit.startFloor-1)*s.step;walkElevation=0;setCardOpen(false);inspectedUnit=null;
   currentRoom=name;setActiveUnit(unit);setFloor(unit.startFloor);setRoom(name);setRooms(Object.keys(interior.views));setInspected(null);cardPinned=false;
   const activeFloors=selectedTower==='b'?towerB!.floors:floors,activeCrown=selectedTower==='b'?towerB!.crown:crown;
   activeFloors.forEach((f,i)=>f.visible=name==='Planta'?i<unit.startFloor-1:i<unit.startFloor-1||i>=unit.endFloor);activeCrown.visible=name!=='Planta';highlight.visible=false;interior.group.position.set(s.x,baseY,s.z);interior.group.visible=true;interior.ceiling.visible=name!=='Planta';controls.enablePan=false;renderer.shadowMap.needsUpdate=true;
   if(name==='Planta'){const full=unit.id==='m-14',height=full?Math.max(52,42/camera.aspect):(camera.aspect<1?56:38),centreZ=s.z+(full?-2.3:0);desired=new T.Vector3(s.x,baseY+height+(unit.endFloor-unit.startFloor)*s.step,centreZ+.1);target=new T.Vector3(s.x,baseY,centreZ);return;}
   sun.position.set(s.x-35,baseY+18,s.z+45);sun.target.position.set(s.x,baseY,s.z);sun.target.updateMatrixWorld();Object.assign(sun.shadow.camera,{left:-28,right:28,top:28,bottom:-28});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.015;sun.intensity=1.8;
   inside=true;controls.enabled=false;ambient.intensity=.45;scene.environment=roomLighting();scene.environmentIntensity=.32;controls.enableZoom=false;camera.fov=68;camera.updateProjectionMatrix();
   const view=interior.views[name as keyof typeof interior.views]||interior.views.Living;
   if(!view)return;
   const eye=new T.Vector3(...view.eye),lookAt=new T.Vector3(...view.look);walkElevation=Math.max(0,eye.y-EYE_HEIGHT);eye.add(new T.Vector3(s.x,baseY,s.z));lookAt.add(new T.Vector3(s.x,baseY,s.z));
   stop();camera.position.copy(eye);controls.target.copy(lookAt);camera.lookAt(lookAt);const angles=new T.Euler().setFromQuaternion(camera.quaternion,'YXZ');yaw=angles.y;pitch=angles.x;flight={from,to:eye.clone(),q0,q1:camera.quaternion.clone(),t:0,duration:wasInside?1.1:2.4};camera.position.copy(from);camera.quaternion.copy(q0);setJourney(true);setPanelOpen(false);canvas.focus();
  };
  function scan(n:number){if(inside)return;const s=towerSpec();n=facadeRequest68(n,s.levels);const next=facadeShift54(camera.position.y,controls.target.y,s.base+(n-.5)*s.step-controls.target.y,s.base,s.levels,s.step);desired=camera.position.clone();desired.y=next.eyeY;target=controls.target.clone();target.y=next.targetY;cardPinned=false;setCardOpen(false);inspect(next.floor);requestRender();}
  function walkCommon(){const view=COMMON_VISITS54[currentPlace];if(!view)return;const from=camera.position.clone(),q0=camera.quaternion.clone();exteriorControls();setRoom(null);setCommonWalk(true);common=view;inside=true;controls.enabled=false;setInspected(null);inspectedUnit=null;highlight.visible=false;setPanelOpen(false);setCardOpen(false);camera.fov=68;camera.updateProjectionMatrix();const to=new T.Vector3(...view.eye),lookAt=new T.Vector3(...view.look);camera.position.copy(to);camera.lookAt(lookAt);const e=new T.Euler().setFromQuaternion(camera.quaternion,'YXZ');yaw=e.y;pitch=e.x;controls.target.copy(lookAt);flight={from,to,q0,q1:camera.quaternion.clone(),t:0,duration:1.8};camera.position.copy(from);camera.quaternion.copy(q0);stop();setJourney(true);canvas.focus();requestRender();}
  api.current={quality:mode=>{qualityMode=mode;qualityLevel=mode==='auto'?initialQuality58(navigator.hardwareConcurrency||4,(navigator as Navigator&{deviceMemory?:number}).deviceMemory):mode;governor.reset(qualityLevel);applyQuality();requestRender();},time:n=>{timeValue=n;requestRender();},go,visit,scan,walk:walkCommon,pinSelection:()=>{if(inspectedUnit)inspect(inspectedFloor,true);},clearSelection:()=>{setInspected(null);inspectedUnit=null;setCardOpen(false);cardPinned=false;highlight.visible=false;requestRender();},floor:n=>{if(!n){go(selectedTower==='b'?'Torre Lago':'Edifício');return;}visit('Planta',currentUnit(n));},move:(direction,active)=>{if(!inside||flight)return;if(active){stopClick();pressed.add(direction)}else pressed.delete(direction);requestRender();},zoom:n=>{stop();if(inside){camera.fov=T.MathUtils.clamp(camera.fov*n,40,85);camera.updateProjectionMatrix();}else camera.position.sub(controls.target).multiplyScalar(n).add(controls.target);requestRender();}};
  drone=createDroneStudio56({scene,camera,renderer,controls,mount,request:requestRender,emit:setDroneState,
   focus:()=>{const s={x:0,z:0,base:M_BASE,levels:M_LEVELS,step:M_STEP};return[s.x,s.base+s.levels*s.step*.5,s.z];},
   context:()=>({place:currentPlace,room:currentRoom,floor:unit.startFloor,tower:selectedTower}),getTime:()=>timeValue,time:n=>{timeValue=n;setDayTime(n);requestRender();},
   suspend:()=>{stop();flight=null;setJourney(false);clearMovement();highlight.visible=false;},
   sync:()=>{const e=new T.Euler().setFromQuaternion(camera.quaternion,'YXZ');yaw=e.y;pitch=e.x;if(!drone?.isOpen){controls.enabled=!inside;controls.enablePan=!inside;controls.minDistance=5;controls.maxDistance=850;controls.maxPolarAngle=Math.PI*.49;}},
   prepare:async ctx=>{
    if(ctx.tower==='b'||ctx.place.includes('Torre Lago'))throw new Error('Este trajeto pertence à Torre Lago, que terá um cenário dedicado.');
    if(!Object.hasOwn(M_SITE_VIEWS,ctx.place))throw new Error('O destino deste trajeto não está disponível nesta versão.');
    if(ctx.place===currentPlace&&ctx.room===currentRoom&&(!ctx.room||(ctx.floor===unit.startFloor&&ctx.tower===selectedTower)))return;
    go(ctx.place as Destination);
    if(ctx.room){const next=unitForFloor(ctx.floor),model=modelFor(next);if(!Object.hasOwn(model.views,ctx.room))throw new Error('Este ambiente interno não está disponível.');visit(ctx.room,next);await model.ready;await renderer.compileAsync(scene,camera);if(flight){camera.position.copy(flight.to);camera.quaternion.copy(flight.q1);}flight=null;setJourney(false);}
    else if(desired&&target){camera.position.copy(desired);controls.target.copy(target);camera.lookAt(target);}
    stop();
   },
  });droneApi.current=drone;
  const key=(e:KeyboardEvent)=>{if(drone?.isOpen)return;if(e.key==='Home'){e.preventDefault();go('Duas torres');return;}const direction=keyMap[e.key]||keyMap[e.key.toLowerCase()];if(inside&&e.key==='Escape'){stopClick('Caminhada interrompida.');requestRender();return;}if(inside&&direction&&!flight){e.preventDefault();stopClick();pressed.add(direction);requestRender();return;}if(!inside&&facadeDestination54(currentPlace)&&['ArrowUp','ArrowDown','PageUp','PageDown'].includes(e.key)){e.preventDefault();const s=towerSpec();scan((inspectedFloor||facadeFloor68(controls.target.y,s.base,s.step,s.levels))+(['ArrowUp','PageUp'].includes(e.key)?1:-1));return;}if(!['ArrowLeft','ArrowRight','+','-'].includes(e.key))return;e.preventDefault();stop();if(e.key==='+'||e.key==='-')api.current?.zoom(e.key==='+'?.85:1.15);else{const p=camera.position.clone().sub(controls.target);p.applyAxisAngle(new T.Vector3(0,1,0),e.key==='ArrowLeft'?.15:-.15);camera.position.copy(controls.target).add(p);}requestRender();};canvas.addEventListener('keydown',key);
  let wheelFloorDelta=0;const wheelHeight=(e:WheelEvent)=>{if(drone?.isOpen||!e.shiftKey||inside||!facadeDestination54(currentPlace))return;e.preventDefault();e.stopImmediatePropagation();wheelFloorDelta-=e.deltaY*.008;const steps=Math.trunc(wheelFloorDelta);if(steps){wheelFloorDelta-=steps;scan(inspectedFloor+steps)};};canvas.addEventListener('wheel',wheelHeight,{capture:true,passive:false});
  function applyQuality(){if(drone?.driving)return;const profile=profiles58[qualityLevel];renderer.setPixelRatio(pixelRatio58(qualityLevel,mount.clientWidth,mount.clientHeight,devicePixelRatio));renderer.setSize(mount.clientWidth,mount.clientHeight);if(sun.shadow.mapSize.x!==profile.shadow){sun.shadow.mapSize.setScalar(profile.shadow);sun.shadow.map?.dispose();sun.shadow.map=null;renderer.shadowMap.needsUpdate=true;}setEffectiveQuality(qualityLevel==='light'?'Leve':qualityLevel==='high'?'Alta':'Equilibrada');mount.dataset.quality=qualityLevel;}
  applyQuality();
  const resize=()=>{if(!drone?.driving){applyQuality();renderer.setSize(mount.clientWidth,mount.clientHeight);camera.aspect=mount.clientWidth/mount.clientHeight;camera.updateProjectionMatrix();}requestRender();};const ro=new ResizeObserver(resize);ro.observe(mount);resize();
  const requestedView=new URLSearchParams(location.search).get('vista');go(requestedView==='duas-torres'?'Duas torres':requestedView==='torre-lago'?'Torre Lago':requestedView==='alameda'?'Alameda iluminada':requestedView==='entrada-patio'?'Entrada do Pátio':requestedView==='casa-detalhe'?'Casa em detalhe':requestedView==='subsolo'?'Interior da garagem':requestedView==='condominio'?'Condomínio Pátio':requestedView==='casas'?'Casas e lotes':requestedView==='clube'?'Clube do condomínio':requestedView==='kids'?'Kids e família':requestedView==='pet'?'Espaço pet':requestedView==='terracos'?'Terraços da galeria':requestedView==='academia'?'MGym':requestedView==='cafe'?'MCoffe':requestedView==='lago'?'Parque e lago':requestedView==='golfe'?'Golfe':requestedView==='rua'?'Rua e chegada':requestedView==='cobertura'?'Cobertura':requestedView==='salao'?'Salão panorâmico':requestedView==='varandas'?'Varandas':requestedView==='lazer'?'Jardim e lazer':requestedView==='quiosque'?'Quiosque':requestedView==='quadras'?'Quadras':requestedView==='garagem'?'Garagem':requestedView==='fachada'?'Fachada':requestedView==='rooftop'?'Rooftop':requestedView==='fundos'?'Fundos':requestedView==='lateral'?'Lateral':requestedView==='fachada-posterior'?'Detalhe dos fundos':requestedView==='implantacao'?'Implantação':requestedView==='galeria'?'Galeria e lobby':requestedView==='lobby'?'Entrada do lobby':'Duas torres');camera.position.copy(desired!);controls.target.copy(target!);stop();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let last=0,frame=0,lastDirection='';const lookVector=new T.Vector3();
  drawFrame=now=>{
   const started=performance.now();
   const dt=Math.min((now-last)/1000,.1);last=now;if(preparing)return;
   const cycle=atmosphere.update(timeValue,inside&&!common,inside&&!common?roomLighting():null);lighting?.update(cycle.lights);promenade?.update(cycle.lights);
   mount.dataset.timeOfDay=cycle.hour.toFixed(2);mount.dataset.night=cycle.night.toFixed(3);mount.dataset.lights=cycle.lights.toFixed(3);mount.dataset.atmosphereRevision='51';
   if(!drone?.isOpen){
   if(desired&&target){const blend=reduced?1:1-Math.exp(-dt*5);camera.position.lerp(desired,blend);controls.target.lerp(target,blend);if(camera.position.distanceTo(desired)<.03){camera.position.copy(desired);controls.target.copy(target);stop();}}
   if(flight){flight.t+=dt;const p=reduced?1:Math.min(1,flight.t/flight.duration),e=p*p*p*(p*(p*6-15)+10);camera.position.lerpVectors(flight.from,flight.to,e);camera.quaternion.slerpQuaternions(flight.q0,flight.q1,e);if(p>=1){flight=null;setJourney(false);}}
   else if(inside&&common){
    const forward=Number(pressed.has('forward'))-Number(pressed.has('back')),side=Number(pressed.has('right'))-Number(pressed.has('left'));
    if(forward||side){const speed=3.0*dt/Math.max(1,Math.hypot(forward,side)),next=walkStep({x:camera.position.x,z:camera.position.z},(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed,common.obstacles,common.bounds,common.areas,common.exclusions);camera.position.set(next.x,common.eye[1],next.z);}look();controls.target.copy(camera.position).add(camera.getWorldDirection(new T.Vector3()).multiplyScalar(8));
   }else if(inside&&interior){
    const forward=Number(pressed.has('forward'))-Number(pressed.has('back')),side=Number(pressed.has('right'))-Number(pressed.has('left'));
    if(forward||side){
     const speed=2.1*dt/Math.max(1,Math.hypot(forward,side)),dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed;
     const level=interior.levels.reduce((best,l)=>Math.abs(l.elevation-walkElevation)<Math.abs(best.elevation-walkElevation)?l:best,interior.levels[0]);
     const origin=towerSpec();const next=walkStep({x:camera.position.x-origin.x,z:camera.position.z-origin.z},dx,dz,level.obstacles,level.bounds,level.walkAreas),stair=interior.stairs.find(s=>next.x>=s.minX&&next.x<=s.maxX&&next.z>=s.minZ&&next.z<=s.maxZ);
     walkElevation=stair?T.MathUtils.lerp(stair.fromY,stair.toY,T.MathUtils.clamp((next.z-stair.startZ)/(stair.endZ-stair.startZ),0,1)):level.elevation;
     camera.position.set(next.x+origin.x,baseY+EYE_HEIGHT+walkElevation,next.z+origin.z);
    }look();
   }
   }
   if(clickRoute.length&&inside&&!flight&&!drone?.isOpen&&clickSpace){
    if(!clickEnabled.current||pressed.size)stopClick();
    else {const target=clickRoute[0],start={x:camera.position.x-clickOrigin.x,z:camera.position.z-clickOrigin.z},dx=target.x-start.x,dz=target.z-start.z,distance=Math.hypot(dx,dz),step=Math.min(distance,(common?2.4:1.65)*dt);
     const next=walkStep(start,dx/Math.max(distance,.001)*step,dz/Math.max(distance,.001)*step,clickSpace.obstacles,clickSpace.bounds,clickSpace.areas,clickSpace.exclusions);
     if(distance>.05&&Math.hypot(next.x-start.x,next.z-start.z)<step*.15){stopClick('Passagem bloqueada. Escolha outro ponto.');}
     else {camera.position.x=next.x+clickOrigin.x;camera.position.z=next.z+clickOrigin.z;const angle=Math.atan2(-dx,-dz);yaw+=Math.atan2(Math.sin(angle-yaw),Math.cos(angle-yaw))*(1-Math.exp(-dt*3));look();if(distance<.055||distance<=step+.005)clickRoute.shift();if(!clickRoute.length)stopClick('Você chegou. Clique em outro ponto para continuar.');}
    }
   }
   mount.dataset.clickWalking=String(clickRoute.length>0);mount.dataset.facadeFloor=String(inspectedFloor);mount.dataset.facadeUnit=inspectedUnit?.id??'';mount.dataset.selectionPinned=String(cardPinned);
   drone?.update(now);
   const orbitChanged=!drone?.driving&&(!inside||drone?.isOpen)&&controls.enabled&&controls.update();
   if(parkedCars)parkedCars.visible=camera.position.y<5;
   const inGarage=garageFinish?.update(camera,profiles58[qualityLevel].reflections)??false;scene.fog=inGarage?null:outdoorFog;
   if(inGarage){scene.environment=garageFinish!.environment;scene.environmentIntensity=.60;ambient.color.set('#e6d9c3');ambient.groundColor.set('#b5ac9b');ambient.intensity=1.4;sun.intensity=0;if(moonLight)moonLight.intensity=0;renderer.toneMappingExposure=1.02;}
   mount.dataset.garageRevision='55';mount.dataset.garageReflections=String(inGarage);
   if(!drone?.isOpen&&!inside&&!interior?.group.visible&&facadeDestination54(currentPlace)&&!cardPinned&&!desired){const s=towerSpec(),n=facadeFloor68(controls.target.y,s.base,s.step,s.levels,inspectedFloor);if(!inspectedUnit||n!==inspectedFloor||currentUnit(n).id!==inspectedUnit.id)inspect(n);}
   if(marker.current){const s=towerSpec(),u=inspectedUnit,v=new T.Vector3();if(u&&!inside&&!interior?.group.visible){const dx=camera.position.x-s.x,dz=camera.position.z-s.z,scale=Math.min((s.width/2+.6)/Math.max(.001,Math.abs(dx)),(s.depth/2+.6)/Math.max(.001,Math.abs(dz)));v.set(s.x+dx*scale,s.base+((u.startFloor+u.endFloor)/2-.5)*s.step,s.z+dz*scale).project(camera);marker.current.style.left=`${(v.x*.5+.5)*mount.clientWidth}px`;marker.current.style.top=`${(-v.y*.5+.5)*mount.clientHeight}px`;marker.current.style.visibility=Math.abs(v.x)<.95&&Math.abs(v.y)<.88&&v.z<1?'visible':'hidden';}else marker.current.style.visibility='hidden';}
   camera.getWorldDirection(lookVector);const nextDirection=mViewDirection(lookVector.x,lookVector.z);if(nextDirection!==lastDirection){lastDirection=nextDirection;setDirection(nextDirection);}
   // Keep centimetre finish layers distinct in the enlarged site's aerial views.
   const near=drone?.isOpen?.06:inside?.08:T.MathUtils.clamp(camera.position.distanceTo(controls.target)*.006,.15,2.5);
   if(Math.abs(camera.near-near)>.005){camera.near=near;camera.updateProjectionMatrix();}
   mount.dataset.apartment64=String(interior?.group.userData.apartment64Ready??false);mount.dataset.apartment69=String(interior?.group.userData.apartment69Ready??false);mount.dataset.walking=String(inside);mount.dataset.camera=camera.position.toArray().map(v=>v.toFixed(2)).join(',');mount.dataset.interior=String(interior?.group.visible??false);mount.dataset.ceiling=String(interior?.ceiling.visible??false);
   mount.dataset.visualRevision='54';mount.dataset.towers='1';mount.dataset.tower=selectedTower;mount.dataset.commonWalk=String(!!common);mount.dataset.transition=String(!!flight);mount.dataset.focusHeight=controls.target.y.toFixed(2);mount.dataset.ledMetres=String(promenade?.root.userData.ledMetres??0);mount.dataset.architectureRevision=String(M_REFERENCE.revision);mount.dataset.interiorStyle=interior?.group.userData.interiorStyle??'';mount.dataset.interiorStatus=unit.id==='m-14'?'floor-14-envelope-69':'previous-study';mount.dataset.unit=unit.id;mount.dataset.level=String(Math.round(walkElevation/M_STEP));mount.dataset.visibleFloors=(selectedTower==='b'?towerB?.floors??[]:floors).filter(f=>f.visible).length.toString();mount.dataset.crown=String(selectedTower==='b'?towerB?.crown.visible:crown.visible);mount.dataset.loadedInteriors=String(interiors.size);mount.dataset.siteVersion=M_SITE.version;mount.dataset.referenceFinish=String(scene.userData.referenceFinish?.revision??0);mount.dataset.realismFinish=String(scene.userData.realismFinish?.revision??0);mount.dataset.blenderFinish=String(scene.userData.blenderFinish?.revision??0);mount.dataset.arrivalBlender=String(scene.userData.arrivalBlender??0);mount.dataset.frame=String(++frame);lightRig?.update(camera,inside&&!common,baseY+walkElevation,cycle.lights,unit.width,controls.target,new T.Vector3(towerSpec().x,0,towerSpec().z));waterReflections.update(camera,inside&&!common,controls.target,profiles58[qualityLevel].reflections);renderer.render(scene,camera);
   drone?.afterRender();
   mount.dataset.drawCalls=String(renderer.info.render.calls);mount.dataset.triangles=String(renderer.info.render.triangles);
   if(qualityMode==='auto'&&!drone?.driving){const next=governor.sample(performance.now()-started);if(next){qualityLevel=next;applyQuality();requestRender();}}

   if(drone?.needsFrame||flight||desired||orbitChanged||clickRoute.length||(inside&&pressed.size))requestRender();
  };
  const visibility=()=>{clearMovement();last=performance.now();if(document.hidden)suspendRender();else requestRender();};document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',suspendRender);window.addEventListener('pageshow',visibility);
  const visibleObserver=new IntersectionObserver(([entry])=>{offscreen=!entry.isIntersecting;if(offscreen){clearMovement();suspendRender();}else{last=performance.now();requestRender();}});visibleObserver.observe(mount);
  return()=>{disposed=true;window.removeEventListener('pagehide',suspendRender);window.removeEventListener('pageshow',visibility);drone?.dispose();droneApi.current=undefined;atmosphere.dispose();suspendRender();visibleObserver.disconnect();document.removeEventListener('visibilitychange',visibility);exterior.dispose();api.current=undefined;ro.disconnect();window.removeEventListener('blur',clearMovement);document.removeEventListener('visibilitychange',clearMovement);canvas.removeEventListener('blur',clearMovement);window.removeEventListener('keyup',up);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',drag);canvas.removeEventListener('pointermove',pickMove);canvas.removeEventListener('pointerup',release);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('lostpointercapture',cancel);canvas.removeEventListener('keydown',key);canvas.removeEventListener('wheel',wheelHeight,true);controls.removeEventListener('change',requestRender);controls.dispose();resources.forEach(r=>r.dispose());renderer.dispose();canvas.remove();};
 },[]);
 const navigate=(name:Destination)=>api.current?.go(name),closeInformation=()=>setInformation(null);
 const levels=tower==='b'?TOWER_B54.levels:M_LEVELS,unitAt=(n:number)=>tower==='b'?towerBUnit54(n):unitForFloor(n);
 const facadeMode=!room&&!commonWalk&&facadeDestination54(place),canWalk=!room&&!!COMMON_VISITS54[place];
 return <main className={`m-experience${droneState?.open?' m-experience--drone':''}${room?' m-experience--residence':''}${!room&&['Rooftop','Implantação','Galeria e lobby','Entrada do lobby','Fundos','Lateral','Detalhe dos fundos'].includes(place)?' m-experience--roof':''}${panelOpen?'':' m-experience--panel-folded'}`} data-room={room||'exterior'}>
  <div ref={host} className="m-canvas" data-testid="m-canvas" data-ready={ready}/>
  <header className="m-header"><a href="/spatial">EME SPATIAL</a><span>M · Torre principal</span><div className="m-header-actions"><a className="m-gallery62-link" href="/apresentar/cozinha">Personalizar cozinha</a><a className="m-gallery62-link" href="/apresentar/patio-m">Pátio M</a><a className="m-gallery62-link" href="/galeria-m.html">Novas imagens</a><button className="m-drone-open" disabled={!ready} onClick={()=>{setReference(false);setPanelOpen(false);setCardOpen(false);droneState?.open?droneApi.current?.close():droneApi.current?.open();}}>{droneState?.open?'Sair do estúdio':'Vídeo drone'}</button><button onClick={()=>setSiteGuide(true)}>Implantação e vistas</button></div></header>
  {apartmentLoading&&<div className="m-load64" role="status">Preparando o apartamento 14…</div>}
  {droneState?.open&&droneApi.current&&<MDronePanel56 state={droneState} studio={droneApi.current}/>}
  <section className="m-daylight" aria-label="Iluminação do cenário">
   <div className="m-daylight-heading"><label htmlFor="m-daylight">Luz e atmosfera</label><output htmlFor="m-daylight">{period.label} · {period.clock}</output></div>
   <input id="m-daylight" type="range" min="0" max="100" step="1" value={dayTime} disabled={!ready} aria-label="Período do dia" aria-valuetext={`${period.label}, ${period.clock}`} onChange={e=>{const value=Number(e.target.value);setDayTime(value);api.current?.time(value);}}/>
   <div className="m-daylight-scale"><span>Dia</span><span>Pôr do sol</span><span>Noite</span></div>
   <label style={{display:'flex',justifyContent:'space-between',gap:8,fontSize:12,marginTop:8}}>Qualidade<select aria-label="Qualidade do cenário" value={quality} disabled={!ready||!!droneState?.open} onChange={e=>{const mode=e.target.value as Quality58;setQuality(mode);api.current?.quality(mode);}}><option value="auto">Automática · {effectiveQuality}</option><option value="light">Leve · economia</option><option value="balanced">Equilibrada</option><option value="high">Alta · mais efeitos</option></select></label>
   <small>{period.lights>.05?'Edifício e condomínio iluminados':'Arraste para acompanhar o anoitecer'}</small>
  </section>
  <button ref={marker} className="m-floor-marker54" style={{visibility:'hidden'}} aria-label={inspected?`Ver imóvel · ${inspected.name} · ${unitFloorLabel(inspected)}`:'Ver imóvel'} onClick={()=>api.current?.pinSelection()}><i aria-hidden="true"/><span>{inspected?unitFloorLabel(inspected):''} · Ver imóvel</span></button>
  {facadeMode&&!reference&&<section className="m-height54" aria-label="Percorrer a torre"><span>{tower==='b'?'Torre Lago':'Torre M'}</span><button aria-label="Subir um andar" onClick={()=>api.current?.scan(scanFloor+1)}>↑</button><input type="range" min="1" max={levels} value={scanFloor} aria-label="Altura na fachada" onChange={e=>api.current?.scan(Number(e.target.value))}/><output>{scanFloor}º</output><button aria-label="Descer um andar" onClick={()=>api.current?.scan(scanFloor-1)}>↓</button></section>}
  {canWalk&&!reference&&<div className="m-common54"><span>{place}</span><button disabled={!ready||journey} onClick={()=>commonWalk?navigate(place):api.current?.walk()}>{commonWalk?'Voltar à vista geral':'Caminhar aqui'} <b aria-hidden="true">↗</b></button></div>}
  {((room&&room!=='Planta')||commonWalk)&&!droneState?.open&&<section className="m-click-walk63"><label><input type="checkbox" checked={clickWalk} onChange={e=>{clickEnabled.current=e.target.checked;setClickWalk(e.target.checked);}}/> Clicar no piso para caminhar</label><small role="status">{clickWalk?walkMessage:'Arraste para olhar. Use as setas para caminhar.'}</small></section>}
  {journey&&<div className="m-journey54" role="status">Entrando no ambiente…</div>}
  {siteGuide&&<MSiteGuide close={()=>setSiteGuide(false)} go={navigate}/>}
  {room&&room!=='Planta'&&<div className="m-view-direction">Olhar: {direction}</div>}
  <button className="m-panel-toggle" aria-expanded={panelOpen} aria-controls="m-navigation" onClick={()=>setPanelOpen(!panelOpen)}>{panelOpen?'Recolher menu':'Explorar espaços'} <span aria-hidden="true">{panelOpen?'−':'+'}</span></button>
  <section className="m-panel" id="m-navigation"><p className="m-eyebrow">EMPREENDIMENTO CONCEITO</p><h1>{room?<>Sua casa.<br/>Outro horizonte.</>:<>Um novo<br/>ponto de vista.</>}</h1><p>{room?`${activeUnit.name} · ${unitFloorLabel(activeUnit)}`:'Escolha um andar e descubra os espaços do M.'}</p>
   <nav className="m-sectors54" aria-label="Explorar o empreendimento" hidden={!!room}>{NAV_GROUPS54.map(group=><details key={group.title} open={group.destinations.includes(place)}><summary>{group.title}</summary><div>{group.destinations.map(d=><button key={d} disabled={!ready} aria-pressed={place===d&&!floor} onClick={()=>navigate(d)}>{d}<span aria-hidden="true">↗</span></button>)}</div></details>)}</nav>
   {import.meta.env.DEV&&!room&&<a href="/estrutura-m.html" style={{display:'block',fontSize:12,margin:'10px 0',color:'inherit'}}>Estudo de estrutura · vistas e corte da galeria ↗</a>}
   <button className="m-visit" disabled={!ready||apartmentLoading} onClick={()=>api.current?.visit('Living',unitForFloor(14))}>Visitar apartamento completo · 14º ↗</button>
   <button className="m-visit" disabled={!ready} onClick={()=>api.current?.visit('Planta',room?activeUnit:unitAt(tower==='b'?4:PILOT_FLOOR))}>{room?'Ver planta da residência':'Conhecer uma residência'}</button>
   {room&&<nav className="m-rooms" aria-label="Visitar a residência">{rooms.map(r=><button key={r} aria-pressed={room===r} onClick={()=>api.current?.visit(r,activeUnit)}>{r}<span aria-hidden="true">↗</span></button>)}<button onClick={()=>navigate(tower==='b'?'Torre Lago':'Edifício')}>Voltar ao edifício</button></nav>}
   <label htmlFor="m-floor">Aproximar pavimento</label><select id="m-floor" value={floor} disabled={!ready} onChange={e=>api.current?.floor(Number(e.target.value))}><option value={0}>Edifício completo</option>{Array.from({length:levels},(_,i)=><option key={i} value={i+1}>{i+1}º andar · {unitAt(i+1).name}</option>)}</select>
   <small>{room?(activeUnit.id==='m-14'?'Pavimento completo conforme o modelo da fachada. Distribuição conceitual, sem planta executiva validada.':`${areaLabel(activeUnit.area)} no estudo interno anterior · ${activeUnit.suites} suítes. Planta em adaptação à nova arquitetura.`):'Passe o mouse ou toque em um andar para ver informações e entrar no imóvel.'}</small>
  </section>
  {!room&&inspected&&cardOpen&&!reference&&<aside className="m-unit-card" aria-label="Residência selecionada" data-testid="m-unit-card"><button className="m-card-close" aria-label="Fechar residência selecionada" onClick={()=>api.current?.clearSelection()}>×</button><span className="m-eyebrow">{unitFloorLabel(inspected)}</span><h2>{inspected.name}</h2><p className="m-unit-area">{areaLabel(inspected.area)} <small>estudo interno anterior</small></p><p>{inspected.suites} suítes · {inspected.endFloor>inspected.startFloor?'dois pavimentos':'uma residência por andar'} · varanda frontal</p><div className="m-unit-actions"><button onClick={()=>setInformation(inspected)}>Ver informações</button><button onClick={()=>api.current?.visit('Living',inspected)}>Navegar pelo imóvel ↗</button></div><small>Planta e metragens em adaptação à nova arquitetura</small></aside>}
  {((room&&room!=='Planta')||commonWalk)&&!reference&&<div className="m-walk" role="group" aria-label={commonWalk?'Caminhar nas áreas comuns':'Caminhar na residência'}><span>Caminhar</span>{[{id:'forward',label:'Avançar',icon:'↑'},{id:'left',label:'Mover à esquerda',icon:'←'},{id:'back',label:'Recuar',icon:'↓'},{id:'right',label:'Mover à direita',icon:'→'}].map(d=><button key={d.id} className={`m-walk-${d.id}`} aria-label={d.label} onClick={()=>{api.current?.move(d.id,true);window.setTimeout(()=>api.current?.move(d.id,false),180);}} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);api.current?.move(d.id,true);}} onPointerUp={()=>api.current?.move(d.id,false)} onPointerCancel={()=>api.current?.move(d.id,false)} onLostPointerCapture={()=>api.current?.move(d.id,false)} onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();api.current?.move(d.id,true);}}} onKeyUp={()=>api.current?.move(d.id,false)} onBlur={()=>api.current?.move(d.id,false)}>{d.icon}</button>)}</div>}
  {room&&<div className="m-room-title" role="status"><span>{activeUnit.name} · {unitFloorLabel(activeUnit)} · {activeUnit.id==='m-14'?'pavimento completo':'estudo interno anterior'}</span><strong>{room}</strong><p>{activeUnit.id==='m-14'?'Estrutura e mobiliário do modelo da fachada':interiorStyle53(activeUnit).name}</p><p>{activeUnit.id==='m-14'?'Área social, dormitórios e sacada contínua':<>{areaLabel(activeUnit.area)} · {activeUnit.suites} suítes{activeUnit.endFloor>activeUnit.startFloor?' · dois níveis':''}</>}</p></div>}
  {!room&&!inspected&&!reference&&(place==='Rooftop'||place==='Fundos')&&<div className="m-room-title" role="status"><span>{place==='Rooftop'?'LAZER EM DOIS NÍVEIS · ACIMA DO 22º ANDAR':'FACHADA POSTERIOR'}</span><strong>{place==='Rooftop'?'Rooftop do M':'Fundos do M'}</strong><p>{place==='Rooftop'?'Piscina 360°, bar central e salão de festas no pavimento inferior.':'Aberturas, madeira e pedra. Varandas amplas concentradas na frente.'}</p></div>}
  <footer className="m-footer"><span>{commonWalk||(room&&room!=='Planta')?'Arraste para olhar · WASD ou setas para caminhar':'Arraste para girar · Botão direito para deslocar'}</span><button aria-label="Aproximar" onClick={()=>api.current?.zoom(.8)}>+</button><button aria-label="Afastar" onClick={()=>api.current?.zoom(1.2)}>−</button><button onClick={()=>navigate('Duas torres')}>Vista inicial</button></footer>
  {!ready&&<div className="m-status" role="status">{error?'Não foi possível carregar o 3D. Reabra a experiência ou consulte a galeria.':'Preparando o empreendimento…'}</div>}
  {reference&&<div className="m-reference"><img src="/assets/m/references54/00-referencia-aprovada.png" alt="Referência aprovada com as duas torres"/><p>Referência visual aprovada · meta de acabamento</p></div>}
  {information&&<div className="m-dialog-backdrop" onClick={closeInformation}><section className="m-unit-dialog" role="dialog" aria-modal="true" aria-labelledby="m-information-title" onClick={e=>e.stopPropagation()} onKeyDown={e=>{
   if(e.key==='Escape'){e.preventDefault();closeInformation();}
   if(e.key==='Tab'){const buttons=e.currentTarget.querySelectorAll<HTMLButtonElement>('button'),first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  }}><button autoFocus className="m-card-close" aria-label="Fechar informações" onClick={closeInformation}>×</button><span className="m-eyebrow">{unitFloorLabel(information)}</span><h2 id="m-information-title">{information.name}</h2><p>{information.description}</p><dl><div><dt>Área interna</dt><dd>{areaLabel(information.interiorArea)}</dd></div><div><dt>Varanda e terraço</dt><dd>{areaLabel(information.terraceArea)}</dd></div><div><dt>Área total</dt><dd>{areaLabel(information.area)}</dd></div><div><dt>Suítes</dt><dd>{information.suites}</dd></div></dl><p className="m-information-note">Planta e metragens do estudo interno anterior, incluindo paredes. Ainda serão compatibilizadas com a nova arquitetura exterior.</p><div className="m-unit-actions"><button onClick={()=>{api.current?.visit('Planta',information);closeInformation();}}>Ver planta</button><button onClick={()=>{api.current?.visit('Living',information);closeInformation();}}>Navegar pelo imóvel ↗</button></div></section></div>}
 </main>;
}
