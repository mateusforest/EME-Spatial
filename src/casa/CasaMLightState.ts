import {Color,MathUtils,Vector3} from 'three';

export type CasaLightSettings={hour:number;solar:number;azimuth:number;interior:number;facade:number;exterior:number};
export type CasaLightCircuit='interior'|'facade'|'exterior'|'day';
export const CASA_LIGHT_DEFAULTS:CasaLightSettings={hour:14.5,solar:1,azimuth:0,interior:1,facade:1,exterior:1};

/** A visual sun path. Surveyed north, latitude and date have not been supplied. */
export function casaSolar(hour:number,rotation=0){
 const h=MathUtils.clamp(hour,7,20),elevation=62*Math.sin(Math.PI*(h-6)/13),e=MathUtils.degToRad(elevation);
 const azimuth=MathUtils.degToRad(135-(h-7)*15+rotation),day=MathUtils.smoothstep(elevation,-5,12),gold=1-MathUtils.smoothstep(elevation,5,32);
 return {day,gold,elevation,sunlight:MathUtils.smoothstep(elevation,0,8),direction:new Vector3(Math.cos(e)*Math.sin(azimuth),Math.sin(e),Math.cos(e)*Math.cos(azimuth)),
  color:new Color('#fff5e8').lerp(new Color('#ffd5a4'),gold*.65)};
}

export function casaCircuitGain(circuit:CasaLightCircuit,s:CasaLightSettings){
 return circuit==='day'?casaSolar(s.hour,s.azimuth).day*s.solar:s[circuit];
}

/** Circuit ownership is a property of the fixture, never of the viewer's position. */
export function casaFixtureCircuit(x:number,z:number):CasaLightCircuit{
 if(z>-2&&x<19.3)return 'facade';
 if(x>19.3||z<-12.15)return 'exterior';
 return 'interior';
}
