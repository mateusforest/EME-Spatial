import * as T from 'three';
import {craft53} from './mCraft53';
import type {Own} from './mSurfaces';

/** Unbranded sedan / crossover bodies with a continuous profile, open arches and layered trim. */
export function garageVehicle55(parent:T.Group,own:Own,x:number,floor:number,z:number,index:number,angle:number){
 const root=new T.Group();root.name='Garage55 vehicle '+index;root.position.set(x,floor,z);root.rotation.y=angle;parent.add(root);
 const suv=index%3===0,roof=suv?1.60:1.38;
 const paint=own(new T.MeshPhysicalMaterial({color:['#b8bdb9','#363f3d','#777e80','#d6d2c5','#24333c','#756559'][(Math.floor(index/3)+index%3)%6],roughness:.23,metalness:.55,clearcoat:1,clearcoatRoughness:.12}));paint.name='Garage55 automotive clearcoat';paint.userData.noNightFill=true;
 const glass=own(new T.MeshPhysicalMaterial({color:'#1d2828',metalness:.4,roughness:.085,clearcoat:1,clearcoatRoughness:.07}));glass.name='Garage55 tinted vehicle glass';glass.userData.noNightFill=true;
 const rubber=own(new T.MeshStandardMaterial({color:'#141615',roughness:.86})),trim=own(new T.MeshStandardMaterial({color:'#222927',metalness:.65,roughness:.29})),chrome=own(new T.MeshStandardMaterial({color:'#bdc2bf',metalness:.94,roughness:.22})),head=own(new T.MeshStandardMaterial({color:'#dedfd6',metalness:.45,roughness:.19})),tail=own(new T.MeshStandardMaterial({color:'#7b1711',metalness:.3,roughness:.25}));
 for(const m of [rubber,trim,chrome,head,tail]){m.name='Garage55 vehicle detail';m.userData.noNightFill=true;}
 const k=craft53(root,own),b=k.box;
 function loft(sections:number[][],material:T.Material){const verts:number[]=[],uv:number[]=[],indices:number[]=[];
  sections.forEach(([zz,width,low,top])=>{for(const [xx,yy]of[[-width,low],[-width*.96,top-.07],[-width*.67,top],[width*.67,top],[width*.96,top-.07],[width,low]]){verts.push(xx,yy,zz);uv.push(xx,zz);}});
  for(let i=0;i<sections.length-1;i++)for(let j=0;j<5;j++){const a=i*6+j;indices.push(a,a+6,a+1,a+1,a+6,a+7);}
  indices.push(0,1,2,0,2,3,0,3,4,0,4,5);const a=(sections.length-1)*6;indices.push(a,a+2,a+1,a,a+3,a+2,a,a+4,a+3,a,a+5,a+4);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();k.add(g,material);
 }
 loft([[-2.30,.74,.60,.70],[-2.16,.88,.74,.86],[-1.55,.94,.75,.92],[-.75,.96,.76,.94],[.8,.96,.75,.91],[1.75,.91,.72,.83],[2.20,.80,.57,.69],[2.30,.72,.50,.57]],paint);
 loft([[-1.57,.74,.89,.95],[-1.02,.76,.90,roof-.07],[-.58,.76,.91,roof],[.30,.75,.90,roof-.015],[.82,.78,.89,roof-.28],[1.30,.80,.86,.88]],glass);
 loft([[-1.05,.74,roof-.11,roof-.07],[-.65,.76,roof-.065,roof+.018],[.25,.745,roof-.06,roof],[.40,.73,roof-.095,roof-.035]],paint);
 // Side skins follow wheel cutouts rather than covering the tyres with a box.
 const side=new T.Shape();side.moveTo(-2.22,.37);side.lineTo(-2.22,.74);side.quadraticCurveTo(-1.6,.94,0,.91);side.quadraticCurveTo(1.55,.90,2.22,.65);side.lineTo(2.22,.35);side.lineTo(1.88,.35);side.absarc(1.43,.35,.445,0,Math.PI,false);side.lineTo(-.97,.35);side.absarc(-1.42,.35,.445,0,Math.PI,false);side.lineTo(-2.22,.37);
 for(const s of [-1,1]){const geo=new T.ExtrudeGeometry(side,{depth:.045,bevelEnabled:true,bevelSize:.015,bevelThickness:.015,bevelSegments:2,curveSegments:10});geo.rotateY(-Math.PI/2);geo.translate(s*.93,0,0);k.add(geo,paint);
  b(s*.935,.44,-.03,.065,.12,1.8,trim);b(s*.935,.87,-.12,.036,.038,2.8,chrome,0,.006);
  // Belt line, door joins, B-pillar, handles and folded mirrors.
  k.pipe(new T.Vector3(s*.958,.50,.12),new T.Vector3(s*.958,.90,.13),.008,trim);
  k.pipe(new T.Vector3(s*.92,.49,-.93),new T.Vector3(s*.935,.90,-.82),.007,trim);
  k.pipe(new T.Vector3(s*.79,.91,-.25),new T.Vector3(s*.735,roof-.025,-.25),.038,trim);
  k.pipe(new T.Vector3(s*.785,.91,1.20),new T.Vector3(s*.72,roof-.04,.34),.028,paint);
  b(s*.963,.79,-.61,.04,.035,.18,chrome);b(s*.963,.79,.46,.04,.035,.18,chrome);
  k.pipe(new T.Vector3(s*.90,.96,.73),new T.Vector3(s*1.055,1.05,.68),.028,trim);b(s*1.08,1.065,.67,.18,.12,.27,paint,0,.05);
  for(const zz of [-1.42,1.43]){
   const tire=new T.CylinderGeometry(.345,.345,.24,32);tire.rotateZ(Math.PI/2);tire.translate(s*.94,.35,zz);k.add(tire,rubber);
   const ring=new T.TorusGeometry(.256,.018,6,32);ring.rotateY(Math.PI/2);ring.translate(s*1.065,.35,zz);k.add(ring,chrome);
   const disc=new T.CylinderGeometry(.224,.224,.015,24);disc.rotateZ(Math.PI/2);disc.translate(s*1.06,.35,zz);k.add(disc,trim);
   for(let a=0;a<10;a++){const t=a*Math.PI/5;k.pipe(new T.Vector3(s*1.08,.35+Math.sin(t)*.07,zz+Math.cos(t)*.07),new T.Vector3(s*1.08,.35+Math.sin(t+.09)*.247,zz+Math.cos(t+.09)*.247),.017,chrome);}
   const hub=new T.CylinderGeometry(.067,.067,.023,16);hub.rotateZ(Math.PI/2);hub.translate(s*1.09,.35,zz);k.add(hub,chrome);
  }
 }
 b(0,.47,2.17,1.62,.22,.22,paint,0,.07);b(0,.49,-2.19,1.66,.24,.23,paint,0,.065);b(0,.42,2.292,.92,.17,.027,trim,0,.015);
 for(let xx=-.39;xx<=.40;xx+=.075)b(xx,.45,2.31,.018,.10,.012,chrome,0,.003);
 for(const s of [-1,1]){b(s*.61,.67,2.18,.39,.10,.105,head,0,.03);b(s*.63,.78,-2.22,.43,.085,.055,tail,0,.02);b(s*.56,.30,-2.29,.21,.065,.08,chrome,0,.025);}
 b(0,.46,2.333,.38,.11,.02,head,0,.005);b(0,.56,-2.33,.36,.105,.025,head,0,.005);b(0,.94,-2.02,1.30,.045,.17,paint,0,.02);
 if(suv)for(const s of [-1,1])k.pipe(new T.Vector3(s*.57,roof+.05,-.92),new T.Vector3(s*.57,roof+.05,.22),.027,chrome);
 k.flush();return root;
}
