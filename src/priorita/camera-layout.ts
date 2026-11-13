import * as T from 'three';

export type FrameRect={left:number;top:number;right:number;bottom:number};
/** Fit all corners into the unobstructed viewport, leaving room for dimension labels. */
export function frameBounds(bounds:T.Box3,aspect:number,fov:number,viewport:{width:number;height:number},safe:FrameRect,flat=false){
  const portrait=aspect<.85;
  const direction=new T.Vector3(flat?0:portrait?.08:.58,flat?1:portrait?1.65:1.05,flat?.001:portrait?.8:1).normalize();
  const right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),direction).normalize();
  const up=new T.Vector3().crossVectors(direction,right).normalize();
  const center=bounds.getCenter(new T.Vector3());
  const corners=[];
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])corners.push(new T.Vector3(x,y,z).sub(center));
  const halfWidth=Math.max(...corners.map(p=>Math.abs(p.dot(right)))),halfHeight=Math.max(...corners.map(p=>Math.abs(p.dot(up)))),depth=Math.max(...corners.map(p=>Math.abs(p.dot(direction))));
  const tan=Math.tan(T.MathUtils.degToRad(fov/2));
  const width=Math.max(150,safe.right-safe.left),height=Math.max(140,safe.bottom-safe.top);
  const distance=Math.max(24,depth+Math.max(halfHeight/(tan*height/viewport.height),halfWidth/(tan*aspect*width/viewport.width))*1.22);
  const offsetX=(.5-(safe.left+safe.right)/2/viewport.width)*2*distance*tan*aspect;
  const offsetY=((safe.top+safe.bottom)/2/viewport.height-.5)*2*distance*tan;
  const target=center.clone().addScaledVector(right,offsetX).addScaledVector(up,offsetY);
  return {position:target.clone().addScaledVector(direction,distance),target};
}
