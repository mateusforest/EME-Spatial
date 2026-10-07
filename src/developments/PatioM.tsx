import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {buildMCondominium42} from './mCondominium42';
import {mSurfaces,type Own} from './mSurfaces';
import {patioNight53} from './mPatioRefinement53';
import {patioPoint53} from './mPatioLayout53';
import './patio.css';

const views:Record<string,number[]>={
 'Visão geral':[410,290,560,45,0,190],
 'Entrada':[24,9,62,4,2,86],
 'Casas e lotes':[83,18,160,-37,3,124],
 'Clube':[97,27,258,40,1,187],
 'Casa em detalhe':[60,11,144,40,3,115],
};
export default function PatioM(){
 const host=useRef<HTMLDivElement>(null),api=useRef<{view:(s:string)=>void;light:(n:number)=>void}|undefined>(undefined);
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[night,setNight]=useState(0),[view,setView]=useState('Visão geral');
 useEffect(()=>{
  const node=host.current!;let disposed=false,frame=0,steps=0;
  const resources=new Set<{dispose:()=>void}>(),own:Own=r=>{resources.add(r);return r;};
  const renderer=new T.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,navigator.hardwareConcurrency<=4?1:1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;renderer.shadowMap.enabled=navigator.hardwareConcurrency>4;renderer.shadowMap.type=T.PCFShadowMap;node.appendChild(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color('#c8dce0');scene.fog=new T.Fog('#c8dce0',700,1700);
  const camera=new T.PerspectiveCamera(45,1,.2,2000),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.12;controls.minDistance=4;controls.maxDistance=850;controls.maxPolarAngle=Math.PI*.49;
  const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),env=own(pmrem.fromScene(room,.04));scene.environment=env.texture;room.dispose();pmrem.dispose();
  const hemi=new T.HemisphereLight('#dceeff','#99886b',2.3),sun=new T.DirectionalLight('#fff0d4',3);sun.position.set(-120,230,130);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-300,right:300,top:300,bottom:-300,near:1,far:850});sun.shadow.normalBias=.08;sun.target.position.set(40,0,180);scene.add(hemi,sun,sun.target);
  const group=new T.Group();scene.add(group);const surfaces=mSurfaces(own,Math.min(4,renderer.capabilities.getMaxAnisotropy()));const homes=buildMCondominium42(group,own,surfaces);homes.name='Pátio M · casas, lotes e clube';
  const ground=new T.Mesh(own(new T.PlaneGeometry(4000,4000)),own(new T.MeshStandardMaterial({color:'#76866a',roughness:1})));ground.rotation.x=-Math.PI/2;ground.position.y=-.12;scene.add(ground);
  // The same curved mapping as the roads keeps the independent scene's LEDs aligned.
  const led=own(new T.MeshStandardMaterial({color:'#fff0d0',emissive:'#ffd399',emissiveIntensity:.15}));
  for(const z of [115,160])for(const side of [-1,1]){
   const points=Array.from({length:70},(_,i)=>{const p=patioPoint53(-135+i*325/69,z+side*5.25);return new T.Vector3(p.x,.31,p.z);});
   group.add(new T.Mesh(own(new T.TubeGeometry(new T.CatmullRomCurve3(points),140,.035,4,false)),led));
  }
  const emitters=new Map<T.MeshStandardMaterial,number>();homes.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof T.MeshStandardMaterial&&m.emissive.getHex()!==0)emitters.set(m,m.emissiveIntensity);});
  let desired:T.Vector3|null=null,target:T.Vector3|null=null;
  function draw(){frame=0;if(disposed||document.hidden)return;if(desired&&target){camera.position.lerp(desired,.12);controls.target.lerp(target,.12);if(camera.position.distanceTo(desired)<.03){camera.position.copy(desired);controls.target.copy(target);desired=null;target=null;}}controls.update();renderer.render(scene,camera);node.dataset.calls=String(renderer.info.render.calls);node.dataset.triangles=String(renderer.info.render.triangles);node.dataset.frames=String(Number(node.dataset.frames||0)+1);if(desired||--steps>0)frame=requestAnimationFrame(draw);}
  function invalidate(){steps=25;if(!frame&&!disposed&&!document.hidden)frame=requestAnimationFrame(draw);}
  const light=(n:number)=>{patioNight53.value=n;scene.background=new T.Color('#c8dce0').lerp(new T.Color('#111e36'),n);(scene.fog as T.Fog).color.copy(scene.background);hemi.intensity=.8-.68*n;sun.intensity=2-1.95*n;sun.position.y=230-215*n;scene.environmentIntensity=.45-.39*n;led.emissiveIntensity=.15+3*n;emitters.forEach((v,m)=>m.emissiveIntensity=v*(.08+.92*n));invalidate();};
  const select=(name:string)=>{const v=views[name]||views['Visão geral'];desired=new T.Vector3(...v.slice(0,3) as [number,number,number]);target=new T.Vector3(...v.slice(3) as [number,number,number]);invalidate();};
  api.current={view:select,light};const legacy:Record<string,string>={'entrada-patio':'Entrada','casa-detalhe':'Casa em detalhe',casas:'Casas e lotes',clube:'Clube'};const initial=legacy[new URLSearchParams(location.search).get('vista')||'']||'Visão geral';const v=views[initial];camera.position.set(v[0],v[1],v[2]);controls.target.set(v[3],v[4],v[5]);setView(initial);light(0);
  const resize=()=>{renderer.setSize(node.clientWidth,node.clientHeight);camera.aspect=node.clientWidth/node.clientHeight;camera.updateProjectionMatrix();invalidate();};const observer=new ResizeObserver(resize);observer.observe(node);
  const start=()=>{desired=null;target=null;invalidate();};controls.addEventListener('start',start);controls.addEventListener('change',invalidate);
  const visibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else invalidate();};document.addEventListener('visibilitychange',visibility);
  surfaces.ready.then(()=>{if(!disposed){node.dataset.ready='true';setReady(true);invalidate();}}).catch(()=>{if(!disposed)setError('Algumas texturas não carregaram. Atualize a página para tentar novamente.');});resize();
  return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',visibility);controls.dispose();resources.forEach(r=>r.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();api.current=undefined;};
 },[]);
 return <main className="patio-page"><div ref={host} className="patio-canvas" data-testid="patio-canvas"/><header><a href="/">EME SPATIAL</a><strong>Pátio M</strong><a href="/apresentar/m">Torre M ↗</a></header><section className="patio-panel"><h1>Pátio M</h1><p>Casas, jardins e espaços de convivência.</p><nav aria-label="Explorar Pátio M">{Object.keys(views).map(name=><button key={name} aria-pressed={view===name} onClick={()=>{setView(name);api.current?.view(name);}}>{name}</button>)}</nav><label htmlFor="patio-light">Luz e atmosfera · {night<.3?'Dia':night<.75?'Entardecer':'Noite'}</label><input id="patio-light" type="range" min="0" max="1" step=".01" value={night} onChange={e=>{const n=Number(e.target.value);setNight(n);api.current?.light(n);}}/><p>Arraste para girar. Botão direito ou dois dedos para deslocar. Use a roda para aproximar.</p><a href="/apresentar/cozinha">Experimentar o configurador de cozinha ↗</a>{!ready&&<p role="status">Preparando o condomínio…</p>}{error&&<p role="alert">{error}</p>}</section><small className="patio-caption">Cenário conceitual · Pátio M</small></main>;
}
