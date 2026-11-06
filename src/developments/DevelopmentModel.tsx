import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { floorStatus } from './moradas-stock';
import { floorColors } from './moradas-floor-geometry';
import type { GalleryId, Lighting, TowerId } from './moradas';

export interface ModelControls { zoom: (direction: number) => void; reset: () => void }
interface Props { showFloor:boolean; tower: TowerId; floor: number; lighting: Lighting; onSelectFloor: (floor: number, tower: TowerId) => void; onArea: (area: GalleryId) => void; onReady: () => void; onFail: () => void }

// Deliberately a reference-based massing study, not a surveyed/BIM representation.
const DevelopmentModel = forwardRef<ModelControls, Props>(function DevelopmentModel(props, ref) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const api = useRef<ModelControls & { update: () => void } | null>(null);
  useImperativeHandle(ref, () => ({ zoom: value => api.current?.zoom(value), reset: () => api.current?.reset() }), []);
  useEffect(() => { api.current?.update(); }, [props.floor, props.tower, props.lighting, props.showFloor]);
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    async function setup() {
      const THREE = await import('three');
      const [{OrbitControls},{GLTFLoader},{RoomEnvironment}]=await Promise.all([import('three/addons/controls/OrbitControls.js'),import('three/addons/loaders/GLTFLoader.js'),import('three/addons/environments/RoomEnvironment.js')]);
      const kit=await new GLTFLoader().loadAsync('/assets/developments/moradas-da-serra/detail-kit/moradas-detail-kit.glb').catch(()=>null);
      const disposeKit=()=>kit?.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});
      if (cancelled || !host.current) {disposeKit();return;}
      const mount = host.current;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, .1, 600);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.22;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const canvas = renderer.domElement;
      canvas.tabIndex = 0;
      canvas.setAttribute('aria-label', 'Maquete 3D do Moradas da Serra. Arraste para girar; use setas para girar, mais e menos para zoom, Home para restaurar. A seleção de andares também está disponível no painel.');
      canvas.setAttribute('role', 'img');
      mount.appendChild(canvas);
      const controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = .12;
      controls.enablePan = false;
      controls.minDistance = 27;
      controls.maxDistance = 125;
      controls.minPolarAngle = .28;
      controls.maxPolarAngle = Math.PI / 2 - .04;
      controls.rotateSpeed = .48;
      controls.zoomSpeed = .6;
      const home = new THREE.Vector3(52, 37, 74);
      const homeTarget = new THREE.Vector3(0, 12, 0);
      camera.position.copy(home); controls.target.copy(homeTarget); controls.update();
      const resources = new Set<{ dispose: () => void }>();
      const own = <T extends { dispose: () => void }>(resource: T) => { resources.add(resource); return resource; };
      const pmrem=new THREE.PMREMGenerator(renderer);const studio=new RoomEnvironment();const environment=own(pmrem.fromScene(studio,.04));studio.dispose();pmrem.dispose();scene.environment=environment.texture;scene.environmentIntensity=.45;
      const block=kit?.scene.getObjectByName('ArchitecturalBlock') as import('three').Mesh|undefined;
      const landscapeTree=kit?.scene.getObjectByName('LandscapeTree');
      kit?.scene.traverse(o=>{if(o instanceof THREE.Mesh){own(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){own(m);m.side=THREE.DoubleSide;if(m instanceof THREE.MeshStandardMaterial&&m.name.startsWith('Leaf')){m.color.multiplyScalar(.78);m.roughness=.9;}}}});
      mount.dataset.detailKit=kit?'blender-5.2':'fallback';
      const material = (color: string, roughness = .8) => own(new THREE.MeshStandardMaterial({ color, roughness }));
      const ivory = material('#e8e6df'), side = material('#d9d9d0'), charcoal = material('#51565a');
      const timber = material('#7a5b40'), stone = material('#b0aca0'), paving = material('#c1bfb3');
      const metal = material('#414b49', .45), glass = material('#5f7e86', .18), frameMat = material('#f6f5ec');
      const trunk = material('#74614b'), leaves = material('#526b42'), lawn = material('#738065');
      const white = material('#f5f0e4'), asphalt = material('#747a77');
      const warmGlass = own(new THREE.MeshStandardMaterial({ color: '#ddd4a2', emissive: '#ffbd68', emissiveIntensity: .25, roughness: .32 }));
      const commonGlass = own(new THREE.MeshStandardMaterial({ color: '#dbc89e', emissive: '#ffd08a', emissiveIntensity: 0, roughness: .3 }));
      const fixture = own(new THREE.MeshStandardMaterial({ color: '#fff0ca', emissive: '#ffd48b', emissiveIntensity: 0 }));
      const nightLights: import('three').PointLight[] = [];
      const water = own(new THREE.MeshStandardMaterial({ color: '#609fa5', metalness: .18, roughness: .2 }));
      const surfaceCanvas=document.createElement('canvas');surfaceCanvas.width=surfaceCanvas.height=128;const surfaceContext=surfaceCanvas.getContext('2d')!;const pixels=surfaceContext.createImageData(128,128);
      for(let i=0;i<pixels.data.length;i+=4){const v=190+((i*137+Math.floor(i/512)*73)%51);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;}surfaceContext.putImageData(pixels,0,0);
      const grain=own(new THREE.CanvasTexture(surfaceCanvas));grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(12,12);
      for(const surface of [ivory,side,stone,paving]){surface.bumpMap=grain;surface.bumpScale=.018;surface.roughnessMap=grain;}
      glass.metalness=.35;glass.roughness=.14;glass.envMapIntensity=1.1;warmGlass.metalness=.2;warmGlass.roughness=.22;
      const boxGeo = block?.geometry || own(new THREE.BoxGeometry(1, 1, 1));
      const leafGeo = own(new THREE.IcosahedronGeometry(1, 2));
      const trunkGeo = own(new THREE.CylinderGeometry(.16, .24, 1, 6));
      const hitTargets: import('three').Object3D[] = [];
      function box(parent: import('three').Object3D, x: number, y: number, z: number, w: number, h: number, d: number, mat: import('three').Material, shadow = false) {
        const mesh = new THREE.Mesh(boxGeo, mat); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); mesh.castShadow = shadow; mesh.receiveShadow = true; parent.add(mesh); return mesh;
      }
      function tree(x: number, z: number, scale = 1) {
        if(landscapeTree){const specimen=landscapeTree.clone(true);specimen.position.set(x,0,z);specimen.scale.setScalar(scale);specimen.rotation.y=(x+z)*.27;specimen.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(specimen);return;}
        const stem = new THREE.Mesh(trunkGeo, trunk); stem.position.set(x, 1.7 * scale, z); stem.scale.set(scale, 3.4 * scale, scale); stem.castShadow = true; scene.add(stem);
        for (let j = 0; j < 3; j++) { const crown = new THREE.Mesh(leafGeo, leaves); crown.position.set(x + Math.sin(j * 2.2) * .65 * scale, (3.4 + j * .38) * scale, z + Math.cos(j * 2.2) * .65 * scale); crown.scale.set(1.7 * scale, 1.55 * scale, 1.5 * scale); crown.castShadow = true; scene.add(crown); }
      }
      box(scene, 0, -.35, 0, 69, .6, 64, paving);
      box(scene, 0, -.7, 0, 500, .5, 500, lawn);
      box(scene, 0, -.05, 36, 130, .08, 8, asphalt);
      for (let x = -56; x < 60; x += 8) box(scene, x, .01, 36, 3.5, .03, .12, white);
      for (const x of [-33.5, 33.5]) box(scene, x, .6, 0, .3, 1.4, 61, stone, true);
      box(scene, 0, .6, -31, 67, 1.4, .3, stone, true);
      box(scene, -21, .6, 31, 25, 1.4, .3, stone, true); box(scene, 24, .6, 31, 19, 1.4, .3, stone, true);
      for (let x = -8; x < 14; x += .43) box(scene, x, 1.15, 31, .06, 2.3, .06, metal);
      box(scene, 3, 2.3, 31, 22, .08, .1, metal);
      for (let x = -28; x <= 29; x += 9) { tree(x, 29, .85); tree(x, -27, 1.1); }
      for (let z = -18; z < 25; z += 9) { tree(-30, z); tree(31, z); }

      // Garden islands, stone edging and paving joints give the arrival scale.
      const garden=material('#5e704d'), hedge=material('#435d39');
      for(const [x,z,w,d] of [[-28,0,5,49],[29,-12,5,27],[0,-27,49,5],[-12,-10,16,14],[8,0,16,14]] as number[][]){
        box(scene,x,-.01,z,w,.18,d,stone);
        box(scene,x,.09,z,w-.3,.06,d-.3,garden);
      }
      const shrubGeo=own(new THREE.IcosahedronGeometry(1,1));
      for(let i=0;i<42;i++){
        const x=i<21?-28:30,z=-23+(i%21)*2.35;
        const shrub=new THREE.Mesh(shrubGeo,hedge);shrub.position.set(x,.45,z);shrub.scale.set(.7,.48,.8);shrub.rotation.y=i*1.31;shrub.castShadow=true;scene.add(shrub);
      }
      const jointPoints:number[]=[];
      for(let x=-33;x<=33;x+=2.2)jointPoints.push(x,-.027,-30,x,-.027,31);
      for(let z=-30;z<=31;z+=2.2)jointPoints.push(-33,-.027,z,33,-.027,z);
      const jointGeometry=own(new THREE.BufferGeometry());jointGeometry.setAttribute('position',new THREE.Float32BufferAttribute(jointPoints,3));
      scene.add(new THREE.LineSegments(jointGeometry,own(new THREE.LineBasicMaterial({color:'#918f83',transparent:true,opacity:.24}))));
      for(const x of [-27,-4]){
        for(let slat=0;slat<5;slat++)box(scene,x,.55,27+slat*.16,2.6,.09,.12,timber,true);
        for(const dx of [-1,1])box(scene,x+dx,.27,27.32,.10,.5,.8,metal,true);
      }
      const towerCenters = { a: new THREE.Vector3(-12, 0, -10), b: new THREE.Vector3(8, 0, 0) };
      function windowAt(parent: import('three').Object3D, x: number, y: number, z: number, rotate: number, index: number, wide = 1.4) {
        const window = new THREE.Group(); window.position.set(x, y, z); window.rotation.y = rotate; parent.add(window);
        box(window, 0, 0, 0, wide + .14, 1.4, .12, frameMat);
        box(window, 0, 0, .07, wide, 1.25, .045, index % 4 !== 0 ? warmGlass : glass);
        box(window, 0, 0, .11, .045, 1.27, .035, frameMat);
        for(const sx of [-1,1])box(window,sx*(wide/2+.04),0,.12,.065,1.45,.12,frameMat,true);
        for(const sy of [-1,1])box(window,0,sy*.7,.12,wide+.15,.06,.12,frameMat,true);
        box(window,0,-.15,.10,wide,.035,.045,metal);
        box(window, 0, -.73, .1, wide + .22, .07, .32, frameMat, true);
      }
      function tower(id: TowerId) {
        const root = new THREE.Group(); root.position.copy(towerCenters[id]); scene.add(root);
        const podium = 3.4, story = 2.85;
        for (const x of [-5, 0, 5]) for (const z of [-4, 4]) box(root, x, podium / 2, z, .45, podium, .45, ivory, true);
        box(root, 0, podium / 2, -1, 2.8, podium, 3.2, timber, true);
        for (let f = 1; f <= (id === 'a' ? 8 : 9); f++) {
          const y = podium + (f - .5) * story;
          const level = new THREE.Group(); level.userData = { tower: id, floor: f }; root.add(level);
          box(level, 0, y, 0, 11.8, story, 9.8, side, true);
          box(level, -3.7, y, 5.15, 4.2, story, .65, ivory, true);
          box(level, 3.7, y, 5.15, 4.2, story, .65, ivory, true);
          box(level, 0, y, 4.99, 3.2, story, .3, charcoal, true);
          box(level, 0, y - .97, 5.2, 3.15, .64, .24, timber, true);
          windowAt(level, -3.7, y + .1, 5.51, 0, f); windowAt(level, 3.7, y + .1, 5.51, 0, f + 1);
          windowAt(level, 0, y + .32, 5.19, 0, f + 2, .87);
          box(level, -3.7, y - story / 2 + .02, 5.49, 4.2, .025, .035, stone);
          box(level, 3.7, y - story / 2 + .02, 5.49, 4.2, .025, .035, stone);
          for (const x of [-3.8, 3.8]) windowAt(level, x, y, -4.98, Math.PI, f);
          windowAt(level, -6, y, 1.8, -Math.PI / 2, f);
          windowAt(level, -6, y, -2.5, -Math.PI / 2, f + 2);
          windowAt(level, 6, y, -2.8, Math.PI / 2, f + 3);
          // Recessed side balcony and its solid charcoal parapet.
          box(level, 6.55, y - 1.29, 1.3, 1.6, .18, 3.7, ivory, true);
          box(level, 7.3, y - .8, 1.3, .15, .96, 3.7, charcoal, true);
          box(level, 6.55, y - .8, 3.15, 1.6, .96, .15, charcoal, true);
          windowAt(level, 6.02, y + .1, 1.3, Math.PI / 2, f, 2.25);
          box(level,7.32,y-.25,1.3,.06,.055,3.75,metal,true);
          for(let rail=-.45;rail<3.1;rail+=.45)box(level,7.32,y-.55,rail,.035,.6,.035,metal);
          box(level,0,y-story/2+.02,-4.92,11.8,.045,.04,stone);
          hitTargets.push(...level.children);
          level.children.forEach(child => { child.userData = { tower: id, floor: f }; });
        }
        const roof = podium + (id === 'a' ? 8 : 9) * story;
        box(root, 0, roof + .16, 0, 12.6, .35, 10.5, ivory, true);
        box(root, 0, roof + 1.8, -.8, 5.6, 3.3, 5.5, charcoal, true);
        const labelCanvas = document.createElement('canvas'); labelCanvas.width = 256; labelCanvas.height = 128;
        const context = labelCanvas.getContext('2d')!; context.fillStyle = '#50565a'; context.fillRect(0, 0, 256, 128); context.fillStyle = '#f7f2de'; context.textAlign = 'center'; context.font = '36px Arial'; context.fillText('DeVille', 128, 76);
        const logoMap = own(new THREE.CanvasTexture(labelCanvas)); logoMap.colorSpace = THREE.SRGBColorSpace;
        const logoMat = own(new THREE.MeshStandardMaterial({ map: logoMap, roughness: .9 }));
        box(root, 0, roof + 1.7, 1.96, 3.4, 1.7, .015, logoMat);
      }
      tower('a'); tower('b');
      // Court, leisure pavilion and arrival are separate clickable places.
      const turf = material('#46764d');
      const court = box(scene, -16, .03, 16, 15, .08, 17, turf); court.userData.area = 'court'; hitTargets.push(court);
      for (const x of [-23.3, -8.7]) box(scene, x, .09, 16, .09, .025, 16.4, white);
      for (const z of [7.8, 16, 24.2]) box(scene, -16, .09, z, 14.6, .025, .09, white);
      const circle = own(new THREE.RingGeometry(2.3, 2.37, 48)); const pitchRing = new THREE.Mesh(circle, white); pitchRing.rotation.x = -Math.PI / 2; pitchRing.position.set(-16, .11, 16); scene.add(pitchRing);
      for (const z of [8, 24]) { box(scene, -16, 1.7, z, 4.5, .1, .1, white); for (const x of [-18.2, -13.8]) box(scene, x, .85, z, .1, 1.7, .1, white); }
      for (let z = 7.5; z < 26; z += 3.5) { box(scene, -24, 1.8, z, .06, 3.6, .06, metal); box(scene, -8, 1.8, z, .06, 3.6, .06, metal); }
      for (const y of [1, 2, 3.5]) { box(scene, -24, y, 16, .03, .035, 18, metal); box(scene, -8, y, 16, .03, .035, 18, metal); }
      box(scene, 23, .05, 18, 16, .1, 19, stone);
      box(scene, 23, .2, 20, 10, .38, 7, ivory);
      const pool = box(scene, 23, .41, 20, 9.5, .02, 6.5, water); pool.userData.area = 'leisure'; hitTargets.push(pool);
      box(scene, 24, 1.6, 10, 12, 3.1, 4.5, timber, true);
      box(scene, 24, 3.3, 10.5, 14, .4, 7.5, ivory, true);
      for (const x of [19, 23, 27]) box(scene, x, 1.65, 12.3, 3.5, 2.65, .06, commonGlass);
      for (const x of [17.2, 30.8]) box(scene, x, 1.5, 13.5, .3, 3, .3, stone, true);
      for (const x of [17.7, 28.8]) for (const z of [18, 22]) box(scene, x, .45, z, 1.3, .35, 2.4, timber, true);
      const entrance = box(scene, 8, 1.6, 27, 10, 3.2, 4, ivory, true); entrance.userData.area = 'entrance'; hitTargets.push(entrance);
      box(scene, 8, 3.3, 27, 11.5, .35, 5.2, ivory, true); box(scene, 8, 1.7, 29.02, 5.5, 2.4, .06, commonGlass);
      // Emissive fixtures and a bounded set of local lights illuminate actual
      // surfaces without expensive per-light shadow maps on mobile devices.
      for (const [x, y, z] of [[8, 2.8, 30], [24, 2.8, 14], [-23, 3.8, 16], [-8, 3.8, 24], [8, 2.8, 6], [-12, 2.8, -4]]) {
        box(scene, x, y, z, .4, .12, .4, fixture);
        const light = new THREE.PointLight('#ffd28a', 0, 17, 2);
        light.position.set(x, y - .25, z); scene.add(light); nightLights.push(light);
      }
      for (let x = -27; x <= 30; x += 9) {
        box(scene, x, .5, 28, .18, 1, .18, metal);
        box(scene, x, 1.04, 28, .23, .14, .23, fixture);
      }
      for (const center of Object.values(towerCenters)) {
        box(scene, center.x, 2.8, center.z + 1, 2.5, .08, 3.1, fixture);
      }
      // Context is a subdued schematic neighborhood, not a geographic survey.
      for (let i = 0; i < 36; i++) {
        const angle = i * 2.399, radius = 62 + (i % 4) * 13;
        const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
        const h = 3 + (i % 3) * 1.3;
        box(scene, x, h / 2, z, 6 + i % 4, h, 7, i % 2 ? stone : ivory);
        box(scene, x, h + .2, z, 6.5 + i % 4, .4, 7.6, timber);
        if (i % 2) tree(x + 6, z + 5, 1.3);
      }
      for (let z = -22; z <= 7; z += 4) {
        box(scene, 23, .01, z, 8, .06, 3.4, asphalt);
        const carMat = z % 3 ? ivory : charcoal;
        box(scene, 23, .65, z, 2.1, .9, 3.5, carMat, true); box(scene, 23, 1.24, z + .1, 1.85, .55, 1.7, glass, true);
      }
      const ambient = new THREE.HemisphereLight('#fff4db', '#a1ac93', 2.5); scene.add(ambient);
      const sun = new THREE.DirectionalLight('#ffe3af', 3.1); sun.position.set(-28, 46, 24); sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -52; sun.shadow.camera.right = 52; sun.shadow.camera.top = 52; sun.shadow.camera.bottom = -52; sun.shadow.camera.near = .5; sun.shadow.camera.far = 130; sun.shadow.bias = -.0002; sun.shadow.normalBias = .02; sun.shadow.radius=3; scene.add(sun);
      const fill = new THREE.DirectionalLight('#bed1df', .8); fill.position.set(35, 28, -30); scene.add(fill);
      const highlightMat = own(new THREE.MeshBasicMaterial({ color: '#edc76e', transparent: true, opacity: .16, depthWrite: false }));
      // Trace the real model footprint, including the recessed front and balcony.
      const footprint = [[-5.92, -4.92], [5.92, -4.92], [5.92, -.57], [7.4, -.57], [7.4, 3.25], [5.92, 3.25], [5.92, 4.92], [5.82, 5.5], [1.6, 5.5], [1.6, 5.16], [-1.6, 5.16], [-1.6, 5.5], [-5.82, 5.5], [-5.92, 4.92]];
      const positions: number[] = [], edgePositions: number[] = [];
      footprint.forEach(([x, z], i) => {
        const [nx, nz] = footprint[(i + 1) % footprint.length];
        positions.push(x, -1.42, z, nx, -1.42, nz, nx, 1.42, nz, x, -1.42, z, nx, 1.42, nz, x, 1.42, z);
        for (const y of [-1.42, 1.42]) edgePositions.push(x, y, z, nx, y, nz);
      });
      const bandGeometry = own(new THREE.BufferGeometry()); bandGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      highlightMat.side = THREE.DoubleSide;
      const highlight = new THREE.Mesh(bandGeometry, highlightMat); scene.add(highlight);
      // Lift the luminous outline clear of sills and balcony surfaces. This
      // traces one selected floor without recolouring the building materials.
      highlight.scale.set(1.018,1,1.018);
      const rimMat=own(new THREE.MeshBasicMaterial({color:'#ffe4a2',toneMapped:false,transparent:true,opacity:.95,depthWrite:false}));
      const haloMat=own(new THREE.MeshBasicMaterial({color:'#efca72',toneMapped:false,transparent:true,opacity:.1,depthWrite:false}));
      for(let i=0;i<edgePositions.length;i+=6){
        const from=new THREE.Vector3(...edgePositions.slice(i,i+3) as [number,number,number]);
        const to=new THREE.Vector3(...edgePositions.slice(i+3,i+6) as [number,number,number]);
        const line=new THREE.LineCurve3(from,to);
        highlight.add(new THREE.Mesh(own(new THREE.TubeGeometry(line,1,.035,6,false)),rimMat));
        highlight.add(new THREE.Mesh(own(new THREE.TubeGeometry(line,1,.11,6,false)),haloMat));
      }
      const edges = own(new THREE.BufferGeometry()); edges.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
      const outline = new THREE.LineSegments(edges, own(new THREE.LineBasicMaterial({ color: '#ffe4a2', transparent: true, opacity: .85 }))); outline.scale.copy(highlight.scale); scene.add(outline);
      const pinLayer = document.createElement('div'); pinLayer.className = 'development-model-pins'; mount.appendChild(pinLayer);
      const pinInfo = [{ area: 'court' as const, text: 'Quadra', position: new THREE.Vector3(-16, 1, 16) }, { area: 'leisure' as const, text: 'Lazer', position: new THREE.Vector3(24, 2, 18) }, { area: 'entrance' as const, text: 'Acesso', position: new THREE.Vector3(8, 4, 27) }];
      const pinButtons = pinInfo.map(pin => { const button = document.createElement('button'); button.type = 'button'; button.className = 'development-model-pin'; button.textContent = `${pin.text} ＋`; button.onclick = () => latest.current.onArea(pin.area); pinLayer.appendChild(button); return button; });
      let frame = 0, settling = 0, width = 1, height = 1, lost = false;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)');
      controls.enableDamping = !reduced.matches;
      const projection = new THREE.Vector3();
      function schedule() { if (!frame && !cancelled && !lost && !document.hidden) frame = requestAnimationFrame(draw); }
      function draw() {
        frame = 0;
        if (cancelled || lost || document.hidden) return;
        controls.update(); renderer.render(scene, camera);
        pinInfo.forEach((pin, index) => { projection.copy(pin.position).project(camera); const visible = projection.z > -1 && projection.z < 1 && Math.abs(projection.x) < .91 && Math.abs(projection.y) < .83; pinButtons[index].hidden = !visible; if (visible) pinButtons[index].style.transform = `translate(${(projection.x * .5 + .5) * width}px, ${(-projection.y * .5 + .5) * height}px) translate(-50%, -100%)`; });
        mount.dataset.camera = camera.position.toArray().map(value => value.toFixed(2)).join(',');
        if (settling-- > 0) schedule();
      }
      function highlightFloor(tower:TowerId,floor:number){
        const center=towerCenters[tower];highlight.visible=true;outline.visible=true;
        const status=tower==='b'?'sold':floorStatus(floor)==='available'?'available':floorStatus(floor)==='negotiation'?'negotiation':'sold';
        const color=floorColors[status];
        highlight.position.set(center.x,3.4+(floor-.5)*2.85,center.z);outline.position.copy(highlight.position);
        for(const material of [highlightMat,rimMat,haloMat,outline.material])material.color.set(color);
        mount.dataset.highlightStatus=status;mount.dataset.highlightFloor=`${tower}-${floor}`;
      }
      function update() {
        const state = latest.current; highlightFloor(state.tower,state.floor);highlight.visible=state.showFloor;outline.visible=state.showFloor;
        const night = state.lighting === 'night', day = state.lighting === 'day';
        scene.background = new THREE.Color(night ? '#162e37' : day ? '#dbe8e8' : '#d9cbb7');
        scene.fog = new THREE.Fog(scene.background, 105, 220);
        ambient.intensity = night ? .45 : day ? 1.1 : .65;
        sun.intensity = night ? .35 : day ? 2.5 : 2.1;
        fill.intensity = night ? .25 : day ? .5 : .4;
        sun.color.set(night ? '#a4bfe1' : day ? '#fff4de' : '#ffd5a0');
        sun.position.set(day ? -18 : -36, day ? 65 : 30, 30);
        warmGlass.color.set(day ? '#657a7c' : night ? '#ddd4a2' : '#748481');
        warmGlass.emissiveIntensity = day ? 0 : night ? 1.3 : .045;
        commonGlass.emissiveIntensity = day ? 0 : night ? 1.2 : .2;
        fixture.emissiveIntensity = day ? 0 : night ? 4 : 2;
        water.emissive.set('#4dced9'); water.emissiveIntensity = day ? 0 : night ? .4 : .12;
        nightLights.forEach(light => { light.intensity = day ? 0 : night ? 65 : 35; });
        renderer.toneMappingExposure = night ? 1 : day ? .95 : .96;
        mount.dataset.lighting = state.lighting; mount.dataset.selectedFloor = `${state.tower}-${state.floor}`;
        mount.dataset.windowEmission = String(warmGlass.emissiveIntensity);
        mount.dataset.activeLights = String(nightLights.filter(light => light.intensity > 0).length); schedule();
      }
      function reset() { camera.position.copy(home); controls.target.copy(homeTarget); controls.update(); settling = 20; schedule(); }
      function zoom(direction: number) { const offset = camera.position.clone().sub(controls.target); offset.setLength(THREE.MathUtils.clamp(offset.length() * (direction > 0 ? .84 : 1.18), controls.minDistance, controls.maxDistance)); camera.position.copy(controls.target).add(offset); controls.update(); schedule(); }
      api.current = { zoom, reset, update };
      const resize = () => { const rect = mount.getBoundingClientRect(); width = Math.max(rect.width, 1); height = Math.max(rect.height, 1); renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); schedule(); };
      const observer = new ResizeObserver(resize); observer.observe(mount);
      const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
      let down = { x: 0, y: 0 };
      const hoverFloor = (event:PointerEvent) => {
        if(event.buttons || event.pointerType==='touch') return;
        const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
        const hit=raycaster.intersectObjects(hitTargets,true)[0]; let object:import('three').Object3D|null=hit?.object||null;
        while(object&&!object.userData.floor)object=object.parent;
        if(object?.userData.floor){highlightFloor(object.userData.tower as TowerId,object.userData.floor);canvas.style.cursor='pointer';schedule();}
        else {canvas.style.cursor='grab';update();}
      };
      const leaveFloor=()=>{canvas.style.cursor='grab';update();};
      const pointerDown = (event: PointerEvent) => { down = { x: event.clientX, y: event.clientY }; };
      const pointerUp = (event: PointerEvent) => { if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6 || event.button !== 0) return; const rect = canvas.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1); raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObjects(hitTargets, true)[0]; if (!hit) return; let object: import('three').Object3D | null = hit.object; while (object && !object.userData.floor && !object.userData.area) object = object.parent; if (object?.userData.floor) latest.current.onSelectFloor(object.userData.floor, object.userData.tower); else if (object?.userData.area) latest.current.onArea(object.userData.area); };
      const keydown = (event: KeyboardEvent) => { if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(event.key)) return; event.preventDefault(); if (event.key === 'Home') return reset(); if (['+', '=', '-'].includes(event.key)) return zoom(event.key === '-' ? -1 : 1); const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target)); spherical.theta += event.key === 'ArrowLeft' ? -.14 : event.key === 'ArrowRight' ? .14 : 0; spherical.phi = THREE.MathUtils.clamp(spherical.phi + (event.key === 'ArrowUp' ? -.1 : event.key === 'ArrowDown' ? .1 : 0), controls.minPolarAngle, controls.maxPolarAngle); camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(controls.target)); controls.update(); schedule(); };
      const contextLost = (event: Event) => { event.preventDefault(); lost = true; latest.current.onFail(); };
      const visibility = () => { if (!document.hidden) schedule(); };
      const change = () => schedule();
      controls.addEventListener('change', change); controls.addEventListener('end', () => { settling = 30; schedule(); });
      canvas.addEventListener('pointermove', hoverFloor);canvas.addEventListener('pointerleave',leaveFloor);canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointerup', pointerUp); canvas.addEventListener('keydown', keydown); canvas.addEventListener('webglcontextlost', contextLost);
      document.addEventListener('visibilitychange', visibility);
      cleanup = () => { api.current = null; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); canvas.removeEventListener('pointermove',hoverFloor);canvas.removeEventListener('pointerleave',leaveFloor);canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('keydown', keydown); canvas.removeEventListener('webglcontextlost', contextLost); document.removeEventListener('visibilitychange', visibility); resources.forEach(resource => resource.dispose()); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); pinLayer.remove(); };
      update(); resize(); renderer.render(scene, camera); latest.current.onReady();
    }
    void setup().catch(error => { cleanup?.(); if (!cancelled) { console.warn('Maquete conceitual indisponível.', error); latest.current.onFail(); } });
    return () => { cancelled = true; cleanup?.(); };
  }, []);
  return <div className="development-model" ref={host} data-testid="development-model" />;
});

export default DevelopmentModel;
