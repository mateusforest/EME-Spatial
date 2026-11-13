/** Small, versioned device-only shortlist; never a commercial stock record. */
export function validFavorites(value:unknown,ids:ReadonlySet<string>):string[]{
  return Array.isArray(value)?[...new Set(value.filter((id):id is string=>typeof id==='string'&&ids.has(id)))].slice(0,96):[];
}
export function toggleComparison(ids:string[],id:string):string[]{
  return ids.includes(id)?ids.filter(x=>x!==id):[...ids.slice(-1),id];
}
export function advanceDay(hour:number,seconds:number,speed:number){
  return Math.min(20,Math.max(6,hour)+Math.min(.5,Math.max(0,seconds))*.25*speed);
}
