import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
// Prevent accidental reinstatement of the expensive housing builder in Torre M.
assert(!read('src/developments/mLandscape.ts').includes('buildMCondominium42'));
assert(read('src/developments/PatioM.tsx').includes('buildMCondominium42(group,own,surfaces)'));
assert(!read('src/developments/PatioM.tsx').includes('buildMExterior'));
assert(read('src/developments/MResidence.tsx').includes('href="/apresentar/cozinha"'));
assert(read('src/experience.tsx').includes("route==='patio-m'?Patio"));
assert(read('src/experience.tsx').includes("location.replace('/apresentar/patio-m'+location.search)"));
console.log('PASS: independent scenes, configurator access and legacy routes');
