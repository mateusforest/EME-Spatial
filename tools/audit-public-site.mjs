// Browser audit. Set PLAYWRIGHT_MODULE when Playwright is supplied by a shared runtime.
// Usage: node tools/audit-public-site.mjs http://127.0.0.1:4203
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.argv[2]||'http://127.0.0.1:4203';
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--use-angle=d3d11']});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
const page=await context.newPage();
page.setDefaultTimeout(10000);
const errors=[],failures=[],results=[];
let requests=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
page.on('request',r=>requests.push(r.url()));
const heavy=()=>requests.filter(u=>/\.(glb|gltf|hdr|wasm)(\?|$)|three\.module|BotaniqueViewer|CasaM-[\w]|MSceneRouter|VacariaViewer/.test(u));
async function visit(path){requests=[];await page.goto(base+path,{waitUntil:'networkidle'});}
async function lightPage(){assert.equal(await page.locator('iframe,canvas').count(),0);assert.deepEqual(heavy(),[]);}
async function noOverflow(){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
const output=mkdtempSync(join(tmpdir(),'eme-site-audit-'));
try{
  await visit('/');
  assert.equal(await page.locator('.ms-project').count(),7);
  await lightPage();
  const links=await page.locator('a[href]').evaluateAll(xs=>[...new Set(xs.map(a=>a.getAttribute('href')).filter(h=>h.startsWith('/')))]);
  for(const [category,count] of [['Casas',1],['Edifícios',4],['Condomínios',2],['Todos',7]]){
    await page.getByRole('group',{name:'Filtrar projetos por categoria'}).getByRole('button',{name:new RegExp('^'+category)}).click();
    assert.equal(await page.locator('.ms-project').count(),count);
  }
  for(const width of [320,390,768,1024,1440]){
    await page.setViewportSize({width,height:900});await noOverflow();
  }
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:join(output,'hero-desktop.png')});
  await page.getByRole('tab',{name:'Interiores',exact:true}).click();
  await page.getByRole('tab',{name:'Interiores',exact:true}).press('ArrowRight');
  assert.equal(await page.getByRole('tab',{name:'Visão aérea',exact:true}).getAttribute('aria-selected'),'true');
  await page.getByRole('button',{name:'Ampliar a prévia visual da Casa M'}).click();
  assert(await page.locator('dialog').isVisible());
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog').isVisible(),false);
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Ampliar a prévia visual da Casa M');
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:join(output,'hero-mobile.png')});
  await page.getByRole('button',{name:'Abrir menu',exact:true}).click();
  await page.locator('#ms-navigation').getByRole('link',{name:'Projetos',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Abrir menu',exact:true}).getAttribute('aria-expanded'),'false');
  assert((await page.locator('#projetos').boundingBox()).y>=(await page.locator('.ms-header').boundingBox()).height);
  results.push('Home: seven projects, filters, responsive widths, keyboard gallery and mobile navigation.');
  for(const path of [...new Set([...links.map(x=>x.split('?')[0]).filter(x=>x!=='/'),'/projetos/torre-m','/projetos/mixed-use'])]){
    await visit(path);await noOverflow();await lightPage();
    assert.equal(await page.locator('h1').count(),1,path);
    assert(!((await page.locator('h1').innerText()).includes('Vamos encontrar seu próximo espaço')),path);
    for(const image of await page.locator('img').all())await image.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>[...document.images].every(x=>x.complete&&x.naturalWidth>0));
  }
  results.push('All linked public pages: headings, images, no horizontal overflow and no premature 3D requests.');
  await visit('/visitar/torre-m?entrada=1');
  assert((await page.locator('.delivery-entry-picker button[aria-pressed=true]').innerText()).startsWith('Apartamento 14'));
  await lightPage();
  await page.getByRole('button',{name:'Entrar na experiência'}).click();
  assert.equal(await page.locator('iframe').getAttribute('src'),'/apresentar/m?apartamento=14');
  assert(await page.locator('main').evaluate(x=>x.inert));
  await page.frameLocator('iframe').locator('canvas').first().waitFor({timeout:30000});
  await page.getByRole('button',{name:'Apresentação',exact:true}).click();
  await page.locator('iframe').waitFor({state:'detached'});
  assert.equal(await page.locator('main').evaluate(x=>x.inert),false);
  results.push('Torre M: selected apartment opens only on entry and is removed on exit.');
  await page.evaluate(()=>Object.defineProperty(navigator,'share',{value:undefined,configurable:true}));
  await page.locator('.delivery-header .delivery-share').click();
  assert.equal(await page.getByRole('textbox',{name:'Link da apresentação'}).inputValue(),'https://www.emespatial.com/visitar/torre-m');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog').isVisible(),false);
  results.push('Share dialog exposes the canonical project link and closes with Escape.');
  await visit('/criar-projeto?nivel=interactive&interesse=Signature');
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await page.getByLabel('Nome do projeto').fill('Auditoria de navegação');
  await page.getByLabel('Cidade e estado').fill('Vacaria / RS');
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
  assert.equal(await page.getByLabel('Modelo de experiência').inputValue(),'interactive');
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Baixar meu briefing'}).click();
  const download=await downloadPromise;
  assert.equal(download.suggestedFilename(),'EME-Spatial-meu-briefing.txt');
  const contents=readFileSync(await download.path(),'utf8');
  assert(contents.includes('Auditoria de navegação')&&contents.includes('Plano: Signature'));
  results.push('Briefing: three steps, selected plan preserved and readable file downloaded.');
  await visit('/#planos');
  await page.waitForFunction(()=>{
    const top=document.getElementById('planos')?.getBoundingClientRect().top;
    return top!==undefined&&top>=70&&top<150;
  });
  results.push('Direct links to sections land below the navigation after the page mounts.');
  assert.deepEqual(errors,[],'Browser errors');
  assert.deepEqual(failures,[],'HTTP failures');
  console.log(JSON.stringify({status:'passed',base,results,screenshots:output},null,2));
}finally{await browser.close();}
