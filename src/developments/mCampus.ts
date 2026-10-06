import {poolTiles53} from './mPoolSurfaces41';
import {poolWater41} from './mPoolSurfaces41';
import {grassSurface51} from './mGround51';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {M_SITE} from './mSiteLayout';
import type {Own} from './mSurfaces';
import {buildMGallery} from './mGallery';

/** Exterior massing follows the approved aerial. Dimensions remain a concept study.
 * Kept separate from floor cuts; the archived GLB is only a botanical source now.
 */
export function buildMCampus(scene:T.Scene,own:Own,finishes?:Parameters<typeof buildMGallery>[2],options:{gallery?:boolean}={}){
 const site=new T.Group();site.name='M_Campus_web14';scene.add(site);
 const part=(name:string)=>{const p=new T.Group();p.name=name;site.add(p);return p;};
 const mat=(name:string,color:string,roughness=.8,metalness=0)=>{const m=own(new T.MeshStandardMaterial({color,roughness,metalness}));m.name=name;return m;};
 const stone=mat('Campus limestone','#d4d0c4'),paving=mat('Campus paths','#b9b5a9'),wood=mat('Campus oak','#907052'),dark=mat('Campus bronze','#424d47',.45,.3),grass=grassSurface51(own),sand=mat('Beach sand','#d0c2a4'),white=mat('Court markings','#e5e1d3'),asphalt=mat('Access asphalt','#626763');
 const water=poolWater41(own),poolTiles=poolTiles53(own);const parasol=mat('EME forest canvas','#123f2d',.92);
 const glass=own(new T.MeshPhysicalMaterial({color:'#bccbc7',roughness:.16,metalness:.12,transparent:true,opacity:.35,depthWrite:false}));
 const cube=own(new T.BoxGeometry(1,1,1));
 const box=(p:T.Group,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material)=>{const o=new T.Mesh(cube,m);o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=!m.transparent;o.receiveShadow=true;p.add(o);return o;};
 const rounded=(p:T.Group,x:number,y:number,z:number,w:number,h:number,d:number,r:number,m:T.Material)=>{const o=new T.Mesh(own(new RoundedBoxGeometry(w,h,d,2,Math.min(r,h/2))),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;};
 const flat=(p:T.Group,points:number[][],y:number,m:T.Material,holes:number[][][]=[])=>{
  const shape=new T.Shape(points.map(v=>new T.Vector2(v[0],-v[1])));for(const hole of holes)shape.holes.push(new T.Path(hole.map(v=>new T.Vector2(v[0],-v[1]))));
  const g=own(new T.ShapeGeometry(shape));g.rotateX(-Math.PI/2);const o=new T.Mesh(g,m);o.position.y=y;o.receiveShadow=true;p.add(o);return o;
 };
 const rect=(x:number,z:number,w:number,d:number)=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];
 const ground=part('M campus ground');
 const c=M_SITE.campus,g=M_SITE.garage;
 flat(ground,[[c.minX,c.minZ],[c.maxX,c.minZ],[c.maxX,c.maxZ],[c.minX,c.maxZ]],.12,grass,[rect(g.x,17.5,g.width,51),[[32,-20],[62,-20],[62,-27],[72,-27],[72,31],[62,31],[62,22],[32,22]]]);
 // Arrival drives flank the pedestrian forecourt. The ramp opening is not covered by terrain.
 box(ground,38,.14,56,320,.15,14,asphalt);
 box(ground,24,.17,-51,128,.13,6,asphalt);
 box(ground,options.gallery===false?30.8:26.2,.18,0,1.6,.16,100,paving);
 box(ground,115,.17,-1,5,.13,96,paving);
 box(ground,-32,.18,46,8,.14,6,asphalt);
 box(ground,0,.19,29,7,.18,36,paving);
 box(ground,11,.19,43,28,.18,4,paving);
 box(ground,-19,.19,43,20,.18,4,paving);

 if(options.gallery!==false)buildMGallery(site,own,finishes);

 const arrival=part('M arrival reflecting pools');
 for(const x of [-8,8]){
  rounded(arrival,x,.32,30,6.6,.42,18,.2,stone);box(arrival,x,.55,30,5.8,.025,17.2,water);
 }
 for(const x of [-14,14])box(arrival,x,.45,30,3,.55,17,grass);

 const garage=part('M descending garage access');
 const ramp=new T.BufferGeometry(),xs=[g.x-g.width/2,g.x+g.width/2];
 ramp.setAttribute('position',new T.Float32BufferAttribute([xs[0],.21,g.startZ,xs[1],.21,g.startZ,xs[0],-g.depth,g.endZ,xs[1],-g.depth,g.endZ],3));ramp.setIndex([0,1,2,1,3,2]);ramp.computeVertexNormals();
 const rampMesh=new T.Mesh(own(ramp),asphalt);rampMesh.receiveShadow=true;garage.add(rampMesh);
 for(const x of [xs[0]-.22,xs[1]+.22]){
  const verts=[x-.22,.7,g.startZ,x+.22,.7,g.startZ,x-.22,.7,g.endZ,x+.22,.7,g.endZ,x-.22,-g.depth-.25,g.startZ,x+.22,-g.depth-.25,g.startZ,x-.22,-g.depth-.25,g.endZ,x+.22,-g.depth-.25,g.endZ];
  const wall=own(new T.BufferGeometry());wall.setAttribute('position',new T.Float32BufferAttribute(verts,3));wall.setIndex([0,2,1,1,2,3,0,4,2,2,4,6,1,3,5,3,7,5,2,6,3,3,6,7]);wall.computeVertexNormals();garage.add(new T.Mesh(wall,stone));
 }
 box(garage,g.x,.45,-9.5,9,.5,5,stone);box(garage,g.x,.76,-9.5,8.5,.14,4.5,grass);
 // Portal is open to the new basement.

 for(const x of [g.x-3,g.x+3]){box(garage,x,.72,40,.18,1,.18,dark);}

 const resort=part('M resort pool complex');
 const [px,pz]=M_SITE.pool;
 flat(resort,rect(px,pz,49,72),.375,paving,[[[32,-20],[62,-20],[62,-27],[72,-27],[72,31],[62,31],[62,22],[32,22]]]);
 // Shared basin: broad leisure water + a long lap strip on its east edge.
 flat(resort,[[32,-20],[62,-20],[62,-27],[72,-27],[72,31],[62,31],[62,22],[32,22]],-1.0,poolTiles);
 flat(resort,[[32.52,-19.48],[62.52,-19.48],[62.52,-26.48],[71.48,-26.48],[71.48,30.48],[62.52,30.48],[62.52,21.48],[32.52,21.48]],.49,water);
 for(const x of [65.5,68.5])box(resort,x,-.985,2,.13,.018,54,dark);
 rounded(resort,40,.45,31,15,.3,8,.15,stone);box(resort,40,.615,31,13.8,.025,6.8,water);
 const poolOutline=[[32,-20],[62,-20],[62,-27],[72,-27],[72,31],[62,31],[62,22],[32,22]];
 for(let i=0;i<poolOutline.length;i++){const [x,z]=poolOutline[i],[xx,zz]=poolOutline[(i+1)%poolOutline.length];box(resort,(x+xx)/2,-.255,(z+zz)/2,Math.abs(xx-x)||.28,1.49,Math.abs(zz-z)||.28,poolTiles);}
 // Detailed loungers are authored by mLeisureFinish on the same dry deck.
 for(const z of [-10,8,25])for(const x of [29,74.3]){
  box(resort,x,1.8,z,.065,3,.065,dark);
  const umbrella=new T.Mesh(own(new T.ConeGeometry(2.1,.65,12)),parasol);umbrella.position.set(x,3.35,z);resort.add(umbrella);
 }
 const club=part('M lakeside clubhouse');const [cx,cz]=M_SITE.clubhouse;
 rounded(club,cx,.38,cz,34,.45,13,.2,stone);rounded(club,cx,4.8,cz,35,.45,14,.2,stone);
 box(club,cx,2.6,cz-5.5,31,4,.25,wood);for(const dx of [-11,11])box(club,cx+dx,2.6,cz+5.5,9,4,.1,glass);
 for(const x of [cx-15,cx-5,cx+5,cx+15])box(club,x,2.6,cz+5.6,.3,4.2,.3,dark);
 box(club,cx,5.09,cz,31,.15,10,grass);

 const sports=part('M football and beach tennis');
 const [fx,fz]=M_SITE.football,[bx,bz]=M_SITE.beach;
 box(sports,fx,.25,fz,29,.2,48,paving);box(sports,fx,.37,fz,27,.025,46,grass);
 box(sports,bx,.25,bz,25,.2,29,paving);box(sports,bx,.39,bz,23,.1,27,sand);
 const line=(x:number,z:number,w:number,d:number)=>box(sports,x,.46,z,w,.018,d,white);
 for(const x of [fx-12,fx+12])line(x,fz,.1,42);for(const z of [fz-21,fz,fz+21])line(fx,z,24,.1);
 const ring=own(new T.RingGeometry(3.8,3.9,40)),circle=new T.Mesh(ring,white);circle.rotation.x=-Math.PI/2;circle.position.set(fx,.44,fz);sports.add(circle);
 for(const z of [fz-21,fz+21]){
  for(const x of [fx-3,fx+3])box(sports,x,1.45,z,.12,2.1,.12,white);box(sports,fx,2.48,z,6,.12,.12,white);
  line(fx,z+(z<fz?4:-4),12,.1);for(const x of [fx-6,fx+6])line(x,z+(z<fz?2:-2),.1,4);
 }
 for(const x of [bx-4,bx+4])line(x,bz,.075,16);for(const z of [bz-8,bz+8])line(bx,z,8,.075);
 for(const x of [bx-5,bx+5])box(sports,x,1.3,bz,.1,2.3,.1,dark);
 for(let y=1.4;y<=2.4;y+=.2)box(sports,bx,y,bz,10,.02,.02,dark);
 for(let x=bx-5;x<=bx+5;x+=.4)box(sports,x,1.9,bz,.015,1,.015,dark);
 // Perimeter posts imply ball protection without transparent full-screen sheets.
 for(const x of [fx-14,fx+14])for(let z=fz-24;z<=fz+24;z+=6)box(sports,x,2.5,z,.08,4.6,.08,dark);
 for(const z of [fz-24,fz+24])box(sports,fx,4.7,z,28,.07,.07,dark);

 const planting=part('M campus planting');
 const palmPositions:number[][]=[];
 for(const x of [-20,18,81,118])for(const z of [-36,-18,0,18,39])if(Math.abs(x)>26||Math.abs(z)>16)palmPositions.push([x,z]);
 for(const x of [-40,-20,0,20,40,60,80,100,118])palmPositions.push([x,-53]);
 for(const x of [-4,4])for(const z of [22,29,36,43])palmPositions.push([x,z]);
 const trunks=own(new T.InstancedMesh(own(new T.CylinderGeometry(.16,.24,1,7)),wood,palmPositions.length));
 // Curved rachis and tapered paired leaflets form a fuller three-dimensional crown.
 const leafVertices:number[]=[];
 const vertex=(x:number,z:number)=>[x,.4*Math.sin(x*.8)-.095*x*x,z];
 for(let i=0;i<19;i++){
  const x=.18+i*.21,length=.95*Math.pow(Math.sin((i+1)/21*Math.PI),.7)+.12;
  for(const sign of [-1,1]){
   const a=vertex(x,0),b=vertex(x+.28,sign*length*.48),c=vertex(x+.58,sign*length),d=vertex(x+.20,sign*length*.12);
   leafVertices.push(...a,...b,...c,...a,...c,...d);
  }
  leafVertices.push(...vertex(x,-.035),...vertex(x+.28,0),...vertex(x,.035));
 } const leafGeo=own(new T.BufferGeometry());leafGeo.setAttribute('position',new T.Float32BufferAttribute(leafVertices,3));leafGeo.computeVertexNormals();
 const leavesMat=mat('Palm fronds','#3e6736');leavesMat.side=T.DoubleSide;
 const leaves=own(new T.InstancedMesh(leafGeo,leavesMat,palmPositions.length*15));const dummy=new T.Object3D();
 palmPositions.forEach(([x,z],i)=>{
  const h=6.6+(i%4)*.65;dummy.position.set(x,.15+h/2,z);dummy.rotation.set(0,0,0);dummy.scale.set(1,h,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
  for(let j=0;j<15;j++){
 const upper=j>=10,scale=upper?.67:1+(i%3)*.06;
 dummy.position.set(x,h+.12,z);dummy.rotation.set(0,j*2.39996+i,upper?.6:.04+(j%3)*.12);
 dummy.scale.set(scale,scale,scale);dummy.updateMatrix();leaves.setMatrixAt(i*15+j,dummy.matrix);
 leaves.setColorAt(i*15+j,new T.Color(upper?'#a8c37c':j%2?'#c0ce9e':'#ffffff'));
}
  if(Math.abs(x)!==4){rounded(planting,x,.4,z,2.6,.55,2.6,.2,stone);box(planting,x,.69,z,2.2,.05,2.2,grass);}
 });trunks.castShadow=true;leaves.castShadow=true;planting.add(trunks,leaves);
 // Fixed exterior pieces are merged per material/zone to keep the notebook responsive.
 for(const p of site.children){
  if(p.name==='M two storey gallery')continue;
  const batches=new Map<T.Material,T.Mesh[]>();
  for(const child of p.children)if(child instanceof T.Mesh&&!(child instanceof T.InstancedMesh)&&!Array.isArray(child.material)){const list=batches.get(child.material)||[];list.push(child);batches.set(child.material,list);}
  for(const [m,list] of batches){if(list.length<2)continue;const parts=list.map(mesh=>{mesh.updateMatrix();let g=mesh.geometry.clone().applyMatrix4(mesh.matrix);if(g.index){const flat=g.toNonIndexed();g.dispose();g=flat;}if((m as T.MeshStandardMaterial).map||(m as T.MeshStandardMaterial).bumpMap){const p=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){uv[i*2]=Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i);uv[i*2+1]=Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i);}g.setAttribute('uv',new T.BufferAttribute(uv,2));}else g.deleteAttribute('uv');return g;});const joined=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());if(joined){const mesh=new T.Mesh(own(joined),m);mesh.castShadow=!m.transparent;mesh.receiveShadow=true;p.add(mesh);list.forEach(mesh=>p.remove(mesh));}}
 }
 site.userData.layout=M_SITE.version;return site;
}


