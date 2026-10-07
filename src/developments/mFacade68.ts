/** Small dead band prevents camera damping at slab boundaries from flickering floors. */
export function facadeFloor68(height:number,base:number,step:number,levels:number,previous=0){
 const raw=(height-base)/step+1;
 if(previous>=1&&previous<=levels&&raw>=previous-.04&&raw<previous+1.04)return previous;
 return Math.max(1,Math.min(levels,Math.floor(raw)));
}
/** Relative commands use the requested floor, never an in-flight camera position. */
export function facadeRequest68(floor:number,levels:number){return Math.max(1,Math.min(levels,Math.round(floor)));}
