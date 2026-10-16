import * as T from 'three';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {casaSolar,CASA_LIGHT_DEFAULTS} from './CasaMLightState';
import type {createCasaMaterials} from './CasaMMaterials';

type Library=ReturnType<typeof createCasaMaterials>;

/** Preserve complete leaf cards while increasing canopy coverage, without animated grass. */
function broadenLeaves(g:T.BufferGeometry){
 if(g.userData.casaCanopy)return;g.userData.casaCanopy=true;
 const p=g.getAttribute('position'),index=g.index;if(!index)return;
 const parent=Int32Array.from({length:p.count},(_,i)=>i);
 const find=(a:number)=>{while(parent[a]!==a){parent[a]=parent[parent[a]];a=parent[a];}return a;};
 for(let i=0;i<index.count;i+=3){const a=find(index.getX(i));parent[find(index.getX(i+1))]=a;parent[find(index.getX(i+2))]=a;}
 const groups=new Map<number,number[]>();for(let i=0;i<p.count;i++){const k=find(i);if(!groups.has(k))groups.set(k,[]);groups.get(k)!.push(i);}
 for(const ids of groups.values())if(ids.length<180){
  const c=new T.Vector3();ids.forEach(i=>c.add(new T.Vector3().fromBufferAttribute(p,i)));c.divideScalar(ids.length);
  ids.forEach(i=>p.setXYZ(i,c.x+(p.getX(i)-c.x)*1.85,c.y+(p.getY(i)-c.y)*1.85,c.z+(p.getZ(i)-c.z)*1.85));
 }
 p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
}

