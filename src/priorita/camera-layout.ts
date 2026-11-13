import * as T from 'three';

export type FrameRect={left:number;top:number;right:number;bottom:number};
/** Fit all corners into the unobstructed viewport, leaving room for dimension labels. */
export function frameBounds(bounds:T.Box3,aspect:number,fov:number,viewport:{width:number;height:number},safe:FrameRect,flat=false,padding=1.22,fitPoints?:T.Vector3[]){
  const portrait=aspect<.85;
  const direction=new T.Vector3(flat?0:portrait?.08:.58,flat?1:portrait?1.65:1.05,flat?.001:portrait?.8:1).normalize();
  const right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),direction).normalize();
  const up=new T.Vector3().crossVectors(direction,right).normalize();
  const center=bounds.getCenter(new T.Vector3());
  const corners:T.Vector3[]=[];
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])corners.push(new T.Vector3(x,y,z).sub(center));
  if(fitPoints){corners.length=0;corners.push(...fitPoints.map(p=>p.clone().sub(center)));}
  const halfWidth=Math.max(...corners.map(p=>Math.abs(p.dot(right)))),halfHeight=Math.max(...corners.map(p=>Math.abs(p.dot(up)))),depth=Math.max(...corners.map(p=>Math.abs(p.dot(direction))));
  const tan=Math.tan(T.MathUtils.degToRad(fov/2));
  const width=Math.max(150,safe.right-safe.left),height=Math.max(140,safe.bottom-safe.top);
  const legacyDistance=Math.max(24,depth+Math.max(halfHeight/(tan*height/viewport.height),halfWidth/(tan*aspect*width/viewport.width))*padding);
  const distance=fitPoints?Math.max(24,...corners.map(p=>Math.max(Math.abs(p.dot(up))/(tan*height/viewport.height),Math.abs(p.dot(right))/(tan*aspect*width/viewport.width))*padding+p.dot(direction))):legacyDistance;
  const offsetX=(.5-(safe.left+safe.right)/2/viewport.width)*2*distance*tan*aspect;
  const offsetY=((safe.top+safe.bottom)/2/viewport.height-.5)*2*distance*tan;
  const target=center.clone().addScaledVector(right,offsetX).addScaledVector(up,offsetY);
  let fittedDistance=distance;
  if(fitPoints){
    const camera=new T.PerspectiveCamera(fov,aspect,.1,30000);
    const safeCenterX=(safe.left+safe.right)/viewport.width-1,safeCenterY=1-(safe.top+safe.bottom)/viewport.height;
    // Perspective makes the foreground larger. Recenter the projected footprint,
    // rather than wasting half the viewport around its world-space bounding box.
    for(let i=0;i<8;i++){
      camera.position.copy(target).addScaledVector(direction,fittedDistance);camera.lookAt(target);camera.updateMatrixWorld();
      const projected=fitPoints.map(p=>p.clone().project(camera));
      const minX=Math.min(...projected.map(p=>p.x)),maxX=Math.max(...projected.map(p=>p.x)),minY=Math.min(...projected.map(p=>p.y)),maxY=Math.max(...projected.map(p=>p.y));
      target.addScaledVector(right,((minX+maxX)/2-safeCenterX)*fittedDistance*tan*aspect);
      target.addScaledVector(up,((minY+maxY)/2-safeCenterY)*fittedDistance*tan);
      fittedDistance*=Math.max((maxX-minX)/(2*width/viewport.width),(maxY-minY)/(2*height/viewport.height))*padding;
    }
  }
  const position=target.clone().addScaledVector(direction,fittedDistance);
  if(fitPoints)target.addScaledVector(direction,(center.y-target.y)/direction.y);
  return {position,target};
}
