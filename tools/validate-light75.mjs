import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.env.SPATIAL_PLAYWRIGHT).href);
const phase=process.argv[2]||'after',base=process.env.SPATIAL_URL||'http://127.0.0.1:4202',out=`conteudos/light75/${phase}`;
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),reports=[];
try{
 for(const [name,route]of [['rooftop','?vista=rooftop'],['living','?apartamento=14&ambiente=Living'],['lobby','?vista=lobby']]){
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const start=Date.now();await page.goto(base+'/apresentar/m'+route);
  await page.locator('[data-ready="true"]').waitFor({timeout:150000});
  await page.getByRole('combobox',{name:'Qualidade do cenário'}).selectOption('balanced');
  await page.waitForTimeout(1800);
  const metrics=await page.evaluate(()=>{const host=document.querySelector('.m-canvas'),a=window.__mAudit71;return {dataset:{...host.dataset},light:a?.scene.userData.atmosphere51,render:a?.renderer.info.render,position:a?.camera.position.toArray()};});
  await page.screenshot({path:`${out}/${name}-day.png`});
  const idleStart=Number(await page.locator('.m-canvas').getAttribute('data-frame'));
  await page.waitForTimeout(1200);
  const idle=Number(await page.locator('.m-canvas').getAttribute('data-frame'))-idleStart;assert(idle<8,'idle rendering must stop');
  if(phase!=='before')for(const [period,value]of [['sunset','60'],['night','100']]){
   await page.getByRole('slider',{name:'Período do dia'}).fill(value);await page.waitForTimeout(650);
   await page.screenshot({path:`${out}/${name}-${period}.png`});
  }
  if(phase==='final'&&name==='living'){
   await page.getByRole('slider',{name:'Período do dia'}).fill('0');
   for(const quality of ['balanced','light']){
    await page.getByRole('combobox',{name:'Qualidade do cenário'}).selectOption(quality);await page.waitForTimeout(600);
    assert.equal(await page.locator('.m-canvas').getAttribute('data-contact-shading75'),String(quality!=='light'));
    await page.locator('.m-canvas canvas').focus();
    await page.evaluate(()=>{window.__frame75=[];window.__sample75=true;let prior=-1;function sample(){const n=Number(document.querySelector('.m-canvas').dataset.frame);if(prior!==n){window.__frame75.push(performance.now());prior=n;}if(window.__sample75)requestAnimationFrame(sample);}requestAnimationFrame(sample);});
    await page.keyboard.down('ArrowLeft');await page.waitForTimeout(2500);await page.keyboard.up('ArrowLeft');
    const times=await page.evaluate(()=>{window.__sample75=false;return window.__frame75;});
    const deltas=times.slice(1).map((t,i)=>t-times[i]).slice(3).sort((a,b)=>a-b);assert(deltas.length>15,'Movement stalled');
    metrics[quality]={samples:deltas.length,p50ms:deltas[Math.floor(deltas.length*.5)],p95ms:deltas[Math.floor(deltas.length*.95)]};
   }
   await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);await page.screenshot({path:`${out}/living-mobile.png`});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  }
  assert.deepEqual(errors,[]);reports.push({name,loadMs:Date.now()-start,metrics,idle,errors});
  console.log(JSON.stringify(reports.at(-1)));await page.close();
 }
 if(phase==='final'){
  const page=await browser.newPage({viewport:{width:390,height:844}}),media=[];page.on('request',r=>{if(r.url().endsWith('.mp4'))media.push(r.url());});
  await page.goto(base+'/galeria-m.html');await page.getByRole('heading',{name:'Materiais, luz e vida.'}).waitFor();
  assert.equal(media.length,0,'Video must not download or play automatically');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.locator('video').evaluate(v=>v.load());await page.waitForFunction(()=>document.querySelector('video').readyState>=1);
  const duration=await page.locator('video').evaluate(v=>v.duration);assert(Math.abs(duration-6)<.05);await page.close();
 }
 fs.writeFileSync(`${out}/report.json`,JSON.stringify(reports,null,2));
}finally{await browser.close();}
