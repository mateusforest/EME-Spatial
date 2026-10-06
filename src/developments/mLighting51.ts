import {patioNight53} from './mPatioRefinement53';
import * as T from 'three';
import type {Own} from './mSurfaces';
import {M_REFERENCE} from './mReferenceArchitecture';

/** Lightweight architectural lighting: shared fixture batches, local lights and warm surface fill. */
export function installMLighting51(scene:T.Scene,floors:T.Group[],crown:T.Group,own:Own){
 const night={value:0},glow=own(new T.MeshStandardMaterial({color:'#fff2d9',emissive:'#ffd49c',emissiveIntensity:0,roughness:.5}));glow.name='M51 warm architectural luminaires';
 const trim=own(new T.MeshStandardMaterial({color:'#4e493e',metalness:.65,roughness:.35}));
 const disc=own(new T.CylinderGeometry(.095,.095,.025,12)),box=own(new T.BoxGeometry(1,1,1)),dummy=new T.Object3D();
 let fixtures=0;
 const batch=(parent:T.Group,positions:number[][],geo:T.BufferGeometry,material:T.Material,name:string)=>{
  if(!positions.length)return;
  const mesh=own(new T.InstancedMesh(geo,material,positions.length));mesh.name=name;mesh.userData.finishOnly=true;
  positions.forEach(([x,y,z,sx=1,sy=1,sz=1],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,0,0);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
  mesh.computeBoundingSphere();parent.add(mesh);fixtures+=positions.length;
 };
 floors.forEach((floor,i)=>{
  const positions:number[][]=[],strips:number[][]=[],duplex=M_REFERENCE.duplexes.find(d=>d.floor===i+1);
  const notch=floor.userData.envelope.notch;
  for(const side of [-1,1]){
   if(notch!==2&&notch!==side){
    const y=duplex?.side===side?6.71:3.23;
    for(const x of [3,6.5,10])positions.push([side*x,y,7.6]);
    strips.push([side*6.0,y+.015,4.85,9.3,.025,.045]);
   }
   for(const z of [-9,-3,2])positions.push([side*12.8,3.23,z]);
   if(notch!==2)positions.push([side*7.5,3.23,-12.8]);
  }
  batch(floor,positions,disc,glow,'M51 balcony downlights');batch(floor,strips,box,glow,'M51 recessed warm coves');
 });
 const roofPositions:number[][]=[];
 for(const x of [-5,-2.5,0,2.5,5])for(const z of [-6.7,-2.2])roofPositions.push([x,9.01,z]);
 for(const x of [-12,-6,0,6,12])for(const z of [-9,8])roofPositions.push([x,4.78,z]);
 batch(crown,roofPositions,disc,glow,'M51 rooftop and salon downlights');
 batch(crown,[[0,7.19,-6.6,9.8,.035,.045],[0,7.89,-6.6,9.8,.035,.045],[0,6.48,-6.6,9.8,.035,.045]],box,glow,'M51 bar shelf lighting');
 const garden=new T.Group();garden.name='M51 landscape lighting';scene.add(garden);
 const lamps:number[][]=[],posts:number[][]=[];
 for(const x of [-20,20])for(const z of [18,30,42]){lamps.push([x,.88,z,.19,.06,.19]);posts.push([x,.46,z,.12,.82,.12]);}
 for(const x of [28,76])for(const z of [-18,0,19,36]){lamps.push([x,.88,z,.19,.06,.19]);posts.push([x,.46,z,.12,.82,.12]);}
 for(const x of [-18,24,65,108])lamps.push([x,5.56,64.05,.82,.025,.3]);
 batch(garden,lamps,box,glow,'M51 garden and street luminaires');batch(garden,posts,box,trim,'M51 shielded garden bollards');
 // A small fixed light budget illuminates the most visited spaces without hundreds of light uniforms.
 const lights:{light:T.PointLight;power:number}[]=[];
 function point(parent:T.Group,x:number,y:number,z:number,power:number,distance:number,color='#ffdbab'){
  const light=new T.PointLight(color,0,distance,2);parent.updateWorldMatrix(true,false);light.position.copy(parent.localToWorld(new T.Vector3(x,y,z)));scene.add(light);lights.push({light,power});
 }
 point(crown,0,8.65,-3.5,180,19);point(crown,0,4.25,0,190,24);
 point(garden,0,10,10,300,28);point(garden,21,6,9,90,20);
 point(garden,-14,2,28,36,16);point(garden,14,2,28,36,16);
 point(garden,51,3.7,-41,140,26);point(garden,33,-.15,-10,18,20,'#a6e2e0');point(garden,71,-.15,16,18,20,'#a6e2e0');
 point(garden,153,6,-3,260,38);point(garden,153,53,-3,180,25);
 const materials=new Set<T.MeshStandardMaterial>(),emissions=new Map<T.MeshStandardMaterial,number>();
 const roomLights=new Map<T.PointLight|T.RectAreaLight,number>();
 let lastAmount=-1;
 function refresh(){lastAmount=-1;
  scene.traverse(o=>{
   if((o instanceof T.RectAreaLight||o instanceof T.PointLight)&&!o.userData.managed53&&!roomLights.has(o)&&!lights.some(p=>p.light===o))roomLights.set(o,o.intensity);
   if(!(o instanceof T.Mesh))return;
   for(const m of Array.isArray(o.material)?o.material:[o.material]){
    if(!(m instanceof T.MeshStandardMaterial)||materials.has(m))continue;materials.add(m);
    if(m.emissive.getHex()!==0&&m.emissiveIntensity>0)emissions.set(m,m.emissiveIntensity);
    if(m===glow||m.transparent||m.userData.noNightFill||m.name.includes('continuous meadow'))continue;
    const previous=m.onBeforeCompile,oldKey=m.customProgramCacheKey();
    m.onBeforeCompile=(shader,renderer)=>{
     previous.call(m,shader,renderer);shader.uniforms.night51=night;
     shader.vertexShader='varying vec3 vLightWorld51;\n'+shader.vertexShader;
     shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
      vec4 lightWorld51=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
       lightWorld51=instanceMatrix*lightWorld51;
      #endif
      vLightWorld51=(modelMatrix*lightWorld51).xyz;`);
     shader.fragmentShader='uniform float night51; varying vec3 vLightWorld51;\n'+shader.fragmentShader;
     shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      vec3 lp51=vLightWorld51;
      float tower51=(1.0-smoothstep(14.5,18.5,abs(lp51.x)))*(1.0-smoothstep(13.0,16.0,abs(lp51.z+2.3)))*smoothstep(16.0,17.0,lp51.y)*(1.0-smoothstep(94.0,95.0,lp51.y));
      float level51=mod(max(lp51.y-17.0,0.0),3.5);
      float cove51=exp(-pow((level51-3.2)*1.8,2.0));
      float interior51=(1.0-smoothstep(4.0,8.7,lp51.z))*.10;
      float roof51=(1.0-smoothstep(7.0,12.0,abs(lp51.x)))*(1.0-smoothstep(5.0,9.0,abs(lp51.z+4.0)))*smoothstep(99.6,100.0,lp51.y)*(1.0-smoothstep(103.3,104.0,lp51.y));
      float lago54=(1.0-smoothstep(23.0,27.0,abs(lp51.x-153.0)))*(1.0-smoothstep(16.0,20.0,abs(lp51.z+3.0)))*smoothstep(.3,.7,lp51.y)*(1.0-smoothstep(56.0,58.0,lp51.y));
      float cove54=exp(-pow((mod(max(lp51.y-8.2,0.0),3.5)-3.1)*1.7,2.0));
      totalEmissiveRadiance+=diffuseColor.rgb*vec3(1.0,.61,.28)*night51*(tower51*(.04+interior51+cove51*.28)+roof51*.13+lago54*(.095+cove54*.25));`);
    };
    m.customProgramCacheKey=()=>oldKey+'|architectural-night-51';m.needsUpdate=true;
   }
  });
 }
 refresh();
 return {update(amount:number){if(amount===lastAmount)return;lastAmount=amount;night.value=amount;patioNight53.value=amount;glow.emissiveIntensity=amount*3.5;for(const [m,base]of emissions)m.emissiveIntensity=base*(m.userData.alwaysLit?1:.025+amount*1.65);for(const {light,power}of lights)light.intensity=power*amount;for(const [light,base]of roomLights)light.intensity=base*(light.userData.alwaysLit?1:light.userData.nightOnly?amount:light instanceof T.RectAreaLight?1-.95*amount:.35+amount);scene.userData.lighting51={fixtures,lit:amount>.01,intensity:amount,localLights:lights.length};},refresh};
}
