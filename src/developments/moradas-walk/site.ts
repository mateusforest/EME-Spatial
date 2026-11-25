import * as THREE from 'three';
import { Builder, type Collider } from './kit';
import { apartmentInterior, apartmentShell, HALF_W, PODIUM, STORY, CEILING } from './apartment';
import type { Materials } from './materials';

// Implantação conceitual a partir das perspectivas comerciais (hero, piscina, quadra, fogo de chão).
// Não é levantamento: distâncias, recuos e orientação são ilustrativos.
export const TOWERS = {
  a: { id: 'a' as const, x: -16, z: -12, floors: 8, label: 'Torre A' },
  b: { id: 'b' as const, x: 16, z: -14, floors: 9, label: 'Torre B' },
};
export const LOT = { minX: -44, maxX: 46, minZ: -36, maxZ: 34 };
export const floorY = (floor: number) => PODIUM + (floor - 1) * STORY;

export interface Place { id: string; label: string; group: 'lazer' | 'apto' | 'chegada'; pos: [number, number]; look: [number, number, number]; inside?: boolean }
export const PLACES: Place[] = [
  { id: 'portaria', label: 'Chegada', group: 'chegada', pos: [2, 40], look: [0, 10, -12] },
  { id: 'acesso', label: 'Acesso às torres', group: 'chegada', pos: [0, 20], look: [-16, 6, -12] },
  { id: 'piscina', label: 'Piscina', group: 'lazer', pos: [6, 13], look: [22, .5, 5] },
  { id: 'salao', label: 'Salão de festas', group: 'lazer', pos: [31, 5], look: [20, 1.2, 7] },
  { id: 'fogo', label: 'Fogo de chão', group: 'lazer', pos: [3, 16.5], look: [2, .3, 10] },
  { id: 'playground', label: 'Playground', group: 'lazer', pos: [-6, 18], look: [-7, 1, 10] },
  { id: 'quadra', label: 'Quadra', group: 'lazer', pos: [-14, 21], look: [-28, .5, 11] },
  { id: 'estacionamento', label: 'Estacionamento', group: 'chegada', pos: [33, 4], look: [37, 1, -20] },
];

export interface SiteResult { colliders: Collider[]; aptColliders: Collider[]; setFloor: (floor: number) => void; lamps: THREE.Vector3[]; outdoorLights: THREE.Vector3[]; aptGroup: THREE.Group; fires: THREE.Vector3[] }

