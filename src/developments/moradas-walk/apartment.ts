import * as THREE from 'three';
import { Builder, wallWithOpenings, type Opening } from './kit';
import type { Materials } from './materials';

// Planta Tipo 2 (70,82 m², 3 dormitórios), traçada da imagem fornecida (floorplans/moradas-type-2.png, 1505×915).
// As coordenadas abaixo estão em pixels da imagem reduzida para 1200 de largura. Escala proporcional,
// sem cotas: 1 px ≈ 9,8 mm. Pé-direito, mobiliário e acabamentos são ilustrativos.
export const PX = 0.0098;
export const PLAN_IMAGE = { file: 'floorplans/moradas-type-2.png', width: 1505, height: 915, scaleTo1200: 1200 / 1505 };
export const CEILING = 2.6;
export const STORY = 2.9;
export const PODIUM = 3.3;
export const HALF_W = 1195 * PX; // ~11,7 m: metade da largura da torre

export interface Quadrant { sx: 1 | -1; sz: 1 | -1 }
/** Pixel da planta → metros no referencial da torre (origem no centro da torre, +Z = frente). */
export function planToTower(px: number, py: number, q: Quadrant = { sx: 1, sz: 1 }): [number, number] {
  return [q.sx * (-HALF_W + px * PX), q.sz * (7 + (py - 615) * PX)];
}
export function towerToPlan(x: number, z: number): [number, number] {
  return [(x + HALF_W) / PX, (z - 7) / PX + 615];
}

type Ctx = { b: Builder; m: Materials; q: Quadrant; y: number };

function rect(c: Ctx, material: THREE.Material, px0: number, px1: number, py0: number, py1: number, y0: number, y1: number, cast = true) {
  const [x0, z0] = planToTower(px0, py0, c.q), [x1, z1] = planToTower(px1, py1, c.q);
  c.b.span(material, x0, x1, c.y + y0, c.y + y1, z0, z1, cast);
}
function cyl(c: Ctx, material: THREE.Material, px: number, py: number, r: number, y0: number, y1: number, seg = 28, rTop = r) {
  const [x, z] = planToTower(px, py, c.q);
  c.b.cyl(material, x, c.y + (y0 + y1) / 2, z, rTop, r, y1 - y0, seg);
}
function wall(c: Ctx, material: THREE.Material, pxa: number, pya: number, pxb: number, pyb: number, openings: Opening[] = [], thick = .14, collide = true) {
  const [ax, az] = planToTower(pxa, pya, c.q), [bx, bz] = planToTower(pxb, pyb, c.q);
  wallWithOpenings(c.b, material, ax, az, bx, bz, c.y, CEILING, thick, openings.map(o => ({ ...o, from: o.from * PX, to: o.to * PX })), c.m.frame, c.m.glass, 'apt', collide);
}

// Janelas e portas externas, em px ao longo de cada parede (início da parede = 0).
const FRONT: Opening[] = [
  { from: 285, to: 355, sill: 1.6, head: 2.15, kind: 'window' }, // banheiro
  { from: 465, to: 595, sill: 1.0, head: 2.2, kind: 'window' },  // dormitório solteiro
  { from: 645, to: 925, sill: 0, head: 2.3, kind: 'glassdoor' }, // sala → sacada
  { from: 1065, to: 1175, sill: 1.1, head: 2.2, kind: 'window' }, // área de serviço
];
const SIDE: Opening[] = [{ from: 115, to: 245, sill: 1.0, head: 2.2, kind: 'window' }]; // suíte (x=5, py 260→615)
const RECESS: Opening[] = [{ from: 55, to: 195, sill: 1.0, head: 2.2, kind: 'window' }]; // dormitório 2 (x=170, py 5→260)

export interface CurtainSpot { x: number; y: number; z: number; w: number; h: number; alongX: boolean }

