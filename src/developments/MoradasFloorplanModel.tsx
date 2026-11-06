import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight,Box,Minus,Plus,RotateCcw,View} from 'lucide-react';
import {ASSETS} from './moradas';

const rooms=[{id:'living',label:'Estar e jantar',photo:0},{id:'kitchen',label:'Cozinha',photo:1},{id:'bedroom',label:'Dormitório',photo:2},{id:'single',label:'Dormitório individual',photo:4},{id:'bathroom',label:'Banheiro',photo:5}];
type Controls={zoom:(d:number)=>void;rotate:(d:number)=>void;reset:()=>void;top:()=>void;room:(id:string)=>void};

export default function MoradasFloorplanModel({bedrooms,onPhoto}:{bedrooms:number;onPhoto:(index:number)=>void}){
 const host=useRef<HTMLDivElement>(null);
 const api=useRef<Controls|null>(null);
 const [ready,setReady]=useState(false);
 const [failed,setFailed]=useState(false);
 const [selected,setSelected]=useState('');
 const currentRoom=rooms.find(r=>r.id===selected);
 useEffect(()=>{
  let cancelled=false,cleanup:(()=>void)|undefined;
  setReady(false);setFailed(false);setSelected('');
  async function setup(){
   const THREE=await import('three');
   const [{GLTFLoader},{OrbitControls},{RoomEnvironment}]=await Promise.all([import('three/addons/loaders/GLTFLoader.js'),import('three/addons/controls/OrbitControls.js'),import('three/addons/environments/RoomEnvironment.js')]);
   const model=await new GLTFLoader().loadAsync(ASSETS+`floorplans/moradas-plan-${bedrooms===3?3:2}bed.glb`);
   const resources=new Set<{dispose:()=>void}>();
   cleanup=()=>resources.forEach(r=>r.dispose());
   model.scene.traverse(o=>{if(o instanceof THREE.Mesh){resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])resources.add(m);o.castShadow=true;o.receiveShadow=true;}});
   if(cancelled||!host.current){resources.forEach(r=>r.dispose());return;}
   const mount=host.current;
   const scene=new THREE.Scene();scene.add(model.scene);
   const camera=new THREE.PerspectiveCamera(37,1,.1,150);
   const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
   renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
   renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.98;renderer.outputColorSpace=THREE.SRGBColorSpace;
   const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`Estudo 3D de ${bedrooms} dormitórios. Arraste para girar, use dois dedos para aproximar. As setas do teclado giram a planta; mais e menos aproximam; Home restaura.`);mount.appendChild(canvas);
   const controls=new OrbitControls(camera,canvas);controls.enableDamping=false;controls.enablePan=true;controls.maxPolarAngle=1.35;controls.minPolarAngle=.01;controls.minDistance=5;controls.maxDistance=38;controls.rotateSpeed=.55;controls.zoomSpeed=.65;
   cleanup=()=>{api.current=null;controls.dispose();resources.forEach(r=>r.dispose());renderer.dispose();renderer.forceContextLoss();canvas.remove();};
   const bounds=new THREE.Box3().setFromObject(model.scene);const center=bounds.getCenter(new THREE.Vector3());center.y=.1;
   const homeDirection=new THREE.Vector3(.8,1.2,1.15).normalize();
   let frame=0,lost=false,width=1,height=1;
   const own=<T extends {dispose:()=>void}>(value:T)=>{resources.add(value);return value;};
   const pmrem=new THREE.PMREMGenerator(renderer);const studio=new RoomEnvironment();const env=own(pmrem.fromScene(studio,.04));studio.dispose();pmrem.dispose();scene.environment=env.texture;scene.environmentIntensity=.35;
   scene.add(new THREE.HemisphereLight('#fff9e9','#b8c0aa',.85));
   const sun=new THREE.DirectionalLight('#fff1d7',1.9);sun.position.set(-4,12,6);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.1,far:40});sun.shadow.normalBias=.015;sun.shadow.bias=-.0002;scene.add(sun);
   const floor=new THREE.Mesh(own(new THREE.PlaneGeometry(45,45)),own(new THREE.ShadowMaterial({opacity:.16})));floor.rotation.x=-Math.PI/2;floor.position.y=-.14;floor.receiveShadow=true;scene.add(floor);
   function draw(){frame=0;if(cancelled||lost||document.hidden)return;renderer.render(scene,camera);mount.dataset.camera=camera.position.toArray().map(n=>n.toFixed(2)).join(',');}
   function schedule(){if(!frame&&!cancelled&&!lost)frame=requestAnimationFrame(draw);}
   function distance(direction=homeDirection){
    const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize();
    const up=new THREE.Vector3().crossVectors(direction,right).normalize();
    const tan=Math.tan(THREE.MathUtils.degToRad(37/2));let fit=0;
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
     const corner=new THREE.Vector3(x,y,z).sub(center);
     fit=Math.max(fit,corner.dot(direction)+Math.max(Math.abs(corner.dot(right))/(tan*width/height),Math.abs(corner.dot(up))/tan)*1.12);
    }
    return fit;
   }
   function reset(){controls.target.copy(center);camera.position.copy(center).add(homeDirection.clone().multiplyScalar(distance()));controls.update();schedule();}
   function zoom(direction:number){const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*(direction>0?.83:1.2),controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);controls.update();schedule();}
   function rotate(direction:number){const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new THREE.Vector3(0,1,0),direction*.22);camera.position.copy(controls.target).add(offset);controls.update();schedule();}
   function top(){const direction=new THREE.Vector3(0,1,.01).normalize();controls.target.copy(center);camera.position.copy(center).add(direction.clone().multiplyScalar(distance(direction)));controls.update();schedule();}
   // Each room uses its own material instance for highlighting; room IDs are
   // Blender glTF extras, never inferred from the selected sales-unit number.
   model.scene.traverse(o=>{if(o instanceof THREE.Mesh){const materials=Array.isArray(o.material)?o.material:[o.material];const clones=materials.map(m=>own(m.clone()));o.material=Array.isArray(o.material)?clones:clones[0];}});
   function room(id:string){setSelected(id);model.scene.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial){m.emissive.set('#588657');m.emissiveIntensity=(id&&o.userData.roomId===id) ? .22 : 0;}});mount.dataset.selectedRoom=id;schedule();}
   api.current={reset,zoom,rotate,top,room};
   const resize=()=>{const rect=mount.getBoundingClientRect();const first=width===1;const oldAspect=width/height;width=Math.max(1,rect.width);height=Math.max(1,rect.height);renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();if(first||Math.abs(oldAspect-camera.aspect)>.15)reset();schedule();};
   const observer=new ResizeObserver(resize);observer.observe(mount);
   const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();let down={x:0,y:0};
   const pointerDown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY};};
   const pointerUp=(e:PointerEvent)=>{if(e.button!==0||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObject(model.scene,true).find(h=>h.object.userData.roomId);if(hit)room(hit.object.userData.roomId);};
   const keydown=(e:KeyboardEvent)=>{if(!['ArrowLeft','ArrowRight','+','=','-','Home','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();if(e.key==='Home')reset();else if(e.key==='ArrowUp')top();else if(e.key==='ArrowDown')reset();else if(e.key==='ArrowLeft'||e.key==='ArrowRight')rotate(e.key==='ArrowLeft'?-1:1);else zoom(e.key==='-'?-1:1);};
   const lostContext=(e:Event)=>{e.preventDefault();lost=true;setFailed(true);};
   const visibility=()=>{if(!document.hidden)schedule();};
   controls.addEventListener('change',schedule);canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('keydown',keydown);canvas.addEventListener('webglcontextlost',lostContext);document.addEventListener('visibilitychange',visibility);
   cleanup=()=>{api.current=null;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('keydown',keydown);canvas.removeEventListener('webglcontextlost',lostContext);document.removeEventListener('visibilitychange',visibility);resources.forEach(r=>r.dispose());renderer.dispose();renderer.forceContextLoss();canvas.remove();};
   resize();mount.dataset.model=`${bedrooms===3?3:2}-bedroom-reference`;mount.dataset.engine='blender-gltf';setReady(true);
  }
  void setup().catch(()=>{cleanup?.();if(!cancelled)setFailed(true);});
  return()=>{cancelled=true;cleanup?.();};
 },[bedrooms]);
 return <div className="moradas-plan-experience">
  <div className="moradas-plan-heading"><span><Box size={16}/>Planta em 3D</span><small>Estudo · {bedrooms} dormitórios</small></div>
  <div className="moradas-plan-model" ref={host} data-testid="floorplan-model" hidden={failed}/>
  {!ready&&!failed&&<p className="moradas-plan-loading" role="status">Preparando os ambientes…</p>}
  {failed&&<div className="moradas-unit-pending"><Box size={32}/><h3>A vista 3D não pôde ser aberta.</h3><p>Use as abas Planta, Ambientes ou Referência para continuar.</p></div>}
  <div className="moradas-plan-controls" aria-label="Controles da planta 3D">
   <button disabled={!ready||failed} onClick={()=>api.current?.rotate(-1)} aria-label="Girar planta para a esquerda"><ArrowLeft size={17}/></button>
   <button disabled={!ready||failed} onClick={()=>api.current?.rotate(1)} aria-label="Girar planta para a direita"><ArrowRight size={17}/></button>
   <button disabled={!ready||failed} onClick={()=>api.current?.zoom(-1)} aria-label="Afastar planta"><Minus size={17}/></button>
   <button disabled={!ready||failed} onClick={()=>api.current?.zoom(1)} aria-label="Aproximar planta"><Plus size={17}/></button>
   <button disabled={!ready||failed} onClick={()=>api.current?.top()}><View size={17}/><span>Vista superior</span></button>
   <button disabled={!ready||failed} onClick={()=>{api.current?.reset();api.current?.room('');}} aria-label="Restaurar planta"><RotateCcw size={17}/></button>
  </div>
  <div className="moradas-plan-room-picker" aria-label="Ambientes da planta">{rooms.map(r=><button key={r.id} disabled={!ready||failed} aria-pressed={selected===r.id} onClick={()=>api.current?.room(r.id)}>{r.label}</button>)}</div>
  <div className="moradas-plan-help" aria-live="polite">{currentRoom?<><span>{currentRoom.label}</span><button onClick={()=>onPhoto(currentRoom.photo)}>Ver perspectiva <ArrowUpRight size={15}/></button></>:<span>Arraste para girar. Aproxime com dois dedos ou pelos controles.</span>}</div>
 </div>;
}
