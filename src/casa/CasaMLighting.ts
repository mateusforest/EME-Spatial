import * as T from 'three';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {CASA_LIGHT_DEFAULTS,casaCircuitGain,casaFixtureCircuit,casaSolar} from './CasaMLightState';
import type {CasaLightCircuit,CasaLightSettings} from './CasaMLightState';
import {casaIndirectMaterial} from './CasaMIndirect';

type Point=[number,number,number];
type Area={position:Point;target:Point;width:number;height:number;power:number;outside?:boolean;day?:boolean};
type Spot={position:Point;target:Point;power:number;distance:number;angle:number;outside?:boolean;circuit?:CasaLightCircuit};
type Fill={position:Point;power:number;distance:number;circuit:CasaLightCircuit};
/** Every fixture remains in the scene. Walking never reassigns or dims a light. */
export function createCasaLighting(scene:T.Scene,renderer:T.WebGLRenderer,touch:boolean){
 RectAreaLightUniformsLib.init();
 const group=new T.Group();group.name='Iluminação arquitetônica';scene.add(group);
 const sun=new T.DirectionalLight('#fff0dc',3.2),hemi=new T.HemisphereLight('#dfebf4','#b3a496',.8);sun.castShadow=true;
 sun.shadow.mapSize.setScalar(touch?2048:4096);sun.shadow.normalBias=.025;sun.shadow.bias=-.00004;sun.shadow.camera.near=1;sun.shadow.camera.far=145;
 Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30});sun.shadow.camera.updateProjectionMatrix();
 group.add(sun,sun.target,hemi);
 const areas:Area[]=[],spots:Spot[]=[],fills:Fill[]=[],channelGeos:T.BufferGeometry[]=[],stripGeos:T.BufferGeometry[]=[],diffuserGeos:T.BufferGeometry[]=[];
 const channel=new T.MeshStandardMaterial({color:'#393329',roughness:.65}),strip=new T.MeshStandardMaterial({color:'#e8ddca',emissive:'#ffe0b5',emissiveIntensity:3,roughness:.7}),outdoorStrip=strip.clone(),facadeStrip=strip.clone();
 const outsideGeos:T.BufferGeometry[]=[],facadeGeos:T.BufferGeometry[]=[],outsideDiffusers:T.BufferGeometry[]=[];
 let settings={...CASA_LIGHT_DEFAULTS};
 const anchor=new T.Vector3(14,3,-8);
 function line(a:Point,b:Point,exterior=false){
  const p=new T.Vector3(...a),q=new T.Vector3(...b),length=p.distanceTo(q),mid=p.clone().add(q).multiplyScalar(.5);
  const matrix=new T.Matrix4().compose(mid,new T.Quaternion().setFromUnitVectors(new T.Vector3(1,0,0),q.sub(p).normalize()),new T.Vector3(1,1,1));
  const black=new T.BoxGeometry(length,.025,.065);black.applyMatrix4(matrix);channelGeos.push(black);
  const luminous=new T.BoxGeometry(length,.031,.028);luminous.applyMatrix4(matrix);(exterior?(casaFixtureCircuit(mid.x,mid.z)==='facade'?facadeGeos:outsideGeos):stripGeos).push(luminous);
 }
 // A fixed, short-range fill for each room represents indirect light. Limit the
 // expensive area lights to broad openings and the principal architectural coves.
 for(const [x0,x1,z0,z1,y] of [
  [11.75,18.80,-2.27,-5.48,3.59],[3.28,7.02,-2.25,-5.25,3.59],
  [3.4,7.45,-5.85,-9.3,3.59],[15.65,18.78,-8.92,-11.94,3.59],
  [7.44,8.56,-2.25,-3.84,3.54],[6.14,7.5,-7.4,-9.38,3.54],
  [3.55,7.48,-9.86,-11.95,3.54],[3.3,8.45,-2.25,-6.35,7.57],
  [3.3,8.45,-6.83,-9.76,7.57],[13.3,18.78,-2.25,-6.34,7.57],
  [13.3,15.8,-6.83,-9.14,7.53],[16.3,18.78,-6.83,-9.14,7.53],
  [11.84,18.76,-9.67,-11.92,7.57]]){
  line([x0,y,z0],[x1,y,z0]);line([x0,y,z1],[x1,y,z1]);
  fills.push({position:[(x0+x1)/2,y-1.15,(z0+z1)/2],power:32,distance:Math.min(5,Math.max(3.1,Math.hypot(x1-x0,z1-z0)*.65)),circuit:'interior'});
 }
 // Mirrors, cabinetry and the kitchen task light have their own lower sources.
 for(const [a,b] of [
  [[18.48,1.62,-8.87],[18.48,1.62,-10.83]],[[18.48,2.27,-8.87],[18.48,2.27,-10.83]],
  [[16.62,2.57,-8.90],[16.62,2.57,-11.46]],[[16.35,4.27,-7.26],[18.73,4.27,-7.26]],
  [[16.38,6.05,-7.20],[18.68,6.05,-7.20]],[[13.74,6.14,-7.51],[13.74,6.14,-9.15]],
  [[15.36,6.14,-6.82],[15.36,6.14,-8.45]],[[7.45,.26,-2.62],[8.55,.26,-2.62]]
 ] as [Point,Point][]){line(a,b);}
 // Continuous guidance under each tread, kept below the walking surface.
 for(let i=0;i<11;i++){
  const z=-5-i*.28,y=(i+1)*.1675-.035;line([8.93,y,z],[10.03,y,z]);
  const z2=-8.08+i*.28,y2=2.01+(i+1)*.1675-.035;line([10.27,y2,z2],[11.37,y2,z2]);
 }
 fills.push({position:[9.55,2.4,-7.4],power:24,distance:3.5,circuit:'interior'},{position:[10.8,5.5,-6.6],power:28,distance:4,circuit:'interior'},{position:[13.5,2.4,-7.4],power:36,distance:4.5,circuit:'interior'},{position:[25,3.3,-14.5],power:55,distance:6,circuit:'exterior'});
 for(const [a,b] of [
  [[3.38,7.73,-1.84],[18.7,7.73,-1.84]],[[3.42,3.68,-1.62],[18.75,3.68,-1.62]],
  [[19.45,3.08,-1.52],[27.3,3.08,-1.52]],[[19.45,3.08,-7.7],[27.3,3.08,-7.7]],
  [[4.75,7.49,-12.4],[18.75,7.49,-12.4]],[[4.75,4.12,-13.74],[9.83,4.12,-13.74]],
  [[10.12,4.16,-18.22],[20.85,4.16,-18.22]],[[21.33,6.57,-11.3],[28.7,6.57,-11.3]],
  [[21.33,6.57,-18.15],[28.7,6.57,-18.15]],[[24.77,1.94,-17.94],[28.25,1.94,-17.94]]
 ] as [Point,Point][]){line(a,b,true);}
 for(const [x,y,z,w,h,p] of [[11,7.6,-1,15,1.4,10],[11,3.55,-.8,15,1.5,10],[23.3,3,-4.5,7,5,7],[13,7.4,-13,10,1.3,8]])areas.push({position:[x,y,z],target:[x,y-3,z],width:w,height:h,power:p,outside:true});
 for(const [x,y,z,w,h] of [[15,3.48,-4,6,2],[17,3.45,-10.2,2.5,2.5]])areas.push({position:[x,y,z],target:[x,y-3,z],width:w,height:h,power:4});
 // Daylight enters through openings, without lifting every material equally.
 for(const [x,y,z,tx,tz,w,h] of [[15.8,1.9,-2.13,15.8,-7,5.8,2.8],[15.7,1.8,-12.08,15.7,-8,4,2.7],[5.4,5.8,-2.13,5.4,-6,4,2.8],[15.8,5.8,-2.13,15.8,-6,4.8,2.8]])areas.push({position:[x,y,z],target:[tx,y-.2,tz],width:w,height:h,power:5.5,day:true});
 for(const [x,y,z] of [[2.5,-.10,.2],[9.05,-.10,.2],[19.3,-.10,.2],[4.15,7.72,-.9],[12.55,7.72,-.9],[17.95,7.72,-.9],[21.15,3.1,-2.3],[25.95,3.1,-2.3],[5.35,7.49,-13.25],[17.55,7.49,-13.25]]){
  const up=y<0,circuit=up?'exterior':casaFixtureCircuit(x,z);if(up)spots.push({position:[x,y,z],target:[x,3,z-.12],power:33,distance:5,angle:.65,outside:true,circuit});
  const g=new T.CylinderGeometry(.034,.034,.012,12);g.translate(x,y,z);(circuit==='facade'?diffuserGeos:outsideDiffusers).push(g);
 }
 const circuit=(f:Area|Spot):CasaLightCircuit=>'circuit' in f&&f.circuit?f.circuit:'day' in f&&f.day?'day':f.outside?casaFixtureCircuit(f.position[0],f.position[2]):'interior';
 const fixtures:{light:T.Light;power:number;circuit:CasaLightCircuit}[]=[];
 areas.forEach((f,i)=>{const l=new T.RectAreaLight(f.day?'#ecf3ff':'#ffe2bc',0,f.width,f.height);l.name='Casa M · área '+i;l.position.fromArray(f.position);if(Math.abs(f.target[1]-f.position[1])>Math.hypot(f.target[0]-f.position[0],f.target[2]-f.position[2]))l.up.set(0,0,1);l.lookAt(...f.target);group.add(l);fixtures.push({light:l,power:f.power,circuit:circuit(f)});});
 spots.forEach((f,i)=>{const l=new T.SpotLight('#ffe0b7',0,f.distance,f.angle,.85,2);l.name='Casa M · foco '+i;l.position.fromArray(f.position);l.target.position.fromArray(f.target);group.add(l,l.target);fixtures.push({light:l,power:f.power*1.45,circuit:circuit(f)});});
 fills.forEach((f,i)=>{const l=new T.PointLight('#ffe9cf',0,f.distance,2);l.name='Casa M · luz indireta '+i;l.position.fromArray(f.position);group.add(l);fixtures.push({light:l,power:f.power*.7,circuit:f.circuit});});
 fixtures.forEach(f=>{if(f.light instanceof T.RectAreaLight)f.power*=f.circuit==='day'?.58:.65;});
 const meshes:T.Mesh[]=[];
 for(const [gs,m] of [[channelGeos,channel],[stripGeos,strip],[facadeGeos,facadeStrip],[outsideGeos,outdoorStrip],[diffuserGeos,facadeStrip],[outsideDiffusers,outdoorStrip]] as [T.BufferGeometry[],T.Material][]){if(gs.length){const mesh=new T.Mesh(mergeGeometries(gs),m);mesh.name='Perfis e difusores LED';mesh.castShadow=false;group.add(mesh);meshes.push(mesh);gs.forEach(g=>g.dispose());}}
 const lamps:T.MeshStandardMaterial[]=[];
 function register(materials:Iterable<T.Material>){for(const m of materials)if(m instanceof T.MeshStandardMaterial){casaIndirectMaterial(m);if(m.userData.casaLed&&!lamps.includes(m))lamps.push(m);}}
 // Context surfaces and fixtures use the same bounce-light response as the house.
 scene.traverse(o=>{if(o instanceof T.Mesh)register(Array.isArray(o.material)?o.material:[o.material]);});
 function set(value:CasaLightSettings){
  settings={...value};const solar=casaSolar(settings.hour,settings.azimuth),daylight=solar.day*settings.solar;
  sun.intensity=daylight*solar.sunlight*2.2;sun.color.copy(solar.color);sun.target.position.copy(anchor);sun.position.copy(anchor).addScaledVector(solar.direction,78);
  hemi.intensity=.25+daylight*.45;scene.environmentIntensity=.025+daylight*.065;
  strip.emissiveIntensity=settings.interior*3;facadeStrip.emissiveIntensity=settings.facade*3;outdoorStrip.emissiveIntensity=settings.exterior*3;
  lamps.forEach(m=>{const c=(m.userData.casaCircuit||'interior') as CasaLightCircuit;m.emissive.set('#ffe0b5');m.emissiveIntensity=casaCircuitGain(c,settings)*3;});
  fixtures.forEach(f=>f.light.intensity=f.power*casaCircuitGain(f.circuit,settings));renderer.shadowMap.needsUpdate=true;
 }
 return {register,set,mode(isPlan:boolean){meshes.forEach(m=>m.visible=!isPlan);},
  snapshot(){return fixtures.map(f=>[f.circuit,...f.light.position.toArray(),f.light.intensity]);},
  dispose(){group.removeFromParent();meshes.forEach(m=>m.geometry.dispose());channel.dispose();strip.dispose();facadeStrip.dispose();outdoorStrip.dispose();sun.shadow.map?.dispose();}
 };
}