/** Casca externa da unidade: lajes, paredes externas com janelas, sacada. `curtains` fecha as janelas (andares sem interior). */
export function apartmentShell(b: Builder, m: Materials, q: Quadrant, y: number, curtains?: { lit: THREE.Material; dark: THREE.Material; seed: number }) {
  const c: Ctx = { b, m, q, y };
  const ext = m.facade;
  // lajes (piso estrutural e teto do andar)
  for (const [x0, x1, y0, y1] of [[5, 1195, 260, 615], [170, 1035, 5, 260], [1035, 1195, 410, 615]]) {
    rect(c, m.slab, x0, x1, y0, y1, -.16, -.02);
    rect(c, m.slab, x0, x1, y0, y1, CEILING, STORY - .16);
  }
  // paredes externas
  wall(c, ext, 5, 615, 1195, 615, FRONT, .2, !curtains);
  wall(c, ext, 5, 260, 5, 615, SIDE, .2, !curtains);
  wall(c, ext, 170, 5, 170, 260, RECESS, .2, !curtains);
  wall(c, ext, 5, 260, 170, 260, [], .2, !curtains);
  wall(c, m.plaster, 170, 5, 630, 5, [], .2, !curtains);
  wall(c, m.plaster, 630, 5, 630, 130, [], .14, !curtains);
  wall(c, m.plaster, 630, 130, 1035, 130, [], .2, !curtains);
  wall(c, m.plaster, 1035, 130, 1035, 410, [], .2, !curtains);
  wall(c, m.plaster, 1035, 410, 1195, 410, [], .14, !curtains);
  // faixa de piso entre andares na fachada (marca cada pavimento, como nas perspectivas)
  rect(c, m.facadeBand, 0, 1195, 612, 622, -.18, 0, true);
  rect(c, m.facadeBand, 0, 8, 255, 615, -.18, 0, true);
  // sacada gourmet: laje, guarda-corpo de vidro, nicho do ar-condicionado com brises de madeira
  rect(c, m.balconySlab, 635, 1040, 615, 722, -.18, -.02);
  rect(c, m.balconyFloor, 640, 942, 618, 718, -.02, 0, false);
  rect(c, m.glassRail, 640, 942, 714, 718, 0, 1.08, false);
  rect(c, m.glassRail, 636, 640, 618, 718, 0, 1.08, false);
  rect(c, m.metal, 636, 942, 713, 719, 1.06, 1.1);
  rect(c, ext, 942, 950, 615, 722, 0, CEILING);
  for (let px = 952; px < 1036; px += 11) rect(c, m.wood, px, px + 5, 704, 716, 0, CEILING, false);
  rect(c, m.facadeAccent, 942, 1040, 615, 722, CEILING, STORY - .16);
  if (!curtains) {
    const [ax, az] = planToTower(636, 615, q), [bx, bz] = planToTower(942, 716, q);
    b.collide(ax - .4, bx + .4, bz - .04, bz + .4, 'apt'); // guarda-corpo frontal
    b.collide(ax - .4, ax + .03, az, bz, 'apt');           // lateral de vidro
    b.collide(bx - .03, bx + .4, az, bz, 'apt');           // parede do nicho
  }
  if (curtains) {
    let s = curtains.seed;
    const pick = () => ((s = (s * 9301 + 49297) % 233280) / 233280) < .42 ? curtains.lit : curtains.dark;
    const front = (from: number, to: number, sill: number, head: number) => rect(c, pick(), from + 5, to + 5, 600, 603, sill, head, false);
    for (const o of FRONT) front(o.from, o.to, o.sill, o.head);
    rect(c, pick(), 18, 21, 260 + SIDE[0].from, 260 + SIDE[0].to, 1.0, 2.2, false);
    rect(c, pick(), 183, 186, 5 + RECESS[0].from, 5 + RECESS[0].to, 1.0, 2.2, false);
    // interior escuro para não enxergar através do prédio
    rect(c, m.void, 20, 1180, 270, 598, 0, CEILING, false);
    rect(c, m.void, 185, 1020, 20, 262, 0, CEILING, false);
  }
}

