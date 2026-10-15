/** Frame-rate independent response, shared by keyboard, touch and click walking. */
export function dampMotion(current:number,target:number,seconds:number,response=10){
 return current+(target-current)*(1-Math.exp(-response*Math.max(0,Math.min(seconds,.05))));
}
export function walkInput(x:number,y:number){
 const length=Math.hypot(x,y),scale=length>1?1/length:1;
 return {x:Math.abs(x)<.04?0:x*scale,y:Math.abs(y)<.04?0:y*scale};
}
export function routeSpeed(distance:number){return Math.min(1.55,Math.sqrt(Math.max(0,distance)*2.4));}
