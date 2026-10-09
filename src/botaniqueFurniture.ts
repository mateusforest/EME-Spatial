import type {Object3D} from 'three';

export type FurnitureGroup='sofa'|'chairs';
export type FurnitureVariant='contemporaneo'|'organico';
export type LightTemperature=3000|4000|6000;
export const temperatureColor={3000:'#ffe0b7',4000:'#fff1df',6000:'#edf4ff'} as const;
export const isFurnitureVariant=(value:unknown):value is FurnitureVariant=>value==='contemporaneo'||value==='organico';
export const isLightTemperature=(value:unknown):value is LightTemperature=>value===3000||value===4000||value===6000;

/** Only switches complete, exported model variants; architecture is untouched. */
export function applyFurnitureVariant(objects:Object3D[],group:FurnitureGroup,variant:FurnitureVariant){
 const members=objects.filter(o=>o.userData.variantGroup===group);
 if(!members.some(o=>o.userData.variantId===variant))return false;
 for(const object of members)object.visible=object.userData.variantId===variant;
 return true;
}
