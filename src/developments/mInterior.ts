import {interiorStyle53,textile53} from './mInteriorStyles53';
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { contactShadow, mSurfaces, type Own } from './mSurfaces';
import { M_STEP, unitForFloor, type MUnit } from './mUnits';
import type { Obstacle } from './mWalking';
import { mRearEnclosure } from './mRearFacade';
import {mSideEnclosure} from './mSideFacade';

export const PILOT_FLOOR = 8;
export const EYE_HEIGHT = .32 + 1.65;
export interface RoomView { eye:[number,number,number];look:[number,number,number] }
export const interiorViews = {
 'Vista do condomínio': {eye:[0,EYE_HEIGHT,8.6],look:[0,.5,130]},
 'Living': { eye: [-.6, EYE_HEIGHT, 3.9], look: [-4.5, 1.25, .6] },
 'Cozinha e jantar': { eye: [1.0, EYE_HEIGHT, 4.05], look: [5.2, 1.2, .3] },
 'Varanda': { eye: [-2, EYE_HEIGHT, 8], look: [6, 1.2, 7.7] },
 'Suíte': { eye: [-3.1, EYE_HEIGHT, -3.65], look: [-4.5, 1, -5.6] },
 'Hall privativo': { eye:[0,EYE_HEIGHT,-3.7],look:[0,1.55,-6.4] },
 'Lavabo':{eye:[-6.35,EYE_HEIGHT,-2.3],look:[-7.3,1.3,-2.0]},
 'Escritório':{eye:[-6.2,EYE_HEIGHT,.25],look:[-7.8,1.1,-.3]},
 'Andar superior':{eye:[.4,EYE_HEIGHT+M_STEP,0],look:[-4.6,1.4,1.9]},
 'Piscina':{eye:[3.0,EYE_HEIGHT,9.0],look:[7.6,.65,11.5]},
} satisfies Record<string,RoomView>;
export type InteriorView = keyof typeof interiorViews;
export interface InteriorLevel {index:number;elevation:number;obstacles:Obstacle[];bounds:Obstacle;walkAreas?:Obstacle[]}
export interface InteriorStair extends Obstacle {axis:'z';startZ:number;endZ:number;fromY:number;toY:number}

