import * as T from 'three';

/** Art-directed local solar path. Not a geolocated insolation calculation. */
export function solar75(value:number){
 const hour=10+T.MathUtils.clamp(value,0,100)*.12;
 const elevation=hour<=13?T.MathUtils.lerp(32,57,(hour-10)/3):T.MathUtils.lerp(57,-32,(hour-13)/9);
 const azimuth=T.MathUtils.lerp(108,265,T.MathUtils.clamp(value,0,100)/100);
 const dusk=T.MathUtils.smoothstep(hour,15.5,18.8),night=T.MathUtils.smoothstep(hour,18.3,20);
 const daylight=1-T.MathUtils.smoothstep(elevation,0,8); // extinction at the horizon
 const e=T.MathUtils.degToRad(elevation),a=T.MathUtils.degToRad(azimuth);
 return {hour,elevation,azimuth,dusk,night,direction:new T.Vector3(Math.cos(e)*Math.sin(a),Math.sin(e),Math.cos(e)*Math.cos(a)),power:(4.1-1.5*dusk)*(1-daylight)};
}

/** Reuse one map, refitting only at meaningful changes of view. No extra render pass. */
export function shadowFocus75(sun:T.DirectionalLight,renderer:T.WebGLRenderer){
 const anchor=new T.Vector3(Infinity,Infinity,Infinity),next=new T.Vector3(),direction=new T.Vector3();let span=0;
 return (camera:T.Camera,target:T.Vector3,inside:boolean,apartment:boolean,baseY:number)=>{
  direction.copy(sun.position).sub(sun.target.position).normalize();
  const distance=camera.position.distanceTo(target);
  let radius:number;
  if(apartment){next.set(0,baseY+1.6,-2.3);radius=24;}
  else if(inside){next.copy(camera.position);next.y=Math.max(3,next.y);radius=34;}
  else if(target.y>18&&distance<115){next.copy(target);radius=T.MathUtils.clamp(distance*.56,28,65);}
  else if(distance>170){next.set(12,43,-8);radius=T.MathUtils.clamp(distance*.36,88,145);}
  else{next.copy(target);next.y=Math.max(12,target.y);radius=T.MathUtils.clamp(distance*.6,40,88);}
  radius=Math.ceil(radius/4)*4;
  const moved=anchor.distanceTo(next)>Math.max(.6,radius*.035)||radius!==span;
  if(moved){anchor.copy(next);span=radius;renderer.shadowMap.needsUpdate=true;}
  sun.target.position.copy(anchor);sun.target.updateMatrixWorld();
  sun.position.copy(anchor).addScaledVector(direction,280);
  const near=Math.max(.5,280-span*2),far=280+span*2;
  if(sun.shadow.camera.right!==span||sun.shadow.camera.far!==far||sun.shadow.camera.near!==near){
   Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span,near,far});sun.shadow.camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;
  }
  sun.shadow.normalBias=apartment?.012:Math.max(.018,span/3500);sun.shadow.bias=-.00006;
  sun.shadow.radius=apartment?1.5:1.7;
 };
}
