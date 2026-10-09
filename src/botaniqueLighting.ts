import * as T from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
let areaLightsReady=false;
export type BotaniqueLightFixture={id:string;type:'spot'|'area';position:[number,number,number];target:[number,number,number];color:string;power:number;range?:number;width?:number;height?:number;angle?:number;penumbra?:number};

/** Visual solar study only: surveyed orientation/date are not supplied. */
export function botaniqueSun(hour:number){
 const h=T.MathUtils.clamp(hour,7,20),phase=(h-7)/12;
 const elevation=58*Math.sin(Math.PI*phase),azimuth=T.MathUtils.degToRad(138-(h-7)*14);
 const e=T.MathUtils.degToRad(elevation),day=T.MathUtils.smoothstep(elevation,-5,12),gold=1-T.MathUtils.smoothstep(elevation,4,30);
 return {hour:h,elevation,day,gold,direction:new T.Vector3(Math.cos(e)*Math.sin(azimuth),Math.sin(e),Math.cos(e)*Math.cos(azimuth))};
}
export const formatSolarHour=(hour:number)=>`${Math.floor(hour).toString().padStart(2,'0')}:${Math.round((hour%1)*60).toString().padStart(2,'0')}`;

export function createBotaniqueLighting(scene:T.Scene,renderer:T.WebGLRenderer,apartment:boolean,draw:()=>void,modeledLights?:BotaniqueLightFixture[]){
 const dome=new Sky();dome.scale.setScalar(apartment?180:500);dome.material.uniforms.turbidity.value=2.8;dome.material.uniforms.rayleigh.value=1.6;dome.material.uniforms.mieCoefficient.value=.003;dome.material.uniforms.mieDirectionalG.value=.82;dome.material.uniforms.showSunDisc.value=true;dome.material.fragmentShader=dome.material.fragmentShader.replace('vec4( texColor, 1.0 )','vec4( texColor * 0.18, 1.0 )');dome.frustumCulled=false;scene.add(dome);
 const sun=new T.DirectionalLight('#fff0dc',3.5),sky=new T.HemisphereLight('#e4effb','#a69882',.65);
 sun.castShadow=true;sun.shadow.bias=-.00005;sun.shadow.normalBias=apartment?.008:.018;sun.shadow.radius=2;
 scene.add(sun,sun.target,sky);
 const environmentScene=new T.Scene(),environmentSky=new Sky(),pmrem=new T.PMREMGenerator(renderer);environmentSky.scale.setScalar(20);environmentScene.add(environmentSky);environmentSky.material.uniforms.showSunDisc.value=false;
 let environment:T.WebGLRenderTarget|undefined,timer:ReturnType<typeof setTimeout>|undefined,disposed=false,hour=16.5,indoor=.65;
 const center=apartment?new T.Vector3(3.6,1.5,-3.9):new T.Vector3(0,24,-16);
 const anchor=center.clone();let span=apartment?7:85,planMode=false;
 const fixtures:T.Light[]=[],windowFills:T.RectAreaLight[]=[],lampTargets:T.Object3D[]=[];
 if(apartment){
  if(!areaLightsReady){RectAreaLightUniformsLib.init();areaLightsReady=true;}
  // Fixture positions come from the same Blender objects as the visible diffusers.
  const practicals:BotaniqueLightFixture[]=modeledLights?.length?modeledLights:[[5.65,2.42,-4.35,13,4],[5.7,2.4,-6.3,10,3.5],[1.7,2.3,-2,8,3.5],[1.7,2.3,-6.3,8,3.5]].map(([x,y,z,power,range],i)=>({id:'fallback-'+i,type:'spot',position:[x,y,z],target:[x,.2,z],color:'#ffdfbb',power,range,angle:1.18,penumbra:1}));
  for(const f of practicals){const lamp=f.type==='area'?new T.RectAreaLight(f.color,f.power,f.width||.6,f.height||.08):new T.SpotLight(f.color,f.power,f.range||4,f.angle||1.12,f.penumbra??1,2);lamp.name=f.id;lamp.position.fromArray(f.position);lamp.userData.power=f.power;if(lamp instanceof T.SpotLight){lamp.target.position.fromArray(f.target);lampTargets.push(lamp.target);scene.add(lamp.target);}else{lamp.up.set(0,0,-1);lamp.lookAt(...f.target);}fixtures.push(lamp);scene.add(lamp);}
  // Broad window fill complements the moving direct sun, keeping the frame readable.
  for(const [x,y,z,tx,tz,w,h] of [[5.75,1.5,-.3,5.75,-4.5,1.65,2],[.08,1.5,-1.6,2.5,-1.6,1.25,1.2],[.08,1.5,-6.2,2.5,-6.2,1.25,1.2]]){const light=new T.RectAreaLight('#fff3e1',2.3,w,h);light.position.set(x,y,z);light.lookAt(tx,1.25,tz);windowFills.push(light);scene.add(light);}
 }else{for(const [x,y,z,power,range] of [[0,2.4,18.5,120,22],[-27,2.8,10,90,22],[20,3,-78,100,24]]){const lamp=new T.PointLight('#ffdab0',power,range,2);lamp.position.set(x,y,z);lamp.userData.power=power;fixtures.push(lamp);scene.add(lamp);}}
 function apply(){
  const value=botaniqueSun(hour),warm=new T.Color('#ffc58f'),neutral=new T.Color('#fff3df');
  sun.color.copy(neutral.lerp(warm,value.gold*.75));sun.intensity=3.65*value.day*(1-.34*value.gold);
  sun.target.position.copy(anchor);sun.target.updateMatrixWorld();sun.position.copy(anchor).addScaledVector(value.direction,180);
  Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span,near:Math.max(.1,180-span*2),far:180+span*2});sun.shadow.camera.updateProjectionMatrix();
  sky.color.set(apartment?'#f2eee3':'#d4e3f0').lerp(new T.Color('#dcae92'),value.gold*.38);sky.intensity=(apartment&&!planMode?.30:.42)+.32*value.day+(apartment&&!planMode?.20*indoor*(1-value.day):0);sky.groundColor.set(apartment&&!planMode?'#c2b096':'#938674');
  scene.environmentIntensity=apartment?.032+.018*value.day:.045+.025*value.day;
  renderer.toneMappingExposure=apartment?.94:.85;
  dome.material.uniforms.sunPosition.value.copy(value.direction);dome.visible=value.elevation>-3;
  scene.background=new T.Color('#152635');
  if(scene.fog instanceof T.Fog)scene.fog.color.set('#c7d6da').lerp(new T.Color('#d5af91'),value.gold*.4).lerp(new T.Color('#152635'),1-value.day);
  fixtures.forEach(l=>l.intensity=planMode?0:l.userData.power*indoor*(.55+.45*(1-value.day)));
  windowFills.forEach(l=>{l.intensity=planMode?0:2.3*value.day;l.color.set('#fff3e1').lerp(new T.Color('#ffd5a8'),value.gold*.4);});
  renderer.shadowMap.needsUpdate=true;draw();
  if(timer)clearTimeout(timer);
  timer=setTimeout(()=>{if(disposed)return;environmentSky.material.uniforms.sunPosition.value.copy(value.direction);environmentSky.material.uniforms.turbidity.value=2.8;environmentSky.material.uniforms.rayleigh.value=1.6;const next=pmrem.fromScene(environmentScene,.03,.1,100,{size:64});const old=environment;environment=next;scene.environment=next.texture;old?.dispose();draw();},180);
 }
 return {sun,fixtures,setHour(value:number){hour=value;apply();},setIndoor(value:number){indoor=value;apply();},setPlanContext(value:{center:T.Vector3;span:number}|null){planMode=!!value;anchor.copy(value?.center||center);span=value?.span||(apartment?7:85);apply();},focus(position:T.Vector3,walking:boolean){if(apartment)return;const close=walking||position.y<12;const next=close?new T.Vector3(position.x,8,position.z):center;const nextSpan=close?32:85;if(anchor.distanceTo(next)>1.5||nextSpan!==span){anchor.copy(next);span=nextSpan;const d=botaniqueSun(hour).direction;sun.target.position.copy(anchor);sun.target.updateMatrixWorld();sun.position.copy(anchor).addScaledVector(d,180);Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span,near:180-span*2,far:180+span*2});sun.shadow.camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;}},dispose(){disposed=true;if(timer)clearTimeout(timer);environment?.dispose();pmrem.dispose();sun.shadow.dispose();dome.geometry.dispose();dome.material.dispose();environmentSky.geometry.dispose();environmentSky.material.dispose();scene.remove(dome,sun,sun.target,sky,...fixtures,...windowFills,...lampTargets);}};
}
