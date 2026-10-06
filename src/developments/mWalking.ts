export interface Obstacle { minX:number; maxX:number; minZ:number; maxZ:number }
export interface WalkPoint { x:number; z:number }
export const WALK_RADIUS=.22;
/** Circular visitor footprint against the geometry's horizontal bounds. */
export function canStand(p:WalkPoint,obstacles:Obstacle[],bounds?:Obstacle,walkAreas?:Obstacle[],exclusions?:WalkPoint[][]) {
 if(bounds){if(p.x<bounds.minX+WALK_RADIUS||p.x>bounds.maxX-WALK_RADIUS||p.z<bounds.minZ+WALK_RADIUS||p.z>bounds.maxZ-WALK_RADIUS)return false;}
 else if(Math.abs(p.x)>10.35||Math.abs(p.z)>9.35)return false;
 // Vertical circulation is a reserved volume, not a navigable staircase yet.
 if(!bounds&&Math.abs(p.x)<2.6&&p.z<-3)return false;
 // The union preserves open connections between the front balcony and side wing.
 // Sampling the visitor footprint also blocks empty corners of the outer bounds.
 if(walkAreas){for(let i=0;i<9;i++){
  const angle=i*Math.PI/4,radius=i===8?0:WALK_RADIUS;
  const x=p.x+Math.cos(angle)*radius,z=p.z+Math.sin(angle)*radius;
  if(!walkAreas.some(a=>x>=a.minX&&x<=a.maxX&&z>=a.minZ&&z<=a.maxZ))return false;
 }}
 if(exclusions)for(let sample=0;sample<9;sample++){
  const a=sample*Math.PI/4,rad=sample===8?0:WALK_RADIUS,x=p.x+Math.cos(a)*rad,z=p.z+Math.sin(a)*rad;
  for(const poly of exclusions){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const u=poly[i],v=poly[j];if((u.z>z)!==(v.z>z)&&x<(v.x-u.x)*(z-u.z)/(v.z-u.z)+u.x)hit=!hit;}if(hit)return false;}
 }
 return !obstacles.some(o=>{
  const x=Math.max(o.minX,Math.min(p.x,o.maxX)),z=Math.max(o.minZ,Math.min(p.z,o.maxZ));
  return (p.x-x)**2+(p.z-z)**2<WALK_RADIUS**2;
 });
}
/** Small swept steps prevent tunnelling; separate axes allow sliding along walls. */
export function walkStep(start:WalkPoint,dx:number,dz:number,obstacles:Obstacle[],bounds?:Obstacle,walkAreas?:Obstacle[],exclusions?:WalkPoint[][]):WalkPoint {
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));const p={...start};
 for(let i=0;i<steps;i++){
  const x={x:p.x+dx/steps,z:p.z};if(canStand(x,obstacles,bounds,walkAreas,exclusions))p.x=x.x;
  const z={x:p.x,z:p.z+dz/steps};if(canStand(z,obstacles,bounds,walkAreas,exclusions))p.z=z.z;
 }
 return p;
}