/** All versions share a front terrace and a usable, enclosed residence behind it. */
export function buildMInterior(own:Own,anisotropy=4,unit:MUnit=unitForFloor(PILOT_FLOOR),sharedSurfaces?:ReturnType<typeof mSurfaces>) {
 const group=new T.Group(),ceiling=new T.Group();group.name=unit.name;group.add(ceiling);
 const front=4.5,rear=front-unit.depth,half=unit.width/2,terraceHalf=unit.terraceWidth/2;
 const multi=unit.endFloor>unit.startFloor;
 const wingSign=unit.projection==='left'?-1:1;
 const wingMin=unit.projection?wingSign<0?-terraceHalf-7:terraceHalf:0,wingMax=unit.projection?wingSign<0?-terraceHalf:terraceHalf+7:0;
 const bounds:Obstacle={minX:-terraceHalf+.22-(unit.projection==='left'?7:0),maxX:terraceHalf-.22+(unit.projection==='right'?7:0),minZ:rear+.22,maxZ:9.35};
 const levels:InteriorLevel[]=[],stairs:InteriorStair[]=[],doorways:{x:number;z:number;level:number}[]=[];
 const surfaces=sharedSurfaces??mSurfaces(own,anisotropy),shadow=contactShadow(own);
 const style=interiorStyle53(unit);group.userData.interiorStyle=style.name;
 const finish=(color:string,roughness=.85)=>own(new T.MeshStandardMaterial({color,roughness}));
 const plaster=finish('#e8e3d9'),stone=finish('#d8ceba'),oak=finish('#c0a078'),linen=finish('#d9d1c2'),forest=finish('#465440'),leather=finish('#936d4a'),rug=finish('#b7ab94'),bronze=finish('#49453e',.32),white=finish('#eee9e0'),screen=finish('#18201c',.22),grout=finish('#c9bfae');
 const warmGlow=own(new T.MeshStandardMaterial({color:'#fff0d8',emissive:'#fff0d8',emissiveIntensity:.65}));
 const upholstery=finish(style.sofa,style.index===1?.44:.96),accentWall=finish(style.wall,.88),pattern=textile53(own,style.index);
 bronze.color.set(style.metal);bronze.metalness=.7;screen.metalness=.12;forest.color.set(style.accent);rug.color.set(style.rug);
 const mirror=finish('#bcc7bc',.06);mirror.metalness=1;
 surfaces.finishWood(oak);oak.color.set(style.oak);surfaces.finishStone(stone);plaster.color.set(style.index<2?'#e7e4d9':'#e0d9cb');plaster.roughness=.92;
 for(const m of [linen,forest,rug,...(style.index===1?[]:[upholstery])])surfaces.finishLinen(m);
 const glazing=own(new T.MeshPhysicalMaterial({color:'#d6dfdc',transparent:true,opacity:.075,roughness:.06,metalness:.08,depthWrite:false,side:T.DoubleSide}));
 const privateGlass=own(new T.MeshPhysicalMaterial({color:'#becac4',transparent:true,opacity:.76,roughness:.48,metalness:.08,depthWrite:false,side:T.DoubleSide}));privateGlass.forceSinglePass=true;
 const sheer=own(new T.MeshStandardMaterial({color:'#e8e2d6',roughness:1,transparent:true,opacity:.6,side:T.DoubleSide}));
 const water=own(new T.MeshPhysicalMaterial({color:'#76a59e',roughness:.10,metalness:.15,transparent:true,opacity:.76,depthWrite:false}));
 water.name='M penthouse infinity water';
 const mapped=new Set<T.Material>([oak,stone,plaster,linen,forest,rug,upholstery]);
 const cube=own(new T.BoxGeometry(1,1,1));
 let current!:T.Group,decor!:T.Group,roof!:T.Group,currentLevel!:InteriorLevel;

 function box(parent:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,soft=false,collision=false){
  const textured=mapped.has(m),geometry=soft?own(new RoundedBoxGeometry(w,h,d,3,Math.min(.13,w*.22,h*.22,d*.22))):textured?own(new T.BoxGeometry(w,h,d)):cube;
  if(textured){const uv=geometry.getAttribute('uv'),p=geometry.getAttribute('position'),n=geometry.getAttribute('normal');const size=m===oak?2.2:m===linen||m===forest||m===rug||m===upholstery?.34:1.65;for(let i=0;i<uv.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));uv.setXY(i,(nx>.5?p.getZ(i):p.getX(i))/size,(ny>.5?p.getZ(i):p.getY(i))/size);}uv.needsUpdate=true;}
  const mesh=new T.Mesh(geometry,m);if(!soft&&!textured)mesh.scale.set(w,h,d);mesh.position.set(x,y,z);mesh.castShadow=!m.transparent;mesh.receiveShadow=true;parent.add(mesh);
  if(collision&&y+h/2>.43&&y-h/2<2.3)currentLevel.obstacles.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});
  return mesh;
 }
 const b=(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,soft=false)=>box(current,x,y,z,w,h,d,m,soft,true);
 const detail=(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,soft=false)=>box(decor,x,y,z,w,h,d,m,soft);
 const c=(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material)=>box(roof,x,y,z,w,h,d,m===plaster?white:m);
 function cylinder(parent:T.Object3D,x:number,y:number,z:number,r:number,h:number,m:T.Material,collision=false,rBottom=r){
  const mesh=new T.Mesh(own(new T.CylinderGeometry(r,rBottom,h,28)),m);mesh.position.set(x,y,z);mesh.castShadow=!m.transparent;mesh.receiveShadow=true;parent.add(mesh);
  if(collision&&y+h/2>.43&&y-h/2<2.3)currentLevel.obstacles.push({minX:x-r,maxX:x+r,minZ:z-r,maxZ:z+r});return mesh;
 }
 function sphere(parent:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material){const mesh=new T.Mesh(own(new T.SphereGeometry(1,20,12)),m);mesh.scale.set(w/2,h/2,d/2);mesh.position.set(x,y,z);mesh.castShadow=!m.transparent;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 function wallDoor(min:number,max:number,z:number,doorX:number,width=1.16){
  const start=doorX-width/2,end=doorX+width/2;
  if(start>min)b((min+start)/2,1.87,z,start-min,3.1,.15,plaster);
  if(max>end)b((max+end)/2,1.87,z,max-end,3.1,.15,plaster);
  b(doorX,3.0,z,width,.62,.15,plaster);
  detail(start-.035,1.52,z+.085,.07,2.40,.09,oak);detail(end+.035,1.52,z+.085,.07,2.40,.09,oak);detail(doorX,2.76,z+.085,width+.14,.07,.09,oak);
  doorways.push({x:doorX,z,level:currentLevel.index});
 }
 function seamFloor(minX:number,maxX:number,minZ:number,maxZ:number,wood=false){
  const material=grout;void wood;
  for(let x=Math.ceil(minX/1.45)*1.45;x<maxX;x+=1.45)detail(x,.323,(minZ+maxZ)/2,.009,.003,maxZ-minZ,material);
  for(let z=Math.ceil(minZ/1.45)*1.45;z<maxZ;z+=1.45)detail((minX+maxX)/2,.324,z,maxX-minX,.003,.009,material);
 }
 function book(x:number,y:number,z:number,w=.22){detail(x,y,z,w,.035,.31,forest);detail(x+.035,y+.04,z,w*.9,.035,.29,white);}
 function pot(x:number,z:number,height=1.25,y=0){
  cylinder(decor,x,y+.54,z,.24,.43,stone,false,.18);
  detail(x,y+height*.55+.63,z,.028,height,.028,bronze);
  const leaf=own(new T.SphereGeometry(1,9,5)),leaves=own(new T.InstancedMesh(leaf,forest,18)),dummy=new T.Object3D();
  for(let i=0;i<18;i++){const angle=i*2.399,yLeaf=y+.83+i*height/22;dummy.position.set(x+Math.cos(angle)*(.16+i*.008),yLeaf,z+Math.sin(angle)*(.16+i*.008));dummy.rotation.set(.45,angle,.6);dummy.scale.set(.20,.035,.38);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);}leaves.castShadow=true;decor.add(leaves);shadow(decor,x,z,1.05,1.05,y+.327);
 }
 function vase(x:number,y:number,z:number){cylinder(decor,x,y+.14,z,.105,.28,stone,false,.07);for(let i=0;i<5;i++){const branch=detail(x+(i-2)*.035,y+.38,z+(i%2)*.06,.012,.52,.012,forest);branch.rotation.z=(i-2)*.11;}sphere(decor,x,y+.53,z,.28,.18,.26,forest);}
 function woodChair(x:number,z:number,rotation=0,upholstery:T.Material=linen){
  const parts=new T.Group();decor.add(parts);parts.position.set(x,0,z);parts.rotation.y=rotation;
  box(parts,0,.83,0,.67,.18,.68,upholstery,true);box(parts,0,1.13,.27,.71,.48,.12,upholstery,true);
  for(const dx of [-.27,.27])for(const dz of [-.24,.24])box(parts,dx,.56,dz,.048,.45,.048,oak,true);
  for(const dx of [-.34,.34]){box(parts,dx,1.03,0,.055,.065,.67,oak,true);box(parts,dx,.90,.24,.055,.4,.055,oak,true);}
  currentLevel.obstacles.push({minX:x-.36,maxX:x+.36,minZ:z-.38,maxZ:z+.38});
 }
 function lounge(x:number,z:number,rotation:number,upholstery:T.Material=forest){
  const chair=new T.Group();decor.add(chair);chair.position.set(x,0,z);chair.rotation.y=rotation;
  sphere(chair,0,.79,-.05,1.03,.35,.95,upholstery);
  // A continuous upholstered arc gives the armchair a curved back and real side arms.
  const shape=new T.Shape(),segments=24;
  for(let i=0;i<=segments;i++){const a=T.MathUtils.degToRad(-20+i*220/segments),x=.56*Math.cos(a),z=.56*Math.sin(a);if(i===0)shape.moveTo(x,z);else shape.lineTo(x,z);}
  for(let i=segments;i>=0;i--){const a=T.MathUtils.degToRad(-20+i*220/segments);shape.lineTo(.40*Math.cos(a),.40*Math.sin(a));}shape.closePath();
  const backGeometry=own(new T.ExtrudeGeometry(shape,{depth:.48,bevelEnabled:true,bevelThickness:.045,bevelSize:.065,bevelSegments:3,curveSegments:24}));backGeometry.rotateX(Math.PI/2);
  const back=new T.Mesh(backGeometry,upholstery);back.position.y=1.35;back.castShadow=true;back.receiveShadow=true;chair.add(back);
  for(const dx of [-.53,.53]){box(chair,dx,.98,0,.07,.07,1.1,oak,true);for(const dz of [-.35,.35])box(chair,dx,.61,dz,.07,.58,.07,oak,true);}
  currentLevel.obstacles.push({minX:x-.58,maxX:x+.58,minZ:z-.55,maxZ:z+.55});shadow(decor,x,z,1.75,1.75,.35);
 }
 function sofa(centerX:number,z:number,width=4.7,outdoor=false){
  const organic=style.index===3&&!outdoor;
  if(!organic)b(centerX,.61,z,width,.46,1.03,(outdoor?linen:upholstery),true);
  const count=outdoor?3:4;
  for(let i=0;i<count;i++){const x=centerX+(i-(count-1)/2)*width/count,curve=(organic?.45:.10)*Math.cos((i-(count-1)/2)*.85);if(organic)b(x,.61,z+curve,width/count+.03,.46,1.03,upholstery,true);detail(x,.88,z-.075+curve,width/count-.025,.22,.96,(outdoor?linen:upholstery),true);const back=detail(x,1.16,z+.37+curve,width/count-.02,.72,.26,(outdoor?linen:upholstery),true);back.rotation.z=(i-(count-1)/2)*.025;}
  for(const sign of [-1,1]){b(centerX+sign*(width/2-.12),1.02,z,.32,.65,1.15,(outdoor?linen:upholstery),true);const pillow=detail(centerX+sign*(width/2-.63),1.12,z+.24,.53,.46,.18,sign<0?pattern:forest,true);pillow.rotation.z=sign*.12;}
  detail(centerX-width*.25,.95,z-.30,.72,.06,.62,rug,true);shadow(decor,centerX,z,width+1,2.1,.356);
 }
 function coffee(x:number,z:number,material:T.Material=stone){cylinder(current,x,.62,z,1.02,.17,material,true);cylinder(decor,x-.42,.43,z,.25,.28,oak);cylinder(decor,x+.42,.43,z,.25,.28,oak);book(x-.2,.735,z-.1,.44);vase(x+.35,.71,z+.1);shadow(decor,x,z,2.8,2.8,.35);}
 function bookshelves(x:number,z:number){
  detail(x,1.86,z,.90,3.02,.30,oak);
  for(let y=.73;y<3;y+=.48){detail(x,y,z+.17,.86,.05,.40,stone);for(let i=0;i<5;i++)detail(x-.29+i*.11,y+.19,z+.17,.065,.34-(i%3)*.025,.17,i%2?white:forest);}
 }
 function bathroom(min:number,max:number,bathRear:number,master=false){
  const center=(min+max)/2,depth=2.35,bathFront=bathRear+depth,width=max-min,doorX=max-.72;
  b(center,.343,bathRear+depth/2,width,.035,depth,stone);
  wallDoor(min,max,bathFront,doorX,.97);
  const vanityX=min+Math.min(1.0,width*.32),vanityWidth=Math.min(1.65,width-.95);
  b(vanityX,.82,bathRear+.40,vanityWidth,.86,.55,oak,true);detail(vanityX,1.28,bathRear+.4,vanityWidth+.04,.075,.65,stone,true);
  cylinder(decor,vanityX,1.34,bathRear+.43,.23,.06,white);detail(vanityX,1.58,bathRear+.20,.035,.51,.035,bronze);detail(vanityX,1.79,bathRear+.32,.035,.035,.26,bronze);
  detail(vanityX,1.92,bathRear+.115,vanityWidth,1.00,.065,bronze,true);detail(vanityX,1.92,bathRear+.155,vanityWidth-.07,.92,.026,mirror,true);
  const toiletX=master&&width>4.2?max-1.24:min+.53;
  b(toiletX,.68,bathRear+1.62,.48,.5,.64,white,true);detail(toiletX,.98,bathRear+1.45,.44,.63,.16,white,true);
  if(master&&width>4.2){b(min+.73,.70,bathRear+1.6,1.3,.65,.8,white,true);detail(min+.73,1.04,bathRear+1.6,1.12,.035,.62,stone,true);}
  b(max-.24,1.79,bathRear+.7,.035,2.85,1.4,glazing);detail(max-.21,2.72,bathRear+.5,.02,.32,.02,bronze);detail(max-.37,2.90,bathRear+.5,.3,.025,.30,bronze);
 }
 function bedroom(min:number,max:number,bedRear:number,master=false){
  const width=max-min,roomCenter=(min+max)/2,center=roomCenter-(unit.kind==='compact'?.5:0),frontWall=-3.1,bedZ=Math.min(bedRear+4.40,frontWall-1.55);
  b(center,.341,(bedRear+frontWall)/2,width,.04,frontWall-bedRear,oak);
  // En-suite rooms retain a real opening instead of sharing a decorative wall.
  bathroom(min+.12,max-.12,bedRear+.12,master);
  const doorX=roomCenter+Math.min(.80,width*.23);wallDoor(min,max,frontWall,doorX);
  b(center,.60,bedZ,1.95,.45,2.16,oak,true);b(center,.92,bedZ,1.93,.22,2.13,linen,true);
  b(center,1.30,bedZ-1.08,2.16,1.44,.14,linen,true);
  detail(center,1.065,bedZ+.17,1.91,.09,1.72,linen,true);detail(center,1.13,bedZ+.65,1.97,.075,.54,forest,true);
  for(const sign of [-1,1]){detail(center+sign*.49,1.11,bedZ-.74,.84,.15,.5,white,true);const side=center+sign*1.32;if(side>min+.24&&side<max-.24){b(side,.73,bedZ-.70,.49,.65,.52,oak,true);detail(side,1.10,bedZ-.70,.52,.065,.55,stone,true);cylinder(decor,side,1.28,bedZ-.7,.045,.3,bronze);cylinder(decor,side,1.5,bedZ-.7,.16,.22,linen);}}
  if(width>4.1){b(min+.35,1.78,-4.65,.62,2.89,2.45,oak);for(let z=-5.65;z<-3.6;z+=.51)detail(min+.68,1.78,z,.016,2.72,.014,bronze);}
  shadow(decor,center,bedZ,2.8,3.2,.367);
  if(!views['Suíte']||master)views['Suíte']={eye:[doorX,EYE_HEIGHT+currentLevel.elevation,-3.45],look:[center,1.1+currentLevel.elevation,bedZ-.25]};
 }
 function suites(count:number){
  const wing=half-1.85,leftCount=count>2?2:1,rightCount=count>3?2:1;
  for(const side of [-1,1]){const n=side<0?leftCount:rightCount;for(let i=0;i<n;i++){const a=side<0?-half+.17+i*wing/n:1.85+i*wing/n,boundary=a+wing/n-.08;bedroom(a,boundary,rear+.15,n===1);if(i<n-1)b(boundary+.06,1.87,(rear-3.1)/2,.13,3.1,-3.1-rear,plaster);}}
  // Bedroom walls flank the private hall rather than cutting off the living.
  for(const x of [-1.77,1.77])b(x,1.87,(rear-3.1)/2,.14,3.1,-3.1-rear,plaster);
 }
 function privateCore(){
  const depth=3.1,face=rear+depth;
  b(0,1.87,rear+depth/2,3.1,3.1,depth,plaster);
  detail(0,1.58,face+.09,1.48,2.51,.03,bronze);detail(0,1.58,face+.115,.022,2.51,.018,white);
  detail(1.10,1.65,face+.095,.12,.20,.04,bronze);detail(1.12,1.65,face+.124,.04,.045,.008,warmGlow);
  detail(-1.62,1.6,face+.8,.08,2.45,.95,oak);detail(-1.56,1.6,face+.8,.022,1.55,.64,mirror);
  cylinder(decor,-.96,.58,face+1.05,.27,.35,leather);vase(-.96,.75,face+1.05);
  if(currentLevel.index===0)views['Hall privativo']={eye:[multi?-.65:0,EYE_HEIGHT,-3.95],look:[0,1.55,face]};
 }
 function supportRooms(){
  // Service spaces sit at the side, with entrances from the wide rear gallery.
  const side=-half+.18,w=2.25,max=side+w;
  b(side+.05,1.87,-2.04,.12,3.1,2.0,plaster);b((side+max)/2,1.87,-3.02,w,3.1,.13,plaster);
  b(max,1.87,-2.81,.12,3.1,.42,plaster);b(max,1.87,-1.12,.12,3.1,.40,plaster);b(max,3.01,-1.98,.12,.65,1.26,plaster);
  b(side+.60,.82,-2.27,.9,.88,.55,oak);detail(side+.60,1.31,-2.27,.94,.08,.65,stone);cylinder(decor,side+.6,1.38,-2.3,.2,.04,white);detail(side+.6,1.62,-2.52,.028,.40,.028,bronze);detail(side+.6,2.09,-2.81,.75,1.20,.04,mirror,true);
  b(max-.52,.67,-2.5,.43,.51,.62,white,true);detail(max-.52,1.0,-2.76,.43,.56,.13,white,true);
  views['Lavabo']={eye:[max+.40,EYE_HEIGHT,-2.00],look:[side+.6,1.3,-2.27]};
  // A separate laundry door and a usable desk keep these rooms out of the social area.
  b((side+max)/2,1.87,-.71,w,3.1,.14,plaster);
  b(max,1.87,.70,.12,3.1,.30,plaster);b(max,3.01,.05,.12,.65,1.1,plaster);
  b(side+.50,.87,-.09,.86,1.02,.67,white,true);cylinder(decor,side+.50,.87,.26,.28,.035,bronze);detail(side+1.45,.94,-.13,.90,.08,.72,stone);detail(side+1.45,2.15,-.41,.84,1.13,.32,oak);
  b(side+.37,.99,1.77,.60,.13,2.08,oak);b(side+.32,1.67,1.75,.39,.065,1.96,oak);book(side+.48,1.03,1.2);woodChair(max-.1,1.85,Math.PI/2,linen);
  views['Escritório']={eye:[max-.9,EYE_HEIGHT,2.4],look:[side+.35,1.15,1.6]};
 }
 function socialRoom(){
  const livingX=unit.kind==='compact'?-3.6:-3.9;
  b(livingX,.36,1.90,6.0,.045,4.45,rug,true);sofa(livingX,3.35,unit.kind==='compact'?4.3:4.9);
  coffee(livingX,1.62);lounge(livingX-2.20,.28,.20);lounge(livingX+1.65,-.12,-.20);
  cylinder(current,livingX+1.65,.62,2.75,.53,.52,leather,true);detail(livingX+1.62,.905,2.72,.43,.045,.37,leather,true);
  const tvX=livingX+.30;
  b(tvX,1.87,-1.4,4.85,3.1,.13,plaster);detail(tvX,1.83,-1.30,4.62,2.96,.08,style.index<2?accentWall:oak);
  if(style.index===3)for(let i=0;i<41;i++){const x=tvX-2.30+i*.115;detail(x,1.85,-1.22+Math.sin(i/40*Math.PI)*.10,.05,2.93,.065,oak);}
  if(style.index===0){for(const x of [tvX-2.18,tvX-1.18,tvX+1.18,tvX+2.18])detail(x,1.85,-1.22,.022,2.72,.025,bronze);for(const y of [.55,3.15])detail(tvX,y,-1.22,4.38,.022,.025,bronze);}
  if(style.index===2){b(livingX-2.03,.62,2.35,1.0,.44,2.4,upholstery,true);detail(livingX-2.03,.9,2.35,.95,.22,2.3,upholstery,true);}
  b(tvX,.69,-1.03,4.63,.61,.52,oak);detail(tvX,1.92,-1.22+(style.index===3?.22:0),2.62,1.48,.075,bronze);detail(tvX,1.92,-1.176+(style.index===3?.22:0),2.50,1.36,.023,screen);
  bookshelves(tvX-1.84,-1.06);bookshelves(tvX+1.85,-1.06);
  for(let i=0;i<10;i++){const x=-half+2.6+i*.10;detail(x,1.86,-.65,.035,3.0,.075,oak);}
  const kitchenX=half-3.15,counterWidth=4.72;
  b(kitchenX,1.87,-1.42,counterWidth,3.1,.14,plaster);
  b(kitchenX,.86,-1.0,counterWidth,1.03,.74,oak);detail(kitchenX,1.395,-.95,counterWidth+.10,.08,.87,stone);
  detail(kitchenX,1.92,-1.30,counterWidth,1.01,.075,stone);b(kitchenX,2.70,-1.12,counterWidth,1.11,.48,oak);
  for(let x=kitchenX-counterWidth/2+.60;x<kitchenX+counterWidth/2;x+=.73){detail(x,.89,-.62,.014,.94,.020,bronze);detail(x,1.12,-.59,.37,.023,.025,bronze);detail(x,2.7,-.86,.015,1.02,.015,bronze);}
  detail(kitchenX,2.13,-.83,counterWidth-.06,.017,.018,warmGlow);
  b(half-.61,1.86,.15,.89,3.04,1.14,oak);detail(half-1.064,1.87,.15,.025,2.98,.025,bronze);detail(half-1.08,1.86,.3,.030,.52,.038,bronze);
  detail(kitchenX,1.456,-.92,.92,.018,.47,bronze);detail(kitchenX,1.47,-.92,.76,.009,.31,white);detail(kitchenX,1.70,-1.16,.035,.48,.035,bronze);detail(kitchenX,1.923,-1.02,.035,.035,.29,bronze);
  const islandZ=.64;
  b(kitchenX,.84,islandZ,3.49,.99,1.03,oak);b(kitchenX,1.36,islandZ,3.68,.11,1.18,stone,true);detail(kitchenX,.41,islandZ,3.30,.10,.96,bronze);
  detail(kitchenX-.86,.90,islandZ+.53,.72,.53,.025,bronze);detail(kitchenX-.86,.89,islandZ+.549,.63,.39,.015,screen);detail(kitchenX-.86,1.15,islandZ+.57,.62,.028,.032,bronze);
  detail(kitchenX-.8,1.425,islandZ,.75,.018,.58,bronze);for(const x of [kitchenX-1.00,kitchenX-.60])for(const z of [islandZ-.16,islandZ+.16])cylinder(decor,x,1.444,z,.095,.013,screen);
  vase(kitchenX+.78,1.42,islandZ+.03);
  const tableZ=3.26;
  b(kitchenX,1.04,tableZ,3.50,.13,1.35,oak,true);cylinder(decor,kitchenX-.8,.69,tableZ,.25,.65,oak);cylinder(decor,kitchenX+.8,.69,tableZ,.25,.65,oak);
  for(const x of [kitchenX-1.13,kitchenX,kitchenX+1.13]){woodChair(x,tableZ-1.02,Math.PI);woodChair(x,tableZ+1.04,0);}
  for(const x of [kitchenX-.85,kitchenX+.85]){detail(x,1.117,tableZ,.4,.012,.4,rug,true);cylinder(decor,x,1.14,tableZ,.16,.035,white);}
  vase(kitchenX,1.108,tableZ);shadow(decor,kitchenX,islandZ,4.45,2.20,.326);shadow(decor,kitchenX,tableZ,4.4,2.7,.326);
  pot(-half+2.1,3.42,1.35);pot(half-1.00,3.84,.9);
  views['Living']={eye:[-.55,EYE_HEIGHT,3.88],look:[livingX,1.25,1.0]};views['Cozinha e jantar']={eye:[.75,EYE_HEIGHT,4.02],look:[kitchenX,1.25,.25]};
 }
 function exteriorWalls(upper=false){
  mRearEnclosure(unit,(x,y,z,w,h,d,isGlass)=>b(x,y,z,w,h,d,isGlass?privateGlass:plaster));
  mSideEnclosure(unit,(x,y,z,w,h,d,isGlass)=>b(x,y,z,w,h,d,isGlass?glazing:plaster));
  if(upper)return;
  for(const sign of [-1,1]){const x=sign*(half-.65);b(x,1.89,front,1.25,3.02,.035,glazing);for(const dx of [-.63,.63])detail(x+dx,1.89,front,.045,3.10,.12,bronze);
   for(let i=0;i<15;i++)detail(sign*(half-1.18+i*.043),1.88,front-.17+(i%2)*.035,.06,3.05,.08,sheer);
  }
  b(0,.338,front,unit.width,.035,.15,bronze);detail(0,3.34,front,unit.width,.075,.15,bronze);
 }
 function terrace(){
  b(0,.16,7.05,unit.terraceWidth,.32,5.1,stone);seamFloor(-terraceHalf,terraceHalf,front,9.6);
  b(0,.97,9.60,unit.terraceWidth,1.30,.04,glazing);
  if(unit.projection){const wingCenter=(wingMin+wingMax)/2;
   b(wingCenter,.16,7.40,7,.32,4,stone);seamFloor(wingMin,wingMax,5.4,9.4);
   for(const z of [5.4,9.4]){b(wingCenter,.97,z,7,1.30,.04,glazing);detail(wingCenter,1.63,z,7,.045,.045,bronze);}
   b(wingSign*(terraceHalf+7),.97,7.40,.04,1.30,4,glazing);detail(wingSign*(terraceHalf+7),1.63,7.40,.045,.045,4,bronze);
   if(unit.kind==='penthouse'){
    // An open basin keeps the water above its bottom, with an unobstructed infinity edge.
    // The raised bottom retains a collision footprint over the entire pool.
    b(wingCenter,.50,7.4,5.55,.36,2.73,stone);
    b(wingCenter-wingSign*2.675,.70,7.4,.20,.76,2.73,stone);
    for(const z of [6.13,8.67])b(wingCenter,.70,z,5.55,.76,.20,stone);
    detail(wingCenter,1.06,7.4,5.15,.035,2.32,water);detail(wingCenter+wingSign*2.80,.69,7.4,.034,.73,2.55,glazing);
    for(const z of [6.03,8.77])detail(wingCenter,1.10,z,5.68,.11,.15,stone);
    views['Piscina']={eye:[wingCenter-wingSign*3.8,EYE_HEIGHT,5.75],look:[wingCenter,.90,7.40]};
   }else{lounge(wingCenter-1.0,7.45,.12,linen);lounge(wingCenter+1.0,7.45,-.12,forest);cylinder(decor,wingCenter,.65,6.25,.45,.30,stone);}
  }
  for(const sign of [-1,1]){if(unit.projection&&sign===wingSign){for(const [z,depth] of [[4.95,.9],[9.5,.2]]){b(sign*terraceHalf,.97,z,.04,1.30,depth,glazing);detail(sign*terraceHalf,1.63,z,.038,.045,depth,bronze);}}else{b(sign*terraceHalf,.97,7.05,.04,1.30,5.1,glazing);detail(sign*terraceHalf,1.63,7.05,.038,.045,5.1,bronze);}}
  detail(0,1.63,9.6,unit.terraceWidth,.045,.042,bronze);
  sofa(-5.25,8.02,3.5,true);coffee(-5.25,6.88,oak);
  const tableX=half-4;
  cylinder(current,tableX,1.10,7.76,1.10,.14,stone,true);cylinder(decor,tableX,.72,7.76,.38,.78,stone);
  woodChair(tableX-1.50,7.76,Math.PI/2);woodChair(tableX+1.50,7.76,-Math.PI/2);woodChair(tableX,9.19,0);vase(tableX,1.18,7.76);
  for(const x of [-terraceHalf+.65,terraceHalf-.65]){b(x,.65,8.40,1.0,.65,1.40,stone,true);pot(x,8.4,1.25,.37);}
  views['Varanda']={eye:[-1.80,EYE_HEIGHT,7.05],look:[tableX,1.30,8.25]};
 }
 function lighting(upper=false){
  const isLowerDouble=multi&&!upper;
  if(!isLowerDouble)c(0,3.43,(rear+front)/2,unit.width,.14,unit.depth,plaster);
  else {c(0,3.43,(rear-5.8)/2,unit.width,.14,-5.8-rear,plaster);c(-half/2,3.43,-3.65,half,.14,4.3,plaster);c((1.6+half)/2,3.43,-3.65,half-1.6,.14,4.3,plaster);c((-.999+half)/2,3.43,1.65,half+.999,.14,5.7,plaster);c(-.5,3.43,-1.35,1,.14,.3,plaster);c((1.6+half)/2,3.43,-1.35,half-1.6,.14,.3,plaster);}
  if(!upper){if(!multi)c(-3.35,3.345,1.56,7.0,.055,5.85,style.index<2?oak:white);c(0,3.43,7.05,unit.terraceWidth,.14,5.1,oak);}
  for(const x of [-half+.45,half-.45])c(x,3.325,.4,.025,.017,7.7,warmGlow);
  const kitchenX=half-3.15;
  if(!upper){for(const x of [kitchenX-1.00,kitchenX+1.00]){c(x,2.75,3.26,.018,.93,.018,bronze);cylinder(roof,x,2.25,3.26,.18,.065,bronze);sphere(roof,x,2.23,3.26,.29,.24,.29,linen);}
   c(kitchenX,2.73,.64,2.68,.035,.07,bronze);c(kitchenX,2.707,.64,2.50,.012,.046,warmGlow);for(const x of [kitchenX-1.16,kitchenX+1.16])c(x,3.06,.64,.015,.71,.015,bronze);
  }
  RectAreaLightUniformsLib.init();
  const daylight=new T.RectAreaLight('#e9eeea',1.35,unit.width-2,multi&&!upper?5.5:2.8);daylight.position.set(0,multi&&!upper?3.3:1.94,4.37);daylight.lookAt(0,1.4,-2);roof.add(daylight);
  for(const x of [-half+.10,half-.10]){const sideLight=new T.RectAreaLight('#e8eadd',.7,3.8,1.85);sideLight.position.set(x,1.95,-5.15);sideLight.lookAt(x<0?-2.5:2.5,1.4,-5.5);roof.add(sideLight);}
  if(!upper){const warm=new T.PointLight('#fff0dd',23,12,2);warm.position.set(kitchenX,2.75,2.4);roof.add(warm);}
  const indirect=new T.RectAreaLight('#ffe3bd',1.8,unit.width-3,5);indirect.position.set(0,3.28,.5);indirect.rotation.x=-Math.PI/2;indirect.userData.nightOnly=true;roof.add(indirect);
 }
 function doubleGround(){
  // Extra rooms are behind the social floor; the upper suites use a separate level.
  wallDoor(-half+.2,-1.9,-3.1,-3.55);b(-1.77,1.87,(rear-3.1)/2,.14,3.1,-3.1-rear,plaster);
  b(-5.2,.96,-6.2,4.75,.10,.90,oak,true);for(const x of [-6.9,-3.5])b(x,.65,-6.2,.11,.61,.78,oak);
  woodChair(-4.7,-5.0,0);bookshelves(-8.8,-7.85);bookshelves(-7.70,-7.85);book(-5.1,1.03,-6.25,.35);pot(-8.75,-3.85,.95);
  views['Escritório']={eye:[-3.45,EYE_HEIGHT,-3.75],look:[-5.3,1.15,-6.20]};
  b(5.8,1.87,-6.9,6.0,3.1,.15,plaster);wallDoor(3.0,half-.2,-3.1,4.0);
  b(6.4,.70,-5.15,3.1,.55,1.10,linen,true);b(6.4,1.13,-5.59,3.1,.76,.18,linen,true);cylinder(current,5.3,.59,-4.0,.7,.25,stone,true);
  for(const x of [3.9,5.3]){b(x,.87,rear+1.2,.98,1.02,.75,white);detail(x,.87,rear+1.60,.02,.70,.02,bronze);}
  detail(4.6,2.15,rear+.50,3.1,1.4,.36,oak);
  const stair:InteriorStair={minX:.12,maxX:1.48,minZ:-5.8,maxZ:-1.2,axis:'z',startZ:-1.2,endZ:-5.8,fromY:0,toY:M_STEP};stairs.push(stair);
  const steps=20,run=(stair.maxZ-stair.minZ)/steps;
  for(let i=0;i<steps;i++){const z=stair.startZ-run*(i+.5),top=.32+(i+1)*M_STEP/steps;box(current,.8,top-.085,z,1.40,.17,run+.018,oak,true);box(decor,.8,top-.11,z+run*.47,1.39,.19,.04,stone);}
  for(const sign of [-1,1]){const x=.8+sign*.73;for(let i=0;i<=steps;i+=2){const z=stair.startZ-run*i,y=.32+i*M_STEP/steps;detail(x,y+.56,z,.027,1.10,.027,bronze);}
   const rail=detail(x,2.07,(-1.2-5.8)/2,.044,.044,Math.hypot(4.6,M_STEP),bronze);rail.rotation.x=-Math.atan2(M_STEP,4.6);
  }
  // Floor-specific collision ignores the treads; the walking surface follows their slope.
  currentLevel.obstacles.push({minX:0,maxX:.08,minZ:-5.8,maxZ:-1.2},{minX:1.52,maxX:1.60,minZ:-5.8,maxZ:-1.2});
 }
 const views:Partial<Record<InteriorView,RoomView>>={};
 function startLevel(index:number){
  current=new T.Group();current.position.y=index*M_STEP;current.name=`${unit.name} · nível ${index+1}`;group.add(current);decor=new T.Group();current.add(decor);roof=new T.Group();roof.position.y=index*M_STEP;ceiling.add(roof);
  currentLevel={index,elevation:index*M_STEP,obstacles:[],bounds:index===0?bounds:{minX:-half+.23,maxX:half-.23,minZ:rear+.23,maxZ:front-.23},walkAreas:index===0?[{minX:-half,maxX:half,minZ:rear,maxZ:front},{minX:-terraceHalf,maxX:terraceHalf,minZ:front,maxZ:9.6},...(unit.projection?[{minX:wingMin,maxX:wingMax,minZ:5.4,maxZ:9.4}]:[])]:undefined};levels.push(currentLevel);
  // Terrace width does not make the strips outside the enclosed side walls walkable.
  if(index===0)for(const sign of [-1,1])currentLevel.obstacles.push(sign<0?{minX:-terraceHalf,maxX:-half,minZ:rear,maxZ:front-.05}:{minX:half,maxX:terraceHalf,minZ:rear,maxZ:front-.05});
 }
 startLevel(0);
 b(0,.16,(rear+front)/2,unit.width,.32,unit.depth,stone);seamFloor(-half,half,rear,front);
 exteriorWalls();privateCore();
 if(multi)doubleGround();else suites(unit.suites);
 supportRooms();socialRoom();terrace();lighting();
 const lowerCurrent=current,lowerDecor=decor,lowerRoof=roof;
 if(multi){
  startLevel(1);
  // The 48 m² void and the stair opening are actual holes in the upper slab.
  b(0,.16,(rear-5.8)/2,unit.width,.32,-5.8-rear,oak);
  b(-half/2,.16,(-5.8-1.5)/2,half,.32,4.3,oak);
  b((1.6+half)/2,.16,(-5.8-1.5)/2,half-1.6,.32,4.3,oak);
  b((-.999+half)/2,.16,1.65,half+.999,.32,5.7,oak);b(-.5,.16,-1.35,1,.32,.3,oak);b((1.6+half)/2,.16,-1.35,half-1.6,.32,.3,oak);b((-half-9)/2,.16,1.5,half-9,.32,6,oak);
  exteriorWalls(true);privateCore();suites(4);
  // Gallery opens over the double-height living; the guardrail protects the void.
  b(-1,1.0,1.5,.045,1.36,6.0,glazing);detail(-1,1.69,1.5,.045,.045,6.0,bronze);
  b(-5,1.0,-1.5,8.0,1.36,.045,glazing);detail(-5,1.69,-1.5,8.0,.045,.045,bronze);
  b(-9,1.0,1.5,.045,1.36,6,glazing);
  for(const z of [-5.8,-1.2]){detail(1.55,1.0,z,.03,1.35,.03,bronze);}
  // A reading lounge occupies the upper front-right, not a duplicate ground apartment.
  sofa(5.7,3.10,3.3);coffee(5.7,1.55);pot(8.2,3.5,1.1);
  b(8.0,.88,-.7,2.1,.075,1.2,oak);woodChair(7.9,.22,0);bookshelves(8.8,-1.25);
  views['Andar superior']={eye:[.4,EYE_HEIGHT+M_STEP,0],look:[-4.6,1.4,1.9]};
  views['Suíte']={...views['Suíte']!,eye:[views['Suíte']!.eye[0],EYE_HEIGHT+M_STEP,views['Suíte']!.eye[2]],look:[views['Suíte']!.look[0],1.1+M_STEP,views['Suíte']!.look[2]]};
  lighting(true);
  // Tall front glazing spans the lower living void, with no intermediate balcony slab.
  box(lowerCurrent,-5,5.1,front,8,3.35,.025,glazing);
  box(lowerDecor,-5,6.70,front,8,.12,.12,bronze);
  const light=new T.RectAreaLight('#e7ece7',.9,7.4,5.6);light.position.set(-5,3.7,4.35);light.lookAt(-5,2.0,0);lowerRoof.add(light);
 }
 // Each material is batched per level, retaining openable ceilings and collision data.
 function batch(parent:T.Group){
  const finishes=new Map<T.Material,T.Mesh[]>();
  for(const child of [...parent.children]){if(child instanceof T.Group){batch(child);continue;}if(!(child instanceof T.Mesh)||child instanceof T.InstancedMesh||Array.isArray(child.material)||child.material.transparent)continue;const list=finishes.get(child.material)||[];list.push(child);finishes.set(child.material,list);}
  for(const [material,meshes] of finishes){if(meshes.length<2)continue;const geometries=meshes.map(mesh=>{mesh.updateMatrix();const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();geometry.applyMatrix4(mesh.matrix);return geometry;});const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(!merged)continue;const mesh=new T.Mesh(own(merged),material);mesh.castShadow=true;mesh.receiveShadow=true;meshes.forEach(m=>parent.remove(m));parent.add(mesh);}
 }
 batch(group);
 views['Vista do condomínio']={eye:[0,EYE_HEIGHT,8.6],look:[0,.5,130]};
 // Return explicit variants to the viewer rather than attaching labels to one pilot plan.
 return {group,ceiling,obstacles:levels[0].obstacles,ready:surfaces.ready,views,bounds,levels,stairs,doorways,floorHeight:M_STEP,unit};
}

