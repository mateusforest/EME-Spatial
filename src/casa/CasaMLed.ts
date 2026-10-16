import {BufferGeometry,Matrix4,Vector3} from 'three';
import {casaFixtureCircuit} from './CasaMLightState.ts';
export const CASA_LED_CIRCUITS=['interior','facade','exterior'] as const;

/** The export merges stair and entrance strips into one mesh. Split material
 * groups by triangle so an outside strip cannot inherit the indoor dimmer. */
export function casaLedGeometry(source:BufferGeometry,world:Matrix4){
 const p=source.getAttribute('position'),bins:Record<string,number[]>={interior:[],facade:[],exterior:[]};
 const point=new Vector3(),center=new Vector3(),count=source.index?.count??p.count;
 for(let i=0;i<count;i+=3){
  const ids=[0,1,2].map(j=>source.index?source.index.getX(i+j):i+j);center.set(0,0,0);
  ids.forEach(id=>center.add(point.fromBufferAttribute(p,id).applyMatrix4(world)));center.multiplyScalar(1/3);
  bins[casaFixtureCircuit(center.x,center.z)].push(...ids);
 }
 const geometry=source.clone(),indices:number[]=[];geometry.clearGroups();
 CASA_LED_CIRCUITS.forEach((c,i)=>{const start=indices.length;indices.push(...bins[c]);if(bins[c].length)geometry.addGroup(start,bins[c].length,i);});
 geometry.setIndex(indices);return geometry;
}
