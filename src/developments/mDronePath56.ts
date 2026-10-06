import {CatmullRomCurve3,Vector3} from 'three';
export type Vec56=[number,number,number];
export type DronePoint56={id:string;eye:Vec56;look:Vec56;fov:number};
export type DroneContext56={place:string;room:string|null;floor:number;tower:'m'|'b'};
export type DroneRoute56={version:1;id:string;name:string;points:DronePoint56[];duration:number;motion:'smooth'|'fpv';format:'landscape'|'portrait'|'square';quality:'hd'|'fullhd';dayTime:number;context:DroneContext56};
export const DRONE_STORAGE56='eme-spatial.drone.routes.v1';
export function newRoute56(context:DroneContext56,dayTime=0):DroneRoute56{return{version:1,id:crypto.randomUUID(),name:'Meu voo',points:[],duration:15,motion:'smooth',format:'landscape',quality:'hd',dayTime,context};}
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const distance=(a:Vec56,b:Vec56)=>Math.hypot(...a.map((n,i)=>n-b[i]));
export function droneDimensions56(route:Pick<DroneRoute56,'format'|'quality'>):[number,number]{const long=route.quality==='fullhd'?1920:1280,short=route.quality==='fullhd'?1080:720;return route.format==='landscape'?[long,short]:route.format==='portrait'?[short,long]:[short,short];}
export function validRoute56(value:unknown):DroneRoute56{
 if(!value||typeof value!=='object')throw new Error('Arquivo de trajeto inválido.');const r=value as DroneRoute56;
 const num=(n:unknown,min:number,max:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
 const vec=(v:unknown)=>Array.isArray(v)&&v.length===3&&v.every(n=>num(n,-5000,5000));
 if(r.version!==1||typeof r.id!=='string'||r.id.length>100||typeof r.name!=='string'||r.name.length>80||!Array.isArray(r.points)||r.points.length>32||!num(r.duration,6,90)||!num(r.dayTime,0,100)||!['smooth','fpv'].includes(r.motion)||!['landscape','portrait','square'].includes(r.format)||!['hd','fullhd'].includes(r.quality))throw new Error('Este arquivo não contém um trajeto compatível.');
 if(!r.context||typeof r.context.place!=='string'||r.context.place.length>80||!(r.context.room===null||typeof r.context.room==='string'&&r.context.room.length<80)||!num(r.context.floor,1,22)||!['m','b'].includes(r.context.tower))throw new Error('O ambiente do trajeto não é válido.');
 if(r.points.some(p=>!p||typeof p.id!=='string'||p.id.length>100||!vec(p.eye)||!vec(p.look)||!num(p.fov,20,100)||distance(p.eye,p.look)<.05))throw new Error('Há pontos inválidos no trajeto.');
 // Return only recognized fields; imported JSON is data, never executable scene content.
 return{version:1,id:r.id,name:r.name,points:r.points.map(p=>({id:p.id,eye:[...p.eye],look:[...p.look],fov:p.fov})),duration:r.duration,motion:r.motion,format:r.format,quality:r.quality,dayTime:r.dayTime,context:{place:r.context.place,room:r.context.room,floor:r.context.floor,tower:r.context.tower}};
}

/** One continuous curve, traversed by distance. Waypoints never reset speed. */
export function compileDrone56(route:DroneRoute56){
 const points=route.points.map(p=>({...p,eye:[...p.eye] as Vec56,look:[...p.look] as Vec56}));
 if(!points.length)throw new Error('Marque pelo menos dois pontos.');
 const closed=points.length>3&&distance(points[0].eye,points.at(-1)!.eye)<.001&&distance(points[0].look,points.at(-1)!.look)<.001;
 const curvePoints=closed?points.slice(0,-1):points;
 const eyes=new CatmullRomCurve3(curvePoints.map(p=>new Vector3(...p.eye)),closed,'centripetal');
 const looks=new CatmullRomCurve3(curvePoints.map(p=>new Vector3(...p.look)),closed,'centripetal');
 eyes.arcLengthDivisions=Math.max(256,(points.length-1)*128);
 const lengths=points.length>1?eyes.getLengths():[0],length=lengths.at(-1)!;
 const pointTimes=points.map((_,i)=>{const index=i/(points.length-1)*eyes.arcLengthDivisions,lo=Math.floor(index);return length>.0001?mix(lengths[lo]??length,lengths[lo+1]??length,index-lo)/length:i/Math.max(1,points.length-1);});
 const sample=(progress:number)=>{
  const u=clamp(progress,0,1);if(points.length===1||u===0||u===1)return{...points[u===1?points.length-1:0],roll:0};
  const t=length>.0001?eyes.getUtoTmapping(u,0):u,index=Math.min(points.length-2,Math.floor(t*(points.length-1))),local=t*(points.length-1)-index;
  const a=points[index],b=points[index+1],eye=eyes.getPoint(t).toArray() as Vec56,look=looks.getPoint(t).toArray() as Vec56;
  if(distance(eye,look)<.05){const dir=a.look.map((n,i)=>n-a.eye[i]);for(let i=0;i<3;i++)look[i]=eye[i]+dir[i];}
  let roll=0;if(route.motion==='fpv'&&length>.01){const before=eyes.getTangentAt(Math.max(0,u-.01)),after=eyes.getTangentAt(Math.min(1,u+.01));roll=clamp((before.x*after.z-before.z*after.x)*1.8,-.11,.11)*Math.min(1,u*20,(1-u)*20);}
  return{eye,look,fov:mix(a.fov,b.fov,local*local*(3-2*local)),roll};
 };
 const steps=Math.max(1,(points.length-1)*40);return{sample,pointTimes,length,trace:Array.from({length:steps+1},(_,i)=>sample(i/steps).eye)};
}
export function sampleDrone56(route:DroneRoute56,progress:number){return compileDrone56(route).sample(progress);}

export function pointAngles57(p:DronePoint56){const d=p.look.map((n,i)=>n-p.eye[i]),length=Math.hypot(...d);return{yaw:Math.atan2(d[0],-d[2])*180/Math.PI,pitch:Math.asin(clamp(d[1]/Math.max(.001,length),-1,1))*180/Math.PI};}
export function orientPoint57(p:DronePoint56,angles:Partial<{yaw:number;pitch:number;fov:number}>){const a={...pointAngles57(p),...angles},yaw=a.yaw*Math.PI/180,pitch=clamp(a.pitch,-85,85)*Math.PI/180,d=Math.max(1,distance(p.eye,p.look));return{...p,look:[p.eye[0]+Math.sin(yaw)*Math.cos(pitch)*d,p.eye[1]+Math.sin(pitch)*d,p.eye[2]-Math.cos(yaw)*Math.cos(pitch)*d] as Vec56,fov:clamp(angles.fov??p.fov,20,95)};}
export function orbitPoints57(center:Vec56,radius:number,height:number,startAngle=0):DronePoint56[]{return Array.from({length:9},(_,i)=>{const a=startAngle+i*Math.PI/4;return{id:crypto.randomUUID(),eye:[center[0]+Math.sin(a)*radius,height,center[2]+Math.cos(a)*radius] as Vec56,look:[...center] as Vec56,fov:50};});}

export function pullback56(point:DronePoint56):DronePoint56[]{
 const delta=point.eye.map((v,i)=>v-point.look[i]) as Vec56;
 return[1,1.35,1.8].map((scale,i)=>({id:crypto.randomUUID(),eye:point.look.map((v,j)=>v+delta[j]*scale+(j===1?i*Math.min(8,Math.abs(delta[1])*.08):0)) as Vec56,look:[...point.look] as Vec56,fov:point.fov}));
}
