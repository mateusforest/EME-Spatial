import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {canopy51} from '../developments/mCanopy51';
import {areas,areaById,plan,canWalk, containsPoint, lotById, lots, solarPosition, statusInfo, terrainHeight} from './model';
import type {LotStatus, ViewMode} from './model';
import {createAnnotations} from './annotations';
import {frameBounds} from './camera-layout';
import {createRoadNavigator} from './navigation';
import {createSolarGuide} from './solar-gizmo';

export type WalkState='idle'|'choosing'|'moving';
type Events = {onSelect: (id:string)=>void;onArea:(id:string)=>void;onWalkState:(state:WalkState)=>void;onNotice:(message:string)=>void; onBlock:(block:string)=>void; onMode:(mode:ViewMode)=>void; onReady:()=>void; onError:(message:string)=>void};
type Transition={start:number;duration:number;from:T.Vector3;to:T.Vector3;fromTarget:T.Vector3;toTarget:T.Vector3;done?:()=>void};

export function createPrioritaScene(host:HTMLDivElement, events:Events) {
  let disposed=false,dirty=true,mode:ViewMode='aerial',selected='',hovered='',showStock=true,showLabels=true;
  let focusedBlock='',paused=false;
  let filtered:Set<string>|null=null;
  let comparison:string[]=[];
  let selectedArea='',walkPicking=false,walkSpeed=8;
  let route:[number,number][]=[];
  const navigator=createRoadNavigator(plan.roads.map(r=>r.polygon),canWalk);
  const statuses=new Map<string,LotStatus>(lots.map(l=>[l.id,'available']));
  const scene=new T.Scene();
  const solarGuide=createSolarGuide(scene,host);
  const draco=new DRACOLoader().setDecoderPath('/assets/priorita/draco/').setWorkerLimit(2);
  scene.fog=new T.Fog('#9dbec8',650,2600);
  const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFShadowMap;
  renderer.shadowMap.autoUpdate=false;
  renderer.domElement.setAttribute('aria-label','Cenário 3D do loteamento Priorità. Use a lista de lotes para selecionar pelo teclado.');
  renderer.domElement.tabIndex=0;
  host.append(renderer.domElement);
  const camera=new T.PerspectiveCamera(47,1,.12,6200);
  camera.position.set(182,172,232);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.target.set(-7,0,8);controls.enableDamping=true;controls.dampingFactor=.085;
  controls.minDistance=16;controls.maxDistance=550;controls.maxPolarAngle=Math.PI*.47;
  controls.screenSpacePanning=false;
  controls.addEventListener('change',invalidate);
  let environment:T.WebGLRenderTarget|undefined;
  const pmrem=new T.PMREMGenerator(renderer);
  new HDRLoader().load('/assets/m/materials/daylight-1k.hdr',hdr=>{
    if(disposed){hdr.dispose();pmrem.dispose();return;}
    environment=pmrem.fromEquirectangular(hdr);scene.environment=environment.texture;
    hdr.dispose();pmrem.dispose();invalidate();
  },undefined,()=>pmrem.dispose());
  scene.environmentIntensity=.26;
  const skyMaterial=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,
    uniforms:{topColor:{value:new T.Color('#3883b9')},bottomColor:{value:new T.Color('#b9d0d9')},sunDirection:{value:new T.Vector3(1,1,1).normalize()},sunColor:{value:new T.Color('#ffdfac')},daylight:{value:1}},
    vertexShader:'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform vec3 topColor;uniform vec3 bottomColor;uniform vec3 sunDirection;uniform vec3 sunColor;uniform float daylight;varying vec3 vDirection;
      void main(){
        vec3 d=normalize(vDirection);float h=smoothstep(-.02,.6,d.y);
        vec3 color=mix(bottomColor,topColor,pow(h,.65));
        float alignment=max(0.,dot(d,sunDirection));
        float glow=pow(alignment,80.)*.32;float disc=smoothstep(.99991,.99996,alignment);
        color=mix(color,sunColor,clamp((glow+disc)*daylight,0.,1.));
        gl_FragColor=vec4(color,1.);
        #include <colorspace_fragment>
      }`
  });
  const sky=new T.Mesh(new T.SphereGeometry(3000,24,12),skyMaterial);scene.add(sky);
  const hemi=new T.HemisphereLight('#dbeaf2','#b6ad82',1.7);scene.add(hemi);
  const sun=new T.DirectionalLight('#fff3db',3.2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  const sunDirection=new T.Vector3(),shadowFocus=new T.Vector3(9999,9999,9999);
  let shadowSpan=0;
  Object.assign(sun.shadow.camera,{left:-190,right:190,top:210,bottom:-210,near:1,far:850});
  sun.shadow.bias=-.00012;sun.shadow.normalBias=.07;sun.shadow.radius=2;scene.add(sun,sun.target);
  const textures:T.Texture[]=[];
  // Blur the unsupported context perceptually with a spatial atmospheric fade,
  // without a full-screen depth-of-field pass or fading the property itself.
  const horizonColor={value:new T.Color('#b9cccf')};
  // One tiny shared mask confines the new lawn finish to the actual parcels
  // and common areas. No extra geometry or changes to the outer landscape.
  const lawnMaskCanvas=document.createElement('canvas');lawnMaskCanvas.width=256;lawnMaskCanvas.height=384;
  const lawnMaskContext=lawnMaskCanvas.getContext('2d')!;
  lawnMaskContext.fillStyle='#000';lawnMaskContext.fillRect(0,0,256,384);lawnMaskContext.fillStyle='#fff';
  for(const item of [...lots,...areas]){lawnMaskContext.beginPath();item.polygon.forEach(([x,z],i)=>{const u=(x+150)/300*256,v=(180-z)/360*384;i?lawnMaskContext.lineTo(u,v):lawnMaskContext.moveTo(u,v);});lawnMaskContext.closePath();lawnMaskContext.fill();}
  const lawnMask=new T.CanvasTexture(lawnMaskCanvas);lawnMask.generateMipmaps=false;lawnMask.minFilter=T.LinearFilter;textures.push(lawnMask);
  function horizon(material:T.Material){
    const lawn=material.name.startsWith('Grama');
    material.onBeforeCompile=shader=>{
      shader.uniforms.prHorizonColor=horizonColor;shader.uniforms.prLawnMask={value:lawnMask};
      shader.vertexShader='varying vec2 prWorldXZ;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <fog_vertex>',`#include <fog_vertex>
        vec4 prPosition=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
          prPosition=instanceMatrix*prPosition;
        #endif
        prWorldXZ=(modelMatrix*prPosition).xz;`);
      shader.fragmentShader='uniform vec3 prHorizonColor;uniform sampler2D prLawnMask;varying vec2 prWorldXZ;\n'+shader.fragmentShader;
      if(lawn)shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
        vec4 lawnA=texture2D(map,vMapUv);
        vec4 lawnB=texture2D(map,mat2(.8,-.6,.6,.8)*vMapUv*.731+vec2(.173,.371));
        vec4 lawnMix=mix(lawnA,lawnB,.42);
        float siteMask=texture2D(prLawnMask,(prWorldXZ+vec2(150.0,180.0))/vec2(300.0,360.0)).r;
        float mowing=.5+.5*sin(prWorldXZ.x*.32+prWorldXZ.y*.12);
        lawnMix.rgb*=mix(vec3(1.0),vec3(.94,1.015,.91)*(.96+mowing*.07),siteMask);
        diffuseColor*=lawnMix;
      #endif`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',`#include <fog_fragment>
        float prDistance=max(abs(prWorldXZ.x),abs(prWorldXZ.y));
        float prHaze=smoothstep(385.0,500.0,prDistance);
        gl_FragColor.rgb=mix(gl_FragColor.rgb,prHorizonColor,prHaze);`);
    };
    material.customProgramCacheKey=()=> 'priorita-spatial-haze-v8-'+lawn;
    return material;
  }
  const grassMat=new T.MeshBasicMaterial(); // CPU picking only; no duplicate texture download.
  const barkMat=new T.MeshStandardMaterial({color:'#63564a',roughness:.95});
  const overlays=new Map<string,T.Mesh<T.BufferGeometry,T.MeshBasicMaterial>>();
  const borders=new Map<string,T.LineLoop<T.BufferGeometry,T.LineBasicMaterial>>();
  const areaOverlays=new Map<string,T.Mesh<T.BufferGeometry,T.MeshBasicMaterial>>();
  const pickables:T.Mesh[]=[];
  const annotations=createAnnotations(host,id=>{select(id,true);events.onSelect(id);},block=>{focusBlock(block);events.onBlock(block);},id=>selectArea(id,true));
  const uiObserver=new MutationObserver(invalidate);
  uiObserver.observe(host.parentElement!,{childList:true,subtree:false});
  let transition:Transition|undefined;
  let yaw=0,pitch=0,raf=0,last=performance.now(),frameTime=0;
  const held=new Set<string>();
  const raycaster=new T.Raycaster(),pointer=new T.Vector2();
  const drag={active:false,x:0,y:0,lastX:0,lastY:0,moved:false,id:-1};
  function invalidate(){dirty=true;}

  function surface(polygon:number[][],offset=0,holes:number[][][]=[]){
    const contour=polygon.map(([x,z])=>new T.Vector2(x,z));
    const hh=holes.map(r=>r.map(([x,z])=>new T.Vector2(x,z)));
    const verts=[...contour,...hh.flat()];
    const faces=T.ShapeUtils.triangulateShape(contour,hh);
    const positions:number[]=[],uv:number[]=[];
    const triangle=(a:T.Vector2,b:T.Vector2,c:T.Vector2,depth:number)=>{
      if(depth<7&&Math.max(a.distanceTo(b),a.distanceTo(c),b.distanceTo(c))>5){
        const ab=a.clone().add(b).multiplyScalar(.5),bc=b.clone().add(c).multiplyScalar(.5),ca=c.clone().add(a).multiplyScalar(.5);
        triangle(a,ab,ca,depth+1);triangle(ab,b,bc,depth+1);triangle(ca,bc,c,depth+1);triangle(ab,bc,ca,depth+1);return;
      }
      for(const p of [a,c,b]){positions.push(p.x,terrainHeight(p.x,p.y)+offset,p.y);uv.push(p.x/6,p.y/6);}
    };
    for(const [a,b,c] of faces)triangle(verts[a],verts[b],verts[c],0);
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.computeVertexNormals();return geo;
  }
  function mesh(geo:T.BufferGeometry,material:T.Material){const m=new T.Mesh(geo,material);m.receiveShadow=true;scene.add(m);return m;}
  const backdrop=new T.PlaneGeometry(6000,6000);backdrop.rotateX(-Math.PI/2);backdrop.translate(0,-25,0);
  const backdropMaterial=new T.MeshBasicMaterial({color:'#dce4dc',toneMapped:false,fog:false});
  mesh(backdrop,backdropMaterial);
  new GLTFLoader().setDRACOLoader(draco).load('/assets/priorita/production-v4/site.glb',gltf=>{
    if(disposed){disposeObject(gltf.scene);return;}
    gltf.scene.updateMatrixWorld(true);
    const groups=new Map<string,{material:T.MeshStandardMaterial;geometries:T.BufferGeometry[]}>();
    gltf.scene.traverse(o=>{
      if(!(o instanceof T.Mesh)||Array.isArray(o.material))return;
      if(/Banco|Encosto/.test(o.name)){o.geometry.dispose();return;}
      const material=o.material as T.MeshStandardMaterial;
      const key=material.uuid+Object.keys(o.geometry.attributes).sort().join(',');
      const group=groups.get(key)||{material,geometries:[]};
      const geometry=o.geometry.clone();geometry.applyMatrix4(o.matrixWorld);group.geometries.push(geometry);groups.set(key,group);
      o.geometry.dispose();
    });
    for(const {material,geometries} of groups.values()){
      horizon(material);
      for(const value of Object.values(material))if(value instanceof T.Texture)value.anisotropy=4;
      if(material.name.startsWith('Grama')){material.color.set('#dedfc4');material.roughness=.94;material.normalScale.set(.48,.48);}
      if(material.name.startsWith('Asfalto')){material.color.set('#a9b1b3');material.roughness=.82;material.normalScale.set(.8,.8);}
      if(material.name.startsWith('Calçada')){material.color.set('#e4dfd2');material.roughness=.78;material.normalScale.set(.85,.85);}
      const geometry=mergeGeometries(geometries);
      if(geometry){const object=mesh(geometry,material);object.castShadow=/Concreto|Metal|Banco/.test(material.name);}
      geometries.forEach(g=>g.dispose());
    }
    renderer.shadowMap.needsUpdate=true;invalidate();events.onReady();
  },undefined,()=>events.onError('Não foi possível carregar o cenário. Tente reabrir a visita.'));
  function outline(polygon:number[][],offset=.13){
    const points:T.Vector3[]=[];
    for(let i=0;i<polygon.length;i++){
      const a=polygon[i],b=polygon[(i+1)%polygon.length],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2);
      for(let j=0;j<n;j++){const x=T.MathUtils.lerp(a[0],b[0],j/n),z=T.MathUtils.lerp(a[1],b[1],j/n);points.push(new T.Vector3(x,terrainHeight(x,z)+offset,z));}
    }
    return new T.BufferGeometry().setFromPoints(points);
  }
  // Static production geometry is authored and exported from Blender.
  const parcelOutlineSegments:number[]=[];
  for(const lot of lots){
    const g=surface(lot.polygon,.035);const landLot=new T.Mesh(g,grassMat);landLot.userData.lot=lot.id;pickables.push(landLot);
    const overlay=new T.Mesh(surface(lot.polygon,.075),new T.MeshBasicMaterial({color:statusInfo.available.color,transparent:true,opacity:.11,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));overlay.renderOrder=2;scene.add(overlay);overlays.set(lot.id,overlay);
    const border=new T.LineLoop(outline(lot.polygon),new T.LineBasicMaterial({color:'#dcdfb9',transparent:true,opacity:.88}));scene.add(border);borders.set(lot.id,border);
    const edge=border.geometry.getAttribute('position');
    for(let i=0;i<edge.count;i++)for(const j of [i,(i+1)%edge.count])parcelOutlineSegments.push(edge.getX(j),edge.getY(j)+.08,edge.getZ(j));
  }
  for(const area of areas){
    const pick=new T.Mesh(surface(area.polygon,.04),grassMat);pick.userData.area=area.id;pickables.push(pick);
    const overlay=new T.Mesh(surface(area.polygon,.08),new T.MeshBasicMaterial({color:'#d7bf78',transparent:true,opacity:.16,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
    overlay.renderOrder=2;overlay.visible=false;scene.add(overlay);areaOverlays.set(area.id,overlay);
  }
  for(const road of plan.roads){const pick=new T.Mesh(surface(road.polygon,.02),grassMat);pick.userData.road=road.name;pickables.push(pick);}
  const destination=new T.Mesh(new T.RingGeometry(.38,.6,28),new T.MeshBasicMaterial({color:'#f2d690',transparent:true,opacity:.95,depthTest:false,side:T.DoubleSide}));
  destination.rotation.x=-Math.PI/2;destination.renderOrder=5;destination.visible=false;scene.add(destination);
  const walkTarget=document.createElement('div');walkTarget.className='pr-walk-target';walkTarget.hidden=true;walkTarget.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="13" cy="4" r="2"/><path d="m8 21 3-7m5 7-3-9 1-5m-7 7 3-6 4-1 4 5"/></svg><span>Ir até aqui</span>';host.append(walkTarget);
  const hoverRoad=new T.Vector3();let roadPreview=false;const targetProjection=new T.Vector3();
  // A single thin outline keeps sub-pixel physical strips legible from the air.
  const parcelOutlineGeometry=new T.BufferGeometry();parcelOutlineGeometry.setAttribute('position',new T.Float32BufferAttribute(parcelOutlineSegments,3));
  const parcelOutlines=new T.LineSegments(parcelOutlineGeometry,new T.LineBasicMaterial({color:'#dedfc5',transparent:true,opacity:.7}));scene.add(parcelOutlines);


  // Instanced street furniture and vegetation share meshes/materials.
  const dummy=new T.Object3D();
  const grassChunks:T.InstancedMesh[]=[];
  const grassViewer=new T.Vector3();
  const vegetationViewer=new T.Vector3(Infinity,Infinity,Infinity);
  type PlantLevel={mesh:T.InstancedMesh;kind:string;level:string;positions:number[][]};
  const plantLevels:PlantLevel[]=[];
  const plantStates=new Map<string,string[]>();
  const foliageMaterials:T.MeshStandardMaterial[]=[];
  const fixtureMaterials:T.MeshStandardMaterial[]=[];
  let sunlightAmount=1;
  let vegetationDirty=true;
  let lightQuality=false;
  function batch(geo:T.BufferGeometry,mat:T.Material,instances:number[][],shadows=true){
    const m=new T.InstancedMesh(geo,mat,instances.length);
    instances.forEach(([x,y,z,sx,sy,sz,rotation=0],i)=>{dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,rotation,0);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);});
    m.castShadow=shadows;m.receiveShadow=true;m.computeBoundingSphere();scene.add(m);return m;
  }
  const lampPosts:number[][]=[];
  for(const side of [-1,1])for(let z=-104;z<126;z+=29){const x=side<0?-5.3:7.9,h=terrainHeight(x,z);lampPosts.push([x,h,z]);}
  // The v7 library supplies the actual lamp geometry; the placements are reused.
  // Sparse traffic markings. All geometries follow the ground rather than a
  // flat plane, including on the crest of the demonstration hill.
  const paint=new T.MeshStandardMaterial({color:'#e5ddbb',roughness:.9});
  const paintGeos:T.BufferGeometry[]=[];
  for(let z=-110;z<127;z+=8){if(z>-31&&z<-15||z>24&&z<44||z>84&&z<100)continue;paintGeos.push(surface([[1.1,z],[1.25,z],[1.25,z+3],[1.1,z+3]],.028));}
  for(const z of [-26,22,82])for(let x=-3;x<7;x+=1.2)paintGeos.push(surface([[x,z],[x+.65,z],[x+.65,z+2.6],[x,z+2.6]],.03));
  const mergedPaint=mergeGeometries(paintGeos);if(mergedPaint)mesh(mergedPaint,paint);paintGeos.forEach(g=>g.dispose());
  const treePositions:number[][]=[];
  let seed=2314;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  new GLTFLoader().load('/assets/priorita/production-v4/grass-tuft.glb',gltf=>{
    if(disposed){disposeObject(gltf.scene);return;}
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(o=>{
      if(!(o instanceof T.Mesh)||Array.isArray(o.material))return;
      const geometry=o.geometry.clone();geometry.applyMatrix4(o.matrixWorld);
      const material=o.material as T.MeshStandardMaterial;material.side=T.DoubleSide;material.color.set('#7c9356');material.roughness=.9;
      const chunks=new Map<string,number[][]>();
      for(const lot of lots){
        const {a,b}=lot.front,len=Math.hypot(a[0]-b[0],a[1]-b[1]);
        const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],dx=lot.center[0]-mid[0],dz=lot.center[1]-mid[1],norm=Math.hypot(dx,dz)||1;
        for(let step=.2;step<len-.2;step+=.4)for(const inset of [.18,.5,.9,1.4,2.1]){
          const x=T.MathUtils.lerp(a[0],b[0],step/len)+dx/norm*(inset+random()*.15),z=T.MathUtils.lerp(a[1],b[1],step/len)+dz/norm*(inset+random()*.15);
          if(!containsPoint([x,z],lot.polygon))continue;
          const key=`${Math.floor(x/32)},${Math.floor(z/32)}`,chunk=chunks.get(key)||[];
          chunk.push([x,z,.65+random()*.5,random()*Math.PI*2]);chunks.set(key,chunk);
        }
        const xs=lot.polygon.map(p=>p[0]),zs=lot.polygon.map(p=>p[1]);
        for(let x=Math.min(...xs)+.7;x<Math.max(...xs);x+=1.6)for(let z=Math.min(...zs)+.7;z<Math.max(...zs);z+=1.6){
          const xx=x+(random()-.5)*1.1,zz=z+(random()-.5)*1.1;if(!containsPoint([xx,zz],lot.polygon)||random()<.3)continue;
          const key=`${Math.floor(xx/32)},${Math.floor(zz/32)}`,chunk=chunks.get(key)||[];
          chunk.push([xx,zz,.55+random()*.5,random()*Math.PI*2]);chunks.set(key,chunk);
        }
      }
      for(const positions of chunks.values()){
        const inst=new T.InstancedMesh(geometry,material,positions.length);
        positions.forEach(([x,z,s,r],i)=>{dummy.position.set(x,terrainHeight(x,z)+.045,z);dummy.scale.setScalar(s);dummy.rotation.set(0,r,0);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);inst.setColorAt(i,new T.Color().setRGB(.8+random()*.2,.85+random()*.15,.7+random()*.2));});
        inst.receiveShadow=true;inst.castShadow=false;inst.computeBoundingSphere();scene.add(inst);grassChunks.push(inst);
      }
      o.geometry.dispose();
    });
    invalidate();
  });
  const plantingLayout=(file:string)=>fetch(`/assets/priorita/production-v4/${file}.json`).then(r=>{if(!r.ok)throw new Error('planting layout');return r.json() as Promise<number[][]>;});
  Promise.all([plantingLayout('trees'),plantingLayout('gardens')]).then(([trees,gardens])=>{
    if(disposed)return;
    const positionsByKind:Record<string,number[][]>={
      tree:trees.filter(([x,z])=>!areas.some(a=>containsPoint([x,z],a.polygon))).map(([x,z,h,a])=>[x,z,h*.84,a]),
      shade:trees.filter(([x,z])=>areas.some(a=>containsPoint([x,z],a.polygon))).map(([x,z,h,a])=>[x,z,h*.9,a]),
      shrub0:gardens.filter((_,i)=>i%3===0).map(([x,z,h,a])=>[x,z,h*.78,a]),
      shrub1:gardens.filter((_,i)=>i%3!==0).map(([x,z,h,a])=>[x,z,h*.42,a]),
      bench:[[-48,-80,1,0],[-64,-47,1,0],[-40,-68,1,0],[-88,56,1,Math.PI/2],[-87,74,1,Math.PI/2]],
      lamp:lampPosts.map(([x,,z])=>[x,z,1,x<0?0:Math.PI]),
    };
    new GLTFLoader().setDRACOLoader(draco).load('/assets/priorita/production-v7/landscape.glb',gltf=>{
      if(disposed){disposeObject(gltf.scene);return;}
      gltf.scene.updateMatrixWorld(true);
      const materialCache=new Map<string,T.MeshStandardMaterial>();
      gltf.scene.traverse(o=>{
        if(!(o instanceof T.Mesh))return;
        const metadata=o.userData.plant_kind?o.userData:o.parent?.userData;
        const kind=metadata?.plant_kind as string,level=metadata?.detail_level as string;
        if(!kind||!level||!positionsByKind[kind])return;
        const geo=o.geometry.clone();geo.applyMatrix4(o.matrixWorld);
        const materials=(Array.isArray(o.material)?o.material:[o.material]).map(m=>{
          if(materialCache.has(m.uuid))return materialCache.get(m.uuid)!;
          const mat=m as T.MeshStandardMaterial;mat.side=T.DoubleSide;mat.envMapIntensity=.55;
          if(/folh|leaf|forra/i.test(mat.name)){
            mat.transparent=false;mat.alphaTest=0;mat.roughness=.86;mat.normalScale.set(.4,.4);
            mat.emissiveMap=mat.map;mat.emissive.set('#82956b');mat.emissiveIntensity=.13*sunlightAmount;foliageMaterials.push(mat);
          }
          if(mat.emissiveIntensity>0&&!/folh|leaf|forra/i.test(mat.name)){mat.emissiveIntensity=.2+(1-sunlightAmount)*2.1;fixtureMaterials.push(mat);}
          for(const value of Object.values(mat))if(value instanceof T.Texture)value.anisotropy=4;
          materialCache.set(m.uuid,mat);return mat;
        });
        const positions=positionsByKind[kind];
        const inst=new T.InstancedMesh(geo,Array.isArray(o.material)?materials:materials[0],positions.length);
        inst.count=0;inst.visible=false;inst.castShadow=kind!=='shrub1';inst.receiveShadow=true;inst.name=`v7 ${kind} · ${level}`;
        scene.add(inst);plantLevels.push({mesh:inst,kind,level,positions});
        if(!plantStates.has(kind))plantStates.set(kind,positions.map(()=>''));o.geometry.dispose();
      });
      host.dataset.landscape='Blender v7';vegetationDirty=true;renderer.shadowMap.needsUpdate=true;invalidate();
    },undefined,()=>events.onNotice('O paisagismo não terminou de carregar. Reabra a visita para tentar novamente.'));
  }).catch(()=>events.onNotice('Não foi possível carregar o paisagismo nesta conexão.'));
  for(let i=0;i<96;i++){
    const a=i*2.399963,r=190+random()*95,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.abs(x)<25&&z<-110)continue;treePositions.push([x,z,7+random()*5,random()*6.28]);
  }
  const canopy=canopy51(resource=>resource),canopyInstances:number[][]=[],stemInstances:number[][]=[];
  canopy.material.color.set('#829574');horizon(canopy.material);
  for(const [x,z,h,a] of treePositions){
    const y=terrainHeight(x,z);stemInstances.push([x,y+h*.25,z,.3,h*.5,.3]);
    for(let j=0;j<3;j++){const angle=j*2.399;canopyInstances.push([x+Math.cos(angle)*h*.18,y+h*(.6+j*.055),z+Math.sin(angle)*h*.18,h*.62,h*.64,h*.62,a+angle]);}
  }
  batch(canopy.geometry,canopy.material,canopyInstances,false);batch(new T.CylinderGeometry(.6,1,1,5),horizon(barkMat),stemInstances,false);
  function updateVegetation(){
    if(!vegetationDirty&&camera.position.distanceToSquared(vegetationViewer)<9)return;
    vegetationViewer.copy(camera.position);vegetationDirty=false;
    const near=lightQuality?22:42;
    const updated=new Set<string>();let changed=false;
    for(const {mesh:inst,kind,level,positions} of plantLevels){
      const states=plantStates.get(kind)!;
      if(!updated.has(kind)){
        positions.forEach(([x,z,h],i)=>{
          const distance=camera.position.distanceTo(new T.Vector3(x,terrainHeight(x,z)+h*.6,z)),old=states[i];
          states[i]=distance<near+(old==='near'?9:0)?'near':'far';
          if(states[i]!==old)changed=true;
        });updated.add(kind);
      }
      let count=0;
      positions.forEach(([x,z,h,a],i)=>{
        if(states[i]!==level)return;
        dummy.position.set(x,terrainHeight(x,z)+(['tree','shade'].includes(kind)?0:.06),z);dummy.scale.setScalar(h);dummy.rotation.set(0,a,0);dummy.updateMatrix();inst.setMatrixAt(count++,dummy.matrix);
      });
      inst.count=count;inst.visible=count>0;inst.instanceMatrix.needsUpdate=true;if(count)inst.computeBoundingSphere();
    }
    if(changed)renderer.shadowMap.needsUpdate=true;
  }

  // 1 m illustrative contours, computed from the exact displayed height field.
  const contourPoints:number[]=[];
  for(let level=-7;level<=7;level++)for(let x=-115;x<100;x+=3)for(let z=-135;z<135;z+=3){
    const corners=[[x,z],[x+3,z],[x+3,z+3],[x,z+3]],crossings:number[][]=[];
    for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4],ha=terrainHeight(...a as [number,number]),hb=terrainHeight(...b as [number,number]);if((ha<=level&&hb>level)||(hb<=level&&ha>level)){const t=(level-ha)/(hb-ha);crossings.push([T.MathUtils.lerp(a[0],b[0],t),level+.12,T.MathUtils.lerp(a[1],b[1],t)]);}}
    if(crossings.length===2)contourPoints.push(...crossings[0],...crossings[1]);
  }
  const contourGeo=new T.BufferGeometry();contourGeo.setAttribute('position',new T.Float32BufferAttribute(contourPoints,3));
  const contours=new T.LineSegments(contourGeo,new T.LineBasicMaterial({color:'#f8f2c8',transparent:true,opacity:.6}));contours.visible=false;scene.add(contours);

  function disposeObject(object:T.Object3D){
    object.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line||o instanceof T.Sprite){if('geometry' in o)o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];for(const mat of mats){for(const value of Object.values(mat))if(value instanceof T.Texture)value.dispose();mat.dispose();}}});
  }
  function updateLotColors(){
    solarGuide.selection(selected,selectedArea);
    for(const [id,overlay] of areaOverlays){overlay.visible=id===selectedArea;overlay.material.opacity=mode==='area'?.04:.16;}
    for(const lot of lots){
      const active=lot.id===selected,hot=lot.id===hovered,inBlock=lot.block===focusedBlock,compared=comparison.includes(lot.id),overlay=overlays.get(lot.id)!,border=borders.get(lot.id)!;
      const match=filtered?.has(lot.id)??true;
      overlay.visible=active||hot||(inBlock&&match)||compared||Boolean(filtered&&match)||(showStock&&match&&statuses.get(lot.id)!=='available');
      border.visible=active||hot||(inBlock&&match)||compared||Boolean(filtered&&match);
      overlay.material.color.set(statusInfo[statuses.get(lot.id)!].color);
      overlay.material.opacity=active?(mode==='lot'?.08:.26):hot?.32:filtered?(match?.22:.015):compared?.15:inBlock?.1:showStock?.13:0;
      border.material.color.set(active||hot||filtered&&match?statusInfo[statuses.get(lot.id)!].color:compared?'#f1cf84':'#d9dfb6');border.material.opacity=active||hot?1:.85;
    }
    invalidate();
  }
  function lighting(hour:number,date:string){
    solarGuide.update(hour,date,selected,selectedArea);
    const solar=solarPosition(hour,date),dir=new T.Vector3(...solar.direction);

    const daylight=T.MathUtils.smoothstep(solar.elevation,-7,15),gold=1-T.MathUtils.smoothstep(solar.elevation,2,32);
    sunlightAmount=daylight;for(const material of foliageMaterials)material.emissiveIntensity=.13*daylight;
    sunDirection.copy(dir);sun.position.copy(sun.target.position).addScaledVector(dir,420);sun.intensity=(2.9-gold*.5)*T.MathUtils.smoothstep(solar.elevation,-1,9);
    sun.color.set('#fff6e6').lerp(new T.Color('#ffd6a0'),gold*.65);
    hemi.intensity=.28+daylight*1.08;scene.environmentIntensity=.12+daylight*.34;
    const haze=new T.Color('#b5cbd0').lerp(new T.Color('#dcba93'),gold*.28).lerp(new T.Color('#33495b'),1-daylight);
    (scene.fog as T.Fog).color.copy(haze);horizonColor.value.copy(haze).convertLinearToSRGB();
    backdropMaterial.color.copy(haze);
    skyMaterial.uniforms.bottomColor.value.copy(haze);
    skyMaterial.uniforms.topColor.value.set('#3883b9').lerp(new T.Color('#527d9c'),gold*.3).lerp(new T.Color('#101e38'),1-daylight);
    skyMaterial.uniforms.sunDirection.value.copy(dir);skyMaterial.uniforms.sunColor.value.set('#fff1ce').lerp(new T.Color('#ffbb77'),gold);
    skyMaterial.uniforms.daylight.value=T.MathUtils.smoothstep(solar.elevation,-1,3);
    for(const mat of fixtureMaterials)mat.emissiveIntensity=.2+(1-daylight)*2.1;
    renderer.shadowMap.needsUpdate=true;invalidate();
  }
  function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();invalidate();}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);resize();
  if(camera.aspect<.85)camera.position.multiplyScalar(1.7);
  function stopWalk(){route=[];walkPicking=false;destination.visible=false;events.onWalkState('idle');invalidate();}
  function setMode(value:ViewMode){stopWalk();mode=value;controls.enabled=value==='aerial'||value==='plan';controls.enableRotate=value==='aerial';events.onMode(value);held.clear();updateLotColors();invalidate();}
  function fly(to:T.Vector3,target:T.Vector3,done?:()=>void){
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fromTarget=controls.enabled?controls.target.clone():camera.position.clone().add(camera.getWorldDirection(new T.Vector3()).multiplyScalar(10));
    transition={start:performance.now(),duration:reduced?1:1050,from:camera.position.clone(),to,fromTarget,toTarget:target,done};controls.enabled=false;held.clear();invalidate();
  }
  function syncLook(){const d=camera.getWorldDirection(new T.Vector3());yaw=Math.atan2(d.x,-d.z);pitch=Math.asin(d.y);}
  function focusPoints(points:number[][],flat=false){
    // Wait for the selected parcel's sheet to commit before measuring the free viewport.
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(disposed)return;
      const rect=host.getBoundingClientRect(),w=rect.width,h=rect.height;
      const safe={left:w<700?18:35,top:w<700?125:80,right:w-35,bottom:h-120};
      const ui=host.parentElement!;
      for(const el of ui.querySelectorAll<HTMLElement>('.pr-search-pill,.pr-lot-list,.pr-detail')){
        const box=el.getBoundingClientRect();
        if(w<700){if(el.matches('.pr-detail,.pr-lot-list'))safe.bottom=Math.min(safe.bottom,box.top-rect.top-18);}
        else if(el.matches('.pr-search-pill'))continue;
        else safe.right=Math.min(safe.right,box.left-rect.left-20);
      }
      const bounds=new T.Box3().setFromPoints(points.map(([x,z])=>new T.Vector3(x,terrainHeight(x,z),z)));
      const frame=frameBounds(bounds,camera.aspect,camera.fov,{width:w,height:h},safe,flat);
      fly(frame.position,frame.target,()=>{controls.enabled=true;controls.target.copy(frame.target);controls.update();});
    }));
  }
  function focusBlock(block:string){
    selectedArea='';events.onArea('');focusedBlock=block==='Todas'?'':block;selected='';events.onSelect('');setMode('aerial');
    if(!focusedBlock){overview();return;}
    focusPoints(lots.filter(l=>l.block===block).flatMap(l=>l.polygon));updateLotColors();
  }
  function overview(flat=false){
    selectedArea='';events.onArea('');focusedBlock='';selected='';events.onSelect('');events.onBlock('Todas');setMode(flat?'plan':'aerial');
    focusPoints(lots.flatMap(l=>l.polygon),flat);
  }
  function select(id:string,focus=false){
    if(id&&!lotById.has(id))return;selectedArea='';events.onArea('');selected=id;if(id)focusedBlock='';updateLotColors();
    if(focus&&id){
      const lot=lotById.get(id)!;setMode('aerial');focusPoints(lot.polygon);
    }
  }
  function selectArea(id:string,focus=false){
    const area=areaById.get(id);if(id&&!area)return;
    selectedArea=id;selected='';focusedBlock='';events.onSelect('');events.onArea(id);setMode('aerial');
    if(focus&&area)focusPoints(area.polygon);updateLotColors();
  }
  function enterArea(id:string){
    const area=areaById.get(id);if(!area)return;selectArea(id);setMode('area');
    const [x,z]=area.center,eye=new T.Vector3(x,terrainHeight(x,z)+1.68,z);
    fly(eye,new T.Vector3(1.3,terrainHeight(1.3,z)+1.68,z),()=>{controls.enabled=false;syncLook();renderer.domElement.focus({preventScroll:true});});
  }
  function enterLot(id:string){
    const lot=lotById.get(id);if(!lot)return;
    select(id);setMode('lot');const [x,z]=lot.center,y=terrainHeight(x,z)+1.68;
    const eye=new T.Vector3(x,y,z),target=eye.clone().add(new T.Vector3(lot.frontAxis[0]*12,-.2,lot.frontAxis[1]*12));
    fly(eye,target,()=>{controls.enabled=false;syncLook();renderer.domElement.focus({preventScroll:true});});
  }
  function walk(x=1.3,z=112){
    if(!canWalk(x,z))return;
    selected='';selectedArea='';focusedBlock='';events.onSelect('');events.onArea('');setMode('walk');
    const eye=new T.Vector3(x,terrainHeight(x,z)+1.68,z);
    fly(eye,new T.Vector3(x,terrainHeight(x,z-15)+1.68,z-15),()=>{controls.enabled=false;syncLook();renderer.domElement.focus({preventScroll:true});});
  }
  function chooseWalkStart(){
    if(mode!=='aerial'&&mode!=='plan')overview();
    selected='';selectedArea='';events.onSelect('');events.onArea('');updateLotColors();
    walkPicking=true;events.onWalkState('choosing');invalidate();
  }
  function walkTo(point:T.Vector3){
    const next=navigator.route([camera.position.x,camera.position.z],[point.x,point.z]);
    if(!next.length){events.onNotice('Escolha outro ponto da rua para continuar o passeio.');return;}
    route=next;destination.position.set(point.x,terrainHeight(point.x,point.z)+.12,point.z);destination.visible=true;held.clear();events.onWalkState('moving');invalidate();
  }
  function hit(e:PointerEvent){const box=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-box.left)/box.width*2-1,-(e.clientY-box.top)/box.height*2+1);camera.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(pickables,false)[0];}
  function down(e:PointerEvent){if(e.button!==0)return;drag.active=true;drag.id=e.pointerId;drag.x=drag.lastX=e.clientX;drag.y=drag.lastY=e.clientY;drag.moved=false;if(mode==='lot'||mode==='area'||mode==='walk')renderer.domElement.setPointerCapture(e.pointerId);}
  function move(e:PointerEvent){
    if(drag.active&&e.pointerId===drag.id){
      if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6)drag.moved=true;
      if(!transition&&(mode==='lot'||mode==='area'||mode==='walk')){yaw-=(e.clientX-drag.lastX)*.004;pitch=T.MathUtils.clamp(pitch-(e.clientY-drag.lastY)*.003,-1.15,1.15);invalidate();}
      drag.lastX=e.clientX;drag.lastY=e.clientY;
    }else if(mode!=='lot'&&mode!=='area'&&e.pointerType==='mouse'){
      const found=hit(e),data=found?.object.userData;roadPreview=Boolean(found&&data?.road&&(mode==='walk'||walkPicking));if(roadPreview){hoverRoad.copy(found!.point);invalidate();}else if(!walkTarget.hidden){walkTarget.hidden=true;invalidate();}
      const id=(data?.lot as string)||'';
      renderer.domElement.style.cursor=data?.road?'crosshair':data?.area||id?'pointer':'grab';
      if(id!==hovered){hovered=id;updateLotColors();}
    }
  }
  function up(e:PointerEvent){
    if(drag.active&&drag.id===e.pointerId&&!drag.moved&&!transition){
      const found=hit(e),data=found?.object.userData;
      if(found&&data?.road){if(mode==='walk')walkTo(found.point);else if(mode==='aerial'||mode==='plan')walk(found.point.x,found.point.z);}
      else if(walkPicking)events.onNotice('Clique sobre uma rua para escolher o início do passeio.');
      else if(mode==='aerial'||mode==='plan'){if(data?.lot){select(data.lot,true);events.onSelect(data.lot);}else if(data?.area)selectArea(data.area,true);}
    }
    if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);drag.active=false;
  }
  function keydown(e:KeyboardEvent){
    if((e.target as HTMLElement).closest('input,select,textarea,button,a,dialog'))return;
    if(e.key==='Escape'){if(route.length||walkPicking){stopWalk();return;}if(mode==='lot'||mode==='area'||mode==='walk'){overview();return;}}
    if((mode==='aerial'||mode==='plan')&&['arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())&&(e.target===renderer.domElement||e.target===document.body)){pan(e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0,e.key==='ArrowUp'?1:e.key==='ArrowDown'?-1:0);e.preventDefault();}
    if(mode==='walk'&&['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())){if(route.length)stopWalk();held.add(e.key.toLowerCase());e.preventDefault();}
  }
  const keyup=(e:KeyboardEvent)=>held.delete(e.key.toLowerCase());
  const blur=()=>{held.clear();drag.active=false;if(route.length)stopWalk();};
  const visibility=()=>{blur();if(!document.hidden)invalidate();};
  const contextLost=(e:Event)=>{e.preventDefault();events.onError('A visita 3D foi interrompida.');};
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',blur);
  renderer.domElement.addEventListener('webglcontextlost',contextLost);window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
  function animate(now:number){
    if(disposed)return;raf=requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;if(document.hidden||paused)return;
    if(transition){
      const t=Math.min(1,(now-transition.start)/transition.duration),smooth=t*t*(3-2*t);
      camera.position.lerpVectors(transition.from,transition.to,smooth);const target=new T.Vector3().lerpVectors(transition.fromTarget,transition.toTarget,smooth);camera.lookAt(target);controls.target.copy(target);dirty=true;
      if(t===1){const done=transition.done;transition=undefined;done?.();}
    }else if(mode==='lot'||mode==='area'||mode==='walk'){
      if(mode==='walk'&&route.length){
        let travel=dt*walkSpeed;
        while(route.length&&travel>0){
          const [x,z]=route[0],dx=x-camera.position.x,dz=z-camera.position.z,distance=Math.hypot(dx,dz),step=Math.min(distance,travel);
          if(distance>.001){camera.position.x+=dx/distance*step;camera.position.z+=dz/distance*step;if(!drag.active){const heading=Math.atan2(dx,-dz),delta=Math.atan2(Math.sin(heading-yaw),Math.cos(heading-yaw));yaw+=delta*Math.min(1,dt*5);}}
          travel-=step;if(distance<=step+.001)route.shift();else break;
        }
        camera.position.y=terrainHeight(camera.position.x,camera.position.z)+1.68;dirty=true;if(!route.length)stopWalk();
      }
      if(mode==='walk'&&held.size){
        const forward=Number(held.has('w')||held.has('arrowup'))-Number(held.has('s')||held.has('arrowdown'));
        const side=Number(held.has('d')||held.has('arrowright'))-Number(held.has('a')||held.has('arrowleft'));
        const norm=Math.hypot(forward,side)||1,speed=dt*walkSpeed/norm;
        const dx=(Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,dz=(-Math.cos(yaw)*forward+Math.sin(yaw)*side)*speed;
        if(canWalk(camera.position.x+dx,camera.position.z+dz)){camera.position.x+=dx;camera.position.z+=dz;}
        else if(canWalk(camera.position.x+dx,camera.position.z))camera.position.x+=dx;
        else if(canWalk(camera.position.x,camera.position.z+dz))camera.position.z+=dz;
        camera.position.y=terrainHeight(camera.position.x,camera.position.z)+1.68;dirty=true;
      }
      if(dirty)camera.lookAt(camera.position.clone().add(new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch))));
    }else controls.update();
    if(dirty&&now-frameTime>30){
      const nearView=(mode==='lot'||mode==='area'||mode==='walk')&&camera.position.y<30,span=nearView?70:210;
      const focus=nearView?new T.Vector3(camera.position.x,0,camera.position.z):new T.Vector3();
      if(span!==shadowSpan||focus.distanceTo(shadowFocus)>7){
        shadowSpan=span;shadowFocus.copy(focus);sun.target.position.copy(focus);sun.position.copy(focus).addScaledVector(sunDirection,420);
        Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span});sun.shadow.camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;
      }
      updateVegetation();
      parcelOutlines.visible=(mode==='aerial'||mode==='plan')&&camera.position.y>35;
      for(const chunk of grassChunks){grassViewer.copy(chunk.boundingSphere!.center);chunk.visible=!lightQuality&&camera.position.distanceTo(grassViewer)<62;}
      camera.updateMatrixWorld();annotations.update(camera,mode,selected,focusedBlock,showLabels,selectedArea,filtered);solarGuide.project(camera);
      walkTarget.hidden=true;
      if(mode==='walk'&&(roadPreview||route.length)||walkPicking&&roadPreview){
        targetProjection.copy(route.length?destination.position:hoverRoad).project(camera);
        const x=(targetProjection.x+1)*host.clientWidth/2,y=(1-targetProjection.y)*host.clientHeight/2;
        if(targetProjection.z>-1&&targetProjection.z<1&&x>40&&x<host.clientWidth-40&&y>30&&y<host.clientHeight-110){walkTarget.hidden=false;walkTarget.style.left=`${x}px`;walkTarget.style.top=`${y-9}px`;walkTarget.querySelector('span')!.textContent=route.length?'Indo até aqui':'Ir até aqui';}
      }
      const north=host.parentElement!.querySelector<HTMLElement>('.pr-north svg');
      if(north){const origin=new T.Vector3().copy(controls.target).project(camera),n=new T.Vector3(controls.target.x+plan.northVector[0]*10,controls.target.y,controls.target.z+plan.northVector[1]*10).project(camera);north.style.transform=`rotate(${Math.atan2(n.x-origin.x,n.y-origin.y)*180/Math.PI-45}deg)`;}
      renderer.render(scene,camera);
      if(import.meta.env.DEV)host.dataset.renderStats=JSON.stringify({mode,block:focusedBlock,selected,selectedArea,walking:route.length>0,walkSpeed,position:camera.position.toArray().map(v=>+v.toFixed(3)),target:controls.target.toArray(),triangles:renderer.info.render.triangles,calls:renderer.info.render.calls,geometries:renderer.info.memory.geometries,quality:lightQuality?'light':'balanced',plants:plantLevels.filter(p=>p.mesh.visible).map(p=>[p.kind,p.level,p.mesh.count])});
      dirty=false;frameTime=now;
    }
  }
  lighting(15.5,'2026-11-12');controls.update();renderer.render(scene,camera);raf=requestAnimationFrame(animate);
  function pan(horizontal:number,vertical:number){
    if(!controls.enabled||transition)return;
    const right=new T.Vector3().setFromMatrixColumn(camera.matrix,0);right.y=0;right.normalize();
    const forward=new T.Vector3().crossVectors(new T.Vector3(0,1,0),right).normalize();
    const step=T.MathUtils.clamp(camera.position.distanceTo(controls.target)*.065,3,24);
    const offset=right.multiplyScalar(horizontal*step).addScaledVector(forward,vertical*step);
    const next=controls.target.clone().add(offset);next.x=T.MathUtils.clamp(next.x,-160,160);next.z=T.MathUtils.clamp(next.z,-185,185);
    offset.copy(next).sub(controls.target);camera.position.add(offset);controls.target.copy(next);controls.update();invalidate();
  }
  return {
    select,selectArea,enterArea,enterLot,walk,chooseWalkStart,stopWalk,overview,lighting,focusBlock,pan,refresh:invalidate,
    setPaused(value:boolean){paused=value;if(!value)invalidate();},
    setFilter(ids:string[]|null){filtered=ids?new Set(ids):null;updateLotColors();},
    focusLots(ids:string[]){const flat=mode==='plan';selected='';events.onSelect('');selectedArea='';events.onArea('');setMode(flat?'plan':'aerial');if(ids.length)focusPoints(ids.flatMap(id=>lotById.get(id)?.polygon||[]),flat);updateLotColors();},
    setSolarTrajectory(show:boolean){solarGuide.show(show);invalidate();},
    setComparison(ids:string[]){comparison=ids.filter(id=>lotById.has(id));updateLotColors();},
    focusComparison(ids:string[]){setMode('aerial');focusedBlock='';comparison=ids.filter(id=>lotById.has(id));focusPoints(comparison.flatMap(id=>lotById.get(id)!.polygon));updateLotColors();},
    setWalkSpeed(value:number){walkSpeed=T.MathUtils.clamp(value,3,14);},
    setStatus(id:string,status:LotStatus){if(statuses.has(id)){statuses.set(id,status);updateLotColors();}},
    setStock(show:boolean){showStock=show;updateLotColors();},
    setLabels(show:boolean){showLabels=show;invalidate();},
    setContours(show:boolean){contours.visible=show;invalidate();},
    setQuality(light:boolean){lightQuality=light;vegetationDirty=true;renderer.setPixelRatio(light?1:Math.min(devicePixelRatio,1.5));sun.shadow.mapSize.setScalar(light?1024:2048);sun.shadow.map?.dispose();sun.shadow.map=null;renderer.shadowMap.needsUpdate=true;resize();},
    hold(key:string,value:boolean){if(value&&mode==='walk'){if(route.length)stopWalk();held.add(key);}else held.delete(key);},
    zoom(direction:number){if(!controls.enabled)return;camera.position.sub(controls.target).multiplyScalar(direction>0?.8:1.25).add(controls.target);controls.update();invalidate();},
    screenshot(){
      camera.updateMatrixWorld();annotations.update(camera,mode,selected,focusedBlock,showLabels,selectedArea,filtered);renderer.render(scene,camera);
      const output=document.createElement('canvas');output.width=renderer.domElement.width;output.height=renderer.domElement.height;
      const context=output.getContext('2d')!;context.drawImage(renderer.domElement,0,0);context.scale(output.width/host.clientWidth,output.height/host.clientHeight);annotations.draw(context);
      return output.toDataURL('image/png');
    },
    dispose(){disposed=true;cancelAnimationFrame(raf);resizeObserver.disconnect();uiObserver.disconnect();annotations.dispose();solarGuide.dispose();walkTarget.remove();controls.dispose();window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',blur);renderer.domElement.removeEventListener('webglcontextlost',contextLost);disposeObject(scene);pickables.forEach(m=>m.geometry.dispose());grassMat.dispose();textures.forEach(t=>t.dispose());environment?.dispose();pmrem.dispose();draco.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();},
  };
}
export type PrioritaScene=ReturnType<typeof createPrioritaScene>;
