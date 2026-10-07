import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const sharp=(await import(pathToFileURL(process.env.SPATIAL_SHARP).href)).default;
const from='conteudos/producao74/final',to='public/assets/m/cycles74';
await fs.mkdir(to,{recursive:true});
for(const name of ['living','cozinha-jantar','sacada']){
 await sharp(`${from}/${name}.png`).webp({quality:92,effort:5}).toFile(`${to}/${name}.webp`);
 await fs.copyFile(`${from}/${name}.png`,`${to}/${name}.png`);
}
await fs.copyFile(`${from}/percurso.mp4`,`${to}/percurso.mp4`);
console.log('Cycles 74: three web previews, original images and continuous video ready.');
