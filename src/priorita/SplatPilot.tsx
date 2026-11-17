import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {SparkRenderer,SplatMesh} from '@sparkjsdev/spark';
import {terrainHeight} from './model';

/**
 * Priorità Serra · piloto de Gaussian Splatting.
 * O splat foi treinado (Brush) a partir de 139 renders do Blender com câmeras exatas, no sistema de
 * coordenadas do Blender (Z para cima). Aqui ele é girado para o sistema da web (Y para cima).
 * Cobertura: raio de ~60 m em torno do cruzamento Rua 01 × Rua 03.
 */
const SPLAT_URL='/assets/priorita/splat-v1/priorita-serra.splat';
const CENTER=new T.Vector3(1,0,34);

export default function SplatPilot(){
  const host=useRef<HTMLDivElement>(null);
  const [status,setStatus]=useState('Carregando o splat…');
  useEffect(()=>{
    const mount=host.current!;
    document.title='Priorità · Splat (piloto) | EME Spatial';
    const renderer=new T.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    mount.append(renderer.domElement);
    const scene=new T.Scene();scene.background=new T.Color('#b9cbd8');
    const camera=new T.PerspectiveCamera(55,1,.1,5000);
    CENTER.y=terrainHeight(CENTER.x,CENTER.z);
    camera.position.set(CENTER.x+40,CENTER.y+22,CENTER.z+42);
    const spark=new SparkRenderer({renderer});scene.add(spark);
    const controls=new OrbitControls(camera,renderer.domElement);
    controls.target.copy(CENTER);controls.enableDamping=true;controls.minDistance=6;controls.maxDistance=110;
    controls.maxPolarAngle=Math.PI*.49;controls.update();
    const splat=new SplatMesh({url:SPLAT_URL});
    splat.rotation.x=-Math.PI/2;   // Blender (Z para cima) -> three (Y para cima)
    scene.add(splat);
    splat.initialized.then(()=>setStatus('')).catch(()=>setStatus('Não foi possível carregar o splat.'));
    const resize=()=>{const w=mount.clientWidth,h=mount.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};
    resize();addEventListener('resize',resize);
    renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
    return()=>{renderer.setAnimationLoop(null);removeEventListener('resize',resize);controls.dispose();splat.dispose();renderer.dispose();renderer.domElement.remove();};
  },[]);
  return <main style={{position:'fixed',inset:0,fontFamily:'Arial,sans-serif'}}>
    <div ref={host} style={{position:'absolute',inset:0}}/>
    <header style={{position:'absolute',top:0,left:0,right:0,padding:'14px 20px',background:'#173a32',color:'#f6f1e6',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:14}}>
      <strong style={{letterSpacing:'.08em'}}>EME SPATIAL · PRIORITÀ · SPLAT (PILOTO)</strong>
      <a href="/apresentar/priorita-serra" style={{color:'#e8d39a'}}>Voltar ao 3D navegável</a>
    </header>
    {status&&<p role="status" style={{position:'absolute',top:'50%',width:'100%',textAlign:'center',color:'#173a32'}}>{status}</p>}
    <p style={{position:'absolute',bottom:10,left:20,margin:0,fontSize:11,color:'#173a32',background:'#ffffffb0',padding:'4px 8px',borderRadius:4}}>
      Gaussian splatting treinado a partir de renders Cycles · área do cruzamento central · conceito ilustrativo
    </p>
  </main>;
}
