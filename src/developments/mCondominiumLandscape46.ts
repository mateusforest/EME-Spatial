import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Own} from './mSurfaces';
/** Reference-inspired planting and curved entrance within the existing subdivision. */
export function landscapeMPatio46(parent:T.Group,own:Own){
 const root=new T.Group();root.name='Patio landscape and curved portal web46';parent.add(root);
 const material=(color:string)=>own(new T.MeshStandardMaterial({color,roughness:.88}));
 const stone=material('#b7ab91'),bronze=material('#6c5138'),path=material('#c6c1b0'),soil=material('#65784f'),leaf=material('#426944'),bark=material('#837259');
 const batches=new Map<T.Material,T.BufferGeometry[]>();
 function add(g:T.BufferGeometry,m:T.Material){g.deleteAttribute('uv');const arr=batches.get(m)||[];arr.push(g);batches.set(m,arr);}
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material){const g=new T.BoxGeometry(w,h,d);g.translate(x,y,z);add(g,m);}
 function slab(shape:T.Shape,y:number,h:number,m:T.Material){const g=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,curveSegments:12});g.rotateX(-Math.PI/2);g.translate(0,y,0);add(g,m);}
 const footprint=(side:number)=>{const s=new T.Shape();s.moveTo(side*7.1,-74.8);s.bezierCurveTo(side*8.4,-73.2,side*11.8,-73.4,side*13.3,-75.1);s.lineTo(side*13.3,-83);s.lineTo(side*12.8,-83);s.lineTo(side*12.8,-75.45);s.bezierCurveTo(side*11.4,-74.1,side*8.8,-74,side*7.45,-75.2);s.closePath();return s;};
 // Curved stone wraps the guardhouse on the west; east pedestrian passage stays clear.
 slab(footprint(-1),.3,2.8,stone);
 const east=new T.Shape();east.moveTo(11.1,-73.4);east.bezierCurveTo(12.5,-73,13.4,-74.7,13.4,-77);east.lineTo(13.4,-84);east.lineTo(12.95,-84);east.lineTo(12.95,-77);east.bezierCurveTo(12.95,-75.2,12.2,-73.7,11.1,-73.85);east.closePath();slab(east,.25,3.15,stone);
 for(let z=76;z<83.6;z+=.24)box(-13.45,2.35,z,.10,3.1,.10,bronze);
 box(-13.6,2.7,80,.4,5.2,1.0,stone);
 // Slim roof edge in bronze gives the entrance a long, coherent horizontal line.
 box(0,4.32,74.97,26.2,.095,.14,bronze);box(0,4.32,85.03,26.2,.095,.14,bronze);
 function ellipse(x:number,z:number,rx:number,rz:number){const s=new T.Shape();s.absellipse(x,-z,rx,rz,0,Math.PI*2,false,0);return s;}
 for(const x of [-20,20]){slab(ellipse(x,74.5,6,1.35),.18,.16,stone);slab(ellipse(x,74.5,5.8,1.18),.34,.05,soil);}
 // Garden loop in previously empty common green, with no change to lots or roads.
 const garden=ellipse(-80,137.5,43,13.7);garden.holes.push(new T.Path(ellipse(-80,137.5,40.7,11.4).getPoints(64)));
 slab(garden,.16,.06,path);
 slab(ellipse(-80,137.5,39.7,10.4),.12,.05,soil);
 for(const x of [-105,-80,-55]){box(x,.54,137.5,3.6,.18,.8,bronze);for(const dx of [-1.4,1.4])box(x+dx,.33,137.5,.16,.45,.6,stone);}
 // Feathered palm prototype, reused along the park and arrival rather than every lot.
 const palmParts:T.BufferGeometry[]=[];
 const trunk=new T.CylinderGeometry(.14,.23,5.5,8);trunk.translate(0,2.75,0);palmParts.push(trunk);
 const palmTrunks=own(mergeGeometries(palmParts,false)!);trunk.dispose();
 const positions:number[]=[];
 for(let f=0;f<14;f++){
  const a=f*Math.PI*2/14;for(let j=0;j<18;j++){
   const t=j/18,r=.25+t*2.6,y=5.55+Math.sin(t*Math.PI)*.75-t*.65,len=.58*(1-t*.65);
   for(const side of [-1,1]){const x=Math.cos(a)*r,z=Math.sin(a)*r;positions.push(x,y,z,x+Math.cos(a+.8*side)*len,y-.13,z+Math.sin(a+.8*side)*len,x+Math.cos(a)*.12,y+.03,z+Math.sin(a)*.12);}
  }
 }
 const frond=own(new T.BufferGeometry());frond.setAttribute('position',new T.Float32BufferAttribute(positions,3));frond.computeVertexNormals();const frondMat=material('#3e6843');frondMat.side=T.DoubleSide;
 const palmLocations:number[][]=[[-18,75,1.35],[18,75,1.45],[-29,75,1.6],[30,75,1.3],[-120,137,1.3],[-40,137,1.3],[72,130,1.3],[74,145,1.4],[111,129,1.35],[110,146,1.45],[145,137,1.5],[174,137,1.35]];
 const trunks=own(new T.InstancedMesh(palmTrunks,bark,palmLocations.length)),fronds=own(new T.InstancedMesh(frond,frondMat,palmLocations.length)),dummy=new T.Object3D();
 palmLocations.forEach(([x,z,s],i)=>{dummy.position.set(x,.2,z);dummy.scale.setScalar(s);dummy.rotation.y=i*2.4;dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);fronds.setMatrixAt(i,dummy.matrix);});trunks.castShadow=true;fronds.castShadow=true;root.add(trunks,fronds);
 // Layered shrubs use a shared low-poly mesh, with color variation and intermittent flowers.
 const shrubLocations:number[][]=[];
 for(let x=-148;x<201;x+=3.5)for(const z of [75,201])if(Math.abs(x)>14)shrubLocations.push([x,z,.55]);
 for(const x of [-152,202])for(let z=81;z<198;z+=3)shrubLocations.push([x,z,.9]);
 for(let i=0;i<40;i++){const a=i/40*Math.PI*2;shrubLocations.push([-80+Math.cos(a)*35,137.5+Math.sin(a)*7.5,.55]);}
 for(const x of [12,49])for(let z=128;z<147;z+=2.1)shrubLocations.push([x,z,.45]);
 const shrubGeo=own(new T.IcosahedronGeometry(1,1)),shrubs=own(new T.InstancedMesh(shrubGeo,leaf,shrubLocations.length));
 shrubLocations.forEach(([x,z,h],i)=>{dummy.position.set(x,.3+h*.5,z);dummy.scale.set(1.2,h,.75);dummy.rotation.y=i*1.3;dummy.updateMatrix();shrubs.setMatrixAt(i,dummy.matrix);shrubs.setColorAt(i,new T.Color(i%13===0?'#b18b9d':i%7===0?'#c2ba79':'#adc4a0'));});shrubs.receiveShadow=true;root.add(shrubs);
 // Fine foliage cards make flowering street trees lighter than dense individual leaves.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d')!;
 let seed=46;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<850;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*58,x=64+Math.cos(a)*r,y=64+Math.sin(a)*r*.88;c.fillStyle=i%3?'#b7cba2':'#e6e4cb';c.beginPath();c.ellipse(x,y,2.4,1.6,a,0,Math.PI*2);c.fill();}
 const tex=own(new T.CanvasTexture(canvas));tex.colorSpace=T.SRGBColorSpace;
 const treeMat=own(new T.MeshStandardMaterial({map:tex,alphaTest:.4,side:T.DoubleSide,roughness:1}));
 const trees:number[][]=[];for(let x=-132;x<190;x+=24)for(const z of [78,199])if(Math.abs(x)>34)trees.push([x,z]);
 for(const x of [-109,-90,-69,-50,130,158,183])trees.push([x,130]);
 const treeTrunkGeo=own(new T.CylinderGeometry(.09,.16,3.9,6)),treeTrunks=own(new T.InstancedMesh(treeTrunkGeo,bark,trees.length));
 const foliageGeo=own(new T.PlaneGeometry(1,1)),foliage=own(new T.InstancedMesh(foliageGeo,treeMat,trees.length*5));
 trees.forEach(([x,z],i)=>{dummy.position.set(x,2.1,z);dummy.scale.set(1,1,1);dummy.rotation.set(0,0,0);dummy.updateMatrix();treeTrunks.setMatrixAt(i,dummy.matrix);for(let j=0;j<5;j++){const a=j*2.4;dummy.position.set(x+Math.cos(a)*.55,4.3+(j%2)*.6,z+Math.sin(a)*.55);dummy.scale.set(3.5,3,1);dummy.rotation.set(.12,a,.1);dummy.updateMatrix();foliage.setMatrixAt(i*5+j,dummy.matrix);foliage.setColorAt(i*5+j,new T.Color(i%5===0?'#c096bb':i%5===2?'#e0c760':'#809f70'));}});
 treeTrunks.castShadow=true;foliage.receiveShadow=true;root.add(treeTrunks,foliage);
 for(const [m,gs]of batches){const flat=gs.map(g=>{const n=g.index?g.toNonIndexed():g;if(n!==g)g.dispose();return n;});const g=mergeGeometries(flat,false);flat.forEach(g=>g.dispose());if(g){const mesh=new T.Mesh(own(g),m);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}}
 root.userData={palms:palmLocations.length,trees:trees.length,shrubs:shrubLocations.length,dynamicLights:0};
}
