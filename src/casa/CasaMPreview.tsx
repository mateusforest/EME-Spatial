import {useEffect,useRef} from 'react';
import * as T from 'three';
import {createCasaFurniture,disposeCasaObject} from './CasaMFurniture';
import type {FurnitureGroup} from './CasaMTypes';

export default function CasaMPreview({group,id}:{group:FurnitureGroup;id:string}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const mount=ref.current;if(!mount)return;let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({antialias:true,alpha:true});}catch{return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(284,155);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
  mount.append(renderer.domElement);const scene=new T.Scene();scene.add(new T.HemisphereLight('#ffffff','#9d8a70',2.5));const light=new T.DirectionalLight('#fff2d9',3);light.position.set(3,5,4);scene.add(light);
  const model=createCasaFurniture(group,id==='original'?(group==='sofa'?'modular':group==='dining'?'wood':'linen'):id);scene.add(model);
  const camera=new T.PerspectiveCamera(37,284/155,.1,30);camera.position.set(3.5,2.7,4.5);camera.lookAt(0,.35,0);renderer.render(scene,camera);
  return()=>{disposeCasaObject(model);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
 },[group,id]);
 return <div className="cm-furniture-preview" ref={ref} aria-label="Prévia 3D da alternativa"><span>Prévia da alternativa</span></div>;
}
