/** Enlarged, softly curved site; all landscape, road and plot coordinates share this mapping. */
export function patioPoint53(x:number,z:number){
 const t=Math.max(0,Math.min(1,(z-73)/28)),blend=t*t*(3-2*t);
 return {x:x*1.22+Math.sin((z-73)/132*Math.PI)*34,z:73+(z-73)*1.72+Math.sin(x/83)*24*blend};
}