export function createCasaEnvironment(scene:T.Scene,renderer:T.WebGLRenderer,library:Library,touch:boolean,request:()=>void){
 const root=new T.Group();root.name='Paisagem e acabamentos exteriores';scene.add(root);
 const resources:{dispose:()=>void}[]=[];let disposed=false,hour=CASA_LIGHT_DEFAULTS.hour,high=true,plan=false;
 const skyUniforms={top:{value:new T.Color('#8eb8d0')},horizon:{value:new T.Color('#d1d5cd')},day:{value:1},skyMap:{value:null as T.Texture|null},hasMap:{value:0},sunDir:{value:new T.Vector3()},gold:{value:0}};
 const skyMaterial=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,toneMapped:false,uniforms:skyUniforms,
  vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec3 vDirection;uniform sampler2D skyMap;uniform float hasMap,day,gold;uniform vec3 top,horizon,sunDir;
   void main(){vec3 d=normalize(vDirection);vec2 uv=vec2(atan(d.z,d.x)/6.2831853+.5,asin(clamp(d.y,-1.,1.))/3.14159265+.5);
   vec3 sky=mix(horizon,top,smoothstep(-.03,.65,d.y));vec3 photo=texture2D(skyMap,uv).rgb;
   photo=photo/(photo+vec3(.8));float cloud=clamp((dot(photo,vec3(.333))-.24)*.85,0.,.55);
   sky=mix(sky,vec3(.89,.88,.82)*day+vec3(.035,.045,.075)*(1.-day),cloud*hasMap*smoothstep(.015,.14,d.y));
   float aureole=pow(max(0.,dot(d,sunDir)),32.);sky+=vec3(.12,.08,.035)*aureole*day*(.3+gold);
   gl_FragColor=vec4(sky,1.);
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
 const forest=new T.Mesh(new T.CylinderGeometry(85,85,27,96,1,true),forestMat);forest.position.set(14,12.7,-8);root.add(forest);resources.push(forest.geometry,forestMat);
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
  const candidates:T.Mesh[]=[];const used=new Set<T.BufferGeometry>();
  model.traverse(o=>{if(o instanceof T.Mesh){const ms=Array.isArray(o.material)?o.material:[o.material];
   if(ms.some(m=>m.name.includes('leaves'))&&!used.has(o.geometry)){broadenLeaves(o.geometry);used.add(o.geometry);}
   if(ms.some(m=>m.name.includes('Agua')))o.visible=false;
   if(o.userData.vegetation&&ms.some(m=>m.name.includes('tree_small_02')))candidates.push(o);
  }});
  // Reuse the native tree's three primitives and their local transforms.
  const parts=new Map<string,T.Mesh>();for(const o of candidates){const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms)if(!parts.has(m.name))parts.set(m.name,o);}
  let seed=173;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const positions:{x:number;z:number;h:number;a:number}[]=[];
  for(let i=0;i<(touch?18:30);i++){
   const row=i%3,side=Math.floor(i/3)%4;
   let x=-48+rand()*125,z=-58+rand()*16;
   if(side===0){x=-32-rand()*18;z=-30+rand()*80;}
   if(side===1){x=52+rand()*22;z=-30+rand()*80;}
   if(side===2){x=-36+rand()*115;z=40+row*8+rand()*4;}
   positions.push({x,z,h:8+rand()*8,a:rand()*Math.PI*2});
  }
  positions.push({x:-1,z:20,h:5.2,a:.5},{x:9,z:21,h:5.8,a:1.6},{x:17,z:22,h:6.3,a:2.3});
  // Far trees use simple branch skeletons plus photographed leaf clusters. Close
  // landscaping retains the native model; distant geometry stays inexpensive.
  const bark=new T.MeshStandardMaterial({color:'#6d6250',roughness:1}),branchGeometry=new T.CylinderGeometry(.65,1,1,7),branches=new T.InstancedMesh(branchGeometry,bark,positions.length*4),stem=new T.Object3D();
  positions.forEach((tree,i)=>{for(let b=0;b<4;b++){
   const a=new T.Vector3(tree.x,-.5+(b?tree.h*.32:0),tree.z),angle=tree.a+b*2.09;
   const end=new T.Vector3(tree.x+(b?Math.cos(angle)*tree.h*.21:0),tree.h*(b?.76:.61)-.5,tree.z+(b?Math.sin(angle)*tree.h*.21:0));
   stem.position.copy(a).add(end).multiplyScalar(.5);stem.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.clone().sub(a).normalize());stem.scale.set(tree.h*(b?.012:.021),a.distanceTo(end),tree.h*(b?.012:.021));stem.updateMatrix();branches.setMatrixAt(i*4+b,stem.matrix);
  }});branches.userData.vegetation=true;branches.receiveShadow=true;root.add(branches);resources.push(branchGeometry,bark);
  // Canopy infill reuses the photographed branch atlas. It adds leaf coverage with
  // a small instanced mesh instead of multiplying the native high-poly branches.
  const leaf=Array.from(parts.values()).find(o=>(Array.isArray(o.material)?o.material:[o.material]).some(m=>m.name.includes('leaves')));
  if(leaf){
   const material=(Array.isArray(leaf.material)?leaf.material:[leaf.material]).find(m=>m.name.includes('leaves'))!;
   const canopies=[...positions];const seen=new Set<T.Object3D>();
   for(const o of candidates){const parent=o.parent||o;if(seen.has(parent))continue;seen.add(parent);const bounds=new T.Box3().setFromObject(parent);const size=bounds.getSize(new T.Vector3()),c=bounds.getCenter(new T.Vector3());
    if(size.y>.8&&size.y<20)canopies.push({x:c.x,z:c.z,h:size.y,a:bounds.min.y});
   }
   const card=new T.PlaneGeometry(1,1),uv=card.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*.52,uv.getY(i)*.95);
   const count=touch?160:280,leaves=new T.InstancedMesh(card,material,canopies.length*count),dummy=new T.Object3D();let index=0;
   for(let c=0;c<canopies.length;c++){const tree=canopies[c],base=c<positions.length?-.5:tree.a;
    for(let i=0;i<count;i++){const angle=rand()*Math.PI*2,v=rand()*2-1,r=Math.sqrt(1-v*v)*(0.35+rand()*.65),radius=tree.h*.30;
     dummy.position.set(tree.x+Math.cos(angle)*r*radius,base+tree.h*(.68+v*.21),tree.z+Math.sin(angle)*r*radius);
     dummy.rotation.set(rand()*Math.PI,angle,rand()*Math.PI);const s=tree.h*(.045+rand()*.025);dummy.scale.set(s,s*1.5,s);dummy.updateMatrix();leaves.setMatrixAt(index,dummy.matrix);
     leaves.setColorAt(index++,new T.Color().setHSL(.18+rand()*.06,.22,.65+rand()*.2));
    }
   }
   leaves.userData.vegetation=true;leaves.castShadow=false;leaves.receiveShadow=true;leaves.computeBoundingSphere();root.add(leaves);resources.push(card);
  }
 }
 function lighting(value:number,azimuth=0,intensity=1){hour=value;const solar=casaSolar(hour,azimuth);
  skyUniforms.horizon.value.set('#bfd7e5').lerp(new T.Color('#e8c29f'),solar.gold*.35).lerp(new T.Color('#273b53'),1-solar.day);skyUniforms.top.value.set('#77add1').lerp(new T.Color('#18283e'),1-solar.day);
  skyUniforms.day.value=solar.day;skyUniforms.gold.value=solar.gold;skyUniforms.sunDir.value.copy(solar.direction);waterMat.uniforms.day.value=solar.day*intensity;forestMat.color.setScalar(.065+solar.day*.7*intensity);
  scene.fog=new T.Fog(skyUniforms.horizon.value,90,210);
 }
 lighting(hour);
 return {root,ready,populate,lighting,quality(v:boolean){high=v;},plan(value:boolean){plan=value;root.visible=!value;},
  animate(seconds:number,camera:T.Camera){waterMat.uniforms.time.value=seconds;return !plan&&high&&camera.position.y<4&&camera.position.z<-10.5&&camera.position.distanceTo(water.position)<20;},
  get reflectionFrames(){return reflectionFrame;},
  dispose(){disposed=true;root.removeFromParent();sky.removeFromParent();resources.forEach(r=>r.dispose());environment?.dispose();pmrem.dispose();}
 };
}
