import type {Object3D} from 'three';

export const furnitureGroups=['sofa','chairs','table','pendant','cabinetry','appliance','bed','bathroom'] as const;
export type FurnitureGroup=typeof furnitureGroups[number];
export type FurnitureVariant='contemporaneo'|'organico'|'modular'|'concha';
export type FurnitureSelections=Record<FurnitureGroup,FurnitureVariant>;
export const defaultFurniture: FurnitureSelections={sofa:'contemporaneo',chairs:'contemporaneo',table:'contemporaneo',pendant:'contemporaneo',cabinetry:'contemporaneo',appliance:'contemporaneo',bed:'contemporaneo',bathroom:'contemporaneo'};
export const isFurnitureGroup=(value:unknown):value is FurnitureGroup=>typeof value==='string'&&(furnitureGroups as readonly string[]).includes(value);
export type LightTemperature=3000|4000|6000;
export const temperatureColor={3000:'#ffe0b7',4000:'#fff1df',6000:'#edf4ff'} as const;
export const isFurnitureVariant=(value:unknown):value is FurnitureVariant=>value==='contemporaneo'||value==='organico'||value==='modular'||value==='concha';
export const isFurnitureChoice=(group:FurnitureGroup,value:unknown):value is FurnitureVariant=>isFurnitureGroup(group)&&(value==='contemporaneo'||value==='organico'||(group==='sofa'&&value==='modular')||(group==='chairs'&&value==='concha'));
export const isLightTemperature=(value:unknown):value is LightTemperature=>value===3000||value===4000||value===6000;

/** Only switches complete, exported model variants; architecture is untouched. */
export function applyFurnitureVariant(objects:Object3D[],group:FurnitureGroup,variant:FurnitureVariant){
 if(!isFurnitureChoice(group,variant))return false;
 const members=objects.filter(o=>o.userData.variantGroup===group);
 if(!members.some(o=>o.userData.variantId===variant))return false;
 for(const object of members)object.visible=object.userData.variantId===variant;
 return true;
}
