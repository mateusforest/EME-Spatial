import source from './plan-source.json';

export type Point2 = [number, number];
export type LotStatus = 'available' | 'reserved' | 'unavailable';
export type ViewMode = 'aerial' | 'plan' | 'walk' | 'lot' | 'area';
export const plan = source;
export type Lot = typeof source.lots[number];
export const lots = source.lots;
export const lotById = new Map(lots.map(lot => [lot.id, lot]));
export const areas=source.otherPolygons.map((area,i)=>({...area,id:`area-${i+1}`,name:['Recreação 01','Área institucional','Recreação 02'][i],kind:i===1?'Institucional':'Recreação'}));
export const areaById=new Map(areas.map(area=>[area.id,area]));
export const statusInfo = {
  available: {label: 'Disponível', color: '#3caa78'},
  reserved: {label: 'Reservado', color: '#e59132'},
  unavailable: {label: 'Indisponível', color: '#d85c55'},
} satisfies Record<LotStatus, {label: string; color: string}>;
export const number = (value: number) => value.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
export const timeLabel = (hour: number) => `${Math.floor(hour).toString().padStart(2, '0')}:${Math.round((hour % 1) * 60).toString().padStart(2, '0')}`;

/** Authored demonstration landform. Never a survey elevation or earthworks plan. */
export function terrainHeight(x: number, z: number) {
  return 2.3 * Math.sin(x * .012) + 3.1 * Math.sin(z * .011) + 1.15 * Math.cos((x + z) * .018) + z * .008;
}
export function lotRelief(lot: Lot) {
  const heights = lot.polygon.map(([x,z]) => terrainHeight(x,z));
  return Math.max(...heights) - Math.min(...heights);
}
export function containsPoint(p: number[], polygon: number[][]) {
  let inside = false;
  for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i],b=polygon[j];
    if ((a[1]>p[1])!==(b[1]>p[1]) && p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
  }
  return inside;
}
export function canWalk(x: number,z: number) {
  return source.roads.some(road=>containsPoint([x,z],road.polygon));
}

/** NOAA fractional-year solar equations. Reference: city of Vacaria, not a
 * surveyed parcel. North direction digitized from the arrow on the PDF. */
export function solarPosition(hour: number, date: string) {
  const [year,month,day]=date.split('-').map(Number);
  const ordinal=(Date.UTC(year,month-1,day)-Date.UTC(year,0,1))/86400000+1;
  const days=(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/86400000;
  const g=2*Math.PI/days*(ordinal-1+(hour-12)/24);
  const eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
  const decl=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
  const lat=-28.5*Math.PI/180,lon=-50.93,offset=-3;
  const ha=((hour*60+eq+4*lon-60*offset)/4-180)*Math.PI/180;
  const elevation=Math.asin(Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.cos(ha));
  const azimuth=Math.atan2(Math.sin(ha),Math.cos(ha)*Math.sin(lat)-Math.tan(decl)*Math.cos(lat))+Math.PI;
  const n=source.northVector, east=[-n[1], n[0]];
  return {elevation:elevation*180/Math.PI,azimuth:azimuth*180/Math.PI,
    direction:[(n[0]*Math.cos(azimuth)+east[0]*Math.sin(azimuth))*Math.cos(elevation),Math.sin(elevation),(n[1]*Math.cos(azimuth)+east[1]*Math.sin(azimuth))*Math.cos(elevation)]};
}
