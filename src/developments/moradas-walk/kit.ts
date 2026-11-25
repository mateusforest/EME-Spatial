import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------- Texturas procedurais (sem arquivos externos, sem licença a conferir) ----------
function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function canvasTexture(size: number, draw: (c: CanvasRenderingContext2D, size: number, r: () => number) => void, seed = 1, srgb = true) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const c = canvas.getContext('2d')!;
  draw(c, size, rng(seed));
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function noise(c: CanvasRenderingContext2D, size: number, r: () => number, base: [number, number, number], amp: number, dots = size * size / 3) {
  c.fillStyle = `rgb(${base.join(',')})`;
  c.fillRect(0, 0, size, size);
  for (let i = 0; i < dots; i++) {
    const v = (r() - .5) * amp;
    c.fillStyle = `rgba(${base[0] + v | 0},${base[1] + v | 0},${base[2] + v | 0},.55)`;
    const s = 1 + r() * 2;
    c.fillRect(r() * size, r() * size, s, s);
  }
}

export const tex = {
  plaster: () => canvasTexture(256, (c, s, r) => noise(c, s, r, [236, 234, 228], 18)),
  grass: () => canvasTexture(512, (c, s, r) => {
    noise(c, s, r, [92, 118, 62], 40, s * s / 2);
    for (let i = 0; i < 9000; i++) {
      const x = r() * s, y = r() * s, g = 90 + r() * 70;
      c.strokeStyle = `rgba(${50 + r() * 40 | 0},${g | 0},${30 + r() * 30 | 0},.6)`;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - .5) * 3, y - 3 - r() * 5); c.stroke();
    }
  }, 7),
  turf: () => canvasTexture(256, (c, s, r) => { noise(c, s, r, [70, 140, 64], 22); for (let x = 0; x < s; x += 64) { c.fillStyle = 'rgba(255,255,255,.04)'; c.fillRect(x, 0, 32, s); } }, 9),
  paving: () => canvasTexture(512, (c, s, r) => {
    noise(c, s, r, [196, 192, 182], 22);
    const n = 4, w = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = (r() - .5) * 14; c.fillStyle = `rgba(${190 + v},${186 + v},${176 + v},.5)`; c.fillRect(i * w + 2, j * w + 2, w - 4, w - 4); }
    c.strokeStyle = 'rgba(110,106,98,.8)'; c.lineWidth = 3;
    for (let i = 0; i <= n; i++) { c.beginPath(); c.moveTo(i * w, 0); c.lineTo(i * w, s); c.stroke(); c.beginPath(); c.moveTo(0, i * w); c.lineTo(s, i * w); c.stroke(); }
  }, 3),
  asphalt: () => canvasTexture(256, (c, s, r) => noise(c, s, r, [92, 94, 96], 30, s * s), 5),
  oak: (base: [number, number, number] = [196, 164, 124]) => canvasTexture(512, (c, s, r) => {
    const rows = 8, h = s / rows;
    for (let i = 0; i < rows; i++) {
      let x = -r() * s;
      while (x < s) {
        const len = s * (.45 + r() * .5), v = (r() - .5) * 26;
        c.fillStyle = `rgb(${base[0] + v | 0},${base[1] + v | 0},${base[2] + v | 0})`;
        c.fillRect(x, i * h, len, h);
        for (let k = 0; k < 14; k++) { c.strokeStyle = `rgba(90,60,30,${.05 + r() * .08})`; c.beginPath(); const y = i * h + r() * h; c.moveTo(x, y); c.bezierCurveTo(x + len / 3, y + (r() - .5) * 6, x + len * 2 / 3, y + (r() - .5) * 6, x + len, y); c.stroke(); }
        c.fillStyle = 'rgba(60,40,20,.35)'; c.fillRect(x, i * h, 2, h);
        x += len;
      }
      c.fillStyle = 'rgba(60,40,20,.3)'; c.fillRect(0, i * h, s, 1.5);
    }
  }, 11),
  tile: (base: [number, number, number] = [214, 210, 202], n = 2) => canvasTexture(512, (c, s, r) => {
    noise(c, s, r, base, 10);
    c.strokeStyle = 'rgba(120,118,112,.6)'; c.lineWidth = 2;
    for (let i = 0; i <= n; i++) { const p = i * s / n; c.beginPath(); c.moveTo(p, 0); c.lineTo(p, s); c.stroke(); c.beginPath(); c.moveTo(0, p); c.lineTo(s, p); c.stroke(); }
  }, 13),
  fabric: (base: [number, number, number]) => canvasTexture(128, (c, s, r) => {
    noise(c, s, r, base, 16);
    for (let i = 0; i < s; i += 2) { c.fillStyle = 'rgba(0,0,0,.04)'; c.fillRect(i, 0, 1, s); c.fillRect(0, i, s, 1); }
  }, 17),
  water: () => canvasTexture(256, (c, s, r) => {
    const gr = c.createLinearGradient(0, 0, s, s); gr.addColorStop(0, '#3fa7c4'); gr.addColorStop(1, '#2b8fb0');
    c.fillStyle = gr; c.fillRect(0, 0, s, s);
    for (let i = 0; i < 260; i++) { c.strokeStyle = `rgba(255,255,255,${.06 + r() * .12})`; c.lineWidth = 1 + r() * 1.5; c.beginPath(); const x = r() * s, y = r() * s; c.ellipse(x, y, 6 + r() * 16, 3 + r() * 8, r() * 3, 0, Math.PI * 2); c.stroke(); }
  }, 21),
  waterNormal: () => canvasTexture(256, (c, s, r) => {
    c.fillStyle = 'rgb(128,128,255)'; c.fillRect(0, 0, s, s);
    for (let i = 0; i < 500; i++) { const x = r() * s, y = r() * s, rad = 4 + r() * 18; const g = c.createRadialGradient(x, y, 0, x, y, rad); const a = r() < .5 ? 100 : 156; g.addColorStop(0, `rgba(${a},${256 - a},255,.35)`); g.addColorStop(1, 'rgba(128,128,255,0)'); c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  }, 23, false),
  wood: () => canvasTexture(256, (c, s, r) => { c.fillStyle = '#9a6a42'; c.fillRect(0, 0, s, s); for (let i = 0; i < 120; i++) { c.strokeStyle = `rgba(${60 + r() * 50 | 0},${36 + r() * 30 | 0},18,.25)`; c.beginPath(); const x = r() * s; c.moveTo(x, 0); c.bezierCurveTo(x + 6, s / 3, x - 6, s * 2 / 3, x, s); c.stroke(); } for (let x = 0; x < s; x += s / 6) { c.fillStyle = 'rgba(30,18,8,.45)'; c.fillRect(x, 0, 2, s); } }, 29),
  stone: () => canvasTexture(256, (c, s, r) => { noise(c, s, r, [168, 160, 148], 40, s * s); for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(80,74,66,${r() * .15})`; c.beginPath(); c.arc(r() * s, r() * s, 4 + r() * 14, 0, 7); c.fill(); } }, 31),
  roofTile: () => canvasTexture(256, (c, s, r) => { c.fillStyle = '#9b5a3c'; c.fillRect(0, 0, s, s); for (let y = 0; y < s; y += 16) for (let x = (y / 16) % 2 * 16; x < s; x += 32) { const v = (r() - .5) * 30; c.fillStyle = `rgb(${150 + v | 0},${84 + v / 2 | 0},${56 + v / 3 | 0})`; c.fillRect(x, y, 30, 14); } }, 37),
};

// ---------- Construtor que junta caixas por material (poucas chamadas de desenho) ----------
export type Level = 'ground' | 'apt';
export interface Collider { minX: number; maxX: number; minZ: number; maxZ: number; level: Level; minY?: number; maxY?: number }

/** Material com escala de UV em metros (textura repete a cada `uvm` metros, contínua entre peças). */
export function mat(params: THREE.MeshStandardMaterialParameters & { uvm?: number }, physical = false) {
  const { uvm, ...rest } = params;
  const m = physical ? new THREE.MeshPhysicalMaterial(rest) : new THREE.MeshStandardMaterial(rest);
  m.userData.uvm = uvm ?? 1;
  return m;
}

function worldUV(geo: THREE.BufferGeometry, uvm: number) {
  const p = geo.getAttribute('position'), n = geo.getAttribute('normal');
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else if (ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u / uvm; uv[i * 2 + 1] = v / uvm;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

export class Builder {
  private parts = new Map<THREE.Material, { cast: THREE.BufferGeometry[]; still: THREE.BufferGeometry[] }>();
  colliders: Collider[] = [];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  /** Deslocamento aplicado a tudo que for adicionado (posicionar uma torre inteira). */
  offset = new THREE.Vector3();

  add(material: THREE.Material, geometry: THREE.BufferGeometry, x: number, y: number, z: number, rotY = 0, cast = true, sx = 1, sy = 1, sz = 1, rotX = 0, rotZ = 0) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    this.q.setFromEuler(this.e.set(rotX, rotY, rotZ));
    this.m.compose(new THREE.Vector3(x + this.offset.x, y + this.offset.y, z + this.offset.z), this.q, new THREE.Vector3(sx, sy, sz));
    g.applyMatrix4(this.m);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
    if ((material as THREE.MeshStandardMaterial).map || (material as THREE.MeshStandardMaterial).bumpMap) worldUV(g, material.userData.uvm ?? 1);
    let bucket = this.parts.get(material);
    if (!bucket) { bucket = { cast: [], still: [] }; this.parts.set(material, bucket); }
    (cast ? bucket.cast : bucket.still).push(g);
    return this;
  }

  /** Caixa por centro e tamanho. */
  box(material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, rotY = 0, cast = true) {
    return this.add(material, new THREE.BoxGeometry(sx, sy, sz), x, y, z, rotY, cast);
  }

  /** Caixa por limites (min/max), mais fácil para paredes e lajes. */
  span(material: THREE.Material, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, cast = true) {
    return this.box(material, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), 0, cast);
  }

  cyl(material: THREE.Material, x: number, y: number, z: number, rTop: number, rBottom: number, h: number, seg = 20, cast = true) {
    return this.add(material, new THREE.CylinderGeometry(rTop, rBottom, h, seg), x, y, z, 0, cast);
  }

  collide(minX: number, maxX: number, minZ: number, maxZ: number, level: Level, minY?: number, maxY?: number) {
    const o = this.offset;
    this.colliders.push({ minX: Math.min(minX, maxX) + o.x, maxX: Math.max(minX, maxX) + o.x, minZ: Math.min(minZ, maxZ) + o.z, maxZ: Math.max(minZ, maxZ) + o.z, level, minY, maxY });
  }

  build(parent: THREE.Object3D, walk?: Level) {
    for (const [material, { cast, still }] of this.parts) {
      for (const [list, castShadow] of [[cast, true], [still, false]] as const) {
        if (!list.length) continue;
        const merged = mergeGeometries(list, false);
        list.forEach(g => g.dispose());
        if (!merged) continue;
        const mesh = new THREE.Mesh(merged, material);
        mesh.castShadow = castShadow && !(material as THREE.Material).transparent;
        mesh.receiveShadow = true;
        if (walk) mesh.userData.walk = walk;
        parent.add(mesh);
      }
    }
    this.parts.clear();
  }
}

/** Parede reta com aberturas (portas e janelas). Coordenadas em metros, eixo da parede de (ax,az) a (bx,bz). */
export interface Opening { from: number; to: number; sill: number; head: number; kind: 'window' | 'door' | 'glassdoor' | 'void' }
export function wallWithOpenings(b: Builder, wall: THREE.Material, ax: number, az: number, bx: number, bz: number, y0: number, height: number, thick: number, openings: Opening[], frame?: THREE.Material, glass?: THREE.Material, level: Level = 'apt', collide = true) {
  const len = Math.hypot(bx - ax, bz - az);
  const dx = (bx - ax) / len, dz = (bz - az) / len;
  const rot = Math.atan2(-dz, dx);
  const at = (t: number, y: number, w: number, h: number, m: THREE.Material, depth = thick, off = 0) => {
    const cx = ax + dx * t + (-dz) * off * 0, cz = az + dz * t + dx * off * 0;
    b.box(m, cx + (dz) * off, y, cz - dx * off, w, h, depth, rot);
  };
  const ops = [...openings].sort((p, q) => p.from - q.from);
  let cursor = 0;
  const solid = (t0: number, t1: number, ya: number, yb: number) => { if (t1 - t0 > .005 && yb - ya > .005) at((t0 + t1) / 2, y0 + (ya + yb) / 2, t1 - t0, yb - ya, wall); };
  for (const o of ops) {
    solid(cursor, o.from, 0, height);
    solid(o.from, o.to, 0, o.sill);
    solid(o.from, o.to, o.head, height);
    const w = o.to - o.from, mid = (o.from + o.to) / 2, h = o.head - o.sill, yc = y0 + o.sill + h / 2;
    if (frame && o.kind !== 'void' && o.kind !== 'door') {
      const f = .05;
      at(mid, y0 + o.sill + f / 2, w, f, frame, thick * .6);
      at(mid, y0 + o.head - f / 2, w, f, frame, thick * .6);
      at(o.from + f / 2, yc, f, h, frame, thick * .6);
      at(o.to - f / 2, yc, f, h, frame, thick * .6);
      const panes = o.kind === 'glassdoor' ? Math.max(2, Math.round(w / 1.1)) : Math.max(1, Math.round(w / 1.0));
      for (let k = 1; k < panes; k++) at(o.from + w * k / panes, yc, .045, h, frame, thick * .5);
      if (glass) at(mid, yc, w - .04, h - .04, glass, .012);
    }
    if (o.kind === 'door' && frame) {
      at(o.from + .02, y0 + o.head / 2, .04, o.head, frame, thick + .02);
      at(o.to - .02, y0 + o.head / 2, .04, o.head, frame, thick + .02);
      at(mid, y0 + o.head - .02, w, .04, frame, thick + .02);
    }
    cursor = o.to;
    if (collide && o.kind !== 'door' && o.kind !== 'void') addSegCollider(b, ax, az, dx, dz, o.from, o.to, thick, level);
  }
  solid(cursor, len, 0, height);
  if (collide) {
    let c = 0;
    for (const o of ops) { addSegCollider(b, ax, az, dx, dz, c, o.from, thick, level); c = o.to; }
    addSegCollider(b, ax, az, dx, dz, c, len, thick, level);
  }
}

function addSegCollider(b: Builder, ax: number, az: number, dx: number, dz: number, t0: number, t1: number, thick: number, level: Level) {
  if (t1 - t0 < .01) return;
  const x0 = ax + dx * t0, z0 = az + dz * t0, x1 = ax + dx * t1, z1 = az + dz * t1;
  const h = thick / 2;
  b.collide(Math.min(x0, x1) - h * Math.abs(dz) - .001, Math.max(x0, x1) + h * Math.abs(dz) + .001, Math.min(z0, z1) - h * Math.abs(dx) - .001, Math.max(z0, z1) + h * Math.abs(dx) + .001, level);
}
