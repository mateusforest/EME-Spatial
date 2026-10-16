/** Stable, one-way adaptation during a visit avoids resolution pumping. */
export function casaPerformanceScale(scale:number,averageMs:number,frames:number){
 if(frames<45||averageMs<27||scale<=.6)return scale;
 return Math.max(.6,Math.round((scale-.12)*100)/100);
}
