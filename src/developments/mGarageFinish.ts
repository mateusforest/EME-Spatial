import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {M_SITE} from './mSiteLayout';
import {addMGalleryFoliage} from './mGalleryFoliage';
import type {Own} from './mSurfaces';

/** Detail the existing conceptual access; do not relocate or steepen its ramp.
 * Drainage, signage and access reader are visual elements, not an engineered system. */
export function finishMGarage(site:T.Group,own:Own,finishes:{finishStone:(m:T.MeshStandardMaterial)=>void;finishWood:(m:T.MeshStandardMaterial)=>void}){
 const root=new T.Group();root.name='M garage finishes web27';root.userData={finishOnly:true,dynamicLights:0};site.add(root);
 const g=M_SITE.garage,left=g.x-g.width/2,right=g.x+g.width/2;
 const rampY=(z:number)=>.21+(z-g.startZ)*(g.depth+.21)/(g.startZ-g.endZ);
 const stone=own(new T.MeshStandardMaterial({color:'#ccc6b7',roughness:.86}));stone.name='Garage mineral lining';finishes.finishStone(stone);
 const wood=own(new T.MeshStandardMaterial());wood.name='Garage oak soffit';finishes.finishWood(wood);
 const metal=own(new T.MeshStandardMaterial({color:'#464d46',roughness:.5,metalness:.45}));metal.name='Garage bronze fittings';
 const road=own(new T.MeshStandardMaterial({color:'#676a65',roughness:1}));road.name='Garage tunnel paving';
 const paint=own(new T.MeshStandardMaterial({color:'#d9d5c9',roughness:1}));paint.name='Garage route markings';
 const diffuser=own(new T.MeshStandardMaterial({color:'#f0d9b6',emissive:'#ffd29b',emissiveIntensity:1.1,roughness:.6}));diffuser.name='Garage shielded diffusers';
 const batches=new Map<T.Material,T.BufferGeometry[]>();
 function add(geometry:T.BufferGeometry,material:T.Material){
  const p=geometry.attributes.position,n=geometry.attributes.normal,uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){uv[i*2]=(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))/2.5;uv[i*2+1]=(Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i))/2.5;}
  geometry.setAttribute('uv',new T.BufferAttribute(uv,2));const list=batches.get(material)||[];list.push(geometry);batches.set(material,list);
 }
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material){const geometry=new T.BoxGeometry(w,h,d);geometry.translate(x,y,z);add(geometry,m);}
 function surface(points:number[][],m:T.Material){const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();add(geometry,m);}
 function stripe(x:number,z:number,w:number,d:number,m:T.Material,offset=.014){surface([[x-w/2,rampY(z-d/2)+offset,z-d/2],[x-w/2,rampY(z+d/2)+offset,z+d/2],[x+w/2,rampY(z+d/2)+offset,z+d/2],[x+w/2,rampY(z-d/2)+offset,z-d/2]],m);}
 // Separate mineral panels sit against the inside faces of the original retaining walls.
 for(const side of [-1,1]){
  const x=side<0?left+.013:right-.013;
  for(let z=g.endZ;z<g.startZ;z+=3){
   const a=z+.012,b=Math.min(z+3,g.startZ)-.012;
   const points=[[x,rampY(a)+.06,a],[x,.69,a],[x,.69,b],[x,rampY(b)+.06,b]];
   surface(side<0?points:points.reverse(),stone);
  }
  box(side<0?left-.22:right+.22,.74,17.5,.48,.075,51,stone);
  // Compact shields keep fixtures outside the 7.8 m clear carriageway.
  for(const z of [33,25,17,9,1,-5]){
   const y=rampY(z)+.53;
   box(side<0?left+.035:right-.035,y,z,.06,.29,.20,metal);
   box(side<0?left+.07:right-.07,y-.04,z,.012,.15,.13,diffuser);
  }
 }
 // A dashed centre line and short arrows indicate opposing lanes without a physical divider.
 for(let z=-3;z<38;z+=5)stripe(g.x,z,.095,2.2,paint);
 for(const [x,direction] of [[g.x-2,-1],[g.x+2,1]]){
  stripe(x,32,.14,2.0,paint);
  const z=32+direction;
  const geo=new T.BufferGeometry();const points=[[x-.52,rampY(z)+.018,z],[x+.52,rampY(z)+.018,z],[x,rampY(z+direction*.85)+.018,z+direction*.85]];
  if(direction>0)points.reverse();geo.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));geo.computeVertexNormals();add(geo,paint);
 }
 // Flush drainage grilles, aligned with the existing slope instead of crossing above it.
 for(const z of [40,-5.8]){
  stripe(g.x,z,7.76,.24,metal,.011);
  for(let x=left+.18;x<right-.15;x+=.16)stripe(x,z,.035,.235,paint,.015);
 }
 // Complete the short covered threshold underneath the current portal slab.
 box(g.x,-g.depth-.035,-9.86,7.9,.075,3.72,road);
 box(g.x,.183,-9.45,7.90,.032,4.65,wood);
 for(const x of [left+.55,right-.55])box(x,.154,-9.4,.055,.018,4.1,diffuser);
 for(const x of [left+.15,right-.15])box(x,-1.50,-7.04,.24,3.35,.15,stone);
 // Side-mounted reader leaves both vehicle lanes open; no simulated gate operation.
 box(left+.34,-2.60,-9.0,.24,1.15,.32,metal);
 box(left+.34,-2.12,-8.82,.17,.16,.035,diffuser);
 // Restrained signage sits on the existing portal fascia.
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=80;
 const context=canvas.getContext('2d')!;context.fillStyle='#d4cebe';context.fillRect(0,0,512,80);context.fillStyle='#34483e';context.font='500 40px sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillText('ACESSO À GARAGEM',256,42);
 const map=own(new T.CanvasTexture(canvas));map.colorSpace=T.SRGBColorSpace;
 const signMaterial=own(new T.MeshStandardMaterial({map,roughness:.85}));signMaterial.name='Garage identification';
 const sign=new T.PlaneGeometry(4.2,.37);sign.translate(g.x,.46,-6.993);add(sign,signMaterial);
 for(const [material,geometries] of batches){
  const flat=geometries.map(geometry=>{if(!geometry.index)return geometry;const f=geometry.toNonIndexed();geometry.dispose();return f;});
  const geometry=mergeGeometries(flat,false);flat.forEach(g=>g.dispose());if(!geometry)continue;
  // Sign uses the usual full-image UVs; all other surfaces use metric coordinates.
  if(material===signMaterial){const p=geometry.attributes.position,uv=geometry.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)-g.x)/4.2+.5,(p.getY(i)-.46)/.37+.5);}
  const mesh=new T.Mesh(own(geometry),material);mesh.name=material.name;mesh.userData.finishOnly=true;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
 }
 const plants:number[][]=[];
 for(const x of [left-.9,right+.95])for(const z of [-5,1,7,13,19,25,31])plants.push([x,.14,z,1.4]);
 addMGalleryFoliage(root,own,plants);
 root.userData.ramp={x:g.x,width:g.width,startZ:g.startZ,endZ:g.endZ,depth:g.depth};return root;
}
