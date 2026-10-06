import * as T from 'three';
import type {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {newRoute56,compileDrone56,pullback56,pointAngles57,orientPoint57,orbitPoints57,droneDimensions56,validRoute56,type Vec56,type DroneRoute56,type DronePoint56,type DroneContext56} from './mDronePath56';

export type DroneState56={open:boolean;route:DroneRoute56;marking:boolean;aiming:boolean;editorMode:'orbit'|'pan'|'pilot';through:boolean;viewHeight:number;focus:'m'|'b';height:number;selected:number;phase:'edit'|'preparing'|'play'|'pause'|'record'|'record-pause'|'finishing';progress:number;message:string;result:{url:string;filename:string;bytes:number;downloadUrl?:string;persisted?:boolean}|null;codec:string};
type Options56={scene:T.Scene;camera:T.PerspectiveCamera;renderer:T.WebGLRenderer;controls:OrbitControls;mount:HTMLElement;request:()=>void;emit:(s:DroneState56)=>void;context:()=>DroneContext56;focus:(tower:'m'|'b')=>Vec56;prepare:(context:DroneContext56)=>Promise<void>;suspend:()=>void;sync:()=>void;time:(n:number)=>void;getTime:()=>number};
export function createDroneStudio56(o:Options56){
 const {camera,controls,renderer,scene,mount}=o,canvas=renderer.domElement;
 const codec=typeof MediaRecorder==='undefined'?'':['video/mp4;codecs=avc1.42001f','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m))??'';
 let state:DroneState56={open:false,route:newRoute56(o.context()),marking:false,aiming:false,editorMode:'orbit',through:false,viewHeight:camera.position.y,focus:'m',height:40,selected:-1,phase:'edit',progress:0,message:'',result:null,codec:codec.includes('mp4')?'MP4':codec?'WebM':''};
 let disposed=false,token=0,lastEmit=0,elapsed=0,lastFrame=0,completed=false;
 let compiled:ReturnType<typeof compileDrone56>|null=null,editorLast=0,priorDamping=true;
 const held=new Set<string>();
 const helper=new T.Group();helper.name='Drone56 route editor';helper.visible=false;scene.add(helper);
 let snapshot:{eye:T.Vector3;quaternion:T.Quaternion;target:T.Vector3;fov:number;aspect:number;ratio:number;size:T.Vector2;enabled:boolean;near:number}|null=null;
 let recorder:MediaRecorder|null=null,stream:MediaStream|null=null,output:HTMLCanvasElement|null=null,context2d:CanvasRenderingContext2D|null=null,chunks:Blob[]=[],aborted=false,upload:AbortController|null=null;
 const emit=()=>{if(!disposed)o.emit({...state,route:{...state.route,points:[...state.route.points]}});};
 const dirty=()=>{state.progress=0;state.message='';if(state.result){URL.revokeObjectURL(state.result.url);state.result=null;}emit();rebuild();o.request();};
 function clearHelpers(){helper.traverse(obj=>{if(obj instanceof T.Mesh||obj instanceof T.Line||obj instanceof T.Sprite){if(!(obj instanceof T.Sprite))obj.geometry?.dispose();for(const material of Array.isArray(obj.material)?obj.material:[obj.material]){if('map'in material)(material.map as T.Texture|null)?.dispose();material.dispose();}}});helper.clear();}
 function rebuild(){
  clearHelpers();helper.visible=state.open&&state.phase==='edit'&&!state.through;const points=state.route.points;compiled=points.length?compileDrone56(state.route):null;if(!points.length)return;
  const geometry=new T.BufferGeometry().setFromPoints(compiled!.trace.map(p=>new T.Vector3(...p)));const line=new T.Line(geometry,new T.LineBasicMaterial({color:'#f6d79c',depthTest:false,transparent:true,opacity:.95}));line.renderOrder=999;helper.add(line);
  const closed=points.length>3&&new T.Vector3(...points[0].eye).distanceTo(new T.Vector3(...points.at(-1)!.eye))<.001;
  points.forEach((p,i)=>{if(closed&&i===points.length-1)return;const end=closed&&i===0,c=document.createElement('canvas');c.width=c.height=96;const ctx=c.getContext('2d')!;const selected=i===state.selected||(end&&state.selected===points.length-1);ctx.fillStyle=selected?'#f2c675':'#264f40';ctx.strokeStyle='#fffbee';ctx.lineWidth=6;ctx.beginPath();ctx.arc(48,48,39,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=selected?'#18382b':'#fffbee';ctx.font=end?'bold 28px Arial':'bold 40px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(end?'1·'+points.length:String(i+1),48,50);
   const sprite=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:false,depthWrite:false}));sprite.position.set(...p.eye);sprite.userData.dronePoint=i;sprite.renderOrder=1000;helper.add(sprite);
  });
  const p=points[state.selected];if(p){const ray=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(...p.eye),new T.Vector3(...p.look)]),new T.LineDashedMaterial({color:'#a6e5de',dashSize:1,gapSize:.7,depthTest:false}));ray.computeLineDistances();ray.renderOrder=998;helper.add(ray);const target=new T.Mesh(new T.SphereGeometry(.7,10,8),new T.MeshBasicMaterial({color:'#9de8de',depthTest:false}));target.position.set(...p.look);target.renderOrder=998;helper.add(target);}
 }
 const driving=()=>state.phase!=='edit';
 function restore(){
  if(snapshot){camera.position.copy(snapshot.eye);camera.quaternion.copy(snapshot.quaternion);camera.fov=snapshot.fov;camera.aspect=mount.clientWidth/mount.clientHeight;camera.near=snapshot.near;camera.updateProjectionMatrix();controls.target.copy(snapshot.target);controls.enabled=snapshot.enabled;renderer.setPixelRatio(snapshot.ratio);renderer.setSize(mount.clientWidth,mount.clientHeight);canvas.style.width='';canvas.style.height='';canvas.style.objectFit='';canvas.style.background='';snapshot=null;o.sync();}
  if(state.open)configureEditor();helper.visible=state.open&&!state.through;o.request();
 }
 function apply(progress:number){const sample=compiled!.sample(progress);camera.position.set(...sample.eye);controls.target.set(...sample.look);camera.up.set(0,1,0);camera.lookAt(controls.target);camera.rotateZ(sample.roll);camera.fov=sample.fov;camera.near=.06;camera.updateProjectionMatrix();}
 function stop(message=''){
  ++token;aborted=true;held.clear();upload?.abort();upload=null;if(recorder&&recorder.state!=='inactive')recorder.stop();stream?.getTracks().forEach(t=>t.stop());recorder=null;stream=null;output=null;context2d=null;chunks=[];state.phase='edit';state.marking=false;state.aiming=false;state.message=message;restore();emit();
 }
 const sourcePoint=():DronePoint56=>{const eye=camera.position.toArray() as [number,number,number],look=camera.position.clone().add(camera.getWorldDirection(new T.Vector3()).multiplyScalar(Math.max(8,camera.position.distanceTo(controls.target))));return{id:crypto.randomUUID(),eye,look:look.toArray() as [number,number,number],fov:camera.fov};};
 function compatible(){const ctx=o.context();return!state.route.points.length||(!ctx.room&&!state.route.context.room)||(ctx.room===state.route.context.room&&ctx.floor===state.route.context.floor&&ctx.tower===state.route.context.tower);}
 function add(point:DronePoint56){
  if(driving())return;if(state.route.points.length>=32){state.message='Use até 32 pontos por voo.';emit();return;}
  if(!compatible()){state.message='Inicie um novo voo para filmar outro interior.';emit();return;}
  if(!state.route.points.length){state.route.context={...o.context(),tower:o.context().room?o.context().tower:state.focus};state.route.dayTime=o.getTime();}
  state.route.points.push(point);state.selected=state.route.points.length-1;dirty();
 }
 function configureEditor(){controls.enableDamping=false;controls.enablePan=true;controls.enableZoom=true;controls.minDistance=.3;controls.maxDistance=1600;controls.minPolarAngle=.001;controls.maxPolarAngle=Math.PI-.001;controls.mouseButtons.LEFT=state.editorMode==='pan'?T.MOUSE.PAN:T.MOUSE.ROTATE;controls.mouseButtons.RIGHT=state.editorMode==='pan'?T.MOUSE.ROTATE:T.MOUSE.PAN;controls.enabled=state.editorMode!=='pilot';canvas.style.cursor=state.marking||state.aiming?'crosshair':'grab';}
 function cameraChanged(){state.viewHeight=camera.position.y;o.sync();emit();o.request();}
 function translateView(x:number,y:number,z:number){const forward=camera.getWorldDirection(new T.Vector3());forward.y=0;forward.normalize();if(forward.lengthSq()<.001)forward.set(0,0,-1);const right=new T.Vector3(-forward.z,0,forward.x),delta=right.multiplyScalar(x).addScaledVector(forward,z);delta.y=y;camera.position.add(delta);controls.target.add(delta);o.suspend();cameraChanged();}
 function editorMode(mode:DroneState56['editorMode']){if(driving())return;state.editorMode=mode;state.marking=false;state.aiming=false;state.through=false;o.suspend();configureEditor();rebuild();cameraChanged();}
 function mapView(){if(driving())return;editorMode('pan');const points=state.route.points,center=new T.Vector3(...o.focus(state.focus));let width=180,depth=180;
  if(points.length){const bounds=new T.Box3().setFromPoints(points.map(p=>new T.Vector3(...p.eye)));bounds.getCenter(center);const size=bounds.getSize(new T.Vector3());width=Math.max(90,size.x+25);depth=Math.max(90,size.z+25);}
  const rect=canvas.getBoundingClientRect(),nav=mount.parentElement?.querySelector('.drone57-nav')?.getBoundingClientRect(),panel=mount.parentElement?.querySelector<HTMLElement>('.m-drone56');
  const top=nav?nav.bottom-rect.top+24:30,right=panel&&!panel.hidden&&rect.width>700?panel.getBoundingClientRect().width+40:24,bottom=panel&&!panel.hidden&&rect.width<=700?panel.getBoundingClientRect().height+30:24;
  const units=Math.max(width/Math.max(150,rect.width-24-right),depth/Math.max(180,rect.height-top-bottom));
  center.x-=(24-right)*.5*units;center.z-=(top-bottom)*.5*units;center.y=state.height;camera.fov=48;
  camera.position.copy(center).add(new T.Vector3(0,units*rect.height/(2*Math.tan(camera.fov*Math.PI/360)),.01));controls.target.copy(center);camera.up.set(0,1,0);camera.lookAt(center);camera.updateProjectionMatrix();cameraChanged();}
 async function viewPoint(){if(driving()||!state.route.points[state.selected])return;state.marking=false;state.aiming=false;state.phase='preparing';emit();const run=++token;
  try{await o.prepare(state.route.context);if(disposed||run!==token)return;o.suspend();state.phase='edit';state.editorMode='pilot';state.through=true;const p=state.route.points[state.selected];camera.position.set(...p.eye);controls.target.set(...p.look);camera.up.set(0,1,0);camera.lookAt(controls.target);camera.fov=p.fov;camera.updateProjectionMatrix();configureEditor();rebuild();cameraChanged();}catch(e){stop(e instanceof Error?e.message:'Não foi possível abrir este ponto.');}
 }
 function updateSelected(){dirty();if(state.through){const p=state.route.points[state.selected];if(p){camera.position.set(...p.eye);controls.target.set(...p.look);camera.lookAt(controls.target);camera.fov=p.fov;camera.updateProjectionMatrix();cameraChanged();}}}
 function rayAt(e:PointerEvent){const rect=canvas.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);return ray;}
 const pointerStart={x:0,y:0};let dragging:{id:number;index:number;offset:T.Vector3;linkedEnd:boolean}|null=null,looking:{id:number;x:number;y:number}|null=null;
 const down=(e:PointerEvent)=>{
  if(!state.open||driving()||e.button!==0)return;pointerStart.x=e.clientX;pointerStart.y=e.clientY;canvas.focus();
  const ray=rayAt(e),hit=helper.visible?ray.intersectObjects(helper.children,false).find(h=>h.object instanceof T.Sprite):null;
  if(hit){state.selected=hit.object.userData.dronePoint;const p=state.route.points[state.selected],at=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-p.eye[1]),new T.Vector3());dragging={id:e.pointerId,index:state.selected,offset:at?new T.Vector3(...p.eye).sub(at):new T.Vector3(),linkedEnd:state.selected===0&&state.route.points.length>3&&new T.Vector3(...p.eye).distanceTo(new T.Vector3(...state.route.points.at(-1)!.eye))<.001};controls.enabled=false;e.stopImmediatePropagation();canvas.setPointerCapture(e.pointerId);dirty();}
  else if(state.aiming){e.stopImmediatePropagation();}
  else if(state.editorMode==='pilot'){looking={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);e.stopImmediatePropagation();}
 };
 const move=(e:PointerEvent)=>{
  if(dragging&&e.pointerId===dragging.id){e.stopImmediatePropagation();const p=state.route.points[dragging.index],at=rayAt(e).ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-p.eye[1]),new T.Vector3());if(at&&at.distanceTo(camera.position)<2500){at.add(dragging.offset);p.eye=[at.x,p.eye[1],at.z];if(dragging.linkedEnd)state.route.points.at(-1)!.eye=[...p.eye];dirty();}return;}
  if(looking&&e.pointerId===looking.id){e.stopImmediatePropagation();const p=sourcePoint(),a=pointAngles57(p),aim=orientPoint57(p,{yaw:a.yaw+(e.clientX-looking.x)*.23,pitch:a.pitch-(e.clientY-looking.y)*.23});looking.x=e.clientX;looking.y=e.clientY;controls.target.set(...aim.look);camera.lookAt(controls.target);cameraChanged();}
 };
 const click=(e:PointerEvent)=>{
  if(!state.open||driving()||e.button!==0)return;
  if(dragging){dragging=null;configureEditor();e.stopImmediatePropagation();return;}
  looking=null;if(Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>6)return;
  const ray=rayAt(e);
  if(state.aiming){const hit=ray.intersectObjects(scene.children,true).find(h=>{let obj:T.Object3D|null=h.object;if(!(obj instanceof T.Mesh))return false;while(obj){if(!obj.visible||obj===helper)return false;obj=obj.parent;}return true;});if(hit&&state.route.points[state.selected]){state.route.points[state.selected].look=hit.point.toArray() as Vec56;state.aiming=false;configureEditor();updateSelected();}else{state.message='Clique sobre uma superfície visível para definir o alvo.';emit();}e.stopImmediatePropagation();return;}
  if(!state.marking)return;
  const point=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-state.height),new T.Vector3());
  if(!point||point.distanceTo(camera.position)>2500||point.distanceTo(camera.position)<.2){state.message='Use “Mapa da rota” para marcar a posição com precisão.';emit();return;}
  const p=sourcePoint();p.eye=point.toArray() as Vec56;p.look=o.focus(state.focus);if(point.distanceTo(new T.Vector3(...p.look))<.2)p.look[2]-=5;add(p);
 };
 const cancelPointer=()=>{dragging=null;looking=null;if(state.open&&!driving())configureEditor();};
 const wheel=(e:WheelEvent)=>{if(state.open&&!driving()&&state.editorMode==='pilot'){e.preventDefault();e.stopImmediatePropagation();translateView(0,0,-Math.sign(e.deltaY)*(e.shiftKey?10:3));}};
 canvas.addEventListener('pointerdown',down,true);canvas.addEventListener('pointermove',move,true);canvas.addEventListener('pointerup',click,true);canvas.addEventListener('pointercancel',cancelPointer);canvas.addEventListener('lostpointercapture',cancelPointer);canvas.addEventListener('wheel',wheel,{capture:true,passive:false});
 const key=(e:KeyboardEvent)=>{if(!state.open)return;if(e.key==='Escape'){if(driving()){e.preventDefault();stop('Prévia encerrada.');}else{state.marking=false;state.aiming=false;configureEditor();emit();}}else if(!driving()&&e.target===canvas&&['w','a','s','d','q','e','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key.toLowerCase().startsWith('arrow')?e.key:e.key.toLowerCase())){e.preventDefault();const k=e.key.toLowerCase();if(!held.has(k)&&['w','a','s','d','q','e'].includes(k))translateView(k==='d'?.5:k==='a'?-.5:0,k==='e'?.5:k==='q'?-.5:0,k==='w'?.5:k==='s'?-.5:0);held.add(k);o.suspend();o.request();}};
 const keyUp=(e:KeyboardEvent)=>held.delete(e.key.toLowerCase()),blur=()=>held.clear();window.addEventListener('keydown',key);window.addEventListener('keyup',keyUp);window.addEventListener('blur',blur);canvas.addEventListener('blur',blur);
 function pause(){if(state.phase==='play'){state.phase='pause';}else if(state.phase==='record'){if(recorder?.state==='recording')recorder.pause();state.phase='record-pause';}else if(state.phase==='pause'){state.phase='play';lastFrame=0;}else if(state.phase==='record-pause'){if(recorder?.state==='paused')recorder.resume();state.phase='record';lastFrame=0;}emit();o.request();}
 const visibility=()=>{if(document.hidden&&(state.phase==='play'||state.phase==='record')){pause();state.message='Voo pausado enquanto esta aba está oculta.';emit();}};document.addEventListener('visibilitychange',visibility);
 function finishRecording(){if(recorder&&recorder.state!=='inactive'){state.phase='finishing';recorder.stop();emit();}}
 async function start(record=false){
  if(driving())stop();if(state.route.points.length<2){state.message='Marque pelo menos dois pontos para voar.';emit();return;}
  state.marking=false;state.aiming=false;held.clear();compiled=compileDrone56(state.route);state.phase='preparing';state.message='Preparando a cena…';helper.visible=false;emit();const run=++token;
  try{
   await o.prepare(state.route.context);if(disposed||run!==token)return;
   o.suspend();o.time(state.route.dayTime);snapshot={eye:camera.position.clone(),quaternion:camera.quaternion.clone(),target:controls.target.clone(),fov:camera.fov,aspect:camera.aspect,ratio:renderer.getPixelRatio(),size:renderer.getSize(new T.Vector2()),enabled:controls.enabled,near:camera.near};
   controls.enabled=false;const [width,height]=droneDimensions56(state.route);renderer.setPixelRatio(1);renderer.setSize(width,height,false);canvas.style.width='100%';canvas.style.height='100%';canvas.style.objectFit='contain';canvas.style.background='#17201c';camera.aspect=width/height;elapsed=0;lastFrame=0;completed=false;state.progress=0;apply(0);
   if(record){
    if(!codec||!canvas.captureStream)throw new Error('Este navegador não oferece gravação. Você pode salvar o trajeto e abri-lo em um navegador compatível.');
    output=document.createElement('canvas');output.width=width;output.height=height;context2d=output.getContext('2d',{alpha:false});if(!context2d)throw new Error('Não foi possível preparar o vídeo.');
    stream=output.captureStream(30);recorder=new MediaRecorder(stream,{mimeType:codec,videoBitsPerSecond:state.route.quality==='fullhd'?12000000:6500000});chunks=[];aborted=false;const activeRecorder=recorder,activeStream=stream;
    activeRecorder.ondataavailable=e=>{if(e.data.size&&!aborted&&run===token)chunks.push(e.data);};
    activeRecorder.onerror=()=>{if(run===token)stop('Não foi possível gravar. Tente a qualidade HD ou outro navegador.');};
    activeRecorder.onstop=async()=>{
     activeStream.getTracks().forEach(t=>t.stop());if(aborted||disposed||run!==token)return;const blob=new Blob(chunks,{type:activeRecorder.mimeType});chunks=[];recorder=null;stream=null;output=null;context2d=null;
     if(state.result)URL.revokeObjectURL(state.result.url);const extension=activeRecorder.mimeType.includes('mp4')?'mp4':'webm';const name=state.route.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-|-$/g,'')||'eme-voo';
     state.result=blob.size?{url:URL.createObjectURL(blob),filename:name+'.'+extension,bytes:blob.size}:null;
     if(blob.size){
      state.message='Guardando o vídeo neste PC…';emit();upload=new AbortController();
      try{const response=await fetch('/api/spatial-local/videos',{method:'POST',headers:{'Content-Type':'video/'+extension,'X-Video-Name':encodeURIComponent(state.route.name)},body:blob,signal:upload.signal});if(!response.ok)throw new Error('O serviço local não está disponível.');const saved=await response.json();if(run!==token||disposed)return;if(state.result)URL.revokeObjectURL(state.result.url);state.result={url:saved.url,filename:saved.filename,bytes:saved.bytes,downloadUrl:saved.downloadUrl,persisted:true};state.message='Vídeo salvo neste PC. Pronto para assistir e baixar.';}
      catch{if(run!==token||disposed)return;state.message='Vídeo pronto nesta sessão. O salvamento no PC não está disponível; baixe antes de sair.';}finally{upload=null;}
     }else state.message='O vídeo ficou vazio. Tente gravar novamente.';
     state.phase='edit';restore();emit();
    };
   }
   state.phase=record?'record':'play';state.message=record?'Gravando a cena. Mantenha esta aba aberta.':'';emit();o.request();
  }catch(error){stop(error instanceof Error?error.message:'Não foi possível iniciar o voo.');}
 }
 return{
  get isOpen(){return state.open;},get driving(){return driving();},get needsFrame(){return state.phase==='play'||state.phase==='record'||held.size>0;},
  open(){priorDamping=controls.enableDamping;o.suspend();state.open=true;state.focus=state.route.points.length?state.route.context.tower:o.context().tower;if(!state.route.points.length){state.route.context=o.context();state.route.dayTime=o.getTime();state.height=camera.position.y<0?Math.round(camera.position.y*10)/10:Math.round(T.MathUtils.clamp(camera.position.y*.6,12,80));}configureEditor();emit();rebuild();o.request();},
  close(){stop();state.open=false;state.through=false;helper.visible=false;controls.enableDamping=priorDamping;controls.mouseButtons.LEFT=T.MOUSE.ROTATE;controls.mouseButtons.RIGHT=T.MOUSE.PAN;o.sync();emit();o.request();},
  editorMode,mapView,viewPoint,moveView:(x:number,y:number,z:number)=>{if(!driving())translateView(x,y,z);},
  focus(value:'m'|'b'){state.focus=value;emit();},
  aimTower(){const p=state.route.points[state.selected];if(!p||driving())return;p.look=o.focus(state.focus);updateSelected();},
  aiming(){if(driving()||state.selected<0)return;state.aiming=!state.aiming;state.marking=false;state.message=state.aiming?'Clique na fachada, no jardim ou em outra superfície para apontar a câmera.':'';configureEditor();emit();},
  angles(angles:Partial<{yaw:number;pitch:number;fov:number}>){if(driving())return;const p=state.route.points[state.selected];if(p){state.route.points[state.selected]=orientPoint57(p,angles);updateSelected();}},
  orbit(radius:number,height:number){if(driving())return;if(o.context().room||camera.position.y<0){state.message='Abra uma vista externa para criar a volta completa.';emit();return;}const center=o.focus(state.focus),angle=Math.atan2(camera.position.x-center[0],camera.position.z-center[2]);state.route={...newRoute56({...o.context(),tower:state.focus},o.getTime()),name:'Volta completa · '+(state.focus==='m'?'Torre M':'Torre Lago'),duration:30,points:orbitPoints57(center,T.MathUtils.clamp(radius,35,300),T.MathUtils.clamp(height,5,250),angle)};state.selected=0;state.height=height;state.through=false;dirty();mapView();},
  marking(){if(driving())return;if(state.editorMode==='pilot')editorMode('pan');state.marking=!state.marking;state.aiming=false;state.message=state.marking?'Clique para adicionar. Arraste uma bolinha para corrigir sua posição.':'';configureEditor();emit();},
  addView(){add(sourcePoint());},
  preset(approach=false){if(driving())return;const point=sourcePoint();if(camera.position.y<0){state.message='No subsolo, guarde enquadramentos ao longo do corredor para evitar atravessar paredes.';emit();return;}const points=pullback56(point);if(approach){points.reverse();points.forEach((p,i)=>p.fov=Math.min(90,p.fov+(2-i)*5));}state.route={...newRoute56(o.context(),o.getTime()),name:approach?'Aproximação cinematográfica':'Revelar o empreendimento',points};state.selected=0;state.through=false;dirty();},
  fresh(){stop();state.through=false;state.route=newRoute56(o.context(),o.getTime());state.selected=-1;dirty();},
  load(route:DroneRoute56){stop();state.through=false;state.route=validRoute56(route);state.focus=route.context.tower;state.height=route.points[0]?.eye[1]??state.height;state.selected=0;dirty();},
  patch(patch:Partial<Pick<DroneRoute56,'name'|'duration'|'motion'|'format'|'quality'|'dayTime'>>){if(driving())return;state.route={...state.route,...patch};if(patch.dayTime!==undefined)o.time(patch.dayTime);dirty();},
  height(value:number){state.height=T.MathUtils.clamp(value,-2.7,350);emit();},
  select(i:number){state.selected=i;emit();rebuild();if(state.through)void viewPoint();o.request();},
  changePoint(i:number,change:'up'|'down'|'remove'|'replace',height?:number){if(driving())return;const points=state.route.points;if(!points[i])return;
   if(change==='remove'){points.splice(i,1);state.selected=Math.min(i,points.length-1);}else if(change==='replace')points[i]=sourcePoint();else {const j=i+(change==='up'?-1:1);if(j>=0&&j<points.length){[points[i],points[j]]=[points[j],points[i]];state.selected=j;}}
   if(height!==undefined&&points[i])points[i].eye[1]=height;updateSelected();
  },
  pointHeight(i:number,height:number){if(driving()||!state.route.points[i])return;state.route.points[i].eye[1]=T.MathUtils.clamp(height,-2.7,350);updateSelected();},
  start,pause,stop,
  seek(value:number){if(!snapshot||state.phase==='record'||state.phase==='record-pause'||state.phase==='finishing')return;state.progress=T.MathUtils.clamp(value,0,1);elapsed=state.progress*state.route.duration;lastFrame=0;completed=false;apply(state.progress);emit();o.request();},
  update(now:number){
   const dt=Math.min(.08,(now-editorLast)/1000);editorLast=now;
   if(state.open&&!driving()&&held.size){const speed=18*dt,x=Number(held.has('d'))-Number(held.has('a')),y=Number(held.has('e'))-Number(held.has('q')),z=Number(held.has('w'))-Number(held.has('s'));if(x||y||z)translateView(x*speed,y*speed,z*speed);const turn=Number(held.has('arrowright'))-Number(held.has('arrowleft')),tilt=Number(held.has('arrowup'))-Number(held.has('arrowdown'));if(turn||tilt){const p=sourcePoint(),a=pointAngles57(p),aim=orientPoint57(p,{yaw:a.yaw+turn*45*dt,pitch:a.pitch+tilt*40*dt});controls.target.set(...aim.look);camera.lookAt(controls.target);cameraChanged();}}
   if(state.phase==='play'||state.phase==='record'){if(state.phase==='record'&&recorder?.state==='inactive'){lastFrame=0;}else {if(lastFrame)elapsed+=(now-lastFrame)/1000;lastFrame=now;}state.progress=Math.min(1,elapsed/state.route.duration);apply(state.progress);if(now-lastEmit>120){lastEmit=now;emit();}if(state.progress>=1)completed=true;}
   if(helper.visible)for(const obj of helper.children)if(obj instanceof T.Sprite)obj.scale.setScalar(T.MathUtils.clamp(2*camera.position.distanceTo(obj.position)*Math.tan(camera.fov*Math.PI/360)*34/Math.max(1,mount.clientHeight),.16,100));
   mount.dataset.dronePhase=state.phase;mount.dataset.dronePoints=String(state.route.points.length);mount.dataset.droneProgress=state.progress.toFixed(3);mount.dataset.droneEditor=state.editorMode;mount.dataset.droneRevision='57';
  },
  afterRender(){
   if(state.phase==='record'&&context2d&&output){context2d.filter='saturate(1.06) contrast(1.025)';context2d.drawImage(canvas,0,0,output.width,output.height);if(recorder?.state==='inactive'){recorder.start(250);lastFrame=0;}}
   if(completed){completed=false;if(state.phase==='record')finishRecording();else if(state.phase==='play'){state.phase='pause';state.message='Fim da prévia. Volte ou encerre para editar.';emit();}mount.dataset.dronePhase=state.phase;}
  },
  dispose(){disposed=true;stop();canvas.removeEventListener('pointerdown',down,true);canvas.removeEventListener('pointermove',move,true);canvas.removeEventListener('pointerup',click,true);canvas.removeEventListener('pointercancel',cancelPointer);canvas.removeEventListener('lostpointercapture',cancelPointer);canvas.removeEventListener('wheel',wheel,true);window.removeEventListener('keydown',key);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',blur);canvas.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);clearHelpers();helper.removeFromParent();if(state.result)URL.revokeObjectURL(state.result.url);},
 };
}
export type DroneStudio56=ReturnType<typeof createDroneStudio56>;
