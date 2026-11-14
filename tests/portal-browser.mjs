// Client integration with a controlled transport. Database policies have a separate PostgreSQL test.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {initialSpatialProject} from '../shared/spatial-studio.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base='http://127.0.0.1:4195', api='https://portal-test.supabase.invalid';
const browser=await chromium.launch({headless:true,...(process.env.TEST_BROWSER_PATH?{executablePath:process.env.TEST_BROWSER_PATH}:{})});
const documents=new Map(), errors=[], calls=[];
const owner='00000000-0000-0000-0000-000000000001', other='00000000-0000-0000-0000-000000000002';
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5X1ioAAAAASUVORK5CYII=','base64');
const token=(id,email)=>['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:id,email,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test_signature'].join('.');
function user(email){return {id:email==='owner@example.test'?owner:other,email,aud:'authenticated',role:'authenticated',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};}
function claim(req){try{return JSON.parse(Buffer.from(req.headers().authorization.split('.')[1],'base64url').toString());}catch{return {};}}
async function context(){
 const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
 await ctx.route(api+'/**',async route=>{
  const req=route.request(),url=new URL(req.url()), c=claim(req);calls.push(url.pathname);
  const respond=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  if(url.pathname==='/auth/v1/token'){
   const body=req.postDataJSON();if(body.password==='wrong')return respond({error:'invalid_grant',error_description:'Invalid login credentials'},400);
   const u=user(body.email);return respond({access_token:token(u.id,u.email),refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:u});
  }
  if(url.pathname==='/auth/v1/user')return respond(user(c.email));
  if(url.pathname==='/auth/v1/logout')return respond({});
  if(url.pathname==='/auth/v1/recover')return respond({});
  if(url.pathname==='/auth/v1/signup')return respond({id:owner,aud:'authenticated',email:'owner@example.test',identities:[]});
  if(!c.sub)return respond({message:'Unauthorized'},401);
  if(url.pathname==='/rest/v1/spatial_portal_members')return respond(c.email==='outsider@example.test'?[]:[{email:c.email}]);
  if(url.pathname==='/rest/v1/spatial_portal_documents')return respond([...documents.values()].filter(r=>r.owner===c.sub).map(({owner,...r})=>r));
  if(url.pathname==='/rest/v1/rpc/spatial_portal_save'){
   const p=req.postDataJSON();if(p.p_owner!==c.sub)return respond({code:'42501',message:'ACCOUNT_CHANGED'},403);const key=c.sub+':'+p.p_kind+':'+p.p_id,old=documents.get(key);
   if((old?.version||0)!==p.p_version)return respond({code:'P0001',message:'STALE_VERSION'},400);
   const row={kind:p.p_kind,document_id:p.p_id,payload:p.p_payload,version:p.p_version+1,updated_at:new Date().toISOString()};documents.set(key,{owner:c.sub,...row});return respond(row);
  }
  if(url.pathname.startsWith('/storage/v1/object/')){
   if(req.method()==='POST')return respond({Key:'spatial-portal-media/test'});
   return route.fulfill({contentType:'image/png',body:pixel});
  }
  errors.push('Unhandled mock request '+url.pathname);return respond({message:'unknown'},500);
 });
 return ctx;
}
async function login(page,email='owner@example.test'){
 await page.getByLabel('E-mail',{exact:true}).fill(email);await page.getByLabel('Senha',{exact:true}).fill('test-password-123');
 await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByRole('button',{name:'Configurações',exact:true}).waitFor();
}
const a=await context(),b=await context();const page=await a.newPage(),second=await b.newPage();
for(const p of [page,second]){p.on('pageerror',e=>errors.push(e.message));p.on('dialog',dialog=>dialog.accept());p.setDefaultTimeout(12000);}
await mkdir('reports/portal-cloud',{recursive:true});
try {
 await page.goto(base+'/portal/contratos');await page.getByRole('heading',{name:'Entre no seu workspace.'}).waitFor();
 assert.equal(calls.filter(p=>p.startsWith('/rest')).length,0);
 await page.screenshot({path:'reports/portal-cloud/login-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'reports/portal-cloud/login-mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('button',{name:'Esqueci minha senha'}).click();await page.getByLabel('E-mail').fill('owner@example.test');await page.getByRole('button',{name:'Enviar recuperação'}).click();await page.getByText('Se houver uma conta para este e-mail',{exact:false}).waitFor();
 await page.getByRole('button',{name:'Voltar para entrar'}).click();await login(page);
 await page.getByLabel('Nome do projeto',{exact:true}).fill('Loteamento 96 · teste');await page.getByRole('button',{name:'Salvar acompanhamento',exact:true}).click();await page.getByText('Acompanhamento salvo na sua conta.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Orçamentos',exact:true}).click();await page.getByLabel('Nome do estudo').fill('96 lotes · teste');await page.getByRole('button',{name:'Salvar rascunho',exact:true}).click();await page.getByText('Orçamento salvo na sua conta.',{exact:true}).waitFor();
 await second.goto(base+'/portal/orcamentos');await login(second);assert.equal(await second.getByLabel('Nome do estudo').inputValue(),'96 lotes · teste');
 await page.getByLabel('Nome do estudo').fill('96 lotes · versão atual');await page.getByRole('button',{name:'Salvar rascunho',exact:true}).click();await page.getByText('Orçamento salvo na sua conta.',{exact:true}).waitFor();
 await second.getByLabel('Nome do estudo').fill('96 lotes · versão antiga');await second.getByRole('button',{name:'Salvar rascunho',exact:true}).click();await second.getByText('O documento mudou em outro computador.',{exact:false}).waitFor();assert.equal(await second.getByLabel('Nome do estudo').inputValue(),'96 lotes · versão antiga');
 await page.getByRole('button',{name:'Estúdio 3D',exact:false}).click();await page.getByLabel('Nome do projeto',{exact:true}).fill('Projeto salvo · teste');await page.getByRole('button',{name:'Salvar projeto',exact:true}).click();await page.getByText('Projeto salvo na sua conta.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Financeiro',exact:true}).click();await page.getByRole('button',{name:'Novo lançamento',exact:true}).click();const form=page.getByRole('dialog');await form.getByLabel('Nome',{exact:true}).fill('Produção 96 lotes');await form.getByLabel('Cliente ou contato').fill('Cliente teste');await form.getByLabel('Valor (R$)').fill('1500');await form.getByLabel('Data prevista').fill('2026-12-01');await form.getByRole('button',{name:'Salvar rascunho'}).click();await page.getByRole('cell',{name:'Produção 96 lotes Cliente teste'}).waitFor();
 await page.evaluate(project=>localStorage.setItem('eme-spatial:studio:v1',JSON.stringify([{id:'legacy-test',project}])),initialSpatialProject());
 await page.getByRole('button',{name:'Configurações',exact:true}).click();await page.getByRole('button',{name:'Copiar rascunhos para minha conta'}).click();await page.getByText('1 documentos copiados.',{exact:false}).waitFor();assert.ok(await page.evaluate(()=>localStorage.getItem('eme-spatial:studio:v1')));
 const backup={schema:'eme-spatial-cloud-backup/1',documents:[{kind:'studio',document_id:'restore-test',payload:{...initialSpatialProject(),name:'Projeto restaurado'}}]};
 await page.locator('input[type=file]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.getByText('1 documentos restaurados.',{exact:false}).waitFor();
 await page.getByRole('button',{name:'Produção visual',exact:true}).click();
 const pack={schema:'eme-spatial-library/1',items:[{id:'media-test',name:'Imagem teste',kind:'image',mime:'image/png',sha256:createHash('sha256').update(pixel).digest('hex'),createdAt:new Date().toISOString(),origin:{projectId:'test',projectName:'Projeto teste',engine:'test',originType:'test'},data:pixel.toString('base64')}]};
 await page.locator('input[type=file]').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(pack))});await page.getByRole('heading',{name:'Imagem teste'}).waitFor();await page.getByRole('button',{name:'Aprovar versão'}).click();await page.getByRole('button',{name:'Voltar à revisão'}).waitFor();
 await page.getByRole('button',{name:'Contratos',exact:true}).click();assert.equal(await page.getByLabel('Nome do projeto',{exact:true}).inputValue(),'Loteamento 96 · teste');await page.screenshot({path:'reports/portal-cloud/contracts-desktop.png',fullPage:true});
 await second.getByRole('button',{name:'Sair',exact:true}).click();await second.getByRole('heading',{name:'Entre no seu workspace.'}).waitFor();await login(second,'second@example.test');assert.notEqual(await second.getByLabel('Nome do estudo').inputValue(),'96 lotes · versão atual');
 assert.equal((await second.locator('body').innerText()).includes('Loteamento 96 · teste'),false);
 await second.getByRole('button',{name:'Sair',exact:true}).click();await second.getByLabel('E-mail',{exact:true}).fill('outsider@example.test');await second.getByLabel('Senha',{exact:true}).fill('test-password-123');await second.getByRole('button',{name:'Entrar',exact:true}).click();await second.getByText('Esta conta ainda não tem acesso ao EME Spatial.',{exact:false}).waitFor();assert.equal(await second.getByRole('button',{name:'Orçamentos',exact:true}).count(),0);
 assert.deepEqual(errors,[]);
 await writeFile('reports/portal-cloud/browser-results.json',JSON.stringify({passed:true,transport:'mock only; SQL policies tested separately',checks:['unauthenticated route','mobile layout','password recovery request','save contract','save budget','second computer reload','stale write rejection','studio project','financial record','legacy import preserves source','private media import and approval','logout and different account','backup restore','unapproved account denied'],documents:documents.size},null,2));
 console.log('PASS: portal browser integration, 15 flows; no browser exceptions.');
} finally {await browser.close();}
