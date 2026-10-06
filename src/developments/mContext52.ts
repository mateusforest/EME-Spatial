import * as T from 'three';
import type {Own} from './mSurfaces';
import {canopy51} from './mCanopy51';

/** Conceptual distant context: shared batches keep the skyline inexpensive. */
export function context52(parent:T.Group,own:Own){
 const group=new T.Group();group.name='M52 layered landscape and skyline';parent.add(group);
 let seed=52002;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const cube=own(new T.BoxGeometry(1,1,1)),dummy=new T.Object3D();
 const stone=own(new T.MeshStandardMaterial({color:'#b7b7ae',roughness:.9}));
 const glass=own(new T.MeshStandardMaterial({color:'#647a7b',roughness:.34,metalness:.28}));
 const roof=own(new T.MeshStandardMaterial({color:'#828c83',roughness:.94}));
 const lit=own(new T.MeshStandardMaterial({color:'#c4b18a',emissive:'#edc384',emissiveIntensity:.55,roughness:.7}));
 type Piece={p:number[];color?:T.Color};
 const walls:Piece[]=[],windows:Piece[]=[],caps:Piece[]=[],lights:Piece[]=[],trees:number[][]=[];
 const put=(list:Piece[],x:number,y:number,z:number,w:number,h:number,d:number,color?:T.Color)=>list.push({p:[x,y,z,w,h,d],color});
 for(let i=0;i<110;i++){
  const a=i*2.399963,r=420+random()*210,x=Math.cos(a)*r,z=Math.sin(a)*r;
  const floors=3+Math.floor(random()*12),h=floors*3.1,w=12+random()*13,d=10+random()*12;
  const color=new T.Color(['#c9c4b4','#b9c2bf','#dbceba','#b6bebd','#cec9bf'][i%5]);
  put(walls,x,h/2,z,w,h,d,color);put(caps,x,h+.16,z,w+.5,.32,d+.5);
  put(walls,x,1.8,z,w+4,3.6,d+3,color);put(caps,x,3.65,z,w+4.3,.2,d+3.3);
  put(caps,x+w*.16,h+1.1,z-d*.15,w*.35,1.8,d*.32);
  for(const side of [-1,1])trees.push([x+side*(w*.5+5),z+side*(d*.5+4),7+random()*6]);
  for(let floor=1;floor<floors;floor++){
   const y=floor*3.1+1.1;
   for(let bay=0;bay<4;bay++){
    const bx=x+(bay-1.5)*w*.215,bz=z+(bay-1.5)*d*.215;
    for(const side of [-1,1]){
     const list=random()<.16?lights:windows;
     put(list,bx,y,z+side*(d/2+.018),w*.145,1.65,.04);
     put(random()<.12?lights:windows,x+side*(w/2+.018),y,bz,.04,1.65,d*.145);
    }
   }
   if(i%4===0)for(const side of [-1,1])put(walls,x,y-.95,z+side*(d/2+.35),w+.5,.15,1.0,color);
  }
 }
 const batch=(items:Piece[],material:T.Material,name:string)=>{
  const mesh=own(new T.InstancedMesh(cube,material,items.length));mesh.name=name;
  items.forEach(({p:[x,y,z,w,h,d],color},i)=>{dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(color)mesh.setColorAt(i,color);});
  mesh.computeBoundingSphere();mesh.receiveShadow=true;group.add(mesh);
 };
 batch(walls,stone,'M52 skyline varied building envelopes');batch(windows,glass,'M52 recessed window bays');batch(caps,roof,'M52 parapets and rooftop services');batch(lights,lit,'M52 scattered occupied windows');
 // Low-detail groves bridge the park and the urban background without adding hundreds of draw calls.
 for(let i=0;i<180;i++){const a=i*2.399963,r=340+random()*120;trees.push([Math.cos(a)*r,Math.sin(a)*r,7+random()*10]);}
 const botanical=canopy51(own),foliage=own(new T.InstancedMesh(botanical.geometry,botanical.material,trees.length*3));
 const stems=own(new T.InstancedMesh(own(new T.CylinderGeometry(.17,.3,1,5)),roof,trees.length));
 trees.forEach(([x,z,h],i)=>{
  dummy.position.set(x,h*.32,z);dummy.scale.set(1,h*.64,1);dummy.rotation.set(0,0,0);dummy.updateMatrix();stems.setMatrixAt(i,dummy.matrix);
  for(let j=0;j<3;j++){const a=j*2.399;dummy.position.set(x+Math.cos(a)*h*.13,h*(.65+j*.08),z+Math.sin(a)*h*.13);dummy.scale.set(h*.75,h*.60,h*.72);dummy.rotation.set(0,a,0);dummy.updateMatrix();foliage.setMatrixAt(i*3+j,dummy.matrix);foliage.setColorAt(i*3+j,new T.Color(['#b3c2a0','#9bb6a0','#c5c49e'][i%3]));}
 });
 foliage.name='M52 transition groves';foliage.computeBoundingSphere();stems.computeBoundingSphere();group.add(foliage,stems);
 // Continuous overlapping foothills hide the flat ground/sky seam from every azimuth.
 for(let layer=0;layer<3;layer++){
  const radius=1100+layer*250,segments=240,rows=6,positions:number[]=[],indices:number[]=[],colors:number[]=[];
  for(let row=0;row<=rows;row++)for(let i=0;i<=segments;i++){
   const a=i/segments*Math.PI*2,t=row/rows;
   const ridge=35+layer*12+Math.pow(.5+.5*Math.sin(a*3+layer*.7),3)*110+Math.pow(.5+.5*Math.sin(a*7+1.2),6)*90+15*Math.sin(a*13);
   const rr=radius-160+t*360,profile=Math.pow(Math.sin(t*Math.PI),1.4),y=-3+ridge*profile*.55;
   positions.push(Math.cos(a)*rr,y,Math.sin(a)*rr);
   const shade=new T.Color(['#627969','#74877d','#859792'][layer]).multiplyScalar(.86+.14*Math.sin(a*7+t*3));colors.push(shade.r,shade.g,shade.b);
   if(row<rows&&i<segments){const k=row*(segments+1)+i;indices.push(k,k+segments+1,k+1,k+1,k+segments+1,k+segments+2);}
  }
  const geo=own(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
  const mat=own(new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}));
  const ridge=new T.Mesh(geo,mat);ridge.name='M52 atmospheric ridge '+layer;group.add(ridge);
 }
 group.userData.context52={buildings:110,layers:3,instancedBatches:4,geographicSurvey:false};
}
