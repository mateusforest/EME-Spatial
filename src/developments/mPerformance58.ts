export type Quality58='auto'|'light'|'balanced'|'high';
export const profiles58={light:{dpr:.85,pixels:950000,shadow:1024,fps:30,reflections:false},balanced:{dpr:1.15,pixels:1800000,shadow:2048,fps:30,reflections:false},high:{dpr:1.5,pixels:3200000,shadow:2048,fps:45,reflections:true}};
export function initialQuality58(cores:number,memory?:number):Exclude<Quality58,'auto'>{return cores<=4||(memory!==undefined&&memory<=4)?'light':'balanced';}
export function pixelRatio58(level:Exclude<Quality58,'auto'>,width:number,height:number,dpr:number){const p=profiles58[level];return Math.max(.1,Math.min(dpr,p.dpr,Math.sqrt(p.pixels/Math.max(1,width*height))));}
/** Sustained expensive frames only: idle gaps are deliberately not sampled. */
export function governor58(initial:Exclude<Quality58,'auto'>){let level=initial,count=0,total=0;return {reset(next:typeof level){level=next;count=0;total=0;},sample(milliseconds:number){total+=Math.min(milliseconds,250);if(++count<45)return null;const average=total/count;count=0;total=0;if(average>28&&level!=='light'){level=level==='high'?'balanced':'light';return level;}return null;}};}

