import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(join(dirname(process.execPath),'node_modules/playwright/package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[],checks={};page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const base=process.argv[2]||'http://127.0.0.1:4214';
const out=process.argv[3]||'C:/Users/EME/Downloads/eme-spatial/output/amici-blender/walk-check';
await mkdir(out,{recursive:true});
try{
 await page.goto(base+'/apresentar/amici',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent==='Passear');return b&&!b.disabled;},null,{timeout:90000});
 await page.getByRole('button',{name:'Passear',exact:true}).click();
 await page.getByText('Passeio pela calçada',{exact:true}).waitFor();
 await page.screenshot({path:join(out,'street.png')});
 await page.mouse.click(720,800);
 await page.getByRole('button',{name:'Parar caminhada',exact:true}).waitFor();
 await page.getByRole('button',{name:'Entrar no hall',exact:true}).waitFor({timeout:10000});checks.groundClick=true;
 await page.getByRole('button',{name:'Passear',exact:true}).click();
 // A full keyboard approach crosses the actual automatically opening entrance.
 await page.locator('canvas').focus();await page.keyboard.down('w');
 await page.getByText('Hall de entrada',{exact:true}).waitFor({timeout:15000});await page.keyboard.up('w');
 checks.keyboardEntry=true;
 await page.screenshot({path:join(out,'door-open.png')});
 // An open presentation stops movement and restores the walk on close.
 await page.getByRole('button',{name:'Ver referência',exact:true}).click();
 await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
 checks.modalRetainsWalk=await page.getByText('Hall de entrada',{exact:true}).isVisible();
 await page.getByRole('button',{name:'Sair do passeio',exact:true}).click();
 checks.exit=!(await page.locator('.am-walk-banner').isVisible());
 await page.getByRole('button',{name:'Passear',exact:true}).click();
 await page.getByRole('button',{name:'Entrar no hall',exact:true}).click();
 await page.getByRole('button',{name:'Voltar à calçada',exact:true}).waitFor({timeout:25000});
 checks.guidedEntry=true;await page.screenshot({path:join(out,'hall.png')});
 // Drag to look around, without moving the visitor out of the hall.
 await page.mouse.move(790,430);await page.mouse.down();await page.mouse.move(1040,450,{steps:12});await page.mouse.up();
 await page.screenshot({path:join(out,'hall-look.png')});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
 checks.resizeRetainsWalk=await page.getByText('Hall de entrada',{exact:true}).isVisible();
 await page.screenshot({path:join(out,'mobile-hall.png')});
 await page.getByRole('button',{name:'Voltar à calçada',exact:true}).click();
 await page.getByRole('button',{name:'Entrar no hall',exact:true}).waitFor({timeout:25000});checks.guidedExit=true;
 await page.getByRole('button',{name:'Sair do passeio',exact:true}).click();
 await page.getByRole('button',{name:'Passear',exact:true}).click();
 const pad=page.getByRole('button',{name:'Caminhar para frente',exact:true});const r=await pad.boundingBox();
 await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();
 await page.getByText('Hall de entrada',{exact:true}).waitFor({timeout:15000});await page.mouse.up();checks.mobilePadEntry=true;
 await page.screenshot({path:join(out,'mobile-door.png')});
 await page.locator('canvas').focus();await page.keyboard.press('Escape');
 checks.escapeExits=!(await page.locator('.am-walk-banner').isVisible());
 checks.mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 await writeFile(join(out,'checks.json'),JSON.stringify({...checks,errors},null,2));console.log(JSON.stringify({...checks,errors}));
 assert(Object.entries(checks).every(([key,value])=>key==='mobileOverflow'?!value:value));assert.deepEqual(errors,[]);
}finally{await browser.close();}
