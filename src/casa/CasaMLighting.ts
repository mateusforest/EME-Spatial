import * as T from 'three';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {botaniqueSun} from '../botaniqueLighting';

type Point=[number,number,number];
type Area={position:Point;target:Point;width:number;height:number;power:number;outside?:boolean;day?:boolean};
type Spot={position:Point;target:Point;power:number;distance:number;angle:number;outside?:boolean};
/** A bounded light pool keeps the same shader layout on desktop and mobile. */
export function createCasaLighting(scene:T.Scene,renderer:T.WebGLRenderer,touch:boolean){
 RectAreaLightUniformsLib.init();
 const group=new T.Group();group.name='Iluminação arquitetônica';scene.add(group);
 const sun=new T.DirectionalLight('#fff0dc',3.2),hemi=new T.HemisphereLight('#d4e6f4','#78654a',.3);sun.castShadow=true;
 sun.shadow.mapSize.setScalar(touch?1024:2048);sun.shadow.normalBias=.015;sun.shadow.bias=-.00006;sun.shadow.camera.near=.5;sun.shadow.camera.far=130;
 group.add(sun,sun.target,hemi);
 const areas:Area[]=[],spots:Spot[]=[],channelGeos:T.BufferGeometry[]=[],stripGeos:T.BufferGeometry[]=[],diffuserGeos:T.BufferGeometry[]=[];
 const channel=new T.MeshStandardMaterial({color:'#393329',roughness:.65}),strip=new T.MeshStandardMaterial({color:'#fff1da',emissive:'#ffd29b',emissiveIntensity:7,roughness:.4}),outdoorStrip=strip.clone();
 const outsideGeos:T.BufferGeometry[]=[];
 let hour=16.5,inside=.65,outside=.8,plan=false,walking=false;
 const lastPosition=new T.Vector3(Infinity,Infinity,Infinity),anchor=new T.Vector3(14,2,-8);
 function line(a:Point,b:Point,exterior=false){
  const p=new T.Vector3(...a),q=new T.Vector3(...b),length=p.distanceTo(q),mid=p.clone().add(q).multiplyScalar(.5);
  const matrix=new T.Matrix4().compose(mid,new T.Quaternion().setFromUnitVectors(new T.Vector3(1,0,0),q.sub(p).normalize()),new T.Vector3(1,1,1));
  const black=new T.BoxGeometry(length,.025,.065);black.applyMatrix4(matrix);channelGeos.push(black);
  const luminous=new T.BoxGeometry(length,.029,.014);luminous.applyMatrix4(matrix);(exterior?outsideGeos:stripGeos).push(luminous);
 }
 // Ceiling slots and a warm, broad source in each room. They follow the native walls.
 for(const [x0,x1,z0,z1,y] of [
  [11.75,18.80,-2.27,-5.48,3.59],[3.28,7.02,-2.25,-5.25,3.59],
  [3.4,7.45,-5.85,-9.3,3.59],[15.65,18.78,-8.92,-11.94,3.59],
  [7.44,8.56,-2.25,-3.84,3.54],[6.14,7.5,-7.4,-9.38,3.54],
  [3.55,7.48,-9.86,-11.95,3.54],[3.3,8.45,-2.25,-6.35,7.57],
  [3.3,8.45,-6.83,-9.76,7.57],[13.3,18.78,-2.25,-6.34,7.57],
  [13.3,15.8,-6.83,-9.14,7.53],[16.3,18.78,-6.83,-9.14,7.53],
  [11.84,18.76,-9.67,-11.92,7.57]]){
  line([x0,y,z0],[x1,y,z0]);line([x0,y,z1],[x1,y,z1]);
  areas.push({position:[(x0+x1)/2,y-.06,(z0+z1)/2],target:[(x0+x1)/2,y-2,(z0+z1)/2],width:(x1-x0)*.7,height:Math.abs(z1-z0)*.65,power:2.9});
  areas.push({position:[(x0+x1)/2,y-.08,z1+.08],target:[(x0+x1)/2,y-.1,z1+2],width:x1-x0,height:.16,power:20});
 }
 // Mirrors, cabinetry and the kitchen task light have their own lower sources.
 for(const [a,b] of [
  [[18.48,1.62,-8.87],[18.48,1.62,-10.83]],[[18.48,2.27,-8.87],[18.48,2.27,-10.83]],
  [[16.62,2.57,-8.90],[16.62,2.57,-11.46]],[[16.35,4.27,-7.26],[18.73,4.27,-7.26]],
  [[16.38,6.05,-7.20],[18.68,6.05,-7.20]],[[13.74,6.14,-7.51],[13.74,6.14,-9.15]],
  [[15.36,6.14,-6.82],[15.36,6.14,-8.45]],[[7.45,.26,-2.62],[8.55,.26,-2.62]]
 ] as [Point,Point][]){line(a,b);areas.push({position:a.map((v,i)=>(v+b[i])/2) as Point,target:[(a[0]+b[0])/2-1,(a[1]+b[1])/2-.5,(a[2]+b[2])/2],width:Math.max(Math.abs(a[0]-b[0]),Math.abs(a[2]-b[2])),height:.12,power:18});}
 // Continuous guidance under each tread, kept below the walking surface.
 for(let i=0;i<11;i++){
  const z=-5-i*.28,y=(i+1)*.1675-.035;line([8.93,y,z],[10.03,y,z]);
  const z2=-8.08+i*.28,y2=2.01+(i+1)*.1675-.035;line([10.27,y2,z2],[11.37,y2,z2]);
 }
 areas.push({position:[8.92,1.25,-6.45],target:[10,1.2,-6.45],width:2.7,height:.12,power:20},{position:[11.36,3.2,-6.45],target:[10.3,3.2,-6.45],width:2.7,height:.12,power:20});
 for(const [a,b] of [
  [[3.38,7.73,-1.84],[18.7,7.73,-1.84]],[[3.42,3.68,-1.62],[18.75,3.68,-1.62]],
  [[19.45,3.08,-1.52],[27.3,3.08,-1.52]],[[19.45,3.08,-7.7],[27.3,3.08,-7.7]],
  [[4.75,7.49,-12.4],[18.75,7.49,-12.4]],[[4.75,4.12,-13.74],[9.83,4.12,-13.74]],
  [[10.12,4.16,-18.22],[20.85,4.16,-18.22]],[[21.33,6.57,-11.3],[28.7,6.57,-11.3]],
  [[21.33,6.57,-18.15],[28.7,6.57,-18.15]],[[24.77,1.94,-17.94],[28.25,1.94,-17.94]]
 ] as [Point,Point][]){line(a,b,true);areas.push({position:[(a[0]+b[0])/2,a[1]-.05,a[2]],target:[(a[0]+b[0])/2,a[1]-2,a[2]],width:Math.abs(b[0]-a[0]),height:.22,power:15,outside:true});}
 // Daylight enters through openings, without lifting every material equally.
 for(const [x,y,z,tx,tz,w,h] of [[15.8,1.9,-2.13,15.8,-7,5.8,2.8],[5.2,1.8,-2.13,5.2,-5,3.4,2.7],[15.7,1.8,-12.08,15.7,-8,4,2.7],[5.4,5.8,-2.13,5.4,-6,4,2.8],[15.8,5.8,-2.13,15.8,-6,4.8,2.8],[14,5.8,-12.08,14,-9,5,2.6],[28.7,2.8,-14.5,23,-14.5,5,4]])areas.push({position:[x,y,z],target:[tx,y-.2,tz],width:w,height:h,power:4.5,day:true});
 for(const [x,y,z] of [[2.5,-.10,.2],[9.05,-.10,.2],[19.3,-.10,.2],[4.15,7.72,-.9],[12.55,7.72,-.9],[17.95,7.72,-.9],[21.15,3.1,-2.3],[25.95,3.1,-2.3],[5.35,7.49,-13.25],[17.55,7.49,-13.25]]){
  const up=y<0;spots.push({position:[x,y,z],target:[x,up?3:y-3,z-.12],power:up?33:24,distance:up?5:7,angle:up?.52:1.02,outside:true});
  const g=new T.CylinderGeometry(.034,.034,.012,12);g.translate(x,y,z);diffuserGeos.push(g);
 }
 for(const [x,y,z] of [[13,2.13,-7.38],[14.05,2.13,-7.38],[10.1,6.8,-7.5],[16.5,3.48,-10],[16,7.45,-4],[5,7.45,-4],[5,3.48,-8],[25,5.6,-14.5]])spots.push({position:[x,y,z],target:[x,y-3,z],power:32,distance:8,angle:1.05});
 const areaSlots=Array.from({length:touch?6:10},()=>{const l=new T.RectAreaLight('#ffdfb4',0,1,1);group.add(l);return l;});
 const spotSlots=Array.from({length:touch?2:4},(_,i)=>{const l=new T.SpotLight('#ffdab0',0,7,1,.75,2);l.castShadow=i===0&&!touch;l.shadow.mapSize.setScalar(512);l.shadow.normalBias=.016;l.shadow.bias=-.0001;group.add(l,l.target);return l;});
 const meshes:T.Mesh[]=[];
 for(const [gs,m] of [[channelGeos,channel],[stripGeos,strip],[outsideGeos,outdoorStrip],[diffuserGeos,outdoorStrip]] as [T.BufferGeometry[],T.Material][]){if(gs.length){const mesh=new T.Mesh(mergeGeometries(gs),m);mesh.name='Perfis e difusores LED';mesh.castShadow=false;group.add(mesh);meshes.push(mesh);gs.forEach(g=>g.dispose());}}
 const lamps:T.MeshStandardMaterial[]=[];
 function register(materials:Iterable<T.Material>){for(const m of materials)if(m instanceof T.MeshStandardMaterial&&m.userData.casaLed)lamps.push(m);}
 function update(camera:T.Camera,force=false){
  if(!force&&lastPosition.distanceToSquared(camera.position)<.4)return;lastPosition.copy(camera.position);
  const solar=botaniqueSun(hour),factor=(f:{outside?:boolean;day?:boolean})=>f.day?solar.day:f.outside?outside*(.65+(1-solar.day)*.9):inside;
  const focus=walking?camera.position:new T.Vector3(13.5,3.5,camera.position.z>0?-1:-12);
  const score=(p:Point)=>{const dy=p[1]-focus.y;return (p[0]-focus.x)**2+(p[2]-focus.z)**2+dy*dy*(walking?4:1);};
  // Reserve four apertures and six electrical fixtures; no shader recompiles while walking.
  const chosen=[...areas.filter(a=>a.day).sort((a,b)=>score(a.position)-score(b.position)).slice(0,touch?2:4),...areas.filter(a=>!a.day&&(!walking?a.outside:true)).sort((a,b)=>score(a.position)-score(b.position)).slice(0,touch?4:6)];
  areaSlots.forEach((l,i)=>{const f=chosen[i];l.intensity=f?f.power*factor(f):0;if(!f)return;l.position.fromArray(f.position);l.width=f.width;l.height=f.height;l.up.set(0,1,0);if(Math.abs(f.target[1]-f.position[1])>1)l.up.set(0,0,1);l.lookAt(...f.target);l.color.set(f.day?'#e5edf2':'#ffdbac');});
  const near=spots.filter(s=>walking||s.outside).sort((a,b)=>score(a.position)-score(b.position)).slice(0,spotSlots.length);
  spotSlots.forEach((l,i)=>{const f=near[i];l.intensity=f?f.power*factor(f):0;if(!f)return;l.position.fromArray(f.position);l.target.position.fromArray(f.target);l.distance=f.distance;l.angle=f.angle;});
  anchor.set(walking?T.MathUtils.clamp(camera.position.x,3,28):14,walking?Math.max(1,camera.position.y-1):2,walking?T.MathUtils.clamp(camera.position.z,-18,0):-8);
  const span=walking?14:34;Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span});sun.shadow.camera.updateProjectionMatrix();sun.target.position.copy(anchor);sun.position.copy(anchor).addScaledVector(solar.direction,75);
  renderer.shadowMap.needsUpdate=true;
 }
 function set(value:number,internal:number,external:number,camera:T.Camera){
  hour=value;inside=internal;outside=external;const solar=botaniqueSun(hour);
  sun.intensity=solar.day*3;sun.color.set('#fff2df').lerp(new T.Color('#ffd09a'),solar.gold*.6);
  hemi.intensity=.045+solar.day*.23;scene.environmentIntensity=.018+solar.day*.065;
  strip.emissiveIntensity=inside*7;outdoorStrip.emissiveIntensity=outside*6;lamps.forEach(m=>m.emissiveIntensity=(m.userData.casaExteriorLed?outside:inside)*5);
  update(camera,true);
 }
 return {register,set,update,mode(walk:boolean,isPlan:boolean,camera:T.Camera){walking=walk;plan=isPlan;meshes.forEach(m=>m.visible=!plan);update(camera,true);},
  dispose(){group.removeFromParent();meshes.forEach(m=>m.geometry.dispose());channel.dispose();strip.dispose();outdoorStrip.dispose();sun.shadow.map?.dispose();spotSlots.forEach(l=>l.shadow.map?.dispose());}
 };
}
