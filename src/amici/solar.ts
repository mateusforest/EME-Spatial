// NOAA fractional-year approximation, BRT (UTC-3). City reference, not a site survey.
// Passo Fundo: IBGE municipal map 4314100_MM.pdf, -28.26 / -52.41.
export const openingHour=17;
export function timeLabel(hour:number){const minutes=Math.round(hour*60);return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;}
export function solarPosition(hour:number,date:string){
 const [year,month,day]=date.split('-').map(Number);
 const ordinal=(Date.UTC(year,month-1,day)-Date.UTC(year,0,1))/86400000+1;
 const days=(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/86400000;
 const g=2*Math.PI/days*(ordinal-1+(hour-12)/24);
 const eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
 const decl=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
 const lat=-28.26*Math.PI/180,lon=-52.41,offset=-3;
 const ha=((hour*60+eq+4*lon-60*offset)/4-180)*Math.PI/180;
 const elevation=Math.asin(Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.cos(ha));
 const azimuth=Math.atan2(Math.sin(ha),Math.cos(ha)*Math.sin(lat)-Math.tan(decl)*Math.cos(lat))+Math.PI;
 // Provisional 35-degree model orientation; not a measured facade azimuth.
 const rotation=35*Math.PI/180,x=Math.sin(azimuth)*Math.cos(elevation),z=-Math.cos(azimuth)*Math.cos(elevation);
 return {elevation:elevation*180/Math.PI,azimuth:azimuth*180/Math.PI,
  direction:[x*Math.cos(rotation)+z*Math.sin(rotation),Math.sin(elevation),-x*Math.sin(rotation)+z*Math.cos(rotation)] as [number,number,number]};
}
