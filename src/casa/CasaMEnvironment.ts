import * as T from 'three';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {casaSolar,CASA_LIGHT_DEFAULTS} from './CasaMLightState';
import type {createCasaMaterials} from './CasaMMaterials';

type Library=ReturnType<typeof createCasaMaterials>;

export function createCasaEnvironment(scene:T.Scene,renderer:T.WebGLRenderer,library:Library,touch:boolean,request:()=>void){
 const root=new T.Group();root.name='Paisagem e acabamentos exteriores';scene.add(root);
 const resources:{dispose:()=>void}[]=[];let disposed=false,hour=CASA_LIGHT_DEFAULTS.hour,high=true,plan=false;
 const skyUniforms={top:{value:new T.Color('#8eb8d0')},horizon:{value:new T.Color('#d1d5cd')},day:{value:1},skyMap:{value:null as T.Texture|null},hasMap:{value:0},sunDir:{value:new T.Vector3()},gold:{value:0}};
 // Use the same linear-light output on mobile and through the desktop composer.
 const skyMaterial=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,toneMapped:true,uniforms:skyUniforms,
  vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec3 vDirection;uniform sampler2D skyMap;uniform float hasMap,day,gold;uniform vec3 top,horizon,sunDir;
   void main(){vec3 d=normalize(vDirection);vec2 uv=vec2(atan(d.z,d.x)/6.2831853+.5,asin(clamp(d.y,-1.,1.))/3.14159265+.5);
   vec3 sky=mix(horizon,top,smoothstep(-.03,.65,d.y));vec3 photo=texture2D(skyMap,uv).rgb;
   photo=photo/(photo+vec3(.8));float cloud=clamp((dot(photo,vec3(.333))-.24)*.85,0.,.55);
   sky=mix(sky,vec3(.89,.88,.82)*day+vec3(.035,.045,.075)*(1.-day),cloud*hasMap*smoothstep(.015,.14,d.y));
   float aureole=pow(max(0.,dot(d,sunDir)),32.);sky+=vec3(.12,.08,.035)*aureole*day*(.3+gold);
   gl_FragColor=vec4(sky,1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   }`});
 const sky=new T.Mesh(new T.SphereGeometry(260,32,16),skyMaterial);sky.frustumCulled=false;
 sky.onBeforeRender=(_r,_s,c)=>{c.getWorldPosition(sky.position);sky.updateMatrixWorld();};scene.add(sky);resources.push(sky.geometry,skyMaterial);
 let environment:T.WebGLRenderTarget|undefined;const pmrem=new T.PMREMGenerator(renderer);
 const ready=new Promise<void>(resolve=>new RGBELoader().load('/assets/m/materials/daylight-1k.hdr',hdr=>{
  if(disposed){hdr.dispose();resolve();return;}hdr.mapping=T.EquirectangularReflectionMapping;
  skyUniforms.skyMap.value=hdr;skyUniforms.hasMap.value=1;resources.push(hdr);
  environment=pmrem.fromEquirectangular(hdr);scene.environment=environment.texture;pmrem.dispose();resolve();request();
 },undefined,()=>{pmrem.dispose();resolve();}));
 const ground=new T.MeshStandardMaterial({color:'#91ad77',map:library.texture('/assets/casa-m/materials/v2/grass_ground-color.jpg',true,90),roughness:1,vertexColors:true});
 const terrain=new T.Mesh(new T.PlaneGeometry(420,420,64,64),ground);terrain.rotation.x=-Math.PI/2;terrain.position.set(14,-.56,-8);terrain.receiveShadow=true;root.add(terrain);resources.push(terrain.geometry,ground);
 const p=terrain.geometry.getAttribute('position'),grassColors=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),edge=T.MathUtils.smoothstep(Math.hypot(x,y),42,110);p.setZ(i,edge*(1.3+Math.sin(x*.06)*Math.cos(y*.05)*1.2));const tone=.76+.17*Math.sin(x*.13)*Math.cos(y*.19);grassColors.set([tone,tone+.05,tone*.84],i*3);}terrain.geometry.setAttribute('color',new T.BufferAttribute(grassColors,3));terrain.geometry.computeVertexNormals();
 // A fixed woodland belt gives the upper balconies a complete, quiet horizon.
 // It is illustrative context; the near plants remain genuine 3D geometry.
 const forestMap=library.texture('/assets/botanique/materials/v6/woodland-backdrop.png',true);forestMap.repeat.set(7,1);forestMap.flipY=true;forestMap.wrapT=T.ClampToEdgeWrapping;
 const forestMat=new T.MeshBasicMaterial({map:forestMap,alphaTest:.45,side:T.DoubleSide,color:'#9aaa89',fog:true});
 const forest=new T.Mesh(new T.CylinderGeometry(85,85,18,96,1,true),forestMat);forest.position.set(14,8.2,-8);root.add(forest);resources.push(forest.geometry,forestMat);
 // Extend the street and pavement into the context so they do not end at the lot.
 const roadMat=new T.MeshStandardMaterial({color:'#aaa9a2',roughness:.96,map:library.texture('/assets/botanique/materials/v6/context-asphalt-color.png',true,1),normalMap:library.texture('/assets/botanique/materials/v6/context-asphalt-normal.png'),normalScale:new T.Vector2(.18,.18)});
 const pavement=new T.MeshStandardMaterial({color:'#aaa596',roughness:.88,map:library.texture('/assets/botanique/materials/v6/context-paving-color.png',true,1)});
 function surface(w:number,d:number,x:number,y:number,z:number,m:T.Material){const g=new T.PlaneGeometry(w,d);const uv=g.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/2,uv.getY(i)*d/2);const o=new T.Mesh(g,m);o.rotation.x=-Math.PI/2;o.position.set(x,y,z);o.receiveShadow=true;root.add(o);resources.push(g);}
 surface(180,7,14,-.48,8.6,roadMat);surface(180,1.8,14,-.37,13,pavement);resources.push(roadMat,pavement);
 const curbGeometries:T.BufferGeometry[]=[];
 for(const z of [12.03,13.98]){const g=new T.BoxGeometry(180,.17,.14);g.translate(14,-.44,z);curbGeometries.push(g);}
 const curb=new T.Mesh(mergeGeometries(curbGeometries),pavement);curb.receiveShadow=curb.castShadow=true;root.add(curb);resources.push(curb.geometry);curbGeometries.forEach(g=>g.dispose());
 // Real reflected geometry in the pool, with gentle optical ripples rather than moving grass.
 const waterNormals=library.texture('/assets/m/materials/refinement49/water-normal.png',false,1);
 const waterShader={name:'CasaMPool',uniforms:{color:{value:new T.Color('#4b9c92')},tDiffuse:{value:null},textureMatrix:{value:new T.Matrix4()},normalMap:{value:waterNormals},time:{value:0},day:{value:1}},
  vertexShader:`uniform mat4 textureMatrix;varying vec4 vUv;varying vec3 vWorld;void main(){vUv=textureMatrix*vec4(position,1.);vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform sampler2D tDiffuse,normalMap;uniform vec3 color;uniform float time,day;varying vec4 vUv;varying vec3 vWorld;
   void main(){vec2 st=vWorld.xz*.32;vec3 a=texture2D(normalMap,st+vec2(time*.008,time*.005)).rgb*2.-1.;vec3 b=texture2D(normalMap,st*.73-vec2(time*.005,time*.007)).rgb*2.-1.;vec2 ripple=(a.xy+b.xy)*.004;
   vec3 reflected=texture2D(tDiffuse,vUv.xy/vUv.w+ripple).rgb;float fresnel=.12+.72*pow(1.-abs(normalize(cameraPosition-vWorld).y),4.);
   vec3 water=color*(.18+.5*day);vec3 c=mix(water,reflected,fresnel*.83);gl_FragColor=vec4(c,.76);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   }`};
 const water=new Reflector(new T.PlaneGeometry(9,2.8),{textureWidth:touch?256:512,textureHeight:touch?256:512,clipBias:.003,shader:waterShader});
 water.rotation.x=-Math.PI/2;water.position.set(11.05,-.102,-14.8);const waterMat=water.material as T.ShaderMaterial;waterMat.transparent=true;waterMat.depthWrite=false;root.add(water);
 const reflect=water.onBeforeRender.bind(water);let reflectionFrame=0;
 water.onBeforeRender=(r,s,c,g,m,group)=>{if(high&&!plan&&!s.overrideMaterial&&!c.userData.casaProbe&&c.position.distanceTo(water.position)<25){reflect(r,s,c,g,m,group);reflectionFrame++;}};
 resources.push(water.geometry,waterMat,water.getRenderTarget());
 function populate(model:T.Group){
  // The V4 model carries complete native leaf cards with preserved UVs.
  // No geometric broadening or atlas cutouts: both damaged their silhouettes.
  model.traverse(o=>{if(o instanceof T.Mesh){
   const ms=Array.isArray(o.material)?o.material:[o.material];
   if(ms.some(m=>m.name.includes('Agua')))o.visible=false;
  }});
 }
 function lighting(value:number){hour=value;const solar=casaSolar(hour);
  skyUniforms.horizon.value.set('#a3c7df').lerp(new T.Color('#e8c29f'),solar.gold*.35).lerp(new T.Color('#273b53'),1-solar.day);skyUniforms.top.value.set('#4d91c5').lerp(new T.Color('#18283e'),1-solar.day);
  skyUniforms.day.value=solar.day;skyUniforms.gold.value=solar.gold;skyUniforms.sunDir.value.copy(solar.direction);waterMat.uniforms.day.value=solar.day;forestMat.color.setScalar(.065+solar.day*.7);
  scene.fog=new T.Fog(skyUniforms.horizon.value,90,210);
 }
 lighting(hour);
 return {root,ready,populate,lighting,quality(v:boolean){high=v;},plan(value:boolean){plan=value;root.visible=!value;},
  animate(seconds:number,camera:T.Camera){waterMat.uniforms.time.value=seconds;return !plan&&high&&camera.position.y<4&&camera.position.z<-10.5&&camera.position.distanceTo(water.position)<20;},
  get reflectionFrames(){return reflectionFrame;},
  dispose(){disposed=true;root.removeFromParent();sky.removeFromParent();resources.forEach(r=>r.dispose());environment?.dispose();pmrem.dispose();}
 };
}
