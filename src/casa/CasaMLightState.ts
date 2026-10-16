import {Color,MathUtils,Vector3} from 'three';

export type CasaLightSettings={hour:number;interior:number;facade:number;exterior:number};
export type CasaLightCircuit='interior'|'facade'|'exterior'|'day';
export const CASA_LIGHT_DEFAULTS:CasaLightSettings={hour:16,interior:1,facade:1,exterior:1};
// User's georeferenced aerial marker, 16/10/2026. Bearing read from the arrow;
// approximate west, not a surveyed azimuth. Model +Z faces the street, +X is south.
export const CASA_SOLAR_SITE={latitude:-(28+29/60+17.95/3600),longitude:-(50+55/60+7.25/3600),frontBearing:270,utcOffset:-3,date:'2026-10-16'};

/** NOAA fractional-year solar equations, geometric altitude (no refraction).
 * https://gml.noaa.gov/grad/solcalc/solareqns.PDF
 * Local civil time, latitude, longitude and date determine the path together. */
export function casaSolar(hour:number,site=CASA_SOLAR_SITE){
 const h=MathUtils.clamp(hour,0,24),[year,month,date]=site.date.split('-').map(Number);
 const days=(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/86400000;
 const ordinal=(Date.UTC(year,month-1,date)-Date.UTC(year,0,1))/86400000+1;
 const g=2*Math.PI/days*(ordinal-1+(h-12)/24);
 const eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
 const decl=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
 const ha=MathUtils.degToRad((h*60+eq+4*site.longitude-60*site.utcOffset)/4-180),lat=MathUtils.degToRad(site.latitude);
 const e=Math.asin(MathUtils.clamp(Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.cos(ha),-1,1));
 const azimuth=(MathUtils.radToDeg(Math.atan2(Math.sin(ha),Math.cos(ha)*Math.sin(lat)-Math.tan(decl)*Math.cos(lat)))+180+360)%360;
 const relative=MathUtils.degToRad(site.frontBearing-azimuth),elevation=MathUtils.radToDeg(e);
 const day=MathUtils.smoothstep(elevation,-6,12),gold=1-MathUtils.smoothstep(elevation,3,32);
 return {day,gold,elevation,azimuth,sunlight:MathUtils.smoothstep(elevation,0,10),direction:new Vector3(Math.cos(e)*Math.sin(relative),Math.sin(e),Math.cos(e)*Math.cos(relative)),
  color:new Color('#fff5e8').lerp(new Color('#ffd5a4'),gold*.65)};
}

export function casaCircuitGain(circuit:CasaLightCircuit,s:CasaLightSettings){
 return circuit==='day'?casaSolar(s.hour).day:s[circuit];
}

/** Circuit ownership is a property of the fixture, never of the viewer's position. */
export function casaFixtureCircuit(x:number,z:number):CasaLightCircuit{
 if(z>-2&&x<19.3)return 'facade';
 if(x>19.3||z<-12.15)return 'exterior';
 return 'interior';
}
