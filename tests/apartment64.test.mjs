import assert from 'node:assert/strict';
import './resolve-typescript.mjs';
const {apartment64Bounds:bounds,apartment64Obstacles:obstacles}=await import('../src/developments/mApartment64.ts');
import {walkingPath63} from '../src/developments/mClickWalk63.ts';
import {canStand} from '../src/developments/mWalking.ts';
const space={bounds,obstacles};
for(const p of [{x:10.65,z:2.65},{x:6.05,z:2.9},{x:5.95,z:2.35}])assert(canStand(p,obstacles,bounds),'Room camera must start in clear circulation');
const path=walkingPath63({x:10.65,z:2.65},{x:6.05,z:2.9},space);assert(path.length,'Living and dining must connect');
assert.equal(walkingPath63({x:6.05,z:2.9},{x:8,z:.15},space).length,0,'Cannot walk inside dining table');
// Version 67 opened this former window edge onto the continuous balcony.
assert(walkingPath63({x:6.05,z:2.9},{x:6,z:5},space).length,'The open balcony must remain reachable');
assert.equal(walkingPath63({x:6.05,z:2.9},{x:6,z:bounds.maxZ+.5},space).length,0,'Cannot walk beyond the balcony perimeter');
console.log('Apartment64 circulation: passed');
