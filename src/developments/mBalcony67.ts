import * as T from 'three';
import {craft53} from './mCraft53';
import {addMGalleryFoliage} from './mGalleryFoliage';
import type {Own,mSurfaces} from './mSurfaces';
import type {Obstacle} from './mWalking';

export const balcony67Obstacles:Obstacle[]=[
 {minX:1.05,maxX:3.9,minZ:6.45,maxZ:7.5},
 {minX:2.05,maxX:3.35,minZ:7.7,maxZ:8.6},
 {minX:8.3,maxX:10.7,minZ:6.5,maxZ:8.35},
 {minX:.65,maxX:1.25,minZ:8.5,maxZ:9.5},
 {minX:10.65,maxX:11.45,minZ:8.5,maxZ:9.5},
];
/** Continuation of the Blender room's open bay, on the same finished floor level. */
export function balcony67(parent:T.Group,ceiling:T.Group,own:Own,surfaces:ReturnType<typeof mSurfaces>){
 const root=new T.Group();root.name='Apartamento 14 · Sacada navegável';parent.add(root);
 const stone=own(new T.MeshStandardMaterial({color:'#e7dfcf',roughness:.8}));surfaces.finishStone(stone);
 const wood=own(new T.MeshStandardMaterial({color:'#b99974',roughness:.75}));surfaces.finishWood(wood);
 const fabric=own(new T.MeshStandardMaterial({color:'#e4dccb',roughness:1}));surfaces.finishLinen(fabric);
 const metal=own(new T.MeshStandardMaterial({color:'#494d42',metalness:.65,roughness:.32}));
 const glass=own(new T.MeshStandardMaterial({color:'#cadbd4',transparent:true,opacity:.24,roughness:.13,metalness:.15,depthWrite:false}));
 const k=craft53(root,own),b=k.box;
 b(6.025,.19,6.87,10.95,.26,5.25,stone);
 // Clear, flush threshold across the entire sliding opening.
 b(6.02,.323,4.32,10.6,.014,.12,metal);
 for(const z of [5.6,6.8,8,9.15])b(6.02,.324,z,10.6,.004,.009,metal,0,0);
 for(const x of [2.4,4.8,7.2,9.6])b(x,.324,6.88,.009,.004,5.05,metal,0,0);
 b(6.02,.94,9.45,10.8,1.22,.035,glass,0,0);b(6.02,1.56,9.45,10.8,.045,.055,metal);
 for(const x of [.6,11.45]){b(x,.94,6.88,.035,1.22,5.15,glass,0,0);b(x,1.56,6.88,.055,.045,5.15,metal);}
 for(const x of [.65,2.8,4.95,7.1,9.25,11.4])b(x,.92,9.45,.035,1.18,.045,metal);
 b(2.47,.56,6.98,2.85,.30,1.05,wood);b(2.47,.82,7,2.7,.25,.9,fabric);b(2.47,1.08,6.56,2.7,.7,.18,fabric);
 b(2.7,.57,8.15,1.3,.13,.9,stone);for(const x of [2.2,3.2])b(x,.43,8.15,.08,.22,.65,wood);
 b(9.5,1.03,7.35,1.4,.1,1.4,wood);b(9.5,.67,7.35,.4,.6,.4,wood);
 for(const x of [8.6,10.4]){b(x,.57,7.35,.58,.16,.7,wood);b(x,.71,7.35,.55,.13,.65,fabric);b(x+(x<9?-.27:.27),.95,7.35,.09,.62,.68,wood);}
 for(const x of [.94,11.05])b(x,.66,8.96,.58,.68,.9,stone);
 k.flush();addMGalleryFoliage(root,own,[[.94,1.02,8.96,1.5],[11.05,1.02,8.96,1.5]]);
 const roof=craft53(ceiling,own);roof.box(6.02,3.28,6.88,10.95,.12,5.25,wood);roof.flush();
 return root;
}
