import * as THREE from 'three';
import { mat, tex } from './kit';

export function createMaterials() {
  const plasterTex = tex.plaster();
  const oak = tex.oak();
  const fabric = (c: [number, number, number], uvm = .5) => mat({ color: '#ffffff', map: tex.fabric(c), roughness: .95, uvm });
  const water = tex.water(), waterNormal = tex.waterNormal();
  const m = {
    facade: mat({ color: '#f4f2ec', map: plasterTex, bumpMap: plasterTex, bumpScale: .4, roughness: .88, uvm: 3 }),
    plaster: mat({ color: '#f3f1ea', map: plasterTex, roughness: .92, uvm: 3 }),
    facadeBand: mat({ color: '#d8d4ca', roughness: .8 }),
    facadeAccent: mat({ color: '#565c60', roughness: .7 }),
    facadeGrey: mat({ color: '#6b7074', map: plasterTex, roughness: .8, uvm: 3 }),
    wood: mat({ color: '#ffffff', map: tex.wood(), roughness: .62, uvm: 1.2 }),
    slab: mat({ color: '#e9e6de', roughness: .9 }),
    balconySlab: mat({ color: '#e3e0d8', roughness: .85 }),
    balconyFloor: mat({ color: '#ffffff', map: tex.tile([196, 190, 180], 2), roughness: .6, uvm: 1.2 }),
    frame: mat({ color: '#f7f7f5', roughness: .35, metalness: .3 }),
    glass: mat({ color: '#cfe2e6', roughness: .03, metalness: .1, transparent: true, opacity: .16, depthWrite: false, envMapIntensity: 1.6 }, true),
    glassRail: mat({ color: '#d4e6ea', roughness: .02, transparent: true, opacity: .22, depthWrite: false, envMapIntensity: 1.6 }, true),
    showerGlass: mat({ color: '#e4f0f2', roughness: .02, transparent: true, opacity: .18, depthWrite: false }, true),
    metal: mat({ color: '#3f4446', roughness: .4, metalness: .7 }),
    steel: mat({ color: '#c9ccce', roughness: .25, metalness: .9 }),
    void: mat({ color: '#2a2824', roughness: 1 }),
    curtainLit: mat({ color: '#ece2cf', roughness: 1, emissive: '#ffcf8a', emissiveIntensity: 0 }),
    curtainDark: mat({ color: '#e1d9ca', roughness: 1 }),
    // interior
    oakFloor: mat({ color: '#ffffff', map: oak, roughness: .55, uvm: 1.8 }),
    tileFloor: mat({ color: '#ffffff', map: tex.tile([212, 208, 200], 2), roughness: .35, uvm: 1.2 }),
    tileWall: mat({ color: '#ffffff', map: tex.tile([232, 230, 224], 4), roughness: .3, uvm: 1.2 }),
    oakFurniture: mat({ color: '#ffffff', map: tex.oak([176, 136, 96]), roughness: .5, uvm: 1.2 }),
    white: mat({ color: '#f6f5f1', roughness: .4 }),
    black: mat({ color: '#121314', roughness: .25, metalness: .2 }),
    charcoal: mat({ color: '#2e3133', roughness: .55, metalness: .2 }),
    marbleDark: mat({ color: '#1d1f21', roughness: .18, metalness: .05 }),
    stoneTop: mat({ color: '#e7e3dc', roughness: .25 }),
    sofa: fabric([136, 150, 122]),
    sofaCushion: fabric([150, 164, 136]),
    rug: fabric([180, 178, 172], .8),
    linen: fabric([236, 232, 224]),
    duvet: fabric([242, 239, 233]),
    throwBlanket: fabric([186, 160, 132]),
    pillow: fabric([226, 220, 208]),
    headboard: fabric([200, 188, 170]),
    lampShade: mat({ color: '#efe6d4', roughness: .9, emissive: '#ffd9a0', emissiveIntensity: 0 }),
    lampMetal: mat({ color: '#2a2b2c', roughness: .4, metalness: .6 }),
    bulb: mat({ color: '#fff8ea', emissive: '#ffe2b0', emissiveIntensity: .3 }),
    mirror: mat({ color: '#dfe6e8', roughness: .02, metalness: 1 }),
    pot: mat({ color: '#b9aa96', roughness: .85 }),
    leaf: mat({ color: '#4e6e3c', roughness: .8 }),
    brick: mat({ color: '#ffffff', map: tex.roofTile(), roughness: .9, uvm: .8 }),
    // exterior
    grass: mat({ color: '#ffffff', map: tex.grass(), roughness: 1, uvm: 3 }),
    turf: mat({ color: '#ffffff', map: tex.turf(), roughness: .95, uvm: 4 }),
    paving: mat({ color: '#ffffff', map: tex.paving(), roughness: .85, uvm: 2 }),
    asphalt: mat({ color: '#ffffff', map: tex.asphalt(), roughness: .95, uvm: 4 }),
    deck: mat({ color: '#ffffff', map: tex.oak([150, 104, 70]), roughness: .7, uvm: 1.6 }),
    poolTile: mat({ color: '#ffffff', map: tex.tile([214, 222, 220], 6), roughness: .3, uvm: 1.2 }),
    water: mat({ color: '#9fe0ec', map: water, normalMap: waterNormal, normalScale: new THREE.Vector2(.6, .6), roughness: .05, metalness: .1, transparent: true, opacity: .82, uvm: 3 }, true),
    stone: mat({ color: '#ffffff', map: tex.stone(), roughness: .9, uvm: 1.5 }),
    concrete: mat({ color: '#b7b3aa', roughness: .9 }),
    line: mat({ color: '#f6f6f2', roughness: .8 }),
    fence: mat({ color: '#2f3436', roughness: .5, metalness: .6 }),
    net: mat({ color: '#1e2224', roughness: .6, transparent: true, opacity: .35, depthWrite: false }),
    roofTile: mat({ color: '#ffffff', map: tex.roofTile(), roughness: .85, uvm: 1.5 }),
    houseWall: mat({ color: '#e6dccb', map: plasterTex, roughness: .9, uvm: 3 }),
    houseWall2: mat({ color: '#d7d3c8', map: plasterTex, roughness: .9, uvm: 3 }),
    playRed: mat({ color: '#d0452f', roughness: .6 }),
    playYellow: mat({ color: '#e8b23a', roughness: .6 }),
    playBlue: mat({ color: '#2f6fb2', roughness: .6 }),
    rubber: mat({ color: '#3d6a4a', roughness: 1 }),
    fire: mat({ color: '#ffb15c', emissive: '#ff7a1a', emissiveIntensity: 0 }),
    poleLight: mat({ color: '#fff4dd', emissive: '#ffd9a0', emissiveIntensity: 0 }),
    car: [mat({ color: '#8c1d1d', roughness: .25, metalness: .6 }), mat({ color: '#d9d9d6', roughness: .25, metalness: .6 }), mat({ color: '#232628', roughness: .25, metalness: .6 }), mat({ color: '#5a6a78', roughness: .25, metalness: .6 })],
    tyre: mat({ color: '#151515', roughness: .9 }),
    carGlass: mat({ color: '#1c2a30', roughness: .05, metalness: .5 }),
    lounger: mat({ color: '#f1eee6', roughness: .8 }),
    umbrella: mat({ color: '#efe8da', roughness: .9, side: THREE.DoubleSide }),
  };
  return m;
}
export type Materials = ReturnType<typeof createMaterials>;

/** Materiais que acendem à noite (fator 0 = dia, 1 = noite). */
export function setNight(m: Materials, k: number) {
  m.curtainLit.emissiveIntensity = 1.1 * k;
  m.lampShade.emissiveIntensity = 1.5 * k;
  m.bulb.emissiveIntensity = .3 + 3 * k;
  m.fire.emissiveIntensity = 1 + 3 * k;
  m.poleLight.emissiveIntensity = 3 * k;
}
