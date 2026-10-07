import * as T from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
import type {Own} from './mSurfaces';
import {solar75} from './mSun75';

export function timeOfDay51(value:number){
 const hour=10+T.MathUtils.clamp(value,0,100)*.12;
 return {hour,night:solar75(value).night,lights:T.MathUtils.smoothstep(hour,16.7,19.1),label:hour<16?'Dia':hour<18.4?'Entardecer':hour<19.5?'Crepúsculo':'Noite',clock:`${String(Math.floor(hour)).padStart(2,'0')}:${String(Math.floor((hour%1)*60+1e-6)).padStart(2,'0')}`};
}

/** Shared sun, sky and reflection environment. Time is a design study, not geolocation. */
export function createMAtmosphere51(scene:T.Scene,renderer:T.WebGLRenderer,sun:T.DirectionalLight,ambient:T.HemisphereLight,own:Own,request:()=>void){
 const sky=new Sky();sky.name='M51 daylight to night atmosphere';sky.scale.setScalar(450000);sky.renderOrder=-1000;sky.frustumCulled=false;scene.add(sky);own(sky.geometry);own(sky.material);
 const uniforms=sky.material.uniforms;uniforms.turbidity.value=2.2;uniforms.rayleigh.value=1.55;uniforms.mieCoefficient.value=.004;uniforms.mieDirectionalG.value=.82;
 uniforms.cloudCoverage.value=.28;uniforms.cloudDensity.value=.35;uniforms.cloudScale.value=.0004;uniforms.cloudSpeed.value=0;
 uniforms.horizon52={value:new T.Color()}; uniforms.night51={value:0};
 uniforms.dusk51={value:0};
 sky.material.fragmentShader='uniform vec3 horizon52; uniform float night51; uniform float dusk51;\n'+sky.material.fragmentShader;
 sky.material.fragmentShader=sky.material.fragmentShader.replace('gl_FragColor = vec4( texColor, 1.0 );',`
  vec3 nightColor51=mix(vec3(.012,.022,.05),vec3(.0025,.005,.017),pow(max(direction.y,0.0),.35));
  vec2 starCell51=floor(direction.xz/(max(direction.y,.05)+.25)*800.0);
  float star51=step(.9985,fract(sin(dot(starCell51,vec2(127.1,311.7)))*43758.5453))*smoothstep(.12,.45,direction.y);
  float skyHeight51=pow(max(direction.y,0.0),.4);
  vec3 daySky51=mix(vec3(.66,.75,.78),vec3(.09,.29,.58),skyHeight51);
  vec3 duskSky51=mix(vec3(.82,.43,.21),vec3(.065,.13,.29),skyHeight51);
  vec3 atmosphere51=mix(daySky51,duskSky51,dusk51);
  float clouds51=smoothstep(.57,.72,fbm(direction.xz/(max(direction.y,.04)+.3)*2.0,0.0)*.5+.5)*smoothstep(.015,.12,direction.y);
  atmosphere51=mix(atmosphere51,mix(vec3(.72,.77,.78),vec3(.7,.39,.25),dusk51),clouds51*.42);
  texColor=mix(mix(atmosphere51,texColor*.075,.10),nightColor51+vec3(star51*.12),night51);
  texColor=mix(horizon52,texColor,smoothstep(-.025,.10,direction.y)); gl_FragColor=vec4(texColor,1.0);`);
 const environmentScene=new T.Scene(),environmentSky=new T.Mesh(sky.geometry,sky.material);environmentSky.scale.copy(sky.scale);environmentScene.add(environmentSky);
 const pmrem=new T.PMREMGenerator(renderer);let environment:T.WebGLRenderTarget|undefined,timer:ReturnType<typeof setTimeout>|undefined,disposed=false,lastTime=-1;
 const skyDay=new T.Color('#d5e5f4'),skyNight=new T.Color('#526aaf'),groundDay=new T.Color('#a39a7d'),groundNight=new T.Color('#17223d');
 const fog=new T.Fog('#bad5df',220,820);scene.fog=fog;
 const moon=new T.DirectionalLight('#92b6ff',0);moon.position.set(-65,160,-75);scene.add(moon);
 const regenerate=()=>{
  if(disposed)return;
  uniforms.showSunDisc.value=0;
  const next=pmrem.fromScene(environmentScene,.015,.1,500000,{size:128});uniforms.showSunDisc.value=1;
  const previous=environment;environment=next;scene.environment=next.texture;previous?.dispose();request();
 };
 function update(value:number,inside:boolean,interiorEnvironment:T.Texture|null){
  const t=timeOfDay51(value),solar=solar75(value),dusk=solar.dusk,day=1-t.night;
  uniforms.sunPosition.value.copy(solar.direction).multiplyScalar(450000);uniforms.night51.value=t.night;uniforms.dusk51.value=dusk;
  sun.position.copy(sun.target.position).addScaledVector(solar.direction,280);
  sun.intensity=solar.power;sun.color.set('#fff0d9').lerp(new T.Color('#ffb36c'),dusk*.85);
  ambient.color.copy(skyDay).lerp(skyNight,t.night);ambient.groundColor.copy(groundDay).lerp(groundNight,t.night);ambient.intensity=(inside?.20:.28)*day+.18*t.night;
  moon.intensity=.20*t.night;renderer.toneMappingExposure=(inside?1.02:.96)+.08*t.night;
  scene.background=null;scene.environmentRotation.set(0,0,0);scene.environment=inside?interiorEnvironment:environment?.texture??null;
  scene.environmentIntensity=inside?.24:(.28*day+.24*t.night);
  fog.color.set('#d5dfe2').lerp(new T.Color('#ddbaa5'),dusk*(1-t.night)).lerp(new T.Color('#101b36'),t.night);
  fog.near=inside?400:280;fog.far=inside?1800:1900; uniforms.horizon52.value.copy(fog.color);
  if(value!==lastTime){lastTime=value;renderer.shadowMap.needsUpdate=true;if(timer)clearTimeout(timer);if(!environment)regenerate();else timer=setTimeout(regenerate,140);}
  scene.userData.atmosphere51={revision:75,hour:t.hour,night:t.night,lights:t.lights,sunElevation:solar.elevation,sunAzimuth:solar.azimuth,sunPower:solar.power};return t;
 }
 return {update,dispose(){disposed=true;if(timer)clearTimeout(timer);environment?.dispose();pmrem.dispose();}};
}
