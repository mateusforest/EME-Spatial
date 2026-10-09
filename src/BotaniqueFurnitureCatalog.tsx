import {useEffect,useId,useMemo,useRef,useState} from 'react';
import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {Armchair,ArrowLeft,ArrowRight,Bath,BedDouble,Check,LampCeiling,PanelsTopLeft,Refrigerator,RotateCcw,Sofa,Table2,X} from 'lucide-react';
import {botaniqueCatalog,getCatalogGroup} from './botaniqueCatalog';
import type {CatalogGroupId} from './botaniqueCatalog';
import './botaniqueCatalog.css';

export type BotaniqueFurnitureCatalogProps={
 objects:T.Object3D[];
 group:string;
 selections:Record<string,string>;
 onGroupChange:(group:string)=>void;
 onSelect:(group:string,variant:string)=>void;
 onClose:()=>void;
};

const icons={sofa:Sofa,chairs:Armchair,table:Table2,pendant:LampCeiling,cabinetry:PanelsTopLeft,appliance:Refrigerator,bed:BedDouble,bathroom:Bath};
type PreviewRuntime={setModel:(objects:T.Object3D[])=>boolean;draw:()=>void;rotate:(amount:number)=>void;reset:()=>void;destroy:()=>void};

/** Only independent copies of Object3D transforms are changed. Mesh resources remain borrowed. */
function variantMembers(objects:T.Object3D[],group:string,variant:string):T.Object3D[]{
 const matching=[...new Set(objects)].filter(object=>object.userData.variantGroup===group&&object.userData.variantId===variant);
 const selected=new Set(matching);
 return matching.filter(object=>{
  for(let parent=object.parent;parent;parent=parent.parent)if(selected.has(parent))return false;
  return true;
 });
}

function createPreview(host:HTMLDivElement,onFailure:()=>void):PreviewRuntime{
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
 renderer.setClearColor(0,0);renderer.shadowMap.enabled=false;
 const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');host.appendChild(canvas);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.02,60),pivot=new T.Group();scene.add(pivot);
 scene.add(new T.HemisphereLight('#ffffff','#a1afa6',1.0));
 const key=new T.DirectionalLight('#fff0dc',1.65);key.position.set(-3,5,4);scene.add(key);
 const fill=new T.DirectionalLight('#e6f0ff',.6);fill.position.set(4,2,-2);scene.add(fill);
 let environment:T.WebGLRenderTarget|undefined;
 const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();
 try{environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.32;}
 catch{/* Direct lights remain usable if this device cannot build an environment map. */}
 finally{room.dispose();pmrem.dispose();}
 const shadowGeometry=new T.CircleGeometry(1,48),shadowMaterial=new T.MeshBasicMaterial({color:'#35493d',transparent:true,opacity:.12,depthWrite:false});
 const shadow=new T.Mesh(shadowGeometry,shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=-.012;scene.add(shadow);
 let frame:number|null=null,disposed=false,model:T.Group|null=null,drag:{id:number;x:number}|null=null;
 const target=new T.Vector3(0,.6,0),direction=new T.Vector3(-1,.42,.68).normalize();
 const fitCamera=()=>{
  if(!model)return;
  pivot.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(pivot),right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),direction).normalize(),up=new T.Vector3().crossVectors(direction,right);
  const tangent=Math.tan(T.MathUtils.degToRad(camera.fov*.5));let distance=.5;
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
   const corner=new T.Vector3(x,y,z).sub(target);
   distance=Math.max(distance,corner.dot(direction)+Math.max(Math.abs(corner.dot(right))/(tangent*camera.aspect),Math.abs(corner.dot(up))/tangent));
  }
  camera.position.copy(target).addScaledVector(direction,distance*1.18);camera.lookAt(target);
 };
 const draw=()=>{
  if(disposed||frame!==null)return;
  frame=requestAnimationFrame(()=>{frame=null;if(!disposed)renderer.render(scene,camera);});
 };
 const resize=()=>{
  const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);
  renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();fitCamera();draw();
 };
 const reset=()=>{pivot.rotation.y=-.25;fitCamera();draw();};
 const rotate=(amount:number)=>{pivot.rotation.y+=amount;draw();};
 const down=(event:PointerEvent)=>{
  if(event.button!==0||!model)return;drag={id:event.pointerId,x:event.clientX};canvas.setPointerCapture(event.pointerId);
 };
 const move=(event:PointerEvent)=>{
  if(!drag||drag.id!==event.pointerId)return;rotate((event.clientX-drag.x)*.012);drag.x=event.clientX;
 };
 const up=(event:PointerEvent)=>{
  if(drag?.id!==event.pointerId)return;drag=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
 };
 const contextLost=(event:Event)=>{event.preventDefault();onFailure();};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);canvas.addEventListener('webglcontextlost',contextLost);
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 return {
  draw,rotate,reset,
  setModel(objects){
   if(model){pivot.remove(model);model.clear();model=null;}
   shadow.visible=false;if(!objects.length){draw();return false;}
   const contents=new T.Group();
   for(const source of objects){
    source.updateWorldMatrix(true,false);
    const clone=source.clone(true);clone.matrix.copy(source.matrixWorld);clone.matrixAutoUpdate=false;clone.matrixWorldNeedsUpdate=true;clone.visible=true;
    // Geometry, materials and textures are shared intentionally; never dispose or recolor them here.
    clone.traverse(object=>{if(object instanceof T.Light)object.visible=false;});
    contents.add(clone);
   }
   contents.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(contents),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
   const extent=Math.max(size.x,size.y,size.z);
   if(bounds.isEmpty()||!Number.isFinite(extent)||extent<=0){contents.clear();draw();return false;}
   const scale=2.35/extent;contents.position.set(-center.x,-bounds.min.y,-center.z);
   model=new T.Group();model.add(contents);model.scale.setScalar(scale);pivot.add(model);pivot.rotation.y=-.25;
   const height=size.y*scale;target.set(0,height*.46,0);
   // The apartment sofa faces -X. Kitchen fronts face +X/+Z after glTF conversion.
   const group=objects[0].userData.variantGroup;
   // The social vanity faces -Z; show the basin and drawer fronts, not its back.
   direction.set(group==='sofa'?-1:group==='bathroom'?.65:1,.42,group==='bathroom'?-1:.68).normalize();fitCamera();
   shadow.scale.set(Math.max(.3,size.x*scale*.64),Math.max(.3,size.z*scale*.64),1);shadow.visible=true;
   draw();return true;
  },
  destroy(){
   disposed=true;if(frame!==null)cancelAnimationFrame(frame);observer.disconnect();
   canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('lostpointercapture',up);canvas.removeEventListener('webglcontextlost',contextLost);
   model?.clear();pivot.clear();scene.environment=null;environment?.dispose();shadowGeometry.dispose();shadowMaterial.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();
  },
 };
}

