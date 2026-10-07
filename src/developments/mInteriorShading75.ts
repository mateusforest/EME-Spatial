import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {InteriorOcclusion} from './InteriorOcclusion';

/** Loaded only by the isolated apartment. Disabled in the economy profile. */
export function interiorShading75(renderer:T.WebGLRenderer,scene:T.Scene,camera:T.Camera){
 const composer=new EffectComposer(renderer),render=new RenderPass(scene,camera),ao=new InteriorOcclusion(scene,camera),output=new OutputPass();
 ao.updateGtaoMaterial({radius:.34,thickness:.12,distanceFallOff:.8,scale:.9,samples:8});
 ao.updatePdMaterial({radius:4,samples:8});ao.blendIntensity=.62;
 composer.addPass(render);composer.addPass(ao);composer.addPass(output);
 const size=new T.Vector2();let width=0,height=0,ratio=0;
 return {render(){
  renderer.getSize(size);const pixelRatio=renderer.getPixelRatio();
  if(size.x!==width||size.y!==height||pixelRatio!==ratio){width=size.x;height=size.y;ratio=pixelRatio;composer.setPixelRatio(pixelRatio);composer.setSize(width,height);}
  renderer.info.autoReset=false;renderer.info.reset();
  try{composer.render();}finally{renderer.info.autoReset=true;}
 },dispose(){ao.dispose();render.dispose();output.dispose();composer.dispose();}};
}