export function buildSite(scene: THREE.Scene, m: Materials, tree?: THREE.Object3D): SiteResult {
  const ground = new Builder();   // superfícies onde se caminha
  const world = new Builder();    // tudo o mais, estático
  const outdoorLights: THREE.Vector3[] = [];
  const fires: THREE.Vector3[] = [];

  // ---------- Terreno, rua e calçadas ----------
  // gramado em quatro peças, deixando o vão da piscina aberto
  for (const [x0, x1, z0, z1] of [[-450, 450, -450, 3.8], [-450, 450, 9.2, 450], [-450, 7.8, 3.8, 9.2], [22.2, 450, 3.8, 9.2]]) ground.span(m.grass, x0, x1, -.1, 0, z0, z1, false);
  ground.span(m.asphalt, -400, 400, 0, .02, 37, 45, false);
  ground.span(m.paving, -400, 400, 0, .1, 34, 37, false);
  ground.span(m.paving, -400, 400, 0, .1, 45, 48, false);
  for (let x = -396; x < 400; x += 9) world.span(m.line, x, x + 4, .02, .03, 40.9, 41.1, false);
  // rua lateral
  ground.span(m.asphalt, 52, 60, 0, .02, -400, 37, false);
  ground.span(m.paving, 48, 52, 0, .1, -400, 34, false);

  // ---------- Pisos do condomínio ----------
  ground.span(m.paving, -4, 6, 0, .06, -6, 34, false); // eixo de acesso
  ground.span(m.paving, -30, 30, 0, .06, -7, -2, false); // frente das torres
  ground.span(m.paving, 6, 28, 0, .06, 12, 15.5, false);
  ground.span(m.paving, -14, -4, 0, .06, 18, 21, false);
  ground.span(m.asphalt, 28, 46, 0, .04, -34, 0, false); // estacionamento
  ground.span(m.asphalt, -44, 46, 0, .04, -36, -27, false);
  for (let z = -32; z < -2; z += 2.6) world.span(m.line, 30.5, 34.5, .04, .05, z, z + .08, false);
  for (let z = -32; z < -2; z += 2.6) world.span(m.line, 39.5, 43.5, .04, .05, z, z + .08, false);
  const carColors = m.car;
  let ci = 0;
  for (let z = -30.7; z < -4; z += 5.2) { if ((z * 7 | 0) % 3) car(world, m, carColors[ci++ % 4], 32.5, z, Math.PI / 2); if ((z * 5 | 0) % 2) car(world, m, carColors[ci++ % 4], 41.5, z + 2.6, -Math.PI / 2); }
  for (let x = -40; x < 26; x += 7.5) if ((x | 0) % 2) car(world, m, carColors[ci++ % 4], x, -33.5, 0);
  for (const z of [-28, -14]) world.collide(30, 35, z - 2, z + 2, 'ground');

  // ---------- Muro, gradil e portaria ----------
  const fenceLine = (x0: number, z0: number, x1: number, z1: number) => {
    world.span(m.stone, x0, x1 || x0 + .25, 0, .9, z0, z1 || z0 + .25);
    const len = Math.hypot(x1 - x0, z1 - z0);
    for (let t = 0; t < len; t += .14) { const x = x0 + (x1 - x0) * t / len, z = z0 + (z1 - z0) * t / len; world.box(m.fence, x, 1.55, z, .03, 1.3, .03, 0, false); }
    world.box(m.fence, (x0 + x1) / 2, 2.2, (z0 + z1) / 2, Math.abs(x1 - x0) + .05, .05, Math.abs(z1 - z0) + .05);
  };
  fenceLine(LOT.minX, 33.6, -5, 33.85); fenceLine(10, 33.6, 46, 33.85);
  world.collide(LOT.minX, -5, 33.4, 34, 'ground'); world.collide(10, 28, 33.4, 34, 'ground'); world.collide(34, 46, 33.4, 34, 'ground');
  // portão de veículos (28–34) fica aberto
  fenceLine(LOT.minX, LOT.minZ, LOT.minX + .25, 33.6); world.collide(LOT.minX - .3, LOT.minX + .3, LOT.minZ, 34, 'ground');
  fenceLine(LOT.maxX, LOT.minZ, LOT.maxX + .25, 33.6); world.collide(LOT.maxX - .3, LOT.maxX + .3, LOT.minZ, 34, 'ground');
  world.span(m.stone, LOT.minX, LOT.maxX, 0, 2.2, LOT.minZ - .25, LOT.minZ); world.collide(LOT.minX, LOT.maxX, LOT.minZ - .5, LOT.minZ + .2, 'ground');
  // portaria com marquise
  world.span(m.facadeGrey, 6.5, 10, 0, 2.8, 28.5, 32.5); world.span(m.glass, 6.4, 6.5, .9, 2.5, 29, 32);
  world.span(m.facadeAccent, -5.5, 11, 3.4, 3.6, 28.5, 34.2); world.span(m.wood, -5.5, 11, 3.36, 3.4, 28.5, 34.2, false);
  for (const x of [-5.2, 10.7]) world.span(m.facadeAccent, x - .15, x + .15, 0, 3.4, 33.6, 34);
  world.span(m.facadeGrey, 6.5, 10, 2.8, 3.4, 28.5, 32.5);
  world.collide(6.5, 10, 28.5, 32.5, 'ground');
  outdoorLights.push(new THREE.Vector3(0, 2.6, 31), new THREE.Vector3(2, 2.6, 31));

  // ---------- Torres ----------
  const fl: THREE.Group[] = [];
  for (const t of Object.values(TOWERS)) {
    world.offset.set(t.x, 0, t.z);
    // térreo: pilotis, hall de vidro, revestimento de madeira
    world.span(m.facade, -HALF_W, HALF_W, 0, PODIUM - .16, -8, -1.2);
    world.span(m.wood, -HALF_W + 1, -4, 0, PODIUM - .16, 5.6, 6.2);
    world.span(m.wood, 4, HALF_W - 1, 0, PODIUM - .16, 5.6, 6.2);
    world.span(m.glass, -4, 4, 0, PODIUM - .16, 6.1, 6.2);
    world.span(m.void, -3.9, 3.9, 0, PODIUM - .2, -1.2, 6);
    world.span(m.facade, -HALF_W, -4, 0, PODIUM - .16, -1.2, 5.6); world.span(m.facade, 4, HALF_W, 0, PODIUM - .16, -1.2, 5.6);
    world.span(m.facadeAccent, -4.3, 4.3, PODIUM - .5, PODIUM - .16, 6.2, 9.5); // marquise de entrada
    world.collide(-HALF_W, HALF_W, -8.2, 6.3, 'ground');
    outdoorLights.push(new THREE.Vector3(t.x, PODIUM - .7, t.z + 8.5));
    // núcleo de circulação (escada e elevadores) entre as quatro unidades
    for (let f = 1; f <= t.floors; f++) {
      const y = floorY(f);
      world.span(m.facade, -HALF_W + 1.66, HALF_W - 1.66, y - .16, y + STORY - .16, -1.05, 1.05);
      world.span(m.facadeGrey, -5.6, 5.6, y - .16, y + STORY - .16, -2.3, 2.3);
      for (const sz of [1, -1] as const) for (const sx of [1, -1] as const) {
        if (t.id === 'a' && sx === 1 && sz === 1) continue; // unidade navegável fica à parte
        apartmentShell(world, m, { sx, sz }, y, { lit: m.curtainLit, dark: m.curtainDark, seed: f * 31 + sx * 7 + sz * 3 + (t.id === 'a' ? 0 : 101) });
      }
    }
    if (t.id === 'a') {
      for (let f = 1; f <= t.floors; f++) {
        const b = new Builder(); b.offset.set(t.x, 0, t.z);
        apartmentShell(b, m, { sx: 1, sz: 1 }, floorY(f), { lit: m.curtainLit, dark: m.curtainDark, seed: f * 17 });
        const g = new THREE.Group(); g.name = `torreA-unidade-andar-${f}`; b.build(g); scene.add(g); fl[f] = g;
      }
    }
    // cobertura
    const roof = floorY(t.floors + 1);
    world.span(m.facade, -HALF_W - .1, HALF_W + .1, roof - .16, roof + .9, 7.3, 7.5);
    world.span(m.facade, -HALF_W - .1, HALF_W + .1, roof - .16, roof + .9, -7.5, -7.3);
    world.span(m.facade, -HALF_W - .1, -HALF_W + .1, roof - .16, roof + .9, -7.5, 7.5);
    world.span(m.facade, HALF_W - .1, HALF_W + .1, roof - .16, roof + .9, -7.5, 7.5);
    world.span(m.slab, -HALF_W, HALF_W, roof - .16, roof - .02, -7.4, 7.4);
    world.span(m.facadeGrey, -5, 5, roof, roof + 3.4, -4, 2.5); // casa de máquinas e reservatório
    world.span(m.facadeAccent, -5.2, 5.2, roof + 3.4, roof + 3.6, -4.2, 2.7);
    world.offset.set(0, 0, 0);
  }

  // ---------- Piscina e deck ----------
  for (const [x0, x1, z0, z1] of [[5, 25, 1, 3.6], [5, 25, 9.4, 12], [5, 7.6, 3.6, 9.4], [22.4, 25, 3.6, 9.4]]) ground.span(m.deck, x0, x1, 0, .08, z0, z1, false);
  ground.span(m.paving, 5, 25, 0, .07, -2, 1, false);
  world.span(m.poolTile, 8, 22, -1.4, -1.3, 4, 9, false);
  world.span(m.poolTile, 7.8, 8, -1.4, .09, 3.8, 9.2); world.span(m.poolTile, 22, 22.2, -1.4, .09, 3.8, 9.2);
  world.span(m.poolTile, 7.8, 22.2, -1.4, .09, 3.8, 4); world.span(m.poolTile, 7.8, 22.2, -1.4, .09, 9, 9.2);
  world.span(m.stone, 7.6, 22.4, .08, .12, 3.6, 3.85); world.span(m.stone, 7.6, 22.4, .08, .12, 9.15, 9.4);
  world.span(m.stone, 7.6, 7.85, .08, .12, 3.6, 9.4); world.span(m.stone, 22.15, 22.4, .08, .12, 3.6, 9.4);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(14, 5), m.water); water.rotation.x = -Math.PI / 2; water.position.set(15, -.08, 6.5); water.name = 'agua'; water.receiveShadow = true;
  scene.add(water);
  world.collide(7.8, 22.2, 3.8, 9.2, 'ground');
  // boia (como na perspectiva)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.55, .2, 14, 30), m.playRed); ring.rotation.x = -Math.PI / 2; ring.position.set(16.5, -.02, 6.8); ring.castShadow = true; scene.add(ring);
  for (let x = 9; x < 21; x += 2.6) { lounger(world, m, x, 10.6); }
  umbrella(world, m, 23.5, 10.5);
  for (let x = 8; x <= 22; x += 3.5) outdoorLights.push(new THREE.Vector3(x, .4, 2.5));
  // muro de pedra com arandelas atrás da piscina (perspectiva da piscina)
  world.span(m.houseWall2, 5, 25, 0, 2.4, .2, .5); world.collide(5, 25, .2, .5, 'ground');
  for (let x = 7; x < 25; x += 4) world.span(m.poleLight, x - .08, x + .08, 1.9, 2.05, .5, .56, false);

  // ---------- Salão de festas ----------
  world.span(m.brick, 26, 40, 0, 3.4, -2, -1.7); world.span(m.brick, 39.7, 40, 0, 3.4, -2, 12);
  world.span(m.brick, 26, 40, 0, 3.4, 11.7, 12);
  world.span(m.glass, 25.9, 26, 0, 3.1, -1.7, 11.7);
  for (let z = -1.7; z <= 11.7; z += 2.7) world.span(m.metal, 25.85, 26.05, 0, 3.1, z - .04, z + .04);
  world.span(m.facadeAccent, 22.5, 40.3, 3.1, 3.5, -2.3, 12.3);
  world.span(m.wood, 22.5, 26, 3.04, 3.1, -2.3, 12.3);
  for (const z of [-2, 4.5, 12]) world.span(m.facadeAccent, 22.6, 22.9, 0, 3.1, z - .15, z + .15);
  ground.span(m.tileFloor, 26, 39.7, 0, .09, -1.7, 11.7, false);
  for (const [x, z] of [[29, 1.5], [29, 6], [33.5, 1.5], [33.5, 6], [29, 10], [33.5, 10]]) {
    world.cyl(m.oakFurniture, x, .74, z, .55, .55, .04, 24); world.cyl(m.charcoal, x, .37, z, .05, .05, .72, 8);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; world.box(m.wood, x + Math.cos(a) * .8, .45, z + Math.sin(a) * .8, .42, .05, .42); world.box(m.wood, x + Math.cos(a) * 1, .7, z + Math.sin(a) * 1, Math.abs(Math.cos(a)) * .04 + Math.abs(Math.sin(a)) * .4, .45, Math.abs(Math.sin(a)) * .04 + Math.abs(Math.cos(a)) * .4); }
    world.collide(x - 1.1, x + 1.1, z - 1.1, z + 1.1, 'ground');
  }
  world.span(m.white, 36.5, 39.6, 0, .92, -1.5, 5); world.span(m.stoneTop, 36.4, 39.65, .92, .96, -1.6, 5.1); world.collide(36.4, 40, -2, 5.1, 'ground');
  world.collide(25.8, 26.1, -1.7, 11.7, 'ground'); world.collide(26, 40, -2.1, -1.6, 'ground'); world.collide(39.6, 40.1, -2, 12, 'ground'); world.collide(26, 40, 11.6, 12.1, 'ground');
  // porta de vidro do salão fica aberta entre z 4 e 7
  const salaoColliders = world.colliders.filter(c => c.minX === 25.8);
  for (const c of salaoColliders) { world.colliders.splice(world.colliders.indexOf(c), 1); }
  world.collide(25.8, 26.1, -1.7, 4, 'ground'); world.collide(25.8, 26.1, 7, 11.7, 'ground');
  for (const [x, z] of [[30, 3.5], [30, 8], [35, 3.5], [35, 8]]) outdoorLights.push(new THREE.Vector3(x, 2.9, z));

  // ---------- Fogo de chão ----------
  ground.cyl(m.stone, 2, .05, 10, 3.4, 3.4, .1, 40);
  world.cyl(m.concrete, 2, .3, 10, .75, .65, .5, 28);
  world.cyl(m.fire, 2, .58, 10, .45, .45, .08, 20);
  fires.push(new THREE.Vector3(2, 1, 10));
  for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5 + .3; lowChair(world, m, 2 + Math.cos(a) * 2.2, 10 + Math.sin(a) * 2.2, a); }
  world.collide(1.2, 2.8, 9.2, 10.8, 'ground');
  // canteiro curvo com pergolado de madeira (perspectiva do fogo de chão)
  for (let x = -1.2; x <= 5.2; x += .4) world.span(m.wood, x - .05, x + .05, 0, 2.6, 6.9, 7.1);
  world.span(m.wood, -1.3, 5.3, 2.6, 2.7, 6.7, 7.3);

  // ---------- Playground ----------
  ground.span(m.rubber, -13, -1, 0, .07, 6, 15, false);
  const playMats = [m.playRed, m.playYellow, m.playBlue];
  world.span(m.playYellow, -10.5, -7.5, 0, 1.6, 8.5, 11.5);
  world.span(m.wood, -10.7, -7.3, 1.6, 1.7, 8.3, 11.7);
  world.add(m.playRed, new THREE.ConeGeometry(2.2, 1.4, 4), -9, 2.4, 10, Math.PI / 4);
  world.add(m.playBlue, new THREE.BoxGeometry(1, .08, 3.6), -6.4, .85, 10, 0, true, 1, 1, 1, 0, -.45);
  for (let k = 0; k < 3; k++) world.span(m.fence, -4.8 + k * .02, -4.7 + k * .02, 0, 2.4, 12.4 + k * 0, 12.5);
  world.span(m.fence, -4.8, -1.8, 2.35, 2.45, 12.4, 12.5); world.span(m.fence, -1.9, -1.8, 0, 2.4, 12.4, 12.5);
  for (const x of [-4, -2.6]) { world.span(playMats[(x * -1 | 0) % 3], x - .25, x + .25, .45, .5, 12.3, 12.6); world.span(m.fence, x - .01, x + .01, .5, 2.4, 12.44, 12.46, false); }
  world.collide(-10.7, -5.8, 8.3, 11.7, 'ground'); world.collide(-4.9, -1.7, 12.2, 12.7, 'ground');
  world.span(m.wood, -12.5, -11.5, 0, .45, 6.5, 8.5); // banco

  // ---------- Quadra society ----------
  ground.span(m.turf, -40, -16, 0, .07, 3, 18, false);
  const ln = (x0: number, x1: number, z0: number, z1: number) => world.span(m.line, x0, x1, .07, .075, z0, z1, false);
  ln(-39, -17, 3.9, 4.05); ln(-39, -17, 16.95, 17.1); ln(-39.05, -38.9, 3.9, 17.1); ln(-17.1, -16.95, 3.9, 17.1); ln(-28.08, -27.92, 3.9, 17.1);
  const circle = new THREE.RingGeometry(2.4, 2.55, 48); circle.rotateX(-Math.PI / 2); world.add(m.line, circle, -28, .076, 10.5, 0, false);
  for (const x of [-38.9, -17.1]) { const s = Math.sign(x + 28); world.span(m.line, x - .05, x + .05, 0, 2, 9.4, 9.5); world.span(m.line, x - .05, x + .05, 0, 2, 11.5, 11.6); world.span(m.line, x - .05, x + .05, 1.95, 2.05, 9.4, 11.6); world.span(m.net, x + s * .02, x + s * .8, 0, 2, 9.45, 11.55, false); }
  for (let x = -40; x <= -16; x += 3) { world.span(m.fence, x - .04, x + .04, 0, 4, 2.96, 3.04); world.span(m.fence, x - .04, x + .04, 0, 4, 17.96, 18.04); }
  for (let z = 3; z <= 18; z += 3) { world.span(m.fence, -40.04, -39.96, 0, 4, z - .04, z + .04); world.span(m.fence, -16.04, -15.96, 0, 4, z - .04, z + .04); }
  world.span(m.net, -40, -16, 0, 4, 2.99, 3.01, false); world.span(m.net, -40, -16, 0, 4, 17.99, 18.01, false);
  world.span(m.net, -40.01, -39.99, 0, 4, 3, 18, false); world.span(m.net, -16.01, -15.99, 0, 4, 3, 10, false); world.span(m.net, -16.01, -15.99, 0, 4, 12, 18, false);
  world.collide(-40.1, -15.9, 2.9, 3.1, 'ground'); world.collide(-40.1, -15.9, 17.9, 18.1, 'ground'); world.collide(-40.1, -39.9, 3, 18, 'ground');
  world.collide(-16.1, -15.9, 3, 10, 'ground'); world.collide(-16.1, -15.9, 12, 18, 'ground');
  ball(world, m, -25, 9);

  // ---------- Postes, bancos, canteiros ----------
  for (const [x, z] of [[-2, 24], [6, 24], [-2, 6], [6, 0], [-20, 21], [16, 16], [26, 15]]) {
    world.cyl(m.fence, x, 1.75, z, .05, .07, 3.5, 10); world.box(m.facadeAccent, x, 3.55, z, .5, .1, .25); world.box(m.poleLight, x, 3.49, z, .4, .02, .18, 0, false);
    outdoorLights.push(new THREE.Vector3(x, 3.3, z)); world.collide(x - .1, x + .1, z - .1, z + .1, 'ground');
  }
  for (const [x, z] of [[-2.5, 28], [6.5, 28], [-2.5, 12], [12, 14]]) { world.span(m.wood, x - .9, x + .9, .42, .47, z - .25, z + .25); world.span(m.concrete, x - .8, x - .6, 0, .42, z - .2, z + .2); world.span(m.concrete, x + .6, x + .8, 0, .42, z - .2, z + .2); world.collide(x - .9, x + .9, z - .3, z + .3, 'ground'); }

  // ---------- Vegetação ----------
  const trees: [number, number, number][] = [];
  for (let x = -41; x <= 44; x += 6.5) { if (x < -5 || x > 11) trees.push([x, 31.5, 1 + (x % 3) * .08]); }
  for (let z = -30; z < 30; z += 7) { trees.push([-42, z, 1.1]); if (z > 14 || z < -36) trees.push([44, z, 1.05]); }
  trees.push([-8, 25, 1.25], [12, 23, 1.2], [20, 27, .95], [-25, 25, 1.15], [-34, 24, .9], [24, 17.5, .85], [-1, 3, .8], [9, -1, .7], [-12, 2, .85]);
  for (let x = -38; x < 28; x += 8) trees.push([x, -24.5, .95]);
  const shrubGeo = new THREE.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 60; i++) { const x = -40 + i * 1.45; if (x > -6 && x < 12) continue; world.add(m.leaf, shrubGeo, x, .45, 32.6, i, true, .75, .55, .65); }
  for (const [x, z, s] of trees) placeTree(world, m, tree, x, z, s);
  for (const [x, z] of trees) world.collide(x - .3, x + .3, z - .3, z + .3, 'ground');

  // ---------- Vizinhança (casas térreas, sobrados e alguns prédios ao longe) ----------
  let seed = 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let gx = -260; gx <= 260; gx += 22) for (let gz = -260; gz <= 260; gz += 24) {
    if (gx > -60 && gx < 66 && gz > -50 && gz < 60) continue;
    if (Math.abs(gz - 41) < 14) continue;
    if (gx > 40 && gx < 70) continue;
    const x = gx + (r() - .5) * 6, z = gz + (r() - .5) * 6;
    const d = Math.hypot(x, z);
    if (d > 150 && r() < .9) { if (r() < .05) world.span(m.houseWall2, x - 8, x + 8, 0, 18 + r() * 30, z - 8, z + 8); continue; }
    house(world, m, x, z, r);
    if (r() < .5) placeTree(world, m, undefined, x + 7, z + 5, .8 + r() * .4);
  }
  // prédios do entorno (como na foto aérea)
  for (const [x, z, h] of [[-120, -90, 36], [-150, -40, 28], [110, -120, 42], [150, -60, 24], [-90, 150, 30], [180, 90, 33]]) { world.span(m.houseWall2, x - 9, x + 9, 0, h, z - 7, z + 7); world.span(m.facadeGrey, x - 9.1, x + 9.1, h, h + 2, z - 7.1, z + 7.1); }

  // ---------- Montagem ----------
  const staticGroup = new THREE.Group(); staticGroup.name = 'condominio';
  world.build(staticGroup); ground.build(staticGroup, 'ground');
  scene.add(staticGroup);

  // ---------- Apartamento navegável (Torre A, frente esquerda, Tipo 2) ----------
  const lamps: THREE.Vector3[] = [];
  const apt = new Builder(); apt.offset.set(TOWERS.a.x, 0, TOWERS.a.z);
  apartmentShell(apt, m, { sx: 1, sz: 1 }, 0);
  apartmentInterior(apt, m, 0, lamps);
  const aptGroup = new THREE.Group(); aptGroup.name = 'apartamento-tipo-2';
  const aptFloor = new Builder(); aptFloor.offset.set(TOWERS.a.x, 0, TOWERS.a.z);
  apt.build(aptGroup);
  // superfícies de piso clicáveis
  aptGroup.traverse(o => { if ((o as THREE.Mesh).isMesh && ((o as THREE.Mesh).material === m.oakFloor || (o as THREE.Mesh).material === m.tileFloor || (o as THREE.Mesh).material === m.balconyFloor)) o.userData.walk = 'apt'; });
  aptFloor.build(aptGroup, 'apt');
  scene.add(aptGroup);
  const setFloor = (floor: number) => {
    aptGroup.position.y = floorY(floor);
    fl.forEach((g, f) => { if (g) g.visible = f !== floor; });
  };
  setFloor(6);
  return { colliders: [...world.colliders], aptColliders: apt.colliders, setFloor, lamps, outdoorLights, aptGroup, fires };
}

