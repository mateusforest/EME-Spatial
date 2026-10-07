import assert from 'node:assert/strict';
import {validDesign,initialDesign} from '../src/configurator/design.ts';
assert.deepEqual(validDesign(null),initialDesign);
assert.deepEqual(validDesign({layout:'invalid',cabinet:99,counter:-1,floor:NaN,fabric:'2',day:Infinity,lights:'yes'}),initialDesign);
assert.equal(validDesign({day:150}).day,100);assert.equal(validDesign({day:-10}).day,0);
const d={layout:'peninsula',cabinet:2,counter:1,floor:2,fabric:1,day:65,lights:false};assert.deepEqual(validDesign(JSON.parse(JSON.stringify(d))),d);
console.log('PASS: untrusted shared and stored design values, bounds and round trip');
