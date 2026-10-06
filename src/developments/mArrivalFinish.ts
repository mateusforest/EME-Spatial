import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Own} from './mSurfaces';

/** Surface details on the existing arrival footprint, without altering approved slabs. */
export function finishMArrival(site:T.Group,own:Own,finishStone:(m:T.MeshStandardMaterial)=>void){
 const root=new T.Group();root.name='M arrival finishes web22';site.add(root);
 const stone=own(new T.MeshStandardMaterial({color:'#ccc8bb',roughness:.86}));stone.name='Arrival honed paving';finishStone(stone);
 const coping=own(stone.clone());coping.color.set('#dedacf');coping.name='Arrival stone coping';
 const bronze=own(new T.MeshStandardMaterial({color:'#414a43',metalness:.55,roughness:.43}));bronze.name='Arrival bronze details';
 const earth=own(new T.MeshStandardMaterial({color:'#494b39',roughness:1}));earth.name='Arrival planting soil';
 const diffuser=own(new T.MeshStandardMaterial({color:'#e5d8b9',emissive:'#ead7b1',emissiveIntensity:.22,roughness:.8}));diffuser.name='Arrival restrained light diffuser';
 const batches=new Map<T.Material,T.BufferGeometry[]>();
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material){
  const g=new T.BoxGeometry(w,h,d);g.translate(x,y,z);const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))/2.5,(Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i))/2.5);
  const list=batches.get(m)||[];list.push(g);batches.set(m,list);
 }
 // Large-format slabs preserve the 7 m pedestrian axis between the reflecting pools.
 for(let row=0;row<18;row++)for(const side of [-1,1])box(side*1.75,.294,20.9+row*1.5,3.478,.028,1.478,stone);
 // Fan-shaped landing closes the grass shoulders between the path and the wide stair.
 const s=new T.Shape([new T.Vector2(-5.3,-15.265),new T.Vector2(5.3,-15.265),new T.Vector2(5.3,-18),new T.Vector2(3.5,-20.16),new T.Vector2(-3.5,-20.16),new T.Vector2(-5.3,-18)]);
 const landing=new T.ShapeGeometry(s);landing.rotateX(-Math.PI/2);landing.translate(0,.307,0);
 const lp=landing.attributes.position,lu=landing.attributes.uv;
 for(let i=0;i<lp.count;i++)lu.setXY(i,lp.getX(i)/2.5,lp.getZ(i)/2.5);
 // Convert to non-indexed before batching with boxes below.
 batches.get(stone)!.push(landing);
 // Thin stone caps finish the existing basins; the water and basin locations stay unchanged.
 for(const x of [-8,8]){
  for(const side of [-1,1])box(x+side*3.1,.58,30,.32,.10,18,coping);
  for(const z of [21.15,38.85])box(x,.58,z,5.9,.10,.30,coping);
 }
 // Soil inset sits within the two approved entrance planting beds.
 box(-8.1,1.027,13.4,4.08,.012,1.68,earth);box(8.7,1.027,16.5,4.88,.012,1.38,earth);
 // Low, shielded fixtures outside the pedestrian width. No extra dynamic lights/shadows.
 for(const side of [-1,1])for(const z of [23,31,39,46]){
  const x=side*3.95;box(x,.29,z,.25,.08,.25,bronze);box(x,.64,z,.12,.66,.15,bronze);
  box(x,.94,z,.26,.08,.24,bronze);box(x,.898,z,.19,.018,.17,diffuser);
 }
 // Two flush bronze pulls give the existing pivot doors a readable human scale.
 for(const side of [-1,1]){const g=new T.BoxGeometry(.026,1.1,.06);g.translate(side*.47,2.25,.075);g.rotateY(side<0?-.7:.7);g.translate(side*1.3,0,9.42);const list=batches.get(bronze)||[];list.push(g);batches.set(bronze,list);}
 for(const [material,geometries] of batches){
  const flat=geometries.map(g=>{if(!g.index)return g;const f=g.toNonIndexed();g.dispose();return f;});
  const geometry=mergeGeometries(flat,false);flat.forEach(g=>g.dispose());if(!geometry)continue;
  const mesh=new T.Mesh(own(geometry),material);mesh.name=material.name;mesh.userData.finishOnly=true;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
 }
 root.userData={finishOnly:true,revision:22,dynamicLights:0};return root;
}
