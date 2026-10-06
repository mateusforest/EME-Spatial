import * as T from 'three';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {patioPoint53} from './mPatioLayout53';

/** A fixed four-light budget avoids recompiling every material when a room is selected. */
export function lightRig53(scene:T.Scene,crown:T.Group){
 const old:T.RectAreaLight[]=[];scene.traverse(o=>{if(o instanceof T.RectAreaLight)old.push(o);});old.forEach(o=>o.removeFromParent());
 RectAreaLightUniformsLib.init();const lights=Array.from({length:4},()=>{const l=new T.RectAreaLight('#ffdcac',0,10,6);l.userData.managed53=true;scene.add(l);return l;});
 function down(i:number,x:number,y:number,z:number,w:number,h:number,intensity:number,color='#ffdcac'){
  const l=lights[i];l.position.set(x,y,z);l.rotation.set(-Math.PI/2,0,0);l.width=w;l.height=h;l.color.set(color);l.intensity=intensity;
 }
 return {update(camera:T.Camera,inside:boolean,baseY:number,night:number,width:number,target:T.Vector3,origin=new T.Vector3()){
  if(inside){
   down(0,0,baseY+3.28,.1,width-2,7,.28+1.6*night);down(1,width*.27,baseY+3.22,-1.5,5,4,.18+night);down(2,0,baseY+3.23,-7,12,3,.14+.8*night);
   const l=lights[3];l.position.set(0,baseY+2.4,4.30);l.lookAt(0,baseY+1.4,-3);l.width=width-2;l.height=2.7;l.color.set('#e9eeea');l.intensity=1.6*(1-night)+.06;for(const light of lights)light.position.add(origin);
  }else if(camera.position.y<0){
   [-19,-31.5,-43.5].forEach((z,i)=>down(i,-3,-.73,z,57,.23,15,'#fff1dd'));
   down(3,9.3,-.48,-15.65,14,1.05,6.5,'#ffe8cc');
  }else if(target.x>125&&target.z<65&&target.z>-45){
   down(0,145,7.3,0,12,18,2.5*night);down(1,163,7.3,0,12,18,2.5*night);
   down(2,153,54.2,-3,15,12,2.6*night);down(3,153,4,27,12,14,1.4*night);
  }else if(target.z>73){
   const club=patioPoint53(-9,136),entry=patioPoint53(0,80);
   down(0,club.x,3.65,club.z,27,25,2.8*night);down(1,entry.x,3.72,entry.z,24,11,3*night);
   down(2,club.x+44,3,club.z+3,29,24,1.4*night,'#b9e0dd');down(3,40,6.7,124,16,8,1.5*night);
  }else if(target.y>85){
   down(0,0,crown.position.y+8.7,-4,12,7,3*night);down(1,0,crown.position.y+4.55,0,24,16,2*night);
   down(2,-16,4.15,6,10,5,2.8*night);down(3,20,4.15,9,10,6,2.8*night);
  }else{
   down(0,49,.18,1,26,38,1.8*night,'#9eced2');down(1,51,4.4,-43,28,9,3.2*night);
   if(target.z<-50){down(2,62,2.8,-69.5,9,5,1.5*night);down(3,62,4.4,-43,10,8,2*night);}
   else {down(2,-16,4.15,6,10,5,2.8*night);down(3,20,4.15,9,10,6,2.8*night);}
  }
 }};
}
