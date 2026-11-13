import {PerspectiveCamera,Vector3} from 'three';

/** CSS anchor is the projected ground point, never clamped to the viewport. */
export function projectLotAnchor(point:Vector3,camera:PerspectiveCamera,width:number,height:number,left=0,top=0){
  const p=point.clone().project(camera);
  return {x:left+(p.x+1)*width/2,y:top+(1-p.y)*height/2,visible:p.z>=-1&&p.z<=1&&Math.abs(p.x)<1&&Math.abs(p.y)<1};
}

export function walkFieldOfView(aspect:number,zoom=0){
  return Math.max(45,Math.min(96,(aspect<.85?78:62)+zoom));
}