void CEILING;

// ---------- peças ----------
function placeTree(b: Builder, m: Materials, tree: THREE.Object3D | undefined, x: number, z: number, s: number) {
  if (tree) {
    tree.updateMatrixWorld(true);
    tree.traverse(o => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const g = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
      b.add(mesh.material as THREE.Material, g, x, 0, z, (x * 13 + z * 7) % 6.28, true, s * 1.15, s * 1.25, s * 1.15);
      g.dispose();
    });
    return;
  }
  b.cyl(m.wood, x, 1.6 * s, z, .14 * s, .2 * s, 3.2 * s, 6);
  const leaf = new THREE.IcosahedronGeometry(1, 1);
  for (let k = 0; k < 3; k++) b.add(m.leaf, leaf, x + Math.sin(k * 2) * .7 * s, (3.6 + k * .4) * s, z + Math.cos(k * 2) * .7 * s, k, true, 1.6 * s, 1.3 * s, 1.5 * s);
}

function car(b: Builder, m: Materials, paint: THREE.Material, x: number, z: number, rot: number) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const at = (lx: number, lz: number): [number, number] => [x + lx * c + lz * s, z - lx * s + lz * c];
  const body = (lx: number, y: number, lz: number, w: number, h: number, d: number, mt: THREE.Material) => { const [px, pz] = at(lx, lz); b.box(mt, px, y, pz, w, h, d, rot); };
  body(0, .55, 0, 1.8, .55, 4.3, paint);
  body(0, 1.05, -.2, 1.6, .5, 2.2, m.carGlass);
  body(0, 1.32, -.2, 1.5, .06, 2, paint);
  const wheel = new THREE.CylinderGeometry(.33, .33, .22, 16); wheel.rotateZ(Math.PI / 2);
  for (const [lx, lz] of [[-.82, 1.35], [.82, 1.35], [-.82, -1.35], [.82, -1.35]]) { const [px, pz] = at(lx, lz); b.add(m.tyre, wheel, px, .33, pz, rot); }
}

