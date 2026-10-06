import * as T from 'three';
import {craft53} from './mCraft53';
import {garageMaterials55} from './mGarageMaterials55';
import {garageVehicle55} from './mGarageVehicles55';
import {garageBays55,garageCars55,garageColumns55,GARAGE55} from './mGarageLayout55';
import {greenMarbleMonogram} from './mMarbleMonogram';
import {contactShadow,type Own} from './mSurfaces';

export function buildMGarage55(site:T.Group,own:Own,finishes:{finishStone:(m:T.MeshStandardMaterial)=>void;finishWood:(m:T.MeshStandardMaterial)=>void}){
 const root=new T.Group();root.name='M basement garage web55';root.userData={garage55:true,finishOnly:true,parkingSpaces:garageBays55.length};site.add(root);
 const m=garageMaterials55(own),k=craft53(root,own),b=k.box,y=GARAGE55.floor;
 const stone=m.travertine,wood=m.create('smoked oak lift screen','#a98b63',.7);finishes.finishWood(wood);wood.color.set('#958573');
 function panel(text:string,x:number,yy:number,z:number,width:number,height:number,angle=0,ground=false){
  const c=document.createElement('canvas');c.width=1024;c.height=ground?256:160;const ctx=c.getContext('2d')!;
  if(!ground){ctx.fillStyle='#282b27';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='#6d705f';ctx.lineWidth=3;ctx.strokeRect(3,3,c.width-6,c.height-6);}
  ctx.fillStyle='#eeeada';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=(ground?'500 140px':'500 52px')+' Arial';ctx.fillText(text,c.width/2,c.height/2,c.width-35);
  const texture=own(new T.CanvasTexture(c));texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;
  const mat=own(new T.MeshStandardMaterial({map:texture,transparent:ground,depthWrite:!ground,roughness:.65,emissive:'#fff0d4',emissiveMap:texture,emissiveIntensity:ground?0:.11,polygonOffset:ground,polygonOffsetFactor:-1}));mat.name='Garage55 wayfinding';mat.userData.noNightFill=true;mat.userData.alwaysLit=true;
  const mesh=new T.Mesh(own(new T.PlaneGeometry(width,height)),mat);mesh.position.set(x,yy,z);mesh.rotation.y=angle;if(ground)mesh.rotation.x=-Math.PI/2;root.add(mesh);
 }
 // Concrete shell and saw-cut floor. The existing ramp mouth remains open at x=-32.
 b(-4,y-.12,-30,64,.24,44,m.floor,0,0);b(-4,-.13,-30,64,.22,44,m.concrete,0,0);
 for(const x of [-36,28]){b(x,-1.65,-30,.24,3.10,44,m.concrete);b(x+(x<0?.14:-.14),-2.78,-30,.025,.75,43.8,m.dark,0,.005);}
 b(-4,-1.65,-52,64,3.1,.2,m.concrete);b(0,-1.65,-8,56,3.1,.2,m.concrete);
 for(let x=-34;x<28;x+=6)b(x,y+.002,-30,.012,.006,43.7,m.dark,0,0);
 for(let z=-50;z<-8;z+=6)b(-4,y+.002,z,63.7,.006,.012,m.dark,0,0);
 // Real construction depth: chamfered columns, beams, panel joints and protective bases.
 for(const p of garageColumns55){b(p.x,-1.67,p.z,.64,3.06,.64,m.concrete,0,.025);b(p.x,y+.48,p.z,.79,.96,.79,m.dark,0,.045);
  for(const s of [-1,1]){b(p.x+s*.405,y+.5,p.z,.012,.68,.047,m.accent,0,.004);b(p.x,y+.5,p.z+s*.405,.047,.68,.012,m.accent,0,.004);}
  b(p.x,-.42,p.z,1.03,.34,1.03,m.concrete);panel('B1',p.x,-1.08,p.z-.327,.30,.13,Math.PI);
 }
 for(const x of [-25,-15,-5,5,15,25])b(x,-.37,-30,.45,.28,43.7,m.concrete);
 for(const z of [-15.7,-28.3,-40.3,-50.5])b(-4,-.34,z,63.7,.22,.42,m.concrete);
 // Both occupied and vacant spaces, individual numbers, kerb stops and EV charging.
 const shadow=contactShadow(own);
 for(const bay of garageBays55){const orient=bay.row%2===0?1:-1;
  for(const dx of [-1.4,1.4])b(bay.x+dx,y+.009,bay.z,.066,.012,5,m.white,0,0);
  b(bay.x,y+.10,bay.z+orient*2.12,1.65,.18,.21,m.rubber,0,.045);for(const dx of [-.55,.55])b(bay.x+dx,y+.199,bay.z+orient*2.12,.19,.011,.13,m.white,0,0);
  panel('B'+String(bay.id).padStart(2,'0'),bay.x,y+.020,bay.z-orient*2.04,.82,.22,orient>0?0:Math.PI,true);
 }
 for(const bay of garageCars55){garageVehicle55(root,own,bay.x,y+.01,bay.z,bay.id,bay.row%2===0?Math.PI:0);shadow(root,bay.x,bay.z,2.4,5.0,y+.014);}
 for(const x of [-21,-12,21]){b(x,y+.94,-8.23,.38,.73,.18,m.dark,0,.06);b(x,y+1.03,-8.335,.20,.25,.025,m.steel);const cable=new T.CatmullRomCurve3([new T.Vector3(x+.16,y+1,-8.43),new T.Vector3(x+.48,y+.45,-8.45),new T.Vector3(x+.28,y+.23,-8.46),new T.Vector3(x-.03,y+.52,-8.45)]);k.add(new T.TubeGeometry(cable,16,.018,6,false),m.rubber);}
 // Suspended 3500 K linear fittings, discrete suspension wires and connected services.
 for(const z of [-19,-31.5,-43.5]){
  for(let x=-29;x<27;x+=7.4){b(x,-.65,z,4.5,.115,.18,m.dark,0,.02);b(x,-.718,z,4.37,.028,.125,m.led,0,.008);for(const dx of [-1.8,1.8])k.pipe(new T.Vector3(x+dx,-.23,z),new T.Vector3(x+dx,-.59,z),.009,m.steel);}
  k.pipe(new T.Vector3(-35,-.65,z-1.6),new T.Vector3(27,-.65,z-1.6),.045,m.red);
  for(let x=-29;x<27;x+=5){k.pipe(new T.Vector3(x,-.64,z-1.6),new T.Vector3(x,-.84,z-1.6),.014,m.red);b(x,-.85,z-1.6,.085,.019,.085,m.steel,0,.008);for(const dx of [-.065,.065])b(x+dx,-.56,z-1.6,.01,.14,.14,m.steel,0,0);}
 }
 for(const x of [-27,-10,18]){
  for(const dx of [-.32,.32])b(x+dx,-.51,-30,.045,.13,41,m.steel,0,.006);
  for(let z=-50;z<-9;z+=.32)b(x,-.55,z,.66,.032,.035,m.steel,0,.003);
  for(let z=-49;z<-9;z+=3){for(const dx of [-.41,.41])k.pipe(new T.Vector3(x+dx,-.25,z),new T.Vector3(x+dx,-.58,z),.009,m.steel);b(x,-.59,z,.89,.036,.035,m.steel,0,.003);}
  for(const dx of [-.15,0,.15])k.pipe(new T.Vector3(x+dx,-.50,-50),new T.Vector3(x+dx,-.50,-9),.015,m.rubber);
 }
 for(const z of [-10,-34,-49])k.pipe(new T.Vector3(-35,-.44,z),new T.Vector3(27,-.44,z),.025,m.steel);
 // Large main-aisle arrows, rather than a dashed road stripe through pedestrian space.
 for(const z of [-19,-31.5,-43.5])for(const x of [-19,-4,18]){const g=new T.Shape();g.moveTo(-.9,-.07);g.lineTo(.3,-.07);g.lineTo(.3,-.32);g.lineTo(.95,0);g.lineTo(.3,.32);g.lineTo(.3,.07);g.lineTo(-.9,.07);const geo=new T.ShapeGeometry(g);geo.rotateX(-Math.PI/2);geo.translate(x,y+.018,z);k.add(geo,m.white);}
 // A stone and oak lift lobby takes the place of five bays, without intruding into the aisle.
 b(9.3,-1.68,-11.55,14.8,3.04,7.0,m.dark);b(9.3,y+.025,-13.4,15.2,.05,5.5,stone,0,.025);
 b(9.3,-1.66,-15.11,14.78,3.02,.15,stone);b(9.3,-.36,-15.6,15.1,.18,1.28,stone);b(9.3,-.47,-15.38,14.4,.035,.045,m.accent,0,.006);
 for(const x of [2.9,3.8,6.55,7.4,8.15,10.96,13.42,15.2])b(x,-1.67,-15.188,.006,2.92,.008,m.bronze,0,0);
 for(const x of [5.1,9.5]){b(x,-1.82,-15.225,2.25,2.70,.12,m.dark);b(x,-1.84,-15.31,1.97,2.59,.045,m.bronze);
  for(const dx of [-.475,.475])b(x+dx,-1.86,-15.35,.942,2.53,.032,m.bronze,0,.009);
  b(x,-1.86,-15.378,.011,2.54,.013,m.dark,0,0);for(const dx of [-1.075,1.075])b(x+dx,-1.81,-15.38,.085,2.68,.09,m.bronze,0,.008);
  b(x,-.535,-15.389,1.92,.04,.025,m.accent,0,.004);panel('↑  01',x,-.72,-15.40,.40,.095,Math.PI);
  b(x+1.34,-1.98,-15.33,.125,.30,.03,m.dark,0,.014);b(x+1.34,-1.97,-15.35,.035,.045,.013,m.accent,0,.006);
 }
 for(let x=11.28;x<12.65;x+=.115)b(x,-1.65,-15.32,.05,2.96,.16,wood,0,.009);
 for(const x of [2.05,12.84,16.58])b(x,-1.68,-15.39,.025,2.86,.035,m.accent,0,.005);
 const logo=greenMarbleMonogram(own);logo.scale.setScalar(.15);logo.position.set(14.3,-1.91,-15.40);logo.rotation.y=Math.PI;(logo.material as T.MeshStandardMaterial).userData.alwaysLit=true;root.add(logo);
 panel('RESIDÊNCIAS',14.3,-2.25,-15.40,1.62,.13,Math.PI);
 // Ceiling and wall signs are oriented to the eastbound arrival view.
 for(const x of [-12,18]){b(x,-.83,-19,.08,.46,4.65,m.dark);panel('← SAÍDA    |    ELEVADORES ↗',x-.049,-.83,-19,4.54,.42,-Math.PI/2);for(const z of [-20.8,-17.2])k.pipe(new T.Vector3(x,-.25,z),new T.Vector3(x,-.60,z),.009,m.steel);}
 panel('SUBSOLO 01',27.84,-1.40,-19,5,.75,-Math.PI/2);
 for(const x of [-25,-5,25]){b(x,-1.89,-8.20,.47,.90,.16,m.red);panel('INCÊNDIO',x,-1.21,-8.30,.5,.14,Math.PI);}
 // Perimeter recesses and column contact shadows anchor all heavy elements to the slab.
 for(const p of garageColumns55)shadow(root,p.x,p.z,1.4,1.4,y+.013);
 for(const z of [-8.14,-51.85])b(-4,y+.016,z,63.7,.035,.065,m.dark,0,0);
 k.flush();root.userData.carCount=garageCars55.length;return root;
}