export interface Spot { id: string; label: string; px: number; py: number; look: [number, number] }
export const APT_SPOTS: Spot[] = [
  { id: 'sala', label: 'Sala', px: 1000, py: 585, look: [660, 330] },
  { id: 'sacada', label: 'Sacada', px: 760, py: 660, look: [760, 1400] },
  { id: 'cozinha', label: 'Cozinha', px: 760, py: 380, look: [1010, 400] },
  { id: 'suite', label: 'Dormitório casal', px: 330, py: 310, look: [60, 450] },
  { id: 'dormitorio', label: 'Dormitório 2', px: 420, py: 215, look: [300, 60] },
  { id: 'solteiro', label: 'Dormitório 3', px: 500, py: 400, look: [560, 615] },
];

/** Interior completo (só no andar escolhido): divisórias, pisos, mobiliário e luminárias. */
export function apartmentInterior(b: Builder, m: Materials, y: number, lamps: THREE.Vector3[]) {
  const q: Quadrant = { sx: 1, sz: 1 };
  const c: Ctx = { b, m, q, y };
  // pisos
  for (const [x0, x1, y0, y1] of [[5, 250, 262, 615], [250, 635, 262, 360], [390, 635, 360, 615], [170, 460, 5, 262], [630, 1035, 130, 615]]) rect(c, m.oakFloor, x0, x1, y0, y1, -.02, 0, false);
  for (const [x0, x1, y0, y1] of [[250, 390, 360, 615], [460, 630, 5, 262], [1035, 1195, 410, 615]]) rect(c, m.tileFloor, x0, x1, y0, y1, -.02, 0, false);
  // rodapés brancos
  // divisórias internas
  const W = m.plaster;
  wall(c, W, 170, 262, 460, 262, [{ from: 210, to: 280, sill: 0, head: 2.1, kind: 'door' }], .12);
  wall(c, W, 5, 262, 170, 262, [], .12);
  wall(c, W, 250, 262, 250, 615, [{ from: 25, to: 95, sill: 0, head: 2.1, kind: 'door' }], .12);
  wall(c, W, 250, 360, 390, 360, [{ from: 15, to: 85, sill: 0, head: 2.1, kind: 'door' }], .12);
  wall(c, W, 390, 360, 390, 615, [], .12);
  wall(c, W, 390, 360, 635, 360, [{ from: 80, to: 150, sill: 0, head: 2.1, kind: 'door' }], .12);
  wall(c, W, 635, 360, 635, 615, [], .12);
  wall(c, W, 460, 5, 460, 262, [], .12);
  wall(c, W, 460, 262, 630, 262, [{ from: 80, to: 145, sill: 0, head: 2.1, kind: 'door' }], .12);
  wall(c, W, 630, 130, 630, 262, [], .12);
  wall(c, W, 1035, 410, 1035, 615, [{ from: 30, to: 120, sill: 0, head: 2.1, kind: 'door' }], .12);
  // revestimento dos banheiros (meia parede cerâmica)
  rect(c, m.tileWall, 256, 384, 366, 372, 0, 2.2, false); rect(c, m.tileWall, 466, 624, 11, 17, 0, 2.2, false);

  const col = (x0: number, x1: number, y0: number, y1: number) => { const [ax, az] = planToTower(x0, y0, q), [bx, bz] = planToTower(x1, y1, q); b.collide(ax, bx, az, bz, 'apt'); };

  // ---- Sala de estar ----
  cyl(c, m.rug, 745, 485, .95, 0, .012, 48);
  rect(c, m.sofa, 652, 735, 400, 595, .12, .44); // assento
  rect(c, m.sofa, 652, 676, 400, 595, .12, .82); // encosto
  rect(c, m.sofa, 652, 735, 400, 418, .12, .62); rect(c, m.sofa, 652, 735, 578, 595, .12, .62); // braços
  rect(c, m.sofaCushion, 678, 732, 420, 497, .44, .52); rect(c, m.sofaCushion, 678, 732, 499, 576, .44, .52);
  rect(c, m.charcoal, 655, 730, 402, 593, 0, .12);
  col(650, 737, 398, 597);
  cyl(c, m.oakFurniture, 790, 480, .32, 0, .36, 32); cyl(c, m.marbleDark, 790, 480, .34, .36, .4, 32);
  cyl(c, m.charcoal, 668, 383, .14, 0, .5, 16); cyl(c, m.lampShade, 668, 383, .12, .5, .72, 16, .08);
  plant(c, 672, 158, 1.1); plant(c, 862, 640, .7);
  // aparador e TV na parede do fundo
  rect(c, m.charcoal, 810, 935, 140, 172, 0, .55); rect(c, m.oakFurniture, 812, 933, 140, 172, .55, .58);
  rect(c, m.black, 830, 915, 136, 141, 1.0, 1.62);
  col(810, 935, 136, 175);
  // jantar
  cyl(c, m.marbleDark, 735, 240, .52, .74, .78, 40); cyl(c, m.charcoal, 735, 240, .06, 0, .74, 12); cyl(c, m.charcoal, 735, 240, .28, 0, .03, 24);
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; chair(c, 735 + Math.cos(a) * 64, 240 + Math.sin(a) * 64, a); }
  col(680, 790, 185, 295);
  pendant(c, 735, 240, 1.75, lamps);
  // cozinha
  rect(c, m.white, 968, 1033, 240, 532, 0, .86); rect(c, m.stoneTop, 965, 1035, 238, 534, .86, .9);
  rect(c, m.black, 978, 1020, 398, 440, .9, .905);
  for (const [px, py] of [[988, 408], [1010, 408], [988, 430], [1010, 430]]) cyl(c, m.charcoal, px, py, .05, .905, .915, 16);
  rect(c, m.steel, 975, 1025, 470, 515, .88, .905);
  rect(c, m.charcoal, 963, 1033, 262, 345, 0, 1.86); // refrigerador
  rect(c, m.white, 1000, 1033, 360, 532, 1.5, 2.2); // armários superiores
  rect(c, m.oakFurniture, 1000, 1033, 360, 532, 2.2, 2.3);
  col(960, 1035, 238, 534);
  // ilha / bancada de refeições
  rect(c, m.white, 832, 882, 338, 606, 0, .92); rect(c, m.stoneTop, 828, 886, 334, 610, .92, .96);
  col(826, 888, 332, 612);
  for (const py of [370, 440]) { cyl(c, m.oakFurniture, 812, py, .17, .62, .66, 20); cyl(c, m.charcoal, 812, py, .02, 0, .62, 8); }
  plant(c, 858, 360, .35, .96);
  pendant(c, 857, 420, 1.85, lamps); pendant(c, 857, 530, 1.85);
  ceilingLight(c, 760, 420, lamps);

  // ---- Dormitório casal (suíte da planta à esquerda) ----
  bed(c, 18, 205, 362, 505, 'x');
  col(16, 207, 360, 507);
  nightstand(c, 22, 62, 318, 352); nightstand(c, 22, 62, 515, 549);
  cyl(c, m.lampShade, 42, 335, .1, .5, .74, 16, .07); cyl(c, m.lampShade, 42, 532, .1, .5, .74, 16, .07);
  rect(c, m.oakFurniture, 12, 245, 553, 607, 0, 2.35); rect(c, m.charcoal, 12, 245, 551, 553, .2, 2.3, false); // roupeiro
  col(10, 247, 549, 609);
  rect(c, m.oakFurniture, 30, 200, 270, 298, 0, .78); col(28, 202, 268, 300);
  ceilingLight(c, 130, 440, lamps);
  // ---- Dormitório 2 (bloco superior) ----
  bed(c, 265, 445, 18, 150, 'z');
  col(263, 447, 16, 152);
  nightstand(c, 232, 262, 20, 55); nightstand(c, 448, 455, 20, 55);
  rect(c, m.oakFurniture, 185, 360, 202, 252, 0, 2.35); col(183, 362, 200, 254);
  rect(c, m.oakFurniture, 183, 215, 30, 190, .72, .76); col(181, 217, 28, 192);
  chair(c, 235, 110, Math.PI);
  ceilingLight(c, 320, 120, lamps);
  // ---- Dormitório 3 (solteiro) ----
  bed(c, 535, 620, 375, 565, 'z', true);
  col(533, 622, 373, 567);
  rect(c, m.oakFurniture, 396, 446, 445, 607, 0, 2.35); col(394, 448, 443, 609);
  rect(c, m.oakFurniture, 470, 530, 590, 607, 0, .62);
  ceilingLight(c, 510, 480);
  // ---- Banheiros ----
  bath(c, 250, 390, 360, 615, 'bottom');
  bath(c, 460, 630, 5, 262, 'top');
  // ---- Área de serviço ----
  rect(c, m.white, 1045, 1110, 425, 490, 0, .86); cyl(c, m.charcoal, 1077, 425, .15, .45, .55, 24);
  rect(c, m.white, 1125, 1190, 420, 470, 0, .86); rect(c, m.steel, 1132, 1183, 426, 464, .86, .9);
  col(1043, 1192, 418, 492);
  // ---- Sacada gourmet ----
  rect(c, m.brick, 880, 938, 622, 712, 0, .9); rect(c, m.stoneTop, 878, 940, 620, 714, .9, .94);
  rect(c, m.charcoal, 890, 930, 630, 705, .94, 1.0);
  col(878, 940, 620, 714);
  cyl(c, m.oakFurniture, 760, 668, .38, .72, .76, 28); cyl(c, m.charcoal, 760, 668, .04, 0, .72, 10);
  chair(c, 705, 668, Math.PI); chair(c, 815, 668, 0);
  col(715, 805, 628, 708);
  plant(c, 655, 700, .6);
}

