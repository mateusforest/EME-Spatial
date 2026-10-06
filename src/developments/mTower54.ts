import * as T from 'three';
import {craft53,sign53} from './mCraft53';
import {addMGalleryFoliage} from './mGalleryFoliage';
import {greenMarbleMonogram} from './mMarbleMonogram';
import {poolWater41,poolTiles53} from './mPoolSurfaces41';
import {terracePalms54} from './mPalms54';
import {makeMUnit,type MUnit} from './mUnits';
import type {Own,mSurfaces} from './mSurfaces';

/** Concept reconstructed from the user's seven two-tower references, not a survey. */
export const TOWER_B54={x:153,z:-3,base:8.2,step:3.5,levels:12,width:48,depth:30};
export const towerBUnit54=(n:number):MUnit=>({...makeMUnit(n,'standard'),id:`b-${n}`,name:'M Lago',description:'Residência conceitual da Torre Lago. O interior é um estudo de ambientação, ainda em compatibilização com a nova fachada.'});

function outline54(scale=1){
 const s=new T.Shape();s.moveTo(-18*scale,-15*scale);s.lineTo(18*scale,-15*scale);s.quadraticCurveTo(24*scale,-15*scale,24*scale,-9*scale);s.lineTo(24*scale,9*scale);s.quadraticCurveTo(24*scale,15*scale,18*scale,15*scale);s.lineTo(10*scale,15*scale);s.bezierCurveTo(5*scale,15*scale,5*scale,6*scale,0,6*scale);s.bezierCurveTo(-5*scale,6*scale,-5*scale,15*scale,-10*scale,15*scale);s.lineTo(-18*scale,15*scale);s.quadraticCurveTo(-24*scale,15*scale,-24*scale,9*scale);s.lineTo(-24*scale,-9*scale);s.quadraticCurveTo(-24*scale,-15*scale,-18*scale,-15*scale);return s;
}
export function buildTower54(scene:T.Scene,own:Own,surfaces:ReturnType<typeof mSurfaces>){
 const root=new T.Group();root.name='Torre Lago · referência duas torres';root.position.set(TOWER_B54.x,0,TOWER_B54.z);scene.add(root);
 const mat=(name:string,color:string,roughness=.7,metalness=0)=>{const m=own(new T.MeshStandardMaterial({color,roughness,metalness}));m.name=name;return m;};
 const stone=mat('Lago limestone','#efe9d9'),wood=mat('Lago natural oak','#b99c76'),bronze=mat('Lago anodized bronze','#4b4940',.36,.7),linen=mat('Lago woven linen','#e6dfcc'),olive=mat('Lago olive cushions','#616c46');
 surfaces.finishStone(stone);surfaces.finishWood(wood);surfaces.finishLinen(linen);surfaces.finishLinen(olive);
 const glass=own(new T.MeshPhysicalMaterial({color:'#d4e5df',roughness:.09,metalness:0,transparent:true,opacity:.18,depthWrite:false,side:T.DoubleSide,envMapIntensity:1.2}));
 const warm=mat('Lago recessed 2700K LEDs','#fff1da',.4);warm.emissive.set('#ffd3a0');warm.emissiveIntensity=2.2;warm.userData.noNightFill=true;
 const interior=mat('Lago warm interiors','#c6ac85',.9);interior.emissive.set('#ffdcb0');interior.emissiveIntensity=.12;
 const water=poolWater41(own),tiles=poolTiles53(own);
 function slab(parent:T.Group,scale:number,y:number,h:number,m:T.Material){const g=own(new T.ExtrudeGeometry(outline54(scale),{depth:h,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:2,curveSegments:12}));g.rotateX(-Math.PI/2);g.translate(0,y,0);const mesh=new T.Mesh(g,m);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);}
 const contour=(scale:number)=>outline54(scale).getSpacedPoints(140).map(p=>new T.Vector3(p.x,0,-p.y));
 // Shape coordinates are mirrored into Three.js ground axes: the carved terrace faces arrival.
 function band(parent:T.Group,scale:number,y:number,height:number,m:T.Material){const pts=contour(scale),p:number[]=[],uv:number[]=[],idx:number[]=[];let length=0;
  pts.forEach((v,i)=>{if(i)length+=v.distanceTo(pts[i-1]);p.push(v.x,y,v.z,v.x,y+height,v.z);uv.push(length/2,0,length/2,height/2);if(i<pts.length-1){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}});
  const g=own(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const mesh=new T.Mesh(g,m);mesh.castShadow=!m.transparent;mesh.receiveShadow=true;parent.add(mesh);
 }
 function furnish(parent:T.Group,y:number,roof=false){const setting=new T.Group();setting.rotation.y=Math.PI;parent.add(setting);const k=craft53(setting,own),b=k.box;
  for(const x of [-12,12]){b(x,y+.31,6,4.5,.42,1.65,wood);b(x,y+.58,6,4.35,.28,1.52,linen);b(x,y+.96,5.35,4.4,.76,.24,linen);b(x-1.25,y+1.0,5.72,.72,.65,.20,olive,0,.09);b(x,y+.40,8.5,2.2,.16,1.15,stone);for(const dx of [-.75,.75])b(x+dx,y+.19,8.5,.09,.36,.75,bronze);
   b(x+4,y+.3,7.0,1.0,.42,1.2,wood);b(x+4,y+.58,7,1.0,.24,1.2,linen);b(x+4,y+.91,6.48,1.0,.64,.16,linen);
   if(roof){for(const z of [-3,0,3]){b(x,y+.32,z,1.5,.25,2.6,wood);b(x,y+.54,z,1.38,.20,2.4,linen);}}
  }k.flush();
 }
 // Generous double-height entrance with a genuinely open central door and planted forecourt.
 const podium=new T.Group();podium.name='Lago lobby and podium';root.add(podium);slab(podium,1.13,.28,.38,stone);slab(podium,1.11,7.8,.4,stone);slab(podium,1.105,7.70,.08,wood);
 const lobbyKit=craft53(podium,own),b=lobbyKit.box;
 // Level arrival bridge crosses the sculpted forecourt and joins the public promenade.
 b(0,.47,-14,7.4,.38,26,stone);
 for(const x of [-3.6,3.6])b(x,.669,-17,.055,.02,19,warm);
 for(const side of [-1,1]){b(side*7,.80,-12,3,.65,5.5,stone);b(side*5,.96,-12,.55,.12,4.8,wood);}
 for(const x of [-21,-13,13,21])for(const z of [-10,10])b(x,4.17,z,.4,7.1,.42,bronze);
 for(const x of [-17,17]){b(x,4.1,-11,15.5,6.8,.06,glass);for(let dx=-7.5;dx<=7.5;dx+=2.5)b(x+dx,4.1,-11.07,.075,6.9,.12,bronze);}
 for(const x of [-22,22])b(x,4.1,-1,.06,6.8,23,glass);
 b(0,1.15,7,7,1.05,1.15,stone);b(0,4,12,11,7,.25,wood);for(let x=-19;x<=19;x+=3)b(x,7.61,-8,.14,.045,.14,warm);
 lobbyKit.flush();furnish(podium,.65);sign53(podium,own,'M LAGO',0,4.8,11.82,4.7,Math.PI);
 const floors:T.Group[]=[];
 for(let n=0;n<TOWER_B54.levels;n++){
  const f=new T.Group();f.name=`Torre Lago · ${n+1}º andar`;f.position.y=TOWER_B54.base+n*TOWER_B54.step;f.userData.floor=n+1;root.add(f);floors.push(f);
  slab(f,1,0,.32,stone);slab(f,.992,-.06,.055,wood);band(f,.98,.34,1.08,glass);band(f,.98,1.40,.035,bronze);
  band(f,.79,.33,2.80,glass);band(f,.795,3.1,.065,warm);slab(f,.76,.32,.035,interior);
  const k=craft53(f,own),points=contour(.79);let distance=0;
  // Rooms have visible depth and back walls; the glass no longer reads as an empty shell.
  for(const x of [-12,12]){k.box(x,1.72,1,14,2.65,.18,linen);k.box(x+5,1.72,-3,.14,2.65,8,wood);k.box(x,3.07,-8,11,.04,.045,warm);k.box(x,2.04,.87,3.5,1.8,.045,olive);k.box(x,2.04,.83,3.6,1.9,.035,bronze);}
  for(let i=1;i<points.length;i++){distance+=points[i].distanceTo(points[i-1]);if(distance>2.6){distance=0;const p=points[i];k.box(p.x,1.72,p.z,.085,2.85,.09,bronze);}}
  for(const side of [-1,1]){for(let i=0;i<10;i++)k.box(side*(4.8+i*.23),1.78,-6.3,.085,2.85,.30,wood);k.box(side*19,.71,8,4.8,.72,1.3,stone);k.box(side*19,.71,-11,4.8,.72,1.3,stone);}
  // Recessed vertical timber spine and occasional larger planted terraces.
  k.box(0,1.75,-4.3,7.2,3.5,.18,bronze);for(let x=-3.5;x<=3.5;x+=.22)k.box(x,1.75,-4.5,.09,3.5,.30,wood);
  if(n===3||n===7){k.box(0,.40,-6.7,12,.32,5.2,stone);k.box(0,.94,-8.6,8,.75,1.1,stone);k.box(0,1.19,-9.25,11.5,1.1,.045,glass);k.box(0,1.76,-9.25,11.5,.045,.045,bronze);addMGalleryFoliage(f,own,[-3,-1.5,0,1.5,3].map(x=>[x,1.3,-8.6,3.4]));}
  k.flush();furnish(f,.37);
  if(n===3||n===7)terracePalms54(f,own,[[-3,1.3,-8.1,.78],[3,1.3,-8.1,.88]]);
  addMGalleryFoliage(f,own,[-1,1].flatMap(s=>[-1.4,0,1.4].flatMap(d=>[[s*19+d,1.06,8,2.3],[s*19+d,1.06,-11,2.3]])));
 }
 const roof=new T.Group();roof.name='Lago rooftop';roof.position.y=TOWER_B54.base+TOWER_B54.levels*TOWER_B54.step;root.add(roof);slab(roof,1.05,0,.4,stone);band(roof,1.03,.4,1.15,glass);band(roof,1.03,1.54,.04,bronze);
 const rk=craft53(roof,own),rb=rk.box;for(const x of [-14,14]){rb(x,.55,-7,13,.35,8,stone);rb(x,.745,-7,12.5,.05,7.5,tiles);rb(x,.85,-7,12.4,.025,7.4,water);}
 rb(0,4.15,0,16,.32,11,stone);rb(0,3.95,0,15.8,.06,10.8,wood);for(const x of [-7,7])for(const z of [-4.6,4.6])rb(x,2.3,z,.25,3.6,.25,wood);rb(0,1.1,-3,10,1.2,1.2,stone);rb(0,1.75,-3,10.3,.15,1.4,stone);rb(0,3.85,-4.5,13,.05,.05,warm);rk.flush();furnish(roof,.44,true);
 const logo=greenMarbleMonogram(own);logo.position.set(0,4.3,0);logo.scale.setScalar(.65);roof.add(logo);
 addMGalleryFoliage(roof,own,[-1,1].flatMap(s=>[[s*20,.5,9,4],[s*20,.5,-10,4]]));
 terracePalms54(roof,own,[[-20,.5,9,1.1],[20,.5,9,1],[-20,.5,-10,.88],[20,.5,-10,.97]]);
 // Entrance landscape sits on the same ground as the connected promenade.
 addMGalleryFoliage(podium,own,[-1,1].flatMap(s=>[0,3,6,9].map(z=>[s*24,.65,z,3.8])));
 addMGalleryFoliage(podium,own,[-1,1].flatMap(s=>[-13.6,-12,-10.4].map(z=>[s*7,1.13,z,2.5])));
 root.rotation.y=Math.PI; // carved central terraces and lobby entrance face +Z
 return {root,floors,crown:roof,podium};
}
