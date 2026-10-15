import * as T from 'three';

/** Refresh local reflections only after interaction settles; never on every walking frame. */
export function createCasaReflections(scene:T.Scene,renderer:T.WebGLRenderer,materials:Iterable<T.Material>,request:()=>void,touch:boolean){
 const pmrem=new T.PMREMGenerator(renderer),cube=new T.WebGLCubeRenderTarget(touch?64:128,{type:T.HalfFloatType}),camera=new T.CubeCamera(.08,130,cube);
 camera.children.forEach(c=>c.userData.casaProbe=true);
 const car:T.MeshStandardMaterial[]=[],room:T.MeshStandardMaterial[]=[];
 for(const m of materials)if(m instanceof T.MeshStandardMaterial){
  if(/automovel|^Glass$|^Rim|^Mirror$/.test(m.name))car.push(m);
  else if(['walnut','marble','travertine'].includes(m.userData.finish)||/espelho|Metais|Aco/.test(m.name))room.push(m);
 }
 let timer:ReturnType<typeof setTimeout>|undefined,disposed=false,enabled=true;
 const maps=new Map<string,T.WebGLRenderTarget>();
 function refresh(){
  if(disposed||!enabled||document.hidden)return;
  const shadow=renderer.shadowMap.needsUpdate;renderer.shadowMap.needsUpdate=false;
  const clips=renderer.clippingPlanes,target=renderer.getRenderTarget(),face=renderer.getActiveCubeFace(),mip=renderer.getActiveMipmapLevel();renderer.clippingPlanes=[];
  try{
   for(const [id,position,list] of [['garage',[23.75,1.6,-1.8],car],['living',[15.2,1.65,-5.4],room]] as [string,[number,number,number],T.MeshStandardMaterial[]][]){
    if(!list.length)continue;const previous=list.map(m=>m.envMap);list.forEach(m=>m.envMap=null);
    try{
     camera.position.fromArray(position);camera.update(renderer,scene);
     const map=pmrem.fromCubemap(cube.texture);maps.get(id)?.dispose();maps.set(id,map);
     list.forEach((m,i)=>{m.envMap=map.texture;m.envMapIntensity=id==='garage'?1.25:.65;if(!previous[i])m.needsUpdate=true;});
    }catch{list.forEach((m,i)=>m.envMap=previous[i]);enabled=false;renderer.domElement.dataset.localReflections='environment';break;}
   }
   if(enabled)renderer.domElement.dataset.localReflections='ready';
  }finally{renderer.setRenderTarget(target,face,mip);renderer.clippingPlanes=clips;renderer.shadowMap.needsUpdate=shadow;request();}
 }
 function schedule(){clearTimeout(timer);if(!disposed&&enabled)timer=setTimeout(refresh,700);}
 return {schedule,enable(value:boolean){if(enabled===value)return;enabled=value;if(value)schedule();else clearTimeout(timer);},dispose(){disposed=true;clearTimeout(timer);maps.forEach(m=>m.dispose());cube.dispose();pmrem.dispose();}};
}
