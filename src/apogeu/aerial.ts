import calibration from './aerial-camera.json' with {type:'json'};

/** One crop drives both the photographic background and the 3D projection. */
export function aerialCrop(width:number,height:number,zoom=1){
 const scale=Math.max(width/calibration.width,height/calibration.height)*zoom;
 const w=width/scale,h=height/scale;
 const x=Math.max(0,Math.min(calibration.width-w,calibration.focus[0]*calibration.width-w/2));
 const y=Math.max(0,Math.min(calibration.height-h,calibration.focus[1]*calibration.height-h/2));
 return {x,y,width:w,height:h};
}
export {calibration};
