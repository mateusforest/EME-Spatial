import * as T from 'three';
import type {Own} from './mSurfaces';
import type {MUnit} from './mUnits';
import type {buildMInterior,RoomView} from './mInterior';
import type {Obstacle} from './mWalking';

const r=(minX:number,maxX:number,minZ:number,maxZ:number):Obstacle=>({minX,maxX,minZ,maxZ});
export const apartment69Bounds=r(-13.48,13.48,-13.8,9.18);
// Inscribed within the rounded slab/rail: no invisible floor outside its corners.
export const apartment69Areas=[r(-11.8,11.8,-13.8,9.18),r(-13.48,13.48,-12.35,7.7)];
export const apartment69Obstacles:Obstacle[]=[
 r(-2.3,2.3,-8.05,-1.95),r(-2.55,2.55,-14.6,-11.35),
 // Glazing stays closed except for two existing front sliding bays opened for the visit.
 r(-12.12,-11.92,-11.65,4.55),r(11.92,12.12,-11.65,4.55),
 r(-12,-2.4,-11.7,-11.5),r(2.4,12,-11.7,-11.5),
 r(-12,-4.8,4.43,4.62),r(-2.4,2.4,4.43,4.62),r(4.8,12,4.43,4.62),
 // Furniture/dividers already present in the fourteenth floor's source layout (variant 1).
 ...[-1,1].flatMap(sign=>{
  const x=sign*7.6,wall=sign*6.55,wardrobe=sign*4.1;
  return [r(x-1.15,x+1.15,-9.4,-6.7),r(wall-3.2,wall+3.2,-5.72,-5.43),r(wardrobe-.58,wardrobe+.58,-10.9,-7.1),...[-1.65,1.65].map(dx=>r(x+dx-.35,x+dx+.35,-9.05,-8.35))];
 }),
 r(4.7,8.7,-.58,.58),r(4.45,8.95,-1.8,-1.0),r(5.8,7.6,1.05,2.85),r(3.65,4.55,2.0,3.0),
 r(-8.05,-5.15,1.02,2.18),r(-8.1,-5.1,.12,.88),r(-8.1,-5.1,2.32,3.12),
 r(-9.45,-3.75,-4.45,-3.23),r(-8.35,-4.85,-2.2,-1.0),
 // Existing balcony dining to the left, reading lounge to the right, and corner planters.
 r(-6.5,-4.7,6.4,8.2),r(-7.25,-6.45,6.85,7.75),r(-4.75,-3.95,6.85,7.75),r(-6,-5.2,5.65,6.5),r(-6,-5.2,8.15,9.0),
 r(5.55,8.05,6.02,7.08),r(3.15,4.25,6.8,7.9),r(5.7,7.2,7.55,8.45),r(8,9,7.3,8.3),
 ...[-1,1].flatMap(s=>[r(s*11.2-1.9,s*11.2+1.9,8.08,9.42),r(s*10.7-2,s*10.7+2,-13.9,-12.6)]),
];

/** The walkthrough reuses the actual visible floor, not a differently sized interior study. */
export function buildMApartment69(own:Own,unit:MUnit,source:T.Group):ReturnType<typeof buildMInterior>{
 const group=new T.Group(),ceiling=new T.Group();group.name='Apartamento 14 · pavimento completo';
 const floor=source.clone(true);floor.position.set(0,0,0);floor.visible=true;group.add(floor,ceiling);
 floor.updateMatrixWorld(true);
 // Open just the glass of two full-height sliding leaves. Keep rails, slabs and all finishes.
 floor.traverse(o=>{
  if(o instanceof T.InstancedMesh)own(o);
  if(!(o instanceof T.Mesh)||Array.isArray(o.material)||o.material.name!=='Reference glazing')return;
  const g=o.geometry,p=g.getAttribute('position'),ix=g.index,kept:number[]=[],v=new T.Vector3();let removed=0;
  for(let i=0;i<(ix?.count??p.count);i+=3){const tri=[0,1,2].map(k=>ix?ix.getX(i+k):i+k);
   const door=tri.every(j=>{v.fromBufferAttribute(p,j).applyMatrix4(o.matrixWorld);return Math.abs(v.z-4.5)<.08&&Math.abs(v.x)>2.4&&Math.abs(v.x)<4.8&&v.y>.5;});
   if(door)removed++;else kept.push(...tri);
  }
  if(removed){const opened=own(g.clone());opened.setIndex(kept);o.geometry=opened;}
 });
 const views:Record<string,RoomView>={
  Living:{eye:[3.6,2.15,3.65],look:[7,1.4,0]},
  'Cozinha e jantar':{eye:[-3.25,2.15,3.5],look:[-6.6,1.4,-1.5]},
  'Circulação interna':{eye:[2.9,2.15,-3.4],look:[10.6,1.6,-5]},
  'Dormitório direito':{eye:[10.7,2.15,-8],look:[7.6,1.2,-8]},
  'Dormitório esquerdo':{eye:[-10.7,2.15,-8],look:[-7.6,1.2,-8]},
  Sacada:{eye:[0,2.15,7],look:[9,1.5,7.4]},
  'Sacada lateral direita':{eye:[13,2.15,2],look:[13,1.8,-8]},
  'Sacada lateral esquerda':{eye:[-13,2.15,2],look:[-13,1.8,-8]},
  'Sacada posterior':{eye:[6,2.15,-12.1],look:[-1,1.8,-13]},
 };
 group.userData.apartment69Ready=true;group.userData.sourceFloor=14;
 const level={index:0,elevation:.18,obstacles:apartment69Obstacles,bounds:apartment69Bounds,walkAreas:apartment69Areas};
 return {group,ceiling,obstacles:level.obstacles,ready:Promise.resolve([]),views,bounds:level.bounds,levels:[level],stairs:[],doorways:[{x:-3.6,z:4.5,level:0},{x:3.6,z:4.5,level:0}],floorHeight:3.5,unit};
}
