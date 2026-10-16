import type {BotaniqueNavigationData} from '../botaniqueNavigation';
export type Point=[number,number,number];
export type CasaView={id:string;label:string;level:string;position:Point;target:Point;walk:boolean};
export type CasaManifest={version:number;model:string;vehicles?:{model:string;name:string;position:Point;rotation?:number}[];views:CasaView[];navigation:BotaniqueNavigationData;source:string;note:string;credits:string[]};
export type FurnitureGroup='sofa'|'dining'|'chairs';
export type CasaApi={view:(id:string)=>void;plan:(floor:number)=>void;sun:(hour:number)=>void;lights:(value:number)=>void;outdoorLights:(value:number)=>void;facadeLights:(value:number)=>void;move:(x:number,y:number)=>void;furniture:(group:FurnitureGroup,id:string)=>void;finish:(family:string,id:string)=>void;quality:(quality:string)=>void;reset:()=>void;dispose:()=>void};
