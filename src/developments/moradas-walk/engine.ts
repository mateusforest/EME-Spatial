import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createMaterials, setNight } from './materials';
import { buildSite, PLACES, TOWERS, floorY } from './site';
import { APT_SPOTS, planToTower } from './apartment';
import { solarPosition } from './solar';
import type { Collider, Level } from './kit';

export type ViewMode = 'walk' | 'aerial';
export interface WalkState { x: number; z: number; yaw: number; level: Level; mode: ViewMode; floor: number; moving: boolean }
export interface Engine {
  goTo: (id: string) => void;
  setMode: (mode: ViewMode) => void;
  setFloor: (floor: number) => void;
  setSun: (hour: number, date: string) => void;
  setQuality: (high: boolean) => void;
  setMoveInput: (forward: number, turn: number) => void;
  capture: () => string;
  state: () => WalkState;
  dispose: () => void;
}

const EYE = 1.62, RADIUS = .26, WALK_SPEED = 1.6, RUN = 3.4;

export async function createEngine(host: HTMLElement, onState: (s: WalkState) => void, onReady: () => void): Promise<Engine> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .9;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = 'mw-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'Moradas da Serra em 3D. Use as setas ou W A S D para caminhar, arraste para olhar e clique no chão para ir até lá.');
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(68, 1, .05, 2500);

  // céu físico
  const sky = new Sky(); sky.scale.setScalar(4000);
  const su = sky.material.uniforms; su.turbidity.value = 3.5; su.rayleigh.value = 2.4; su.mieCoefficient.value = .004; su.mieDirectionalG.value = .82;
  scene.add(sky);
  const skyScene = new THREE.Scene(); const skyForEnv = new Sky(); skyForEnv.scale.setScalar(4000); skyScene.add(skyForEnv);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT: THREE.WebGLRenderTarget | null = null;
  scene.fog = new THREE.Fog('#cdd6dc', 260, 1400);

  const sun = new THREE.DirectionalLight('#fff4e2', 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -.0003; sun.shadow.normalBias = .035; sun.shadow.radius = 2.5; sun.shadow.blurSamples = 12;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#cfe3ff', '#7a7560', .5); scene.add(hemi);

  const m = createMaterials();
  const kit = await new GLTFLoader().loadAsync('/assets/developments/moradas-da-serra/detail-kit/moradas-detail-kit.glb').catch(() => null);
  const tree = kit?.scene.getObjectByName('LandscapeTree') ?? undefined;
  tree?.traverse(o => { const mesh = o as THREE.Mesh; if (mesh.isMesh) { const mt = mesh.material as THREE.MeshStandardMaterial; mt.side = THREE.DoubleSide; if (mt.name.startsWith('Leaf')) { mt.color.multiplyScalar(.85); mt.roughness = .85; } } });
  const site = buildSite(scene, m, tree);

  // luzes noturnas: quantidade fixa (evita recompilar sombreadores), ligadas conforme a hora
  const nightLights: THREE.PointLight[] = [];
  const aptLights: THREE.PointLight[] = [];
  // lâmpadas do apartamento: coordenadas da torre, relativas ao piso do andar (o grupo sobe com o andar)
  for (const p of site.lamps.slice(0, 7)) { const l = new THREE.PointLight('#ffd6a0', 0, 7, 1.6); l.position.set(p.x + TOWERS.a.x, p.y, p.z + TOWERS.a.z); site.aptGroup.add(l); aptLights.push(l); }
  for (const p of [...site.outdoorLights.slice(0, 10), ...site.fires]) { const l = new THREE.PointLight(site.fires.includes(p) ? '#ff9a4a' : '#ffd9a6', 0, 14, 1.8); l.position.copy(p); scene.add(l); nightLights.push(l); }

  // pós-processamento
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, 1, 1);
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.blendIntensity = .9;
  gtao.updateGtaoMaterial({ radius: .6, distanceExponent: 1.4, thickness: 1, scale: 1 });
  composer.addPass(gtao);
  composer.addPass(new OutputPass());
  let high = !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  if (!high) { renderer.setPixelRatio(1); sun.shadow.mapSize.set(2048, 2048); }

  // ---------- estado de navegação ----------
  const st: WalkState = { x: 2, z: 40, yaw: 0, level: 'ground', mode: 'walk', floor: 6, moving: false };
  let pitch = -.02;
  const keys = new Set<string>();
  const input = { forward: 0, turn: 0 };
  let target: THREE.Vector3 | null = null;
  let tween: { from: THREE.Vector3; to: THREE.Vector3; yaw0: number; yaw1: number; p0: number; p1: number; t: number; dur: number } | null = null;

  const orbit = new OrbitControls(camera, canvas);
  orbit.enableDamping = true; orbit.dampingFactor = .08; orbit.minDistance = 12; orbit.maxDistance = 260; orbit.maxPolarAngle = Math.PI / 2 - .05;
  orbit.target.set(0, 10, -4); orbit.enabled = false;

  function colliders(): Collider[] { return st.level === 'apt' ? site.aptColliders : site.colliders; }
  function blocked(x: number, z: number) {
    if (st.level === 'ground' && (x < -70 || x > 70 || z < -38 || z > 60)) return true;
    for (const c of colliders()) if (x > c.minX - RADIUS && x < c.maxX + RADIUS && z > c.minZ - RADIUS && z < c.maxZ + RADIUS) return true;
    return false;
  }
  function eyeY() { return st.level === 'apt' ? floorY(st.floor) + EYE : groundHeightAt(st.x, st.z) + EYE; }
  function groundHeightAt(x: number, z: number) { return x > -4 && x < 6 && z > -6 && z < 34 ? .06 : (x > 5 && x < 25 && z > 1 && z < 12) ? .08 : .05; }
  function applyCamera() {
    camera.position.set(st.x, eyeY(), st.z);
    camera.rotation.set(pitch, st.yaw, 0, 'YXZ');
  }
  function tryMove(dx: number, dz: number) {
    let moved = false;
    if (!blocked(st.x + dx, st.z)) { st.x += dx; moved = true; }
    if (!blocked(st.x, st.z + dz)) { st.z += dz; moved = true; }
    return moved;
  }

  function lookYaw(fromX: number, fromZ: number, toX: number, toZ: number) { return Math.atan2(-(toX - fromX), -(toZ - fromZ)); }
  function flyTo(x: number, z: number, level: Level, look: THREE.Vector3, dur = 1.3) {
    const fromLevel = st.level;
    st.level = level;
    const to = new THREE.Vector3(x, eyeY(), z);
    st.level = fromLevel;
    const yaw1 = lookYaw(x, z, look.x, look.z);
    const p1 = Math.atan2(look.y - to.y, Math.hypot(look.x - x, look.z - z));
    let yaw0 = st.mode === 'walk' ? st.yaw : lookYaw(camera.position.x, camera.position.z, look.x, look.z);
    while (yaw1 - yaw0 > Math.PI) yaw0 += Math.PI * 2; while (yaw0 - yaw1 > Math.PI) yaw0 -= Math.PI * 2;
    const from = camera.position.clone();
    const changingLevel = fromLevel !== level;
    st.mode = 'walk'; orbit.enabled = false; camera.fov = 68; camera.updateProjectionMatrix();
    tween = { from, to, yaw0, yaw1, p0: st.mode === 'walk' ? pitch : -.3, p1: Math.max(-.6, Math.min(.5, p1)), t: 0, dur: changingLevel ? 2.2 : dur };
    st.x = x; st.z = z; st.level = level; target = null;
  }

  function goTo(id: string) {
    const place = PLACES.find(p => p.id === id);
    if (place) { flyTo(place.pos[0], place.pos[1], 'ground', new THREE.Vector3(...place.look)); return; }
    const spot = APT_SPOTS.find(s => s.id === id);
    if (spot) {
      const [x, z] = planToTower(spot.px, spot.py); const [lx, lz] = planToTower(spot.look[0], spot.look[1]);
      flyTo(x + TOWERS.a.x, z + TOWERS.a.z, 'apt', new THREE.Vector3(lx + TOWERS.a.x, floorY(st.floor) + 1.3, lz + TOWERS.a.z));
    }
  }

  function setMode(mode: ViewMode) {
    if (mode === st.mode) return;
    st.mode = mode; tween = null; target = null;
    if (mode === 'aerial') {
      orbit.enabled = true; camera.fov = 42; camera.updateProjectionMatrix();
      camera.position.set(st.level === 'apt' ? -60 : 72, 58, 96); orbit.target.set(st.level === 'apt' ? TOWERS.a.x : 0, st.level === 'apt' ? floorY(st.floor) : 8, st.level === 'apt' ? TOWERS.a.z : -2); orbit.update();
    } else { orbit.enabled = false; camera.fov = 68; camera.updateProjectionMatrix(); applyCamera(); }
    applyAmbient(); updateShadowCamera(); emit();
  }

  function setFloor(floor: number) { st.floor = floor; site.setFloor(floor); if (st.mode === 'walk' && !tween) applyCamera(); updateShadowCamera(); emit(); }

  // ---------- sol ----------
  let lastSunKey = '';
  function setSun(hour: number, date: string) {
    const pos = solarPosition(hour, date);
    const dir = new THREE.Vector3(...pos.direction);
    su.sunPosition.value.copy(dir); skyForEnv.material.uniforms.sunPosition.value.copy(dir);
    const e = pos.elevation;
    const day = THREE.MathUtils.smoothstep(e, -4, 8);
    const night = 1 - THREE.MathUtils.smoothstep(e, -8, 1);
    const low = 1 - THREE.MathUtils.smoothstep(e, 2, 25);
    sun.intensity = 3.3 * THREE.MathUtils.smoothstep(e, -1, 10);
    sun.color.setHSL(.08 + .04 * (1 - low), .55 * low + .12, .6 + .3 * (1 - low));
    amb.day = day; amb.night = night;
    hemi.color.set(night > .5 ? '#5c6f9a' : '#cfe3ff');
    renderer.toneMappingExposure = .78 + .12 * day + .3 * night;
    scene.fog!.color.setHSL(.58, .25, .1 + .62 * day);
    setNight(m, night);
    for (const l of nightLights) l.intensity = (l.color.r > .99 && l.color.g < .7 ? 25 : 18) * night;
    for (const l of aptLights) l.intensity = 6 * night;
    sunDir.copy(dir);
    const key = `${Math.round(e * 2)}:${Math.round(pos.azimuth / 2)}`;
    if (key !== lastSunKey) {
      lastSunKey = key;
      const nightSky = night > .6;
      skyForEnv.material.uniforms.rayleigh.value = nightSky ? .2 : 2.4;
      envRT?.dispose(); envRT = pmrem.fromScene(skyScene, 0, .1, 3000);
      scene.environment = envRT.texture;
    }
    su.rayleigh.value = night > .6 ? .2 : 2.4;
    scene.background = night > .85 ? new THREE.Color('#0b1220') : null;
    sky.visible = night <= .85;
    applyAmbient(); updateShadowCamera();
  }
  const sunDir = new THREE.Vector3(0, 1, 0);
  // luz do céu: fraca fora (para as sombras aparecerem), mais forte dentro do apartamento (luz que entra pelas janelas)
  const amb = { day: 1, night: 0 };
  function applyAmbient() {
    const indoor = st.level === 'apt' && st.mode === 'walk';
    const nightSky = amb.night > .6;
    scene.environmentIntensity = nightSky ? (indoor ? .015 : .008) : indoor ? .05 + .07 * amb.day : .012 + .02 * amb.day;
    hemi.intensity = indoor ? .15 + .35 * amb.day : .06 + .1 * amb.day;
  }
  function updateShadowCamera() {
    const indoor = st.level === 'apt' && st.mode === 'walk';
    const center = indoor ? new THREE.Vector3(TOWERS.a.x - 5.8, floorY(st.floor), TOWERS.a.z + 4) : st.mode === 'aerial' ? new THREE.Vector3(0, 0, -2) : new THREE.Vector3(st.x, 0, st.z);
    const ext = indoor ? 14 : st.mode === 'aerial' ? 75 : 55;
    const cam = sun.shadow.camera;
    cam.left = -ext; cam.right = ext; cam.top = ext; cam.bottom = -ext; cam.near = 1; cam.far = 600; cam.updateProjectionMatrix();
    sun.target.position.copy(center); sun.position.copy(center).addScaledVector(sunDir, 250);
  }

  function setQuality(h: boolean) {
    high = h;
    sun.shadow.mapSize.set(h ? 4096 : 2048, h ? 4096 : 2048); sun.shadow.map?.dispose(); (sun.shadow as unknown as { map: null }).map = null;
    renderer.setPixelRatio(Math.min(devicePixelRatio, h ? 1.6 : 1)); resize();
  }

  // ---------- entrada ----------
  let drag: { x: number; y: number; moved: boolean; id: number } | null = null;
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  canvas.addEventListener('pointerdown', e => { if (st.mode !== 'walk') return; drag = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId }; canvas.setPointerCapture(e.pointerId); tween = null; });
  canvas.addEventListener('pointermove', e => {
    if (!drag || st.mode !== 'walk') return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    if (drag.moved) { st.yaw += dx * .0042; pitch = Math.max(-1.2, Math.min(1.1, pitch + dy * .0036)); drag.x = e.clientX; drag.y = e.clientY; target = null; applyCamera(); }
  });
  canvas.addEventListener('pointerup', e => {
    if (!drag || st.mode !== 'walk') { drag = null; return; }
    const wasClick = !drag.moved; drag = null;
    if (!wasClick) return;
    const r = canvas.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(scene.children, true).filter(h => h.object.visible && h.distance < 80 && !((h.object as THREE.Mesh).material as THREE.Material | undefined)?.transparent);
    const first = hits[0];
    if (!first || first.object.userData.walk !== st.level) return;
    target = new THREE.Vector3(first.point.x, 0, first.point.z);
  });
  canvas.addEventListener('wheel', e => { if (st.mode !== 'walk') return; e.preventDefault(); camera.fov = THREE.MathUtils.clamp(camera.fov + e.deltaY * .03, 35, 85); camera.updateProjectionMatrix(); }, { passive: false });
  const kd = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.closest('input,textarea,select')) return; const k = e.key.toLowerCase(); if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'q', 'e'].includes(k)) { keys.add(k); target = null; tween = null; if (k.startsWith('arrow')) e.preventDefault(); } };
  const ku = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
  const blur = () => keys.clear(); window.addEventListener('blur', blur);

  // ---------- laço ----------
  function resize() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false); composer.setSize(w, h); gtao.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(host); resize();

  let last = performance.now(), raf = 0, lastEmit = 0, alive = true;
  function emit() { onState({ ...st }); }
  function frame(now: number) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const tm = now / 1000;
    if (m.water.map) { m.water.map.offset.set(tm * .01, tm * .006); m.water.normalMap!.offset.set(-tm * .02, tm * .015); }
    st.moving = false;
    if (st.mode === 'walk') {
      if (tween) {
        tween.t += dt / tween.dur;
        const k = THREE.MathUtils.smoothstep(Math.min(1, tween.t), 0, 1);
        if (tween.dur > 2) { // troca de nível: sobe pela fachada como um drone e entra
          const lift = Math.sin(k * Math.PI) * 14;
          camera.position.lerpVectors(tween.from, tween.to, k); camera.position.y += lift * (tween.to.y > tween.from.y ? .6 : 1);
        } else camera.position.lerpVectors(tween.from, tween.to, k);
        st.yaw = THREE.MathUtils.lerp(tween.yaw0, tween.yaw1, k); pitch = THREE.MathUtils.lerp(tween.p0, tween.p1, k);
        camera.rotation.set(pitch, st.yaw, 0, 'YXZ');
        st.moving = true;
        if (tween.t >= 1) { tween = null; applyCamera(); applyAmbient(); updateShadowCamera(); emit(); }
      } else {
        const run = keys.has('shift') ? RUN : WALK_SPEED;
        let f = input.forward, s = 0, turn = input.turn;
        if (keys.has('w') || keys.has('arrowup')) f += 1;
        if (keys.has('s') || keys.has('arrowdown')) f -= 1;
        if (keys.has('a')) s -= 1; if (keys.has('d')) s += 1;
        if (keys.has('arrowleft') || keys.has('q')) turn += 1; if (keys.has('arrowright') || keys.has('e')) turn -= 1;
        st.yaw += turn * dt * 1.6;
        if (target) {
          const dx = target.x - st.x, dz = target.z - st.z, d = Math.hypot(dx, dz);
          if (d < .15) target = null;
          else {
            const want = lookYaw(st.x, st.z, target.x, target.z);
            let dy = want - st.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
            st.yaw += dy * Math.min(1, dt * 5);
            const step = Math.min(d, (d > 4 ? RUN : WALK_SPEED) * dt);
            if (!tryMove(dx / d * step, dz / d * step)) target = null;
            st.moving = true;
          }
        }
        if (f || s) {
          const sp = run * dt, fx = -Math.sin(st.yaw), fz = -Math.cos(st.yaw);
          tryMove((fx * f + Math.cos(st.yaw) * s) * sp, (fz * f - Math.sin(st.yaw) * s) * sp);
          st.moving = true;
        }
        applyCamera();
        if (st.moving && st.level === 'ground') { const cam = sun.shadow.camera; const c = sun.target.position; if (Math.hypot(c.x - st.x, c.z - st.z) > 12) updateShadowCamera(); void cam; }
      }
    } else orbit.update();
    if (high) composer.render(); else renderer.render(scene, camera);
    if (now - lastEmit > 120) { lastEmit = now; emit(); }
  }

  setSun(16.5, new Date().toISOString().slice(0, 10));
  applyCamera(); st.yaw = lookYaw(st.x, st.z, 0, -12); applyCamera();
  raf = requestAnimationFrame(frame);
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__mw = { scene, camera, sun, renderer, st, composer, skip: () => { if (tween) tween.t = 1; } };
  onReady(); emit();

  return {
    goTo, setMode, setFloor, setSun, setQuality,
    setMoveInput: (forward, turn) => { input.forward = forward; input.turn = turn; if (forward || turn) { target = null; tween = null; } },
    capture: () => {
      if (high) composer.render(); else renderer.render(scene, camera);
      const k = Math.min(1, 1280 / canvas.width), out = document.createElement('canvas');
      out.width = Math.round(canvas.width * k); out.height = Math.round(canvas.height * k);
      out.getContext('2d')!.drawImage(canvas, 0, 0, out.width, out.height);
      return out.toDataURL('image/jpeg', .88);
    },
    state: () => ({ ...st }),
    dispose: () => {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); orbit.dispose();
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', blur);
      scene.traverse(o => { const mesh = o as THREE.Mesh; if (mesh.isMesh) { mesh.geometry.dispose(); } });
      for (const v of Object.values(m)) (Array.isArray(v) ? v : [v]).forEach(x => { const mt = x as THREE.MeshStandardMaterial; mt.map?.dispose(); mt.dispose(); });
      envRT?.dispose(); pmrem.dispose(); composer.dispose(); renderer.dispose(); canvas.remove();
    },
  };
}
