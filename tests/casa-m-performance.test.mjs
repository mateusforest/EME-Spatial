import test from 'node:test';
import assert from 'node:assert/strict';
import {casaPerformanceScale} from '../src/casa/CasaMPerformance.ts';

test('automatic quality ignores isolated stalls and keeps a stable floor on sustained slow devices',()=>{
 assert.equal(casaPerformanceScale(1,80,1),1);
 assert.equal(casaPerformanceScale(1,16,180),1);
 let scale=1;
 for(let i=0;i<20;i++)scale=casaPerformanceScale(scale,40,60);
 assert.equal(scale,.6);
 assert.equal(casaPerformanceScale(scale,12,180),.6,'resolution never pumps up and down during a visit');
});
