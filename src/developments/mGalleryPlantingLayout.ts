import {mGalleryContour,M_PODIUM} from './mReferencePodium';

/** Reuse the actual asymmetric slab contours, including their upper setbacks.
 * Leave the central portal and rear service circulation clear. Coordinates: x,y,z,scale. */
export function mGalleryPlantingLocations():number[][]{
 const locations:number[][]=[];
 for(const side of ['left','right'] as const)for(const upper of [false,true]){
  const path=mGalleryContour(side,upper,.85),count=Math.ceil(path.getLength()/.82);
  const y=upper?10.33:M_PODIUM.upper+.10;
  for(const p of path.getSpacedPoints(count).slice(0,-1)){
   if(-p.y<-.5||Math.abs(p.x)<7.6)continue;
   locations.push([p.x,y,-p.y,1.05]);
  }
 }
 return locations;
}
