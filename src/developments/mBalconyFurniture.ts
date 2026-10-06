import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {M_REFERENCE} from './mReferenceArchitecture';
import type {Own} from './mSurfaces';

/** Furnishing belongs to the approved exterior balconies, not the older interior plans. */
export function furnishMBalconies(floors:T.Group[],own:Own,finish:{finishWood:(m:T.MeshStandardMaterial)=>void;finishStone:(m:T.MeshStandardMaterial)=>void}){
 const wood=own(new T.MeshStandardMaterial());finish.finishWood(wood);wood.color.set('#e0c7a4');
 const stone=own(new T.MeshStandardMaterial({color:'#d9cbb4',roughness:.84}));finish.finishStone(stone);
 const linen=own(new T.MeshStandardMaterial({color:'#e5ddcc',roughness:1}));
 const olive=own(new T.MeshStandardMaterial({color:'#72765a',roughness:1}));
 const caramel=own(new T.MeshStandardMaterial({color:'#a88b69',roughness:.95}));
 const materials=[wood,stone,linen,olive,caramel];
 const cache=new Map<string,{geometry:T.BufferGeometry;material:T.Material}[]>();
 function composition(kind:number,side:number){
  const key=kind+':'+side;if(cache.has(key))return cache.get(key)!;
  const batches:T.BufferGeometry[][]=materials.map(()=>[]);let ax=0,az=0,yaw=0;
  const anchor=(x:number,z:number,r=0)=>{ax=x;az=z;yaw=r;};
  function put(g:T.BufferGeometry,m:number,x:number,y:number,z:number,rx=0){g.rotateX(rx);g.translate(x,y+.5,z);g.rotateY(yaw);g.translate(ax,0,az);batches[m].push(g);}
  function box(x:number,y:number,z:number,w:number,h:number,d:number,m:number,soft=false,rx=0){put(soft?new RoundedBoxGeometry(w,h,d,1,Math.min(.07,h*.32)):new T.BoxGeometry(w,h,d),m,x,y,z,rx);}
  function cylinder(x:number,y:number,z:number,r:number,h:number,m:number,sx=1,sz=1){const g=new T.CylinderGeometry(r,r,h,16);g.scale(sx,1,sz);put(g,m,x,y,z);}
  function seat(x:number,z:number,r:number,width= .85,fabric=2){
   anchor(x,z,r);
   for(const dx of [-width/2+.09,width/2-.09])for(const dz of [-.33,.33])box(dx,.19,dz,.055,.38,.055,0);
   box(0,.33,0,width,.12,.88,0,true);box(0,.45,.02,width-.10,.17,.79,fabric,true);
   box(0,.78,-.37,width-.12,.53,.15,fabric,true,-.12);
   for(const dx of [-width/2,width/2]){box(dx,.65,0,.075,.08,.84,0,true);for(let j=0;j<7;j++)box(dx,.49,-.31+j*.1,.024,.27,.024,0);}
   if(width>1.5){for(const dx of [-width*.32,width*.32])box(dx,.78,-.21,.44,.40,.15,3,true,-.18);}
  }
  function table(x:number,z:number,r=.52,dining=false,oval=false){anchor(x,z);const h=dining?.75:.40;cylinder(0,h-.045,0,r,.09,dining?0:1,oval?1.6:1,1);cylinder(0,(h-.09)/2,0,dining?.16:.29,h-.09,dining?0:1);cylinder(0,h+.06,0,.11,.12,1);box(.22,h+.035,0,.24,.025,.17,4,true);}
  const sx=(v:number)=>side*v;
  if(kind===0){ // Sofa, two woven-arm chairs and round stone table.
   seat(sx(5.9),6.52,0,3.05);seat(sx(8),7.65,-side*Math.PI/2,.87,3);seat(sx(3.65),7.65,side*Math.PI/2,.87,2);table(sx(5.9),7.95,.56);
  }else if(kind===1){ // Intimate round dining for four.
   table(sx(5.6),7.3,.82,true);
   for(const [dx,dz,r] of [[-1.22,0,Math.PI/2],[1.22,0,-Math.PI/2],[0,-1.22,0],[0,1.22,Math.PI]])seat(sx(5.6)+dx,7.3+dz,r,.60,2);
  }else if(kind===2){ // Long dining with six seats.
   anchor(sx(5.7),7.3);box(0,.72,0,2.65,.09,1.03,0,true);for(const dx of [-1.04,1.04])box(dx,.35,0,.11,.7,.70,0);
   for(const dx of [-.85,0,.85]){seat(sx(5.7)+dx,6.24,0,.60);seat(sx(5.7)+dx,8.36,Math.PI,.60);}
   anchor(sx(5.7),7.3);cylinder(0,.85,0,.16,.16,1);
  }else if(kind===3){ // Reading lounge with caramel cushions and oval table.
   seat(sx(6.8),6.55,0,2.25,4);seat(sx(3.7),7.35,side*Math.PI/2,.95,3);table(sx(6.45),8,.43,false,true);
   anchor(sx(8.5),7.8);cylinder(0,.23,0,.46,.46,2);
  }else { // Projected duplex relaxation bay, away from the existing corner planter.
   for(const x of [14.1,16.1]){
    anchor(sx(x),6.4);for(const dx of [-.4,.4])for(const dz of [-.82,.82])box(dx,.18,dz,.06,.36,.06,0);
    box(0,.33,0,1.05,.12,2.35,0,true);box(0,.46,.38,.96,.15,1.46,2,true);box(0,.68,-.65,.96,.15,1.03,2,true,.48);
    box(0,.55,.77,.98,.035,.34,3,true);
   }
   table(sx(15.1),7.2,.27);
  }
  const result:{geometry:T.BufferGeometry;material:T.Material}[]=[];
  batches.forEach((parts,i)=>{if(!parts.length)return;const flat=parts.map(g=>{const f=g.index?g.toNonIndexed():g;if(f!==g)g.dispose();return f;});const g=mergeGeometries(flat,false);flat.forEach(p=>p.dispose());if(g)result.push({geometry:own(g),material:materials[i]});});cache.set(key,result);return result;
 }
 floors.forEach((floor,i)=>{
  const root=new T.Group();root.name='M balcony furniture web32';root.userData.finishOnly=true;floor.add(root);
  const notch=floor.userData.envelope.notch;
  const variants=[[0,2],[1,3],[3,0],[2,3]];
  const pair=variants[i%4];root.userData.layout=pair.join('-');
  function place(kind:number,side:number){for(const part of composition(kind,side)){const mesh=new T.Mesh(part.geometry,part.material);mesh.name='Balcony furniture '+kind;mesh.userData={finishOnly:true,layout:kind};mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}}
  for(const side of [-1,1])if(notch!==2&&notch!==side)place(pair[side<0?0:1],side);
  const duplex=M_REFERENCE.duplexes.find(d=>d.floor===i+1);if(duplex)place(4,duplex.side);
 });
}


