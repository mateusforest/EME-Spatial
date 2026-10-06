import * as T from 'three';
import type {buildVacaria} from './vacariaModel';
export const vacariaWest=(z:number)=>-3.6+(z+43.2)*8.52/123.2;
export const vacariaEast=(z:number)=>61.32+(z+17.52)*3.6/53.52;
export const vacariaNorth=(x:number)=>-16.2-(x-7.56)*1.32/53.76;
export const vacariaDiagonal=(x:number)=>36+(64.92-x)*44/60;

/** Lot fences are shared once; the actual perimeter closes boundary lots. */
export function finishVacariaYards(model:ReturnType<typeof buildVacaria>,m:{paint:T.Material;concrete:T.Material;grass:T.Material}){
 const own=<A extends {dispose:()=>void}>(r:A)=>{model.resources.add(r);return r;};
 const root=new T.Group();root.name='Quintais e divisas compartilhadas V08';model.district.add(root);
 const cube=own(new T.BoxGeometry(1,1,1)),segments=new Map<string,T.Mesh>();
 function fence(a:number[],b:number[],owner:string){
  const key=[a,b].map(p=>p.map(n=>n.toFixed(3)).join(',')).sort().join('|');const existing=segments.get(key);if(existing){existing.userData.owners.push(owner);return;}
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]);const wall=new T.Mesh(cube,m.paint);wall.name='Divisa única de quintais';wall.position.set((a[0]+b[0])/2,.84,(a[1]+b[1])/2);wall.scale.set(.12,1.78,length);wall.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);wall.castShadow=wall.receiveShadow=true;wall.userData={segment:[a,b],owners:[owner]};root.add(wall);segments.set(key,wall);
  const cap=new T.Mesh(cube,m.concrete);cap.name='Capa da divisa compartilhada';cap.position.copy(wall.position);cap.position.y=1.75;cap.rotation.copy(wall.rotation);cap.scale.set(.16,.035,length);cap.castShadow=true;root.add(cap);
 }
 function lawn(points:number[][],owner:string){const shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const geo=own(new T.ShapeGeometry(shape));geo.rotateX(-Math.PI/2);const positions=geo.getAttribute('position'),uv=[];for(let i=0;i<positions.count;i++)uv.push(positions.getX(i)/2,positions.getZ(i)/2);geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));const mesh=new T.Mesh(geo,m.grass);mesh.name='Quintal integrado '+owner;mesh.position.y=-.059;mesh.receiveShadow=true;mesh.userData={owner,polygon:points};root.add(mesh);}
 for(const h of model.homes){const old=h.getObjectByName('Quintal de estudo');if(old)old.visible=false;
  const x=h.position.x,z=h.position.z,a=x-3,b=x+3,id=h.name;
  if(h.userData.block==='Superior'){
   const rear=z-7.5;lawn([[a,rear],[b,rear],[b,vacariaNorth(b)],[a,vacariaNorth(a)]],id);
   fence([a,rear],[a,vacariaNorth(a)],id);if(id!=='V08')fence([b,rear],[b,vacariaNorth(b)],id);
   if(id==='V08')lawn([[b,z],[vacariaEast(z)-.11,z],[61.21,-17.41],[b,vacariaNorth(b)+.01]],id+' lateral aberto');
   h.userData.perimeterYard=true;continue;
  }
  const rear=z+7.5,back=rear+2;
  const west=id==='V09'||id==='V16',east=id==='V23',diagonal=id==='V22'||id==='V24';
  if(diagonal){
   lawn([[a,rear],[b,rear],[b,vacariaDiagonal(b)],[a,vacariaDiagonal(a)]],id);
   fence([a,rear],[a,vacariaDiagonal(a)],id);if(id!=='V24')fence([b,rear],[b,vacariaDiagonal(b)],id);
   if(id==='V24')lawn([[b,z],[vacariaEast(z)-.11,z],[64.80,35.96],[b,vacariaDiagonal(b)-.01]],id+' lateral');
  }else{
   const left=west?vacariaWest(back)+.10:a,right=east?vacariaEast(back)-.10:b;
   lawn([[a,rear],[b,rear],[b,back],[a,back]],id);fence([left,back],[right,back],id);
   if(!west)fence([a,rear],[a,back],id);if(!east&&id!=='V21')fence([b,rear],[b,back],id);
   if(west)lawn([[vacariaWest(z)+.10,z],[a,z],[a,back],[vacariaWest(back)+.10,back]],id+' lateral');
   if(east)lawn([[b,z],[vacariaEast(z)-.10,z],[vacariaEast(back)-.10,back],[b,back]],id+' lateral');
  }
  h.userData.perimeterYard=west||east||diagonal;
 }
 root.userData.uniqueFenceCount=segments.size;
 root.userData.perimeterUnits=model.homes.filter(h=>h.userData.perimeterYard).map(h=>h.name);
}