// ---------- peças de mobiliário ----------
function chair(c: Ctx, px: number, py: number, angle: number) {
  const [x, z] = planToTower(px, py, c.q);
  const g = new THREE.Group();
  const seat = new THREE.BoxGeometry(.44, .05, .44);
  const legGeo = new THREE.CylinderGeometry(.018, .018, .45, 6);
  const back = new THREE.BoxGeometry(.04, .42, .42);
  // gira para que o encosto fique do lado de fora da mesa
  const rot = -angle;
  const b = c.b;
  b.add(c.m.oakFurniture, seat, x, c.y + .46, z, rot);
  const ox = Math.cos(angle) * .2, oz = Math.sin(angle) * .2;
  const [bx, bz] = [x + ox * c.q.sx * 1, z + oz * c.q.sz * 1];
  b.add(c.m.oakFurniture, back, bx, c.y + .7, bz, rot);
  for (const [dx, dz] of [[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]]) b.add(c.m.charcoal, legGeo, x + dx, c.y + .225, z + dz, 0);
  g.clear();
}
function plant(c: Ctx, px: number, py: number, size: number, y0 = 0) {
  cyl(c, c.m.pot, px, py, .16 * size + .06, y0, y0 + .38 * size + .05, 20, .19 * size + .07);
  const [x, z] = planToTower(px, py, c.q);
  const leaf = new THREE.IcosahedronGeometry(1, 1);
  for (let k = 0; k < 5; k++) {
    const a = k * 1.26, r = .14 * size;
    c.b.add(c.m.leaf, leaf, x + Math.cos(a) * r, c.y + y0 + (.55 + .16 * (k % 3)) * size, z + Math.sin(a) * r, a, true, .22 * size, .3 * size, .2 * size);
  }
}
function pendant(c: Ctx, px: number, py: number, y: number, lamps?: THREE.Vector3[]) {
  cyl(c, c.m.charcoal, px, py, .006, y + .1, CEILING, 6);
  cyl(c, c.m.lampMetal, px, py, .2, y, y + .14, 32, .05);
  cyl(c, c.m.bulb, px, py, .08, y - .01, y + .02, 16);
  if (lamps) { const [x, z] = planToTower(px, py, c.q); lamps.push(new THREE.Vector3(x, c.y + y - .1, z)); }
}
function ceilingLight(c: Ctx, px: number, py: number, lamps?: THREE.Vector3[]) {
  cyl(c, c.m.bulb, px, py, .12, CEILING - .02, CEILING, 24);
  if (lamps) { const [x, z] = planToTower(px, py, c.q); lamps.push(new THREE.Vector3(x, c.y + CEILING - .25, z)); }
}
function nightstand(c: Ctx, x0: number, x1: number, y0: number, y1: number) { rect(c, c.m.oakFurniture, x0, x1, y0, y1, 0, .5); }
function bed(c: Ctx, x0: number, x1: number, y0: number, y1: number, headAt: 'x' | 'z', single = false) {
  const m = c.m;
  rect(c, m.oakFurniture, x0, x1, y0, y1, .08, .32);
  rect(c, m.linen, x0 + 3, x1 - 3, y0 + 3, y1 - 3, .32, .52);
  if (headAt === 'x') {
    rect(c, m.headboard, x0 - 4, x0 + 4, y0 - 6, y1 + 6, 0, 1.15);
    rect(c, m.duvet, x0 + 70, x1 - 2, y0 + 1, y1 - 1, .5, .58);
    rect(c, m.throwBlanket, x1 - 50, x1 - 2, y0 + 1, y1 - 1, .58, .6);
    rect(c, m.pillow, x0 + 8, x0 + 42, y0 + 10, (y0 + y1) / 2 - 4, .52, .66); rect(c, m.pillow, x0 + 8, x0 + 42, (y0 + y1) / 2 + 4, y1 - 10, .52, .66);
  } else {
    rect(c, m.headboard, x0 - 6, x1 + 6, y0 - 4, y0 + 4, 0, 1.15);
    rect(c, m.duvet, x0 + 1, x1 - 1, y0 + 60, y1 - 2, .5, .58);
    rect(c, m.throwBlanket, x0 + 1, x1 - 1, y1 - 45, y1 - 2, .58, .6);
    if (single) rect(c, m.pillow, x0 + 12, x1 - 12, y0 + 8, y0 + 40, .52, .66);
    else { rect(c, m.pillow, x0 + 10, (x0 + x1) / 2 - 4, y0 + 8, y0 + 42, .52, .66); rect(c, m.pillow, (x0 + x1) / 2 + 4, x1 - 10, y0 + 8, y0 + 42, .52, .66); }
  }
}
function bath(c: Ctx, x0: number, x1: number, y0: number, y1: number, showerSide: 'top' | 'bottom') {
  const m = c.m;
  const sy0 = showerSide === 'top' ? y0 + 6 : y1 - 95, sy1 = showerSide === 'top' ? y0 + 100 : y1 - 6;
  rect(c, m.tileFloor, x0 + 6, x1 - 6, sy0, sy1, 0, .03, false);
  const gy = showerSide === 'top' ? sy1 : sy0;
  rect(c, m.showerGlass, x0 + 6, x1 - 50, gy - 1, gy + 1, .03, 2.05, false);
  cyl(c, m.steel, (x0 + x1) / 2, (sy0 + sy1) / 2, .1, 2.05, 2.07, 20);
  const vy = showerSide === 'top' ? y1 - 50 : y0 + 10;
  rect(c, m.oakFurniture, x1 - 60, x1 - 6, vy, vy + 45, .3, .82); rect(c, m.white, x1 - 58, x1 - 8, vy + 2, vy + 43, .82, .86);
  rect(c, m.mirror, x1 - 8, x1 - 6, vy, vy + 45, 1.05, 1.75, false);
  const ty = showerSide === 'top' ? y1 - 110 : y0 + 75;
  cyl(c, m.white, x0 + 28, ty + 20, .2, 0, .4, 24); rect(c, m.white, x0 + 8, x0 + 20, ty, ty + 40, .4, .78);
  const [ax, az] = planToTower(x1 - 62, vy - 2, c.q), [bx, bz] = planToTower(x1 - 4, vy + 47, c.q); c.b.collide(ax, bx, az, bz, 'apt');
  const [tx, tz] = planToTower(x0 + 6, ty - 2, c.q), [ux, uz] = planToTower(x0 + 50, ty + 42, c.q); c.b.collide(tx, ux, tz, uz, 'apt');
}
