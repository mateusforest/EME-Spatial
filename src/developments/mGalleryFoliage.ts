import * as T from 'three';
import type {Own} from './mSurfaces';

/** Low broadleaf understory for the gallery beds. Individual curved leaves, shared
 * geometry and a single instanced draw; the original thin-leaf shrubs remain above. */
export function addMGalleryFoliage(parent:T.Object3D,own:Own,locations:number[][]){
 if(!locations.length)return;
 const points:number[]=[],indices:number[]=[];
 for(let row=0;row<=6;row++){
  const t=row/6,width=.105*Math.sin(Math.PI*t),z=t*.36;
  points.push(-width,Math.sin(Math.PI*t)*.03,z,0,Math.sin(Math.PI*t)*.055,z,width,Math.sin(Math.PI*t)*.03,z);
  if(row<6)for(let side=0;side<2;side++){const a=row*3+side,b=a+3;indices.push(a,b,a+1,a+1,b,b+1);}
 }
 const g=own(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();
 const material=own(new T.MeshStandardMaterial({color:'#718368',roughness:.88,side:T.DoubleSide}));
 material.name='Gallery muted broadleaf planting';
 const leaves=own(new T.InstancedMesh(g,material,locations.length*48)),dummy=new T.Object3D(),color=new T.Color();
 leaves.name='M gallery broadleaf understory';leaves.userData.finishOnly=true;
 locations.forEach(([x,y,z,plantScale=1],plant)=>{
  for(let i=0;i<48;i++){
   const a=i*2.399+plant*.73,ring=Math.sqrt((i+.5)/48),radius=.33*ring*plantScale;
   dummy.position.set(x+Math.cos(a)*radius,y+(.12+(1-ring)*.38)*plantScale,z+Math.sin(a)*radius);
   dummy.rotation.set(-.18+(i%5)*.11,-a+Math.PI/2,Math.sin(i*1.73)*.25);
   dummy.scale.setScalar((.72+(i%7)*.065)*plantScale);dummy.updateMatrix();const index=plant*48+i;
   leaves.setMatrixAt(index,dummy.matrix);color.set(['#718668','#879678','#65795e'][i%3]);leaves.setColorAt(index,color);
  }
 });
 leaves.castShadow=true;leaves.receiveShadow=true;leaves.computeBoundingSphere();parent.add(leaves);
 return leaves;
}