function lounger(b: Builder, m: Materials, x: number, z: number) {
  b.span(m.lounger, x - .35, x + .35, .25, .35, z - .6, z + .9);
  b.add(m.lounger, new THREE.BoxGeometry(.7, .08, .7), x, .55, z - .85, 0, true, 1, 1, 1, .9);
  b.span(m.charcoal, x - .3, x + .3, 0, .25, z - .5, z + .8);
  b.collide(x - .4, x + .4, z - 1.2, z + 1, 'ground');
}
function umbrella(b: Builder, m: Materials, x: number, z: number) {
  b.cyl(m.charcoal, x, 1.2, z, .03, .03, 2.4, 8);
  b.add(m.umbrella, new THREE.ConeGeometry(1.5, .5, 10, 1, true), x, 2.45, z);
  b.collide(x - .1, x + .1, z - .1, z + .1, 'ground');
}
function lowChair(b: Builder, m: Materials, x: number, z: number, a: number) {
  b.add(m.wood, new THREE.BoxGeometry(.6, .06, .6), x, .3, z, -a);
  b.add(m.wood, new THREE.BoxGeometry(.06, .6, .6), x + Math.cos(a) * .3, .55, z + Math.sin(a) * .3, -a, true, 1, 1, 1, 0, 0);
  b.collide(x - .3, x + .3, z - .3, z + .3, 'ground');
}
function ball(b: Builder, m: Materials, x: number, z: number) { b.add(m.white, new THREE.SphereGeometry(.11, 16, 12), x, .18, z); }
function house(b: Builder, m: Materials, x: number, z: number, r: () => number) {
  const w = 8 + r() * 4, d = 9 + r() * 4, h = r() < .25 ? 5.8 : 3;
  b.span(r() < .5 ? m.houseWall : m.houseWall2, x - w / 2, x + w / 2, 0, h, z - d / 2, z + d / 2);
  const roof = new THREE.ConeGeometry(1, 1, 4, 1); roof.rotateY(Math.PI / 4);
  b.add(m.roofTile, roof, x, h + .9, z, 0, true, w * .78, 1.8, d * .78);
  b.span(m.void, x - 1, x + 1, .9, 2, z + d / 2, z + d / 2 + .02, false);
}