export default function BotaniqueFurnitureCatalog({objects,group,selections,onGroupChange,onSelect,onClose}:BotaniqueFurnitureCatalogProps){
 const category=getCatalogGroup(group),titleId=useId(),hintId=useId();
 const [choice,setChoice]=useState({group:category.id,variant:selections[category.id]||'contemporaneo'});
 const [previewError,setPreviewError]=useState(false),[hasPreview,setHasPreview]=useState(false);
 const [announcement,setAnnouncement]=useState('');
 const host=useRef<HTMLDivElement>(null),runtime=useRef<PreviewRuntime|null>(null),panel=useRef<HTMLElement>(null),close=useRef<HTMLButtonElement>(null);
 const onCloseRef=useRef(onClose);onCloseRef.current=onClose;
 const selectedId=selections[category.id]||'contemporaneo';
 const candidateId=choice.group===category.id?choice.variant:selectedId;
 const candidate=category.variants.find(variant=>variant.id===candidateId)||category.variants[0];
 const members=useMemo(()=>variantMembers(objects,category.id,candidate.id),[objects,category.id,candidate.id]);
 const available=members.length>0,applied=selectedId===candidate.id;
 const availability=useMemo(()=>new Set(category.variants.filter(variant=>variantMembers(objects,category.id,variant.id).length>0).map(variant=>variant.id)),[objects,category]);
 useEffect(()=>{
  const previous=document.activeElement,parent=panel.current?.parentElement;close.current?.focus({preventScroll:true});
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onCloseRef.current();}};
  document.addEventListener('keydown',escape,true);
  return()=>{
   document.removeEventListener('keydown',escape,true);
   const visiblePrevious=previous instanceof HTMLElement&&previous!==document.body&&previous.isConnected&&previous.getClientRects().length>0;
   const destination=visiblePrevious?previous:parent?.querySelector<HTMLButtonElement>('.b-catalog-shortcut');
   destination?.focus({preventScroll:true});
  };
 },[]);
 useEffect(()=>{
  if(!host.current)return;
  try{runtime.current=createPreview(host.current,()=>setPreviewError(true));}
  catch{setPreviewError(true);}
  return()=>{runtime.current?.destroy();runtime.current=null;};
 },[]);
 useEffect(()=>{setHasPreview(runtime.current?.setModel(members)??false);},[members]);
 // Shared finishes may have changed in the viewer. Redraw once on a React update, never continuously.
 useEffect(()=>{runtime.current?.draw();});
 function changeGroup(next:CatalogGroupId){setAnnouncement('');setChoice({group:next,variant:selections[next]||'contemporaneo'});onGroupChange(next);}
 function apply(){if(!available)return;onSelect(category.id,candidate.id);setAnnouncement(`${candidate.name} aplicado no ambiente.`);}
 return <aside className="bfc" ref={panel} role="dialog" aria-labelledby={titleId} aria-describedby={hintId}>
  <header className="bfc-header"><div><span className="bfc-eyebrow">CATÁLOGO DEMONSTRATIVO</span><h2 id={titleId}>Seu ambiente, sua escolha.</h2></div><button ref={close} className="bfc-icon-button" aria-label="Fechar catálogo de móveis" onClick={onClose}><X size={18}/></button></header>
  <nav className="bfc-categories" aria-label="Categorias de móveis">{botaniqueCatalog.map(item=>{const Icon=icons[item.id];return <button key={item.id} aria-pressed={category.id===item.id} onClick={()=>changeGroup(item.id)}><Icon size={17}/><span>{item.label}</span></button>;})}</nav>
  <div className="bfc-scroll">
   <div className="bfc-section-heading"><h3>{category.title}</h3><p id={hintId}>Veja em 3D e aplique no ambiente.</p></div>
   <div className="bfc-supplier"><span className="bfc-supplier-mark" aria-hidden="true">{category.supplier.initials}</span><div><strong>{category.supplier.name}</strong><span>{category.supplier.note}</span></div></div>
   <div className="bfc-preview" aria-label={`Prévia 3D de ${candidate.name}`}>
    <div className="bfc-preview-label"><span>PRÉVIA 3D</span>{applied&&<span className="bfc-applied"><Check size={12}/>No ambiente</span>}</div>
    <div className="bfc-preview-canvas" ref={host}/>
    {(previewError||!hasPreview)&&<div className="bfc-preview-empty"><Sofa size={25}/><p>{!available?'Este modelo ainda não está disponível nesta cena.':'A prévia 3D não está disponível neste dispositivo.'}</p></div>}
    {!previewError&&hasPreview&&<div className="bfc-preview-controls"><span>Arraste para girar</span><div><button className="bfc-icon-button" aria-label="Girar prévia à esquerda" onClick={()=>runtime.current?.rotate(-.35)}><ArrowLeft size={14}/></button><button className="bfc-icon-button" aria-label="Restaurar ângulo da prévia" onClick={()=>runtime.current?.reset()}><RotateCcw size={14}/></button><button className="bfc-icon-button" aria-label="Girar prévia à direita" onClick={()=>runtime.current?.rotate(.35)}><ArrowRight size={14}/></button></div></div>}
   </div>
   <div className="bfc-variants" role="group" aria-label={`Modelos de ${category.label.toLowerCase()}`}>{category.variants.map(variant=><button key={variant.id} className={candidate.id===variant.id?'is-previewed':''} aria-pressed={candidate.id===variant.id} disabled={!availability.has(variant.id)} onClick={()=>{setChoice({group:category.id,variant:variant.id});setAnnouncement('');}}><span className="bfc-variant-top"><span>{variant.name}</span>{selectedId===variant.id&&<Check size={14} aria-label="Aplicado no ambiente"/>}</span><small>{variant.finish}</small>{!availability.has(variant.id)&&<em>Modelo em preparação</em>}</button>)}</div>
   <section className="bfc-product" aria-label="Detalhes da opção"><div className="bfc-product-title"><h4>{candidate.name}</h4><span>{category.label}</span></div><p>{candidate.description}</p><ul>{candidate.details.map(detail=><li key={detail}>{detail}</li>)}</ul><small>Acabamentos com aparência ilustrativa; podem acompanhar a ambientação escolhida.</small></section>
  </div>
  <footer className="bfc-footer"><button className="bfc-apply" disabled={!available||applied} onClick={apply}>{applied?<><Check size={17}/>Aplicado no ambiente</>:<>Aplicar no ambiente<ArrowRight size={17}/></>}</button><p>Modelos e fornecedores de demonstração. Sem oferta comercial.</p><span className="bfc-sr-only" role="status" aria-live="polite">{announcement}</span></footer>
 </aside>;
}
